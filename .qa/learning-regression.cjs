const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file:///C:/Users/Admin/Desktop/caja_game/codebreakers_tripleA_cinematic_polish_v3.html');
 await page.waitForTimeout(1500);
 for(const id of [1,3]){
  await page.evaluate(id=>{load(id);showScreen('game')},id);
  await page.locator('#learnWorked').click();await page.locator('#learnSpeed').selectOption('160');
  await page.locator('#compileRun').click();await page.waitForFunction(()=>complete);
  assert.match(await page.locator('#learnDebrief').textContent(),/With support/);
  await page.locator('#modalClose').click();
 }
 await page.evaluate(()=>load(3));await page.locator('#learnIndependent').click();
 await page.locator('#codeEditor').fill('if(pathClear("R")){moveRight(2);}else{moveDown();}\nmoveLeft(2);moveDown(6);if(pathClear("D")){moveUp();}else{moveRight(6);}');
 await page.locator('#compileRun').click();await page.waitForFunction(()=>complete);
 assert.match(await page.locator('#learnDebrief').textContent(),/With support/,'Other predicates cannot satisfy hasKey objective');
 await page.locator('#modalClose').click();await page.evaluate(()=>load(0));await page.locator('#learnIndependent').click();
 await page.locator('#codeEditor').pressSequentially('moveRight(6);\nmoveDown(6);');
 assert.equal(await page.evaluate(()=>queue.length),0,'Typing WASD letters does not enqueue movements');
 const source=await page.locator('#codeEditor').inputValue();
 await page.locator('#compileCode').click();await page.locator('#undo').click();
 await page.locator('#learnStep').click();assert.match(await page.locator('#learnTraceStatus').textContent(),/Line 1/);
 await page.locator('#reset').click();assert.equal(await page.locator('#codeEditor').inputValue(),source);
 await page.locator('#compileCode').click();await page.locator('#learnSpeed').selectOption('800');await page.locator('#run').click();
 await page.locator('#learnPause').click();await page.waitForFunction(()=>!busy);assert.ok(await page.evaluate(()=>queue.length>0));
 await page.locator('#learnHintDrawer').evaluate(e=>e.open=true);await page.locator('#learnHint').click();
 await page.locator('#learnSpeed').selectOption('160');await page.locator('#learnReplay').click();await page.waitForFunction(()=>complete);
 assert.match(await page.locator('#learnDebrief').textContent(),/With support/,'Replay retains help used after compilation');
 await page.locator('#modalClose').click();
 await page.evaluate(()=>{load(L.findIndex(m=>m.name==='Hazard Grid'));showScreen('game')});
 await page.locator('#codeEditor').fill('moveRight(2);moveDown();');await page.locator('#compileRun').click();
 await page.waitForFunction(()=>!busy);assert.equal(await page.locator('#codeEditor').inputValue(),'moveRight(2);moveDown();');
 assert.equal(await page.evaluate(()=>steps),0);
 await page.locator('#learnFocus').click();await page.locator('#learnTextSize').selectOption('1.3');
 assert.equal(await page.locator('#learnFocus').getAttribute('aria-pressed'),'true');
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Game has no mobile horizontal overflow');
 await page.screenshot({path:'.qa/learning-mobile.png',fullPage:true});
 await page.locator('#toMenu').click();await page.locator('.rail-item[data-go="teacher"]').click();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Teacher page has no mobile horizontal overflow');
 await page.screenshot({path:'.qa/learning-teacher-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: loop/condition examples, concept evidence, typing, undo trace, reset, pause, supported replay, hazard recovery, focus/text and mobile teacher layout.');
})().catch(e=>{console.error(e);process.exit(1)});

