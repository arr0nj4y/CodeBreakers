// Taps the synth's output with an analyser and checks each mood is audible,
// not clipping, and different from the others.
const { chromium } = require('playwright');
const path = require('path');
const assert = require('node:assert/strict');
const url = 'file:///' + path.resolve('codebreakers_tripleA_cinematic_polish_v3.html').split(path.sep).join('/');
(async () => {
 const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
 const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
 await page.addInitScript(() => {
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (target, ...rest) {
   if (target instanceof AudioDestinationNode && !(this instanceof AnalyserNode)) {
    const an = this.context.createAnalyser(); an.fftSize = 2048; window.__tap = an;
    connect.call(this, an); return connect.call(an, target, ...rest);
   }
   return connect.call(this, target, ...rest);
  };
 });
 await page.goto(url); await page.waitForTimeout(1200);
 await page.mouse.click(700, 120);
 const measure = ms => page.evaluate(ms => new Promise(done => {
  const an = window.__tap, buf = new Float32Array(an.fftSize), spec = new Uint8Array(an.frequencyBinCount); let sum = 0, n = 0, peak = 0; const bands = [0, 0, 0];
  const t0 = performance.now();
  const tick = () => { an.getFloatTimeDomainData(buf); for (const v of buf) { sum += v * v; n++; peak = Math.max(peak, Math.abs(v)); } an.getByteFrequencyData(spec); bands[0] += spec.slice(1, 12).reduce((a, b) => a + b, 0); bands[1] += spec.slice(12, 120).reduce((a, b) => a + b, 0); bands[2] += spec.slice(120, 600).reduce((a, b) => a + b, 0); if (performance.now() - t0 < ms) setTimeout(tick, 40); else done({ rms: Math.sqrt(sum / n), peak, bands: bands.map(b => Math.round(b / 1000)) }); };
  tick();
 }), ms);
 const deck = await measure(6000);
 await page.locator('.rail-item[data-go="combat"]').click();
 await page.waitForTimeout(3500);
 const combat = await measure(6000);
 console.log('deck', deck, '\ncombat', combat, '\ntheme', await page.evaluate(() => HelmAudio.theme));
 assert.ok(deck.rms > 0.005, 'Deck music is audible');
 assert.ok(combat.rms > deck.rms, 'Combat mood is more intense than the deck');
 assert.ok(Math.max(deck.peak, combat.peak) < 1, 'No clipping');
 console.log('PASS: synthesized soundtrack audible in both moods without clipping.');
 await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
