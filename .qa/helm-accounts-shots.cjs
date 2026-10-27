// Captures the account screens and the arcade briefing at desktop and phone widths.
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || '.qa/shots';
const url = 'file:///' + path.resolve('codebreakers_tripleA_cinematic_polish_v3.html').split(path.sep).join('/');
(async () => {
 const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
 for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(url); await page.waitForTimeout(1200);
  await page.locator(`.rail-item[data-go="teacher"]`).click();
  await page.locator('#classPanel [data-act="demo"]').click(); await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/${name}-teacher-demo.png`, fullPage: true });
  await page.locator(`.rail-item[data-go="deck"]`).click(); await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/${name}-deck-strip.png` });
  await page.locator('#accountStrip [data-act="new"]').click(); await page.waitForTimeout(200);
  await page.screenshot({ path: `${out}/${name}-gate-step1.png` });
  await page.locator('#wizName').fill('Ana Lopez'); await page.locator('#helmGate button[type="submit"]').click();
  await page.locator('#wizPin').fill('2468'); await page.locator('#wizPin2').fill('2468'); await page.locator('#helmGate button[type="submit"]').click();
  await page.screenshot({ path: `${out}/${name}-gate-step3.png` });
  await page.locator('#wizCode').fill(await page.evaluate(() => CBAccounts.makeCode('DEM2A'))); await page.locator('#helmGate button[type="submit"]').click(); await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${name}-deck-linked.png` });
  await page.locator('.rail-tool[data-tool="profile"]').click({ force: true }).catch(async () => { await page.locator('.rail-more-btn').click(); await page.locator('.rail-tool[data-tool="profile"]').click(); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${out}/${name}-player-dialog.png` });
  await page.locator('#playerDialog [data-act="signout"]').click(); await page.waitForTimeout(200);
  await page.screenshot({ path: `${out}/${name}-gate-players.png` });
  await page.locator('#helmGate [data-act="guest"]').click(); await page.waitForEvent('load').catch(() => { }); await page.waitForTimeout(1200);
  await page.locator(`.rail-item[data-go="arcade"]`).click(); await page.waitForTimeout(300);
  await page.locator('#arcadeCatalog .arc-mode-card').nth(1).click(); await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${name}-arcade-brief.png`, fullPage: true });
  console.log(name, 'errors:', JSON.stringify(errors));
  await page.close();
 }
 await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
