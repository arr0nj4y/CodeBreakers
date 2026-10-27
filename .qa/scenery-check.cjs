const { chromium } = require('playwright');
const path = require('path');
const assert = require('node:assert/strict');
const url = 'file:///' + path.resolve('codebreakers_tripleA_cinematic_polish_v3.html').split(path.sep).join('/');
(async () => {
 const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
 const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
 const errors = []; page.on('pageerror', e => errors.push(e.message));
 await page.goto(url); await page.waitForTimeout(1500);
 const area = { arcade: '--lilac', combat: '--coral', teacher: '--steel', deck: '--amber' };
 const mood = { arcade: 'deck', combat: 'combat', teacher: 'deck', deck: 'deck' };
 for (const [target, screen] of [['arcade', 'arcadeScreen'], ['combat', 'combatScreen'], ['teacher', 'teacherScreen'], ['deck', 'menuScreen']]) {
  await page.locator(`.rail-item[data-go="${target}"]`).click(); await page.waitForTimeout(300);
  assert.equal(await page.locator('#' + screen).isVisible(), true, target + ' opens');
  assert.equal(await page.locator(`.rail-item[data-go="${target}"]`).getAttribute('aria-current'), 'page');
  assert.match(await page.evaluate(() => document.documentElement.style.getPropertyValue('--area')), new RegExp(area[target]));
  assert.equal(await page.evaluate(() => window.HelmAudio.target), mood[target], target + ' music mood');
  await page.screenshot({ path: '.qa/scenery-' + screen + '.png' });
 }
 await page.locator('.rail-item[data-go="arcade"]').click();
 assert.equal(await page.locator('#arcadeCatalog .helm-mode-art').count(), 12, 'Every arcade mode carries its Blender model');
 await page.locator('#cbArcadeSearch').fill('cipher');
 assert.equal(await page.locator('#arcadeCatalog .arc-mode-card:visible').count(), 1, 'Search filter still hides cards');
 await page.locator('#cbArcadeSearch').fill('');
 await page.locator('#arcadeCatalog .arc-mode-card').first().click();
 assert.equal(await page.locator('#arcadeCatalog').isVisible(), false, 'Opening a mode replaces the catalog');
 await page.locator('.rail-item[data-go="combat"]').click();
 assert.equal(await page.locator('#playerFighter').evaluate(e => getComputedStyle(e).backgroundImage.startsWith('url("data:image/webp')), true, 'Combat uses the Blender fighters');
 assert.deepEqual(errors, []); console.log('PASS: rail navigation, area colours, music moods, arcade models, arcade filter, combat models.');
 await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
