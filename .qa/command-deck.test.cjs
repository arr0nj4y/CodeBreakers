const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const url = pathToFileURL(path.resolve('codebreakers_tripleA_cinematic_polish_v3.html')).href;
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const worlds = ['Logic Labyrinth', 'Firewall Fortress', 'Encryption Vault', 'Network Nexus', "NULL's Core"];
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const frame = page => page.locator('#warTable').evaluate(canvas => Number(canvas.dataset.frame));

async function checkWorlds(page, widths, fallback = false) {
  for (const width of widths) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
    await settle(page);
    for (let world = 0; world < worlds.length; world++) {
      await page.locator(`.pin[data-world="${world}"]`).click();
      await settle(page);
      assert.equal(await page.locator('#sectorName').textContent(), worlds[world]);
      assert.equal(await page.locator('.pin[aria-pressed="true"]').count(), 1);
      assert.equal(await page.locator('#sectorMissions .mrow').count(), 3);
      const layout = await page.locator('#helmDeck').evaluate(deck => {
        const table = deck.querySelector('.table-wrap').getBoundingClientRect();
        const sector = deck.querySelector('.sector').getBoundingClientRect();
        const motion = deck.querySelector('#tableMotion').getBoundingClientRect();
        return {
          fits: document.getElementById('menuScreen').scrollWidth <= document.getElementById('menuScreen').clientWidth,
          separated: sector.right <= table.left + 1 || table.bottom <= sector.top + 1,
          pins: [...deck.querySelectorAll('.pin')].map(pin => {
            const rect = pin.getBoundingClientRect();
            return {
              inside: rect.left >= table.left - 1 && rect.right <= table.right + 1 && rect.top >= table.top - 1 && rect.bottom <= table.bottom + 1,
              coversMotion: rect.left < motion.right && rect.right > motion.left && rect.top < motion.bottom && rect.bottom > motion.top
            };
          })
        };
      });
      assert.equal(layout.fits, true, `No page overflow at ${width}px`);
      assert.equal(layout.separated, true, 'The mission panel never covers the planet table');
      assert.ok(layout.pins.every(pin => pin.inside), `All five world labels fit at ${width}px, fallback=${fallback}: ${JSON.stringify(layout.pins)}`);
      assert.ok(layout.pins.every(pin => !pin.coversMotion), 'World controls do not cover the motion control');
    }
  }
}

