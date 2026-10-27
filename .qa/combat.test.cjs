const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const url = pathToFileURL(path.resolve('codebreakers_tripleA_cinematic_polish_v3.html')).href;
const correct = [0, 1, 1, 0, 1, 0];
const goCombat = page => page.locator('.rail-item[data-go="combat"]').click();
const complete = page => page.locator('#combatStage[data-phase="complete"]').waitFor();
const answer = async (page, index) => { await page.locator('#combatAnswers button').nth(index).click(); await complete(page); };
const next = page => page.locator('#combatNext').click();
const health = (page, id) => page.locator(id).textContent();
const wins = page => page.evaluate(() => JSON.parse(localStorage.getItem('cb-combat-stats') || '{"wins":0}').wins);

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const errors = [], failed = [], internet = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => failed.push(request.url()));
    page.on('request', request => { if (/^https?:/.test(request.url())) internet.push(request.url()); });
    await page.goto(url);
    await page.locator('.rail-item[data-go="combat"]').waitFor();
    await goCombat(page);

    assert.match(await health(page, '#combatPrompt'), /health is below 50/);
    assert.equal(await page.locator('#combatAnswers button').count(), 3, 'A challenge is available immediately');
    assert.equal(await page.locator('#healBtn').isDisabled(), true, 'Do not spend a charge at full health');
    await page.keyboard.press('1');
    assert.equal(await page.locator('#combatScene').evaluate(element => element.getAnimations({ subtree: true }).length), 0, 'Reduced-motion mode skips character movement');
    await complete(page);
    assert.equal(await page.locator('#combatResult').isVisible(), true);
    assert.equal(await page.locator('#combatResult').getAttribute('data-outcome'), 'correct');
    assert.equal(await health(page, '#playerHp'), '86 HP');
    assert.equal(await health(page, '#enemyHp'), '73 HP');
    assert.match(await health(page, '#combatCorrectAnswer'), /health < 50/);
    assert.equal(await page.locator('#combatAnswers button:disabled').count(), 3, 'A round can only resolve once');
    assert.equal(await page.locator('#combatScreen dialog').count(), 0, 'Feedback never covers the arena');
    assert.equal(await page.locator('#combatScene').isVisible(), true);
    const firstQuestion = await health(page, '#combatPrompt');
    await page.waitForTimeout(250);
    assert.equal(await health(page, '#combatPrompt'), firstQuestion, 'The question stays available for review');
    await next(page);
    assert.match(await health(page, '#combatPrompt'), /for\(let i/);
    assert.equal(await page.locator('#combatResult').isVisible(), false);
    await answer(page, 0);
    assert.equal(await page.locator('#combatResult').getAttribute('data-outcome'), 'incorrect');
    assert.equal(await health(page, '#combatCorrectAnswer'), '4');
    assert.match(await health(page, '#combatExplanation'), /0, 1, 2 and 3/);
    assert.equal(await health(page, '#enemyHp'), '73 HP', 'An incorrect answer deals no damage');
    assert.equal(await health(page, '#playerHp'), '69 HP');
    await page.locator('#combatAbort').click();
    assert.equal(await page.locator('#menuScreen').isVisible(), true);
    assert.equal(await page.locator('#combatResult').isVisible(), false);

    await goCombat(page);
    await page.locator('#defendBtn').click();
    assert.equal(await page.locator('#defendBtn').getAttribute('aria-pressed'), 'true');
    await answer(page, 0);
    assert.equal(await health(page, '#playerHp'), '96 HP', 'Defense reduces the counterattack');
    assert.equal(await health(page, '#enemyHp'), '100 HP');
    await next(page);
    await answer(page, 0); // Round 2, intentionally incorrect.
    await next(page);
    const pendingQuestion = await health(page, '#combatPrompt');
    assert.equal(await health(page, '#playerHp'), '79 HP');
    await page.locator('#healBtn').click();
    await complete(page);
    assert.equal(await page.locator('#combatResult').getAttribute('data-outcome'), 'repair');
    assert.equal(await health(page, '#playerHp'), '77 HP', 'Repair restores 15 before a 17-damage counterattack');
    await next(page);
    assert.equal(await health(page, '#combatPrompt'), pendingQuestion, 'Repair does not skip an unanswered question');
    assert.match(await health(page, '#healBtn'), /1 charge/);
    await page.locator('#healBtn').click();
    await next(page);
    assert.equal(await page.locator('#healBtn').isDisabled(), true, 'Repair charges are limited');
    await page.locator('#combatReset').click();

    for (let i = 0; i < 4; i++) {
      await answer(page, correct[i]);
      if (i < 3) await next(page);
    }
    assert.equal(await page.locator('#combatResult').getAttribute('data-outcome'), 'victory');
    assert.equal(await health(page, '#enemyHp'), '0 HP');
    assert.equal(await wins(page), 1, 'One completed battle saves one win');
    assert.equal(await health(page, '#combatNextLabel'), 'New battle');
    await next(page);
    assert.equal(await health(page, '#enemyHp'), '100 HP');
    assert.equal(await health(page, '#playerHp'), '100 HP');
    assert.equal(await wins(page), 1, 'Starting another battle does not award another win');

    for (let i = 0; i < 10; i++) {
      await answer(page, (correct[i % correct.length] + 1) % 3);
      if (await page.locator('#combatResult').getAttribute('data-outcome') === 'defeat') break;
      await next(page);
    }
    assert.equal(await page.locator('#combatResult').getAttribute('data-outcome'), 'defeat');
    assert.equal(await health(page, '#playerHp'), '0 HP');
    assert.equal(await wins(page), 1, 'Defeat does not award a win');
    await page.locator('#combatAbort').click();
    assert.equal(await page.locator('#menuScreen').isVisible(), true, 'The inline abort action returns to the deck');
    await page.reload();
    await page.locator('.rail-item[data-go="combat"]').waitFor();
    assert.equal(await wins(page), 1, 'Combat wins survive reload');
    assert.equal(await page.evaluate(() => CBRoster.report().combatWins), 1, 'Teacher reports retain combat wins');

    // Questions and the visible arena work on phones, tablets and desktops.
    for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      await goCombat(page);
      const layout = await page.evaluate(() => {
        const screen = document.getElementById('combatScreen'), question = document.getElementById('combatPrompt').getBoundingClientRect();
        return { width: innerWidth, screenWidth: screen.scrollWidth, top: question.top, bottom: question.bottom, height: innerHeight };
      });
      assert.ok(layout.screenWidth <= viewport.width, 'No horizontal overflow: ' + JSON.stringify(layout));
      assert.ok(layout.top >= 0 && layout.bottom <= layout.height - 64, 'The question is visible: ' + JSON.stringify(layout));
      await answer(page, 0);
      assert.equal(await page.locator('#combatScene').isVisible(), true, 'Fighters remain visible on every screen size');
      assert.equal(await page.locator('#combatResult').evaluate(element => getComputedStyle(element).position), 'static', 'Feedback stays in the page');
      assert.ok(await page.locator('#combatScreen').evaluate(element => element.scrollWidth <= innerWidth), 'Feedback does not overflow horizontally');
      await next(page);
      await answer(page, 0);
      assert.equal(await page.locator('#combatResult').getAttribute('data-outcome'), 'incorrect');
      await page.locator('#combatAbort').click();
    }

    // Existing campaign and report hooks still function after the combat controller changes.
    await page.locator('#deployMission').click();
    assert.equal(await page.locator('#board .tile').count(), 49);
    await page.locator('#options button').first().click();
    await page.locator('#codeEditor').fill('moveRight();');
    await page.locator('#compileCode').click();
    assert.equal(await health(page, '#qlen'), '1');
    await page.locator('#learnStep').click();
    await page.waitForTimeout(400);
    assert.match(await health(page, '#moves'), /Steps: 1/);
    assert.deepEqual(errors, [], 'No browser exceptions');
    assert.deepEqual(failed, [], 'No missing local files');
    assert.deepEqual(internet, [], 'Play remains offline');
    // Real motion: health changes on contact, both fighters move, and old
    // sequences cannot damage a restarted battle or keep playing offscreen.
    const motion = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
    motion.on('pageerror', error => errors.push(error.message));
    await motion.goto(url);
    await motion.locator('.rail-item[data-go="combat"]').waitFor();
    await goCombat(motion);
    const initialX = (await motion.locator('#playerFighter').boundingBox()).x;
    await motion.locator('#combatAnswers button').first().click();
    await motion.locator('#combatStage[data-phase="guardian-attack"]').waitFor();
    assert.equal(await health(motion, '#enemyHp'), '100 HP', 'Damage waits for the attack to make contact');
    assert.equal(await motion.locator('#combatResult').isVisible(), false, 'The animation is unobstructed');
    assert.equal(await motion.locator('#combatNext').isDisabled(), true, 'Next cannot skip a running attack');
    assert.ok(await motion.locator('#playerFighter').evaluate(element => element.getAnimations().length > 0), 'Guardian has a running animation');
    await motion.waitForTimeout(260);
    const attackingX = (await motion.locator('#playerFighter').boundingBox()).x;
    assert.ok(attackingX > initialX + 8, 'Guardian moves toward the Sentinel');
    await motion.waitForFunction(() => document.getElementById('enemyHp').textContent === '73 HP');
    assert.equal(await health(motion, '#playerHp'), '100 HP', 'Guardian impact precedes the counterattack');
    await motion.locator('#combatReset').click();
    await motion.waitForTimeout(1600);
    assert.equal(await health(motion, '#enemyHp'), '100 HP');
    assert.equal(await health(motion, '#playerHp'), '100 HP', 'Reset cancels pending damage');
    assert.equal(await motion.locator('#combatScene').getAttribute('aria-busy'), 'false');
    assert.equal(await motion.locator('#combatEffects').evaluate(element => element.childElementCount), 0, 'Effects are cleaned up');

    await motion.evaluate(() => {
      window.combatTestPhases = [];
      new MutationObserver(() => window.combatTestPhases.push(document.getElementById('combatStage').dataset.phase)).observe(document.getElementById('combatStage'), { attributes: true, attributeFilter: ['data-phase'] });
    });
    await answer(motion, 0);
    assert.ok(await motion.evaluate(() => combatTestPhases.includes('guardian-attack') && combatTestPhases.includes('sentinel-attack')), 'Both attack phases run');
    assert.equal(await health(motion, '#playerHp'), '86 HP');
    assert.equal(await health(motion, '#enemyHp'), '73 HP');
    await next(motion);
    await motion.evaluate(() => { combatTestPhases.length = 0; });
    await answer(motion, 0);
    assert.ok(await motion.evaluate(() => !combatTestPhases.includes('guardian-attack') && combatTestPhases.includes('sentinel-attack')), 'An incorrect answer triggers only a Sentinel strike');
    await next(motion);
    await motion.locator('#combatAnswers button').first().click();
    await motion.locator('#combatStage[data-phase="sentinel-attack"]').waitFor();
    await motion.locator('.rail-item[data-go="deck"]').click();
    const healthOnExit = await health(motion, '#playerHp');
    await motion.waitForTimeout(1200);
    assert.equal(await health(motion, '#playerHp'), healthOnExit, 'Leaving the arena cancels the old counterattack');
    await goCombat(motion);
    assert.equal(await health(motion, '#playerHp'), '100 HP');

    await motion.locator('#defendBtn').click();
    await answer(motion, 0);
    assert.equal(await health(motion, '#playerHp'), '96 HP', 'Animated shield blocks most of the strike');
    await next(motion);
    await answer(motion, 0);
    await next(motion);
    await motion.locator('#healBtn').click();
    await complete(motion);
    assert.equal(await motion.locator('#combatResult').getAttribute('data-outcome'), 'repair', 'Animated repair completes before feedback');

    await motion.evaluate(() => {
      const control = document.getElementById('reducedMotion');
      control.checked = true; control.dispatchEvent(new Event('change'));
    });
    await motion.locator('#combatReset').click();
    await motion.locator('#combatAnswers button').first().click();
    assert.equal(await motion.locator('#combatScene').evaluate(element => element.getAnimations({ subtree: true }).length), 0, 'The in-game reduced-motion setting also skips movement');
    await complete(motion);
    await motion.evaluate(() => {
      const control = document.getElementById('reducedMotion');
      control.checked = false; control.dispatchEvent(new Event('change'));
    });

    for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
      await motion.setViewportSize(viewport);
      await motion.locator('#combatReset').click();
      await motion.locator('#combatAnswers button').first().click();
      await motion.locator('#combatStage[data-phase="guardian-attack"]').waitFor();
      const scene = await motion.locator('#combatScene').boundingBox();
      assert.ok(scene.y >= 0 && scene.y + scene.height <= viewport.height - 64, 'The mobile camera keeps the fight visible: ' + JSON.stringify(scene));
      await complete(motion);
      await motion.locator('#combatAbort').click();
      await goCombat(motion);
    }
    await motion.close();
    assert.deepEqual(errors, [], 'No animation exceptions');
    console.log('PASS: visible questions, inline feedback, next/abort, keyboard controls, defense, repair limits, victory/defeat, saved wins, teacher reports, responsive layouts, campaign regression, impact timing, smooth motion, reduced-motion settings, mobile fight visibility and cancellation.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
