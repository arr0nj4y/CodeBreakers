const { chromium } = require('playwright');
const path = require('path');
const assert = require('node:assert/strict');
const url = 'file:///' + path.resolve('codebreakers_tripleA_cinematic_polish_v3.html').split(path.sep).join('/');
const fits = page => page.evaluate(() => { const s = [...document.querySelectorAll('.screen')].find(x => !x.hidden); return document.documentElement.scrollWidth <= innerWidth && (!s || s.scrollWidth <= s.clientWidth + 1); });
(async () => {
 const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
 for (const width of [390, 768]) {
  const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(url); await page.waitForTimeout(1500);
  assert.equal(await page.locator('#warTable').getAttribute('data-paused'), 'true', 'Reduced motion pauses the table');
  const f = await page.locator('#warTable').getAttribute('data-frame'); await page.waitForTimeout(400);
  assert.equal(await page.locator('#warTable').getAttribute('data-frame'), f, 'No frames render while paused');
  assert.equal(await page.locator('#helmRail').isVisible(), true);
  for (const target of ['deck', 'arcade', 'combat', 'teacher']) {
   await page.locator(`.rail-item[data-go="${target}"]`).click(); await page.waitForTimeout(250);
   assert.equal(await fits(page), true, `${target} has no horizontal overflow at ${width}px`);
  }
  await page.locator('.rail-item[data-go="deck"]').click(); await page.waitForTimeout(250);
  await page.screenshot({ path: `.qa/mobile-${width}.png`, fullPage: true });
  await page.locator('#deployMission').click(); await page.waitForTimeout(400);
  assert.equal(await page.locator('#board').isVisible(), true);
  assert.ok((await page.locator('#board').boundingBox()).width > width * .7, 'Board fills the phone width');
  await page.locator('#helmBriefing > summary').click();
  assert.equal(await fits(page), true, `mission with open briefing has no horizontal overflow at ${width}px`);
  await page.screenshot({ path: `.qa/world-${width}.png`, fullPage: true });
  assert.deepEqual(errors, []); await page.close(); console.log('PASS: ' + width + 'px layout, reduced motion, navigation and deployment');
 }
 const page = await browser.newPage();
 await page.addInitScript(() => { const old = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type, ...args) { return type === 'webgl' ? null : old.call(this, type, ...args); }; });
 await page.goto(url); await page.waitForTimeout(1500);
 assert.equal(await page.locator('#warTable').getAttribute('data-renderer'), 'fallback');
 assert.equal(await page.locator('#tablePins').evaluate(e => e.classList.contains('static')), true, 'Fallback shows the Blender planet renders');
 await page.locator('.pin[data-world="3"]').click();
 assert.equal(await page.locator('#sectorName').textContent(), 'Network Nexus');
 await page.locator('#deployMission').click();
 assert.equal(await page.locator('#board').isVisible(), true);
 console.log('PASS: no-WebGL fallback keeps world selection and deployment');
 await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
