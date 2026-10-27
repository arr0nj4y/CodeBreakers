const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const http = require('node:http');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const game = 'codebreakers_tripleA_cinematic_polish_v3.html';
const cssFile = game.replace('.html', '.css');
const normalize = text => text.replace(/\r\n?/g, '\n');

function buildWithLineEndings(newline) {
  const output = new Map();
  const proxy = new Proxy(fs, {
    get(target, name) {
      if (name === 'writeFileSync') return (file, data) => output.set(String(file), String(data));
      if (name === 'readFileSync') return (file, ...args) => {
        if ([game, cssFile].includes(path.basename(String(file)))) {
          return normalize(fs.readFileSync(file, 'utf8')).replace(/\n/g, newline);
        }
        return fs.readFileSync(file, ...args);
      };
      return target[name];
    }
  });
  const module = { exports: {} };
  new vm.Script(fs.readFileSync('.qa/page-files.cjs', 'utf8')).runInNewContext({
    module, process, require: name => name === 'node:fs' ? proxy : require(name)
  });
  const localRequire = createRequire(path.resolve('.qa/build.cjs'));
  new vm.Script(fs.readFileSync('.qa/build.cjs', 'utf8')).runInNewContext({
    process, console: { log() {} },
    require: name => name === 'fs' ? proxy : name === './page-files.cjs' ? module.exports : localRequire(name)
  });
  return output;
}

async function checkServer() {
  const socket = net.createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  const dataDir = path.join(os.tmpdir(), 'cb-preflight-readonly-' + process.pid + '-' + Date.now());
  const server = spawn(process.execPath, ['.qa/serve.cjs', String(port)], {
    env: { ...process.env, CB_DATA_DIR: dataDir }, stdio: ['ignore', 'pipe', 'pipe']
  });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Class server did not start')), 5000);
      server.stdout.on('data', data => { if (String(data).includes('running')) { clearTimeout(timer); resolve(); } });
      server.once('error', error => { clearTimeout(timer); reject(error); });
      server.once('exit', code => { clearTimeout(timer); reject(new Error('Class server exited: ' + code)); });
    });
    const request = target => new Promise((resolve, reject) => {
      http.get({ host: '127.0.0.1', port, path: target }, response => {
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString(), type: response.headers['content-type'] }));
      }).on('error', reject);
    });
    for (const invalid of ['/%ZZ', '/%E0%A4%A', '/%00', '/api/%ZZ', 'http://[broken']) {
      const response = await request(invalid);
      assert.equal(response.status, 400, 'Malformed URLs return a controlled error');
      assert.equal(server.exitCode, null, 'A malformed URL cannot stop the class server');
      assert.equal((await request('/api/ping')).status, 200);
    }
    assert.equal((await request('/')).status, 200);
    assert.match((await request('/' + cssFile)).type, /^text\/css/);
    assert.equal((await request('/missing-file.css')).status, 404);
    assert.equal((await request('/%E2%9C%93')).status, 404, 'Valid escaped Unicode paths remain valid requests');
  } finally {
    const ended = new Promise(resolve => server.once('exit', resolve));
    server.kill();
    if (server.exitCode === null) await ended;
  }
}

async function checkNavigation() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true
  });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const errors = [], warnings = [], failures = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (['warning', 'error'].includes(message.type())) warnings.push(message.text()); });
    page.on('requestfailed', request => failures.push(request.url()));
    await page.goto(pathToFileURL(path.resolve(game)).href);
    await page.waitForFunction(() => window.CBBoot?.active === false);
    const more = page.locator('.rail-more-btn');
    const checkClosed = async () => {
      assert.equal(await page.locator('#railMore').isVisible(), false);
      assert.equal(await more.getAttribute('aria-expanded'), 'false');
    };
    await more.click(); await page.keyboard.press('Escape'); await checkClosed();
    assert.equal(await more.evaluate(element => element === document.activeElement), true);
    await more.click(); await page.locator('#railMore [data-tool="help"]').click(); await checkClosed();
    await page.locator('#closeHelp').click();
    await more.click(); await page.locator('.rail-item[data-go="arcade"]').click(); await checkClosed();
    await more.click(); await page.setViewportSize({ width: 1440, height: 1000 }); await checkClosed();
    assert.equal(await page.locator('#railTools .rail-tool').count(), 4);
    const palettes = [];
    for (const target of ['deck', 'arcade', 'combat', 'teacher']) {
      await page.locator('.rail-item[data-go="' + target + '"]').click();
      assert.equal(await page.locator('.rail-item[aria-current="page"]').count(), 1);
      assert.equal(await page.locator('.rail-item[data-go="' + target + '"]').getAttribute('aria-current'), 'page');
      palettes.push(await page.locator('#helmRail').evaluate(element => getComputedStyle(element).backgroundColor));
    }
    assert.equal(new Set(palettes).size, 4);
    assert.deepEqual(errors, []);
    assert.deepEqual(warnings, []);
    assert.deepEqual(failures, []);
  } finally { await browser.close(); }
}

(async () => {
  const lf = buildWithLineEndings('\n'), crlf = buildWithLineEndings('\r\n');
  for (const file of [game, cssFile]) {
    assert.equal(normalize(crlf.get(file)), normalize(lf.get(file)), 'LF and Windows CRLF builds are equivalent');
    assert.equal(normalize(lf.get(file)), normalize(fs.readFileSync(file, 'utf8')), 'Generated output is up to date');
  }
  const html = lf.get(game);
  assert.equal((html.match(/id="page-styles"/g) || []).length, 1);
  assert.equal((html.match(/<style\b/gi) || []).length, 0);
  assert.equal((html.match(/name="description"/g) || []).length, 1);
  for (const [index, match] of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].entries()) {
    new vm.Script(match[1], { filename: 'page-script-' + index + '.js' });
  }
  await checkServer();
  await checkNavigation();
  console.log('PASS: equivalent LF/CRLF builds, current generated files, inline-script syntax, stylesheet references, malformed-request handling, server availability, menu dismissal/accessibility, page themes and clean browser console.');
})().catch(error => { console.error(error); process.exitCode = 1; });
