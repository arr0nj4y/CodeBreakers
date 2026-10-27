const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const url = pathToFileURL(path.resolve('codebreakers_tripleA_cinematic_polish_v3.html')).href;
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ready = page => page.waitForFunction(() => window.CBBoot?.active === false && document.getElementById('bootScreen')?.hidden);

async function recordProgress(page) {
  await page.addInitScript(() => {
    window.bootValues = [];
    document.addEventListener('DOMContentLoaded', () => {
      const progress = document.getElementById('bootProgress');
      const record = () => bootValues.push(Number(progress.getAttribute('aria-valuenow')));
      record();
      new MutationObserver(record).observe(progress, { attributes: true, attributeFilter: ['aria-valuenow'] });
    });
  });
}

async function checkCompleted(page) {
  await page.waitForFunction(() => document.getElementById('bootProgress')?.getAttribute('aria-valuenow') === '100');
  assert.equal(await page.locator('#bootScreen').isVisible(), true, '100% is shown before the loader leaves');
  assert.equal(await page.locator('#loadPercent').textContent(), '100%');
  assert.equal(await page.locator('#loadFill').evaluate(element => element.style.width), '100%');
  await ready(page);
  assert.equal(await page.locator('#helmRail').evaluate(element => element.inert), false);
  assert.equal(await page.locator('#menuScreen').evaluate(element => element.inert), false);
  const values = await page.evaluate(() => bootValues);
  assert.equal(values[0], 0);
  assert.equal(values.at(-1), 100);
  assert.ok(values.every((value, index) => value >= 0 && value <= 100 && (!index || value >= values[index - 1])), 'Progress never regresses or exceeds 100%');
}

(async () => {
  const browser = await chromium.launch({ executablePath, headless: true });
  const errors = [];
  try {
    for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 1000 }]) {
      const page = await browser.newPage({ viewport, reducedMotion: viewport.width < 1000 ? 'reduce' : 'no-preference' });
      page.on('pageerror', error => errors.push(error.message));
      await recordProgress(page);
      await page.goto(url);
      assert.equal(await page.locator('#bootScreen').isVisible(), true);
      assert.equal(await page.locator('#helmRail').evaluate(element => element.inert), true, 'The sidebar is locked during startup');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => !!document.activeElement.closest('#helmRail,.screen:not(#bootScreen),.app')), false, 'Keyboard focus cannot reach the game behind the loader');
      const layout = await page.locator('#bootScreen').evaluate(element => ({ width: element.scrollWidth, viewport: innerWidth, progress: document.getElementById('bootProgress').getBoundingClientRect().width }));
      assert.ok(layout.width <= layout.viewport && layout.progress > 0, 'The loader fits the viewport');
      if (viewport.width < 1000) {
        assert.equal(await page.locator('.boot-orbit-outer').evaluate(element => element.getAnimations().some(animation => animation.effect.getComputedTiming().iterations === Infinity)), false, 'Reduced motion stops the decorative orbit');
      }
      await checkCompleted(page);
      await page.locator('#accountStrip [data-act="new"]').waitFor();
      await page.locator('.rail-item[data-go="arcade"]').click();
      assert.equal(await page.locator('#arcadeCatalog .arc-mode-card').count(), 12);
      assert.equal(await page.locator('#bootScreen').isVisible(), false, 'Page navigation does not restart loading');
      await page.locator('.rail-item[data-go="teacher"]').click();
      assert.equal(await page.locator('#classPanel').isVisible(), true);
      if (viewport.width === 1440) {
        await page.reload();
        assert.equal(await page.locator('#bootScreen').isVisible(), true, 'A fresh page load shows the loader again');
        await checkCompleted(page);
        await page.locator('#accountStrip [data-act="new"]').click();
        assert.equal(await page.locator('#helmGate').isVisible(), true, 'Player setup remains available after startup');
      }
      await page.close();
    }

    const slow = await browser.newPage({ reducedMotion: 'reduce' });
    slow.on('pageerror', error => errors.push(error.message));
    await recordProgress(slow);
    await slow.addInitScript(() => {
      let renderer;
      Object.defineProperty(window, 'HelmTable', {
        configurable: true,
        get: () => renderer,
        set(value) {
          const create = value.create;
          value.create = (...args) => {
            const table = create(...args);
            table.ready = Promise.all([table.ready, new Promise(resolve => { window.releasePlanetAssets = resolve; })]);
            return table;
          };
          renderer = value;
        }
      });
    });
    await slow.goto(url);
    await slow.waitForTimeout(1500);
    assert.equal(await slow.locator('#bootScreen').isVisible(), true);
    assert.ok(Number(await slow.locator('#bootProgress').getAttribute('aria-valuenow')) < 100, 'Startup waits for actual planet readiness');
    await slow.evaluate(() => releasePlanetAssets());
    await checkCompleted(slow);
    await slow.close();

    const failure = await browser.newPage({ reducedMotion: 'reduce' });
    failure.on('pageerror', error => errors.push(error.message));
    await recordProgress(failure);
    await failure.addInitScript(() => {
      let loader;
      Object.defineProperty(window, 'CBBoot', {
        configurable: true,
        get: () => loader,
        set(value) {
          const start = value.start;
          value.start = options => start({ ...options, images: [...options.images, 'data:image/png;base64,invalid'] });
          loader = value;
        }
      });
    });
    await failure.goto(url);
    await checkCompleted(failure);
    assert.equal(await failure.locator('#menuScreen').isVisible(), true, 'An image error does not trap the user on the loader');
    await failure.close();

    const timeout = await browser.newPage({ reducedMotion: 'reduce' });
    timeout.on('pageerror', error => errors.push(error.message));
    await recordProgress(timeout);
    await timeout.addInitScript(() => {
      let renderer;
      Object.defineProperty(window, 'HelmTable', {
        configurable: true,
        get: () => renderer,
        set(value) {
          const create = value.create;
          value.create = (...args) => { const table = create(...args); table.ready = new Promise(() => {}); return table; };
          renderer = value;
        }
      });
    });
    await timeout.goto(url);
    const began = Date.now();
    await checkCompleted(timeout);
    assert.ok(Date.now() - began >= 4500, 'A stalled startup task uses the bounded readiness timeout');
    await timeout.close();
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }

  const fallback = await chromium.launch({ executablePath, headless: true, args: ['--disable-webgl'] });
  try {
    const page = await fallback.newPage({ reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(error.message));
    await recordProgress(page);
    await page.goto(url);
    await checkCompleted(page);
    assert.equal(await page.locator('#warTable').getAttribute('data-renderer'), 'fallback');
    await page.locator('#deployMission').click();
    assert.equal(await page.locator('#board .tile').count(), 49, 'The game loads and deploys without WebGL');
    assert.deepEqual(errors, []);
  } finally {
    await fallback.close();
  }
  console.log('PASS: neon loader at four viewport sizes, monotonic 0-100% progress, visible completion, readiness gating, slow/failed/stalled assets, reduced motion, inert background, reload/navigation behavior, player setup and no-WebGL deployment.');
})().catch(error => { console.error(error); process.exitCode = 1; });
