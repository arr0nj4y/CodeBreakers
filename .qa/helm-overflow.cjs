// Lists elements wider than the viewport on each screen at phone width.
const { chromium } = require('playwright');
const path = require('path');
const url = 'file:///' + path.resolve('codebreakers_tripleA_cinematic_polish_v3.html').split(path.sep).join('/');
(async () => {
 const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
 const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
 await page.goto(url);
 await page.waitForTimeout(1500);
 const report = async label => console.log(label, await page.evaluate(() => {
  const vw = innerWidth, out = [];
  for (const e of document.querySelectorAll('body *')) {
   const r = e.getBoundingClientRect();
   if (r.width && r.right > vw + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('[hidden]')) out.push((e.id ? '#' + e.id : '') + '.' + [...e.classList].join('.') + ' ' + e.tagName + ' r=' + Math.round(r.right) + ' w=' + Math.round(r.width));
  }
  const scr=[...document.querySelectorAll('.screen')].find(x=>!x.hidden);return {doc:document.documentElement.scrollWidth,screen:scr?scr.scrollWidth:null,vw,first:out.slice(0,3)};
 }));
 for (const target of ['deck', 'arcade', 'combat', 'teacher']) {
  await page.locator(`.rail-item[data-go="${target}"]`).click(); await page.waitForTimeout(300);
  await report(target);
 }
 await page.locator('.rail-item[data-go="deck"]').click(); await page.waitForTimeout(300);
 await page.locator('#deployMission').click(); await page.waitForTimeout(400);
 await report('mission');
 await browser.close();
})();
