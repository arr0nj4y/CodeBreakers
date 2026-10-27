// Player accounts, class codes, demo class and automatic roster updates:
// part A on one device (file://), part B across two "devices" through the class server.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('node:assert/strict');
const fileUrl = 'file:///' + path.resolve('codebreakers_tripleA_cinematic_polish_v3.html').split(path.sep).join('/');
const go = (page, target) => page.locator(`.rail-item[data-go="${target}"]`).click();

async function createPlayer(page, name, pin, code) {
 await page.locator('#accountStrip [data-act="new"]').click();
 await page.locator('#wizName').fill(name);
 await page.locator('.avatar-pick label').nth(2).click();
 await page.locator('#helmGate button[type="submit"]').click();
 await page.locator('#wizPin').fill(pin); await page.locator('#wizPin2').fill(pin);
 await page.locator('#helmGate button[type="submit"]').click();
 assert.match(await page.locator('#gateTitle').textContent(), /Join your class/, 'Sign-up ends with the class step');
 if (code) { await page.locator('#wizCode').fill(code); await page.locator('#helmGate button[type="submit"]').click(); }
 else await page.locator('#helmGate [data-act="skip"]').click();
}
async function earnCheckpointXp(page) {
 await go(page, 'deck'); await page.locator('#deployMission').click(); await page.waitForTimeout(300);
 await page.locator('#options button').first().click();
 await go(page, 'deck');
}

