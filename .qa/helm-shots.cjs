// Captures every War Table screen at desktop and phone widths and reports
// runtime errors and any network request (the game must stay offline).
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || '.qa/shots';
require('fs').mkdirSync(out, { recursive: true });
const url = 'file:///' + path.resolve('codebreakers_tripleA_cinematic_polish_v3.html').replaceAll('\\', '/');
(async () => {
 const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
 for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const errors = [], requests = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('request', r => { if (!/^(data|file|blob):/.test(r.url())) requests.push(r.url()); });
  await page.goto(url);
  await page.waitForTimeout(1800);
  const shot = async label => { await page.waitForTimeout(500); await page.screenshot({ path: `${out}/${name}-${label}.png`, fullPage: label !== 'deck' }); };
  await shot('deck');
  await page.screenshot({ path: `${out}/${name}-deck-full.png`, fullPage: true });
  const go = async target => { if (name === 'mobile') await page.locator(`.rail-item[data-go="${target}"]`).click(); else await page.locator(`.rail-item[data-go="${target}"]`).click(); await page.waitForTimeout(400); };
  await go('arcade'); await shot('arcade');
  await page.locator('#arcadeCatalog .arc-mode-card').first().click(); await page.waitForTimeout(400); await shot('arcade-play');
  await go('combat'); await shot('combat');
  await page.locator('#attackBtn').click(); await page.waitForTimeout(300); await shot('combat-question');
  await go('teacher'); await shot('teacher');
  await go('deck');
  await page.locator('#deployMission').click(); await page.waitForTimeout(500);
  await shot('mission');
  await page.locator('#compileRun').click(); await page.waitForTimeout(1500); await shot('mission-run');
  await page.locator('#helmBriefing > summary').click(); await page.waitForTimeout(200); await shot('mission-briefing');
  console.log(name, 'errors:', JSON.stringify(errors), 'requests:', JSON.stringify(requests));
  await page.close();
 }
 await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