(async () => {
  const browser = await chromium.launch({ executablePath, headless: true });
  const errors = [], failed = [], internet = [];
  const watch = page => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => failed.push(request.url()));
    page.on('request', request => { if (/^https?:/.test(request.url())) internet.push(request.url()); });
  };
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    watch(page);
    await page.goto(url);
    await page.locator('#warTable[data-renderer="webgl"]').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    const gpu = await page.locator('#warTable').evaluate(canvas => {
      const gl = canvas.getContext('webgl');
      const pixels = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let painted = 0;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) painted++;
      return { error: gl.getError(), painted };
    });
    assert.equal(gpu.error, 0, 'The 3D shaders and atmosphere pass render without WebGL errors');
    assert.ok(gpu.painted > 1000, 'The canvas contains rendered 3D content');
    await checkWorlds(page, [320, 390, 768, 1024, 1180, 1181, 1280, 1440, 1920]);

    await page.locator('.pin[data-world="0"]').click();
    await page.locator('#sectorMissions .mrow').first().click();
    await page.locator('#deployMission').click();
    assert.equal(await page.locator('#board .tile').count(), 49);
    await page.locator('#options button').first().click();
    await page.locator('#codeEditor').fill('moveRight();');
    await page.locator('#compileCode').click();
    assert.equal(await page.locator('#qlen').textContent(), '1');
    await page.locator('#learnStep').click();
    await page.waitForTimeout(400);
    assert.match(await page.locator('#moves').textContent(), /Steps: 1/);
    await page.locator('#toMenu').click();
    assert.equal(await page.locator('#deckXp').textContent(), '20');
    await page.reload();
    await page.locator('#warTable[data-renderer="webgl"]').waitFor();
    assert.equal(await page.locator('#deckXp').textContent(), '20', 'Existing progress survives a reload');

    const motion = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
    watch(motion);
    await motion.goto(url);
    await motion.locator('#warTable[data-renderer="webgl"]').waitFor();
    let before = await frame(motion);
    await motion.waitForFunction(previous => Number(document.getElementById('warTable').dataset.frame) > previous, before);
    await motion.locator('#tableMotion').click();
    assert.equal(await motion.locator('#tableMotion').getAttribute('aria-pressed'), 'true');
    await motion.waitForTimeout(1000);
    before = await frame(motion);
    await motion.waitForTimeout(200);
    assert.equal(await frame(motion), before, 'Pausing stops the shared 3D animation clock');
    await motion.locator('#tableMotion').click();
    await motion.waitForFunction(previous => Number(document.getElementById('warTable').dataset.frame) > previous, before);
    await motion.locator('.rail-item[data-go="arcade"]').click();
    await motion.waitForTimeout(150);
    before = await frame(motion);
    await motion.waitForTimeout(200);
    assert.equal(await frame(motion), before, 'Hidden tables stop rendering');
    await motion.locator('.rail-item[data-go="deck"]').click();
    await motion.waitForFunction(previous => Number(document.getElementById('warTable').dataset.frame) > previous, before);
    await motion.emulateMedia({ reducedMotion: 'reduce' });
    await motion.waitForTimeout(300);
    assert.equal(await motion.locator('#warTable').getAttribute('data-paused'), 'true');
    const canvas = await motion.locator('#warTable').boundingBox();
    const x = canvas.x + canvas.width * .5, y = canvas.y + canvas.height * .45;
    await motion.mouse.move(x, y); await motion.mouse.down();
    await motion.mouse.move(x + 140, y, { steps: 8 }); await motion.mouse.up();
    await settle(motion);
    assert.notEqual(await motion.locator('.pin[aria-pressed="true"]').getAttribute('data-world'), '0', 'Dragging the 3D table chooses another world');

    const lost = await motion.locator('#warTable').evaluate(canvas => {
      const extension = canvas.getContext('webgl').getExtension('WEBGL_lose_context');
      if (!extension) return false;
      extension.loseContext(); return true;
    });
    assert.equal(lost, true, 'The test browser can simulate a lost 3D context');
    await motion.locator('#warTable[data-renderer="fallback"]').waitFor({ state: 'attached' });
    assert.equal(await motion.locator('#warTable').isVisible(), false);
    await checkWorlds(motion, [320, 390, 1440], true);
    await motion.locator('.rail-item[data-go="teacher"]').click();
    await motion.locator('.rail-item[data-go="deck"]').click();
    assert.equal(await motion.locator('#warTable').getAttribute('data-renderer'), 'fallback', 'Returning to the deck keeps the working fallback');
    assert.deepEqual(errors, []);
    assert.deepEqual(failed, []);
    assert.deepEqual(internet, [], 'All assets remain local');
  } finally {
    await browser.close();
  }

  const fallbackBrowser = await chromium.launch({ executablePath, headless: true, args: ['--disable-webgl'] });
  try {
    const page = await fallbackBrowser.newPage({ viewport: { width: 1440, height: 1000 } });
    watch(page);
    await page.goto(url);
    await page.locator('#warTable[data-renderer="fallback"]').waitFor({ state: 'attached' });
    assert.equal(await page.locator('.table-pins.static').count(), 1);
    await checkWorlds(page, [320, 390, 1024, 1440], true);
    await page.locator('.pin[data-world="0"]').click();
    await page.locator('#deployMission').click();
    assert.equal(await page.locator('#board .tile').count(), 49, 'Missions remain playable without WebGL');
    assert.deepEqual(errors, []); assert.deepEqual(failed, []); assert.deepEqual(internet, []);
  } finally {
    await fallbackBrowser.close();
  }
  console.log('PASS: 3D shaders, all five worlds at nine screen sizes, separate mission panel, visible labels, deployment, saved progress, pause/resume, reduced motion, drag selection, stopped hidden rendering, context-loss recovery and no-WebGL fallback.');
})().catch(error => { console.error(error); process.exitCode = 1; });