(async () => {
 const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
 // ---------------- Part A: one shared device
 {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  await page.goto(fileUrl); await page.waitForTimeout(1200);
  assert.match(await page.locator('#accountStrip').textContent(), /without a player profile/);
  await go(page, 'teacher');
  await page.locator('#classPanel [data-act="demo"]').click(); await page.waitForTimeout(400);
  assert.equal(await page.locator('#teacherRows tr .src-badge[data-src="demo"]').count(), 8, 'Demo class adds 8 labeled students');
  assert.equal(await page.locator('#teacherCount').textContent(), '8');
  await page.locator('#classPanel [data-act="new"]').click();
  await page.locator('#classTeacher').fill('Ms. Reyes'); await page.locator('#classNameInput').fill('ICT 11 - Rizal');
  await page.locator('.class-create button[type="submit"]').click();
  const code = (await page.locator('#classCode').textContent()).trim();
  assert.equal(await page.evaluate(c => CBAccounts.normalizeCode(c), code), code, 'Class code carries a valid checksum');
  await page.screenshot({ path: '.qa/shots/teacher-class.png', fullPage: true });

  await go(page, 'deck');
  await createPlayer(page, 'Ana Lopez', '2468', code.toLowerCase().replace('-', ' '));
  assert.match(await page.locator('#accountStrip').textContent(), /Ana Lopez.*ICT 11 - Rizal/, 'Student is linked to the class');
  assert.equal(await page.locator('#railPilot').textContent(), 'Ana Lopez');
  await earnCheckpointXp(page);
  await go(page, 'teacher'); await page.waitForTimeout(600);
  const anaRow = page.locator('#teacherRows tr', { hasText: 'Ana Lopez' });
  assert.equal(await anaRow.count(), 1, 'Linked student appears on the roster without importing');
  assert.match(await anaRow.textContent(), /This device/);
  assert.match(await anaRow.textContent(), /20/, 'Roster shows the earned XP');

  await page.locator('.rail-tool[data-tool="profile"]').click();
  await page.locator('#playerDialog [data-act="signout"]').click();
  assert.equal(await page.locator('#helmGate').isVisible(), true, 'Signing out shows the player picker');
  assert.equal(await page.locator('#helmGate .gate-player').count(), 9);
  await page.locator('#helmGate .gate-player', { hasText: 'Bea Ramirez' }).click();
  await page.locator('#gatePin').fill('1234');
  await Promise.all([page.waitForEvent('load'), page.locator('#helmGate button[type="submit"]').click()]);
  await page.waitForTimeout(1200);
  assert.equal(await page.locator('#deckXp').textContent(), '2280', 'Demo account loads its own progress');
  await page.locator('.rail-tool[data-tool="profile"]').click();
  await page.locator('#playerDialog [data-act="signout"]').click();
  await page.locator('#helmGate .gate-player', { hasText: 'Ana Lopez' }).click();
  await page.locator('#gatePin').fill('1111'); await page.locator('#helmGate button[type="submit"]').click();
  assert.match(await page.locator('#gateError').textContent(), /does not match/, 'Wrong PIN is refused');
  await page.locator('#gatePin').fill('2468');
  await Promise.all([page.waitForEvent('load'), page.locator('#helmGate button[type="submit"]').click()]);
  await page.waitForTimeout(1200);
  assert.equal(await page.locator('#deckXp').textContent(), '20', 'Switching back restores the right progress');
  await go(page, 'teacher'); await page.waitForTimeout(400);
  const demoCode = await page.evaluate(() => CBAccounts.makeCode('DEM2A'));
  await page.locator('#classSwitch').selectOption(demoCode); await page.waitForTimeout(300);
  await page.locator('#classPanel [data-act="remove-demo"]').click(); await page.waitForTimeout(400);
  assert.equal(await page.locator('#teacherRows tr .src-badge[data-src="demo"]').count(), 0, 'Demo class can be removed');
  assert.equal(await page.locator('#teacherRows tr', { hasText: 'Ana Lopez' }).count(), 1, 'Real students stay');
  assert.deepEqual(errors, []);
  await page.close();
  console.log('PASS: demo class, class code, sign-up with class step, same-device roster, sign out, PIN sign-in, progress swap, demo removal.');
 }
 // ---------------- Part B: two devices through the class server
 const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cb-class-'));
 const port = 3011, server = spawn(process.execPath, [path.join('.qa', 'serve.cjs'), String(port)], { env: { ...process.env, CB_DATA_DIR: dataDir }, stdio: 'pipe' });
 try {
  await new Promise((ok, fail) => { server.stdout.on('data', d => /running/.test(d) && ok()); server.on('exit', c => fail(new Error('server exited ' + c))); setTimeout(() => fail(new Error('server timeout')), 8000); });
  const teacher = await (await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })).newPage();
  const student = await (await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })).newPage();
  const errors = []; [teacher, student].forEach(p => p.on('pageerror', e => errors.push(e.message)));
  await teacher.goto(`http://localhost:${port}/`); await teacher.waitForTimeout(1000);
  await go(teacher, 'teacher'); await teacher.waitForTimeout(500);
  await teacher.locator('#classTeacher').fill('Mr. Dizon'); await teacher.locator('#classNameInput').fill('STEM 12 - Luna');
  await teacher.locator('.class-create button[type="submit"]').click(); await teacher.waitForTimeout(500);
  const code = (await teacher.locator('#classCode').textContent()).trim();
  assert.match(await teacher.locator('.class-live').textContent(), /Live updates are on/);

  await student.goto(`http://127.0.0.1:${port}/`); await student.waitForTimeout(1000);
  const unknown = await student.evaluate(() => CBAccounts.makeCode());
  await student.locator('#accountStrip [data-act="new"]').click();
  await student.locator('#wizName').fill('Rafael Tan');
  await student.locator('#helmGate button[type="submit"]').click();
  await student.locator('#wizPin').fill('1357'); await student.locator('#wizPin2').fill('1357');
  await student.locator('#helmGate button[type="submit"]').click();
  await student.locator('#wizCode').fill(unknown); await student.locator('#helmGate button[type="submit"]').click(); await student.waitForTimeout(300);
  assert.match(await student.locator('#wizError').textContent(), /No class with that code/, 'Unknown class codes are caught by the server');
  await student.locator('#wizCode').fill(code); await student.locator('#helmGate button[type="submit"]').click(); await student.waitForTimeout(400);
  assert.match(await student.locator('#accountStrip').textContent(), /STEM 12 - Luna/, 'Join step resolves the class name from the server');
  await earnCheckpointXp(student);
  await student.waitForTimeout(9000);
  await teacher.waitForTimeout(4500);
  const row = teacher.locator('#teacherRows tr', { hasText: 'Rafael Tan' });
  assert.equal(await row.count(), 1, 'Student on another device appears automatically');
  assert.match(await row.textContent(), /Live/);
  assert.match(await row.textContent(), /20/);
  await teacher.screenshot({ path: '.qa/shots/teacher-live.png', fullPage: true });
  await student.screenshot({ path: '.qa/shots/student-linked.png', fullPage: true });
  assert.ok(fs.readdirSync(dataDir).some(f => f.endsWith('.json')), 'Class data is stored on the class server');
  assert.deepEqual(errors, []);
  console.log('PASS: class server registration, server-checked class code, live roster update across devices.');
 } finally {
  server.kill();
  fs.rmSync(dataDir, { recursive: true, force: true });
  await browser.close();
 }
})().catch(e => { console.error(e); process.exit(1); });
