/* Learning layer uses the existing campaign engine; all data stays local. */
(()=>{'use strict';
 const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
 ready(()=>{
  if(window.CBLearning)return;
  const E=window.CBEvidence,language=window.CBLanguage,$=id=>document.getElementById(id);
  const KEY='cb-learning-evidence-v1';let evidence;
  try{evidence=E.clean(JSON.parse(localStorage.getItem(KEY)));}catch(_){evidence=E.clean(null);}
  const profiles={
   0:{skill:'Sequencing',objective:'Program an ordered route to the core, then explain why the order matters.',example:'// First cross the top row; then descend.\nmoveRight(6);\nmoveDown(6);',scaffold:'// Complete the missing distance.\nmoveRight(6);\nmoveDown(?);',hints:['A sequence runs from top to bottom. Identify your start and the core before choosing directions.','Count the columns and rows between your start and the core. One move changes one coordinate.','On the standard layout: cross the top row with six RIGHT moves, then use six DOWN moves.'],follow:'Ask the learner to predict a two-command route, then explain the order before executing.'},
   1:{skill:'Loops',objective:'Use a repeating block to traverse the corridor. Observe its iteration counter.',example:'// Each block repeats one movement six times.\nrepeat(6) {\n  moveRight();\n}\nrepeat(6) {\n  moveDown();\n}',scaffold:'// Replace ? with the number of steps on each clear edge.\nrepeat(?) { moveRight(); }\nrepeat(?) { moveDown(); }',hints:['A loop repeats its body. Count repetitions separately from the number of instructions inside it.','The top row and right edge form a clear route. Watch when the agent reaches an edge.','On the standard layout, repeat moveRight() six times, then repeat moveDown() six times.'],follow:'Trace a three-iteration loop together, then ask the learner to change the distance without duplicating commands.'},
   3:{skill:'Conditions',objective:'Use hasKey() before and after collecting the key. Execute both a false and a true decision.',example:'// No key yet: take the else route to collect it.\nif (hasKey()) { moveDown(); } else { moveRight(2); }\n// Return to the clear left edge, then descend.\nmoveLeft(2);\nmoveDown(6);\n// Now the condition is true: cross the key door.\nif (hasKey()) { moveRight(6); } else { moveUp(); }',scaffold:'// Complete the key route, then the door route.\nif (hasKey()) { moveDown(); } else { moveRight(?); }\nmoveLeft(2);\nmoveDown(6);\nif (hasKey()) { moveRight(?); } else { moveUp(); }',hints:['A condition chooses an action from the current state. hasKey() changes after collecting the key.','Test hasKey() before collecting the key, then again when approaching the door. Watch FALSE change to TRUE.','On the standard layout, collect the key two cells right, return two cells left, descend six cells, then move right six cells through the door. Put the key-dependent moves inside if/else.'],follow:'Have the learner explain which branch runs with and without a key, then test both states.'}
  };
  const bases=L.map(m=>({map:m.map.slice(),objective:m.objective,hint:m.hint,topic:m.topic}));
  let variant='base',variantMission=-1,variantPreparing=false,freshAttempt=false,attempt=null,metadata=[],program=null,paused=false,replay=null,prediction=null,runNumber=0;
  const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;};
  const button=(label,id,fn)=>{const b=node('button','',label);if(id)b.id=id;b.type='button';b.onclick=fn;return b;};
  const profile=()=>profiles[idx]||{skill:L[idx].topic,objective:L[idx].objective,hints:['Identify the objective and required items. Predict the effect of one command before running a longer program.','Inspect the board for keys, switches, gates and hazards. Use Step to find the first unexpected change.',L[idx].hint],follow:'Review the first unexpected step together, then assign a related mission without hints.'};
  const saveEvidence=()=>{try{localStorage.setItem(KEY,JSON.stringify(evidence));}catch(_){}renderPath();renderTeacherEvidence();};
  const current=()=>E.entry(evidence,idx);
  const note=(text,error=false)=>{$('codeFeedback').textContent=text;$('codeFeedback').classList.toggle('error',error);};
  function flagHelp(level,kind){if(!attempt)return;attempt.assistance=Math.max(attempt.assistance,level);if(replay)replay.assistance=Math.max(replay.assistance,level);if(kind==='hint')current().hints++;if(kind==='example')current().examples++;saveEvidence();renderSupport();}
  function renderSupport(){if($('learnSupport'))$('learnSupport').textContent=(variant==='base'?'Standard mission':variant==='transfer'?'Transfer layout':'Later review layout')+' · '+(attempt?.assistance?'Support used this attempt':'No in-game support used');}
  function recordError(type){current().errors[type]++;saveEvidence();}
  function restoreVariants(){if(variantMission>=0){Object.assign(L[variantMission],bases[variantMission]);variantMission=-1;}variant='base';}
  function configureMission(initial=false){
   metadata=[];program=null;prediction=null;paused=false;replay=null;runNumber++;attempt={assistance:0,usedCode:false,executedLoops:false,trueBranch:false,falseBranch:false,conditional:false,recorded:false,started:false,hintLevel:0};
   $('hints').checked=false;$('hints').dispatchEvent(new Event('change'));
   $('codeEditor').value='';$('learnTraceLines').replaceChildren();$('learnTraceStatus').textContent='Compile a program to inspect its source, then Step or Run.';
   $('learnHintText').textContent='Hints are optional. Each click offers a little more support; using them never removes XP.';
   $('learnHint').disabled=false;$('learnHint').textContent='Hint 1 / 3';$('learnPredictionFeedback').textContent='Predict the final column and row before you run.';
   $('learnGoal').textContent=profile().objective;$('learnSkill').textContent=profile().skill;
   $('learnWorked').hidden=$('learnScaffold').hidden=!profiles[idx]||variant!=='base';
   $('learnTransfer').hidden=$('learnReview').hidden=!profiles[idx];
   $('learnTransfer').disabled=busy;const m=evidence.missions[idx];$('learnReview').disabled=!(m?.lastTransferAt&&Date.now()-m.lastTransferAt>=E.REVIEW_DELAY);
   $('learnReview').title=$('learnReview').disabled?'Available 24 hours after an independent transfer completion.':'Try a different layout after a break.';
   $('learnPause').disabled=true;$('learnReplay').disabled=true;$('learnPause').textContent='Pause';
   if(profiles[idx]){
    unlocked=true;finishedQuestion=false;$('checkpointOverlay').hidden=true;
    $('checkpointStatus').textContent='OPTIONAL KNOWLEDGE CHECK — practice the concept on the board.';
    $('objective').textContent='🎯 '+profile().objective+(variant==='base'?'':' This is a new layout: inspect the start and core.');
    message('Plan a route, predict the result, then compile and step through your code.');draw();
   }
   if(idx===0&&variant==='base'&&!evidence.missions[0]?.completed){
    $('codeEditor').value='// First exercise: one move to the right.\nmoveRight();';attempt.assistance=2;
    $('learnTraceStatus').textContent='First exercise: predict column 2, row 1. Compile, then press Step. Next, try the scaffold or an independent route.';
   }
   $('learnDebrief')?.remove();renderSupport();renderPath();if(!initial)note('New attempt ready. Choose an example, a scaffold, or write your own program.');
  }
  function start(id){if(busy)return;restoreVariants();freshAttempt=true;load(id);showScreen('game');$('checkpointOverlay').hidden=true;$('codeEditor').focus();}
  function example(scaffold=false){if(busy)return;restoreVariants();freshAttempt=true;load(idx);$('codeEditor').value=scaffold?profile().scaffold:profile().example;flagHelp(scaffold?2:3,'example');note(scaffold?'Replace each ? with a count. The compiler will help locate incomplete instructions.':'Read the example, predict its result, then Step through it. This attempt is recorded as supported practice.');}
  function independent(){if(busy)return;freshAttempt=true;load(idx);$('codeEditor').value='';attempt.assistance=0;renderSupport();note('Independent attempt: write your own route. Hints remain available whenever you need them.');}
  function newVariant(kind){if(busy||!profiles[idx])return;const id=idx,m=evidence.missions[id];if(kind==='retention'&&!(m?.lastTransferAt&&Date.now()-m.lastTransferAt>=E.REVIEW_DELAY))return;restoreVariants();variant=kind;variantMission=id;const original=bases[id].map;L[id].map=kind==='transfer'?original.map(row=>[...row].reverse().join('')):original.slice().reverse();L[id].hint='This layout is reflected. Find the start and core, then trace the required items before choosing directions.';variantPreparing=true;load(id);variantPreparing=false;$('codeEditor').value='';attempt.assistance=0;renderSupport();note('New layout. Apply the same concept to a different route; examples are hidden, but hints are still available.');}
  // Home learning path; all existing campaign and teacher controls remain available.
  const path=node('section','learn-path');path.id='learningPath';path.setAttribute('aria-label','Guided learning path');path.append(node('div','eyebrow','RECOMMENDED LEARNING PATH'),node('h2','','Learn → practice → transfer'));
  const pathRows=node('div','learn-path-cards');for(const id of [0,1,3]){const b=button('',null,()=>start(id));b.dataset.learnMission=String(id);b.append(node('strong','',profiles[id].skill),node('span','learn-path-evidence','Not yet observed'));pathRows.append(b);}path.append(pathRows,node('p','muted','Start with a demonstration, finish an independent route, then test a new layout. The full campaign, arcade and teacher dashboard remain available.'));
  document.querySelector('.stellar-home-content').prepend(path);
  function renderPath(){document.querySelectorAll('[data-learn-mission]').forEach(b=>{const id=Number(b.dataset.learnMission);b.querySelector('.learn-path-evidence').textContent=E.level(evidence.missions[id]);});}
  const learning=node('section','learning-workbench');learning.id='learningWorkbench';learning.setAttribute('aria-label','Learning support and execution trace');
  learning.innerHTML='<div class="eyebrow">MISSION LEARNING OBJECTIVE</div><h3 id="learnSkill"></h3><p id="learnGoal"></p><p id="learnSupport" class="muted"></p><div id="learnStages" class="learn-buttons"></div><details id="learnHintDrawer"><summary>Need a nudge? Progressive hints</summary><p id="learnHintText"></p><div id="learnHintActions"></div></details><details id="learnPrediction"><summary>Predict before running</summary><div class="learn-prediction"><label>Final column <input id="learnPredictX" type="number" min="1" max="7" value="2"></label><label>Final row <input id="learnPredictY" type="number" min="1" max="7" value="1"></label><button id="learnLockPrediction" type="button">Lock prediction</button></div><p id="learnPredictionFeedback" role="status"></p></details><div class="learn-buttons" id="learnTransfers"></div>';
  $('codingLab').before(learning);
  $('learnStages').append(button('1 · Worked example','learnWorked',()=>example(false)),button('2 · Complete a scaffold','learnScaffold',()=>example(true)),button('3 · Try independently','learnIndependent',independent));
  $('learnHintActions').append(button('Hint 1 / 3','learnHint',()=>{const level=Math.min(3,++attempt.hintLevel);flagHelp(level,'hint');$('learnHintText').textContent='Hint '+level+': '+(variant==='base'?profile().hints[level-1]:['The mission keeps the same concept but its layout is reflected. Locate the start and core.','Count the distance along clear edges. Track the key or other required objects before the core.',L[idx].hint][level-1]);$('learnHint').textContent=level===3?'All hints shown':'Hint '+(level+1)+' / 3';$('learnHint').disabled=level===3;}));
  $('learnTransfers').append(button('Try a new layout','learnTransfer',()=>newVariant('transfer')),button('Later retention check','learnReview',()=>newVariant('retention')));
  $('learnLockPrediction').onclick=()=>{if(busy){$('learnPredictionFeedback').textContent='Pause execution before recording a prediction.';return;}const px=Number($('learnPredictX').value),py=Number($('learnPredictY').value);if(![px,py].every(v=>Number.isInteger(v)&&v>=1&&v<=7)){$('learnPredictionFeedback').textContent='Choose whole-number coordinates from 1 to 7.';return;}prediction={x:px-1,y:py-1};current().predictions++;saveEvidence();$('learnPredictionFeedback').textContent='Prediction locked: column '+px+', row '+py+'. Run your program to compare.';};
  const trace=node('section','learn-trace');trace.id='learnTrace';trace.innerHTML='<div class="eyebrow">EXECUTION TRACE</div><p id="learnTraceStatus" role="status" aria-live="polite"></p><div id="learnPlayback" class="learn-buttons"></div><label class="learn-speed">Step interval <select id="learnSpeed"><option value="160">Fast · 0.16 s</option><option value="360" selected>Normal · 0.36 s</option><option value="800">Slow · 0.8 s</option></select></label><ol id="learnTraceLines" aria-label="Compiled source with active line"></ol>';
  $('codeEditor').insertAdjacentElement('afterend',trace);
  $('learnPlayback').append(button('Pause','learnPause',()=>{paused=true;$('learnPause').textContent='Pausing…';}),button('Step','learnStep',()=>run(true)),button('Replay from start','learnReplay',()=>{if(busy||!replay)return;const r={...replay};load(idx);$('codeEditor').value=r.source;attempt.assistance=r.assistance;renderSupport();if(compileProgram())run();}));
  const controls=node('div','learn-accessibility');controls.append(button('Focus mode: off','learnFocus',()=>{const on=document.body.classList.toggle('learn-focus');$('learnFocus').setAttribute('aria-pressed',String(on));$('learnFocus').textContent='Focus mode: '+(on?'on':'off');try{localStorage.setItem('cb-learning-focus',String(on));}catch(_){}}));
  $('learnFocus')?.setAttribute('aria-pressed','false');
  const sizeLabel=node('label','','Text size '),size=node('select');size.id='learnTextSize';size.setAttribute('aria-label','Learning text size');for(const [v,t]of [['1','Standard'],['1.15','Large'],['1.3','Extra large']]){const option=node('option','',t);option.value=v;size.append(option);}size.onchange=()=>{document.body.style.setProperty('--learn-scale',size.value);try{localStorage.setItem('cb-learning-text-size',size.value);}catch(_){}};sizeLabel.append(size);controls.append(sizeLabel);document.querySelector('.game-navigation').append(controls);
  try{if(localStorage.getItem('cb-learning-focus')==='true'){$('learnFocus').click();}const v=localStorage.getItem('cb-learning-text-size');if(['1','1.15','1.3'].includes(v)){size.value=v;size.onchange();}}catch(_){}
  $('learnFocus').setAttribute('aria-pressed',String(document.body.classList.contains('learn-focus')));
  function sourceLines(source){$('learnTraceLines').replaceChildren();source.split('\n').forEach((line,i)=>{const li=node('li');li.dataset.line=String(i+1);li.append(node('code','',line||' '));$('learnTraceLines').append(li);});}
  function showTrace(info){document.querySelectorAll('#learnTraceLines li').forEach(el=>{const active=Number(el.dataset.line)===info?.line;el.classList.toggle('executing',active);if(active)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});if(!info){$('learnTraceStatus').textContent='Manual movement · '+steps+' steps completed. Compile code to see source lines.';return;}
   const loops=info.loops.map(l=>'loop line '+l.line+': iteration '+l.iteration+' / '+l.count).join('; '),conditions=info.conditions.map(c=>c.label+' → '+(c.result?'TRUE':'FALSE')).join('; ');
   $('learnTraceStatus').textContent='Line '+info.line+' · '+({R:'RIGHT',L:'LEFT',D:'DOWN',U:'UP'}[info.direction])+(loops?' · '+loops:'')+(conditions?' · '+conditions:'');
  }
  function compileProgram(){if(busy||complete){note('Pause or reset the current attempt before compiling.',true);return false;}try{
   const result=language.compile($('codeEditor').value,L[idx].map,{x,y,key,switchOn,fragments,unlocked,visited:[...visited]});
   if([10,11,14].includes(idx)&&(!result.features.condition||!result.features.otherwise))throw Error('This mission requires if/else decisions.');
   if([12,13,14].includes(idx)&&!result.features.loop)throw Error('This mission requires a repeat or for loop.');
   if(!result.moves.length)throw Error('No movements execute. Check your counts and condition results.');
   queue=result.moves.slice();metadata=result.trace.slice();program=result;codeQualified=true;paused=false;updateQueue();sourceLines(result.source);
   $('learnTraceStatus').textContent=result.moves.length+' movements ready. Step follows the highlighted source line.';
   if(result.decisions.length)$('learnTraceStatus').textContent+=' '+result.decisions.map(c=>c.label+': '+(c.result?'TRUE':'FALSE')).slice(0,4).join(' · ');
   if(steps===0){replay={source:result.source,assistance:attempt.assistance};$('learnReplay').disabled=false;}
   note('Compiled '+result.moves.length+' movements. This replaces the previous queue.');return true;
  }catch(error){recordError('syntax');note(error.message+' Check the indicated line, fix one issue, and compile again.',true);$('learnTraceStatus').textContent='Compilation stopped. The existing queue has not changed.';return false;}}
  $('compileCode').onclick=compileProgram;$('compileRun').onclick=()=>{if(compileProgram())run();};
  const originalLoad=load,originalWin=win,originalCheckpoint=openCheckpoint,originalAnswer=answer,originalUpdateQueue=updateQueue;
  updateQueue=function(active=-1){if(metadata.length>queue.length)metadata.length=queue.length;while(metadata.length<queue.length)metadata.push(null);originalUpdateQueue(active);};
  load=function(i){const preserve=i===idx&&!freshAttempt&&!variantPreparing,previous=preserve?{source:$('codeEditor').value,assistance:attempt?.assistance||0,replay}:null;freshAttempt=false;if(!variantPreparing&&variantMission>=0&&i!==variantMission)restoreVariants();originalLoad(i);configureMission();if(previous){$('codeEditor').value=previous.source;attempt.assistance=previous.assistance;replay=previous.replay;$('learnReplay').disabled=!replay;renderSupport();note('Board reset. Your program is preserved; edit it, then compile again.');}};
  openCheckpoint=function(){if(profiles[idx]){unlocked=true;$('checkpointOverlay').hidden=true;return;}originalCheckpoint();};
  answer=function(n){if(!finishedQuestion&&!busy&&n!==L[idx].correct)recordError('checkpoint');const wasUnlocked=unlocked;originalAnswer(n);if(!wasUnlocked&&unlocked&&program){queue=[];metadata=[];updateQueue();note('Access state changed. Compile again so conditions use the unlocked gate.');}};
  function conceptMet(){if(idx===1||[12,13].includes(idx))return attempt.executedLoops;if(idx===3)return attempt.trueBranch&&attempt.falseBranch;if([10,11].includes(idx))return attempt.conditional;if(idx===14)return attempt.executedLoops&&attempt.conditional;return attempt.usedCode;}
  win=function(){
   if(!attempt.recorded){attempt.recorded=true;const result=E.record(evidence,idx,{assistance:attempt.assistance,usedCode:attempt.usedCode&&!attempt.manualUsed,concept:conceptMet(),variant});saveEvidence();originalWin();
    const panel=node('section','learn-debrief');panel.id='learnDebrief';panel.append(node('h3','','Learning evidence: '+result));
    panel.append(node('p','',conceptMet()?'You executed the target concept. Try a new layout to check whether the idea transfers.':'Route completed. For independent concept evidence, execute the target control structure: '+(idx===3?'test hasKey() before and after collecting the key.':idx===1?'use a repeating loop.':'use the required code in a running program.')));
    panel.append(node('p','muted','Attempts and hints are part of learning. No learning-evidence points are deducted for experimentation.'));
    const label=node('label','','What changed in your understanding? (optional)'),reflection=node('textarea');reflection.id='learnReflection';reflection.maxLength=280;reflection.rows=2;label.htmlFor=reflection.id;label.append(reflection);panel.append(label,button('Save reflection',null,()=>{current().reflection=reflection.value.trim().slice(0,280);saveEvidence();reflection.setAttribute('aria-label','Reflection saved');panel.querySelector('button').textContent='Reflection saved';}));
    $('modalBody').insertAdjacentElement('afterend',panel);
   }else originalWin();
  };
  run=async function(single=false){
   if(busy||complete)return;if(idx>=10&&!codeQualified){note('Compile a program with the required control structures before running.',true);return;}
   if(!queue.length){note('Compile your program or add a movement first.',true);return;}
   if(!attempt.started){attempt.started=true;current().attempts++;current().lastPracticed=Date.now();saveEvidence();}
   busy=true;paused=false;levels();$('learnPause').disabled=false;$('learnPause').textContent='Pause';const turn=serial,number=++runNumber;let remaining=single?1:queue.length,failed=false;
   while(remaining-->0&&queue.length&&serial===turn&&!complete&&!paused){
    const direction=queue.shift(),info=metadata.shift();updateQueue();showTrace(info);
    if(info){attempt.usedCode=true;if(info.loops.some(l=>l.count>1))attempt.executedLoops=true;for(const c of info.conditions){attempt.conditional=true;if(c.name==='hasKey'){if(c.stateResult)attempt.trueBranch=true;else attempt.falseBranch=true;}}}else attempt.manualUsed=true;
    const before=[x,y],cell=tile(x+vec[direction][0],y+vec[direction][1]);
    if(cell==='!')recordError('hazard');
    const result=await move(direction);
    if(serial!==turn)break;
    if(result===false||result==='reset'){
     failed=true;if(result===false)recordError('collision');
     const prefix=info?'Line '+info.line+(info.loops.length?', iteration '+info.loops.at(-1).iteration:''):'Movement';
     $('learnTraceStatus').textContent=prefix+' stopped at column '+(before[0]+1)+', row '+(before[1]+1)+'. '+$('status').textContent+' Try one step after correcting the route.';
     break;
    }
    if(result==='win')break;
    if(!single&&queue.length)await sleep(Number($('learnSpeed').value)||360);
   }
   if(serial===turn&&number===runNumber){busy=false;levels();$('learnPause').disabled=true;$('learnPause').textContent='Pause';
    if(paused){note('Paused. Use Step for one movement, or Run program to resume.');}
    else if(!queue.length&&!failed){
     if(prediction){const correct=x===prediction.x&&y===prediction.y;if(correct)current().predictionsCorrect++;$('learnPredictionFeedback').textContent=(correct?'Prediction matched. ':'Prediction differed. ')+'Actual endpoint: column '+(x+1)+', row '+(y+1)+'. '+(correct?'Explain which commands led here.':'Use the trace to find the first difference.');prediction=null;saveEvidence();}
     if(!complete)note('Program finished at column '+(x+1)+', row '+(y+1)+'. Inspect the trace, then plan your next commands.');
    }
   }
  };
  // Keep metadata aligned with the existing manual queue controls.
  document.querySelectorAll('[data-cmd]').forEach(b=>b.addEventListener('click',()=>{if(!busy){metadata=[];program=null;attempt.usedCode=false;}}));
  $('clear').addEventListener('click',()=>{if(!busy)metadata=[];});$('addloop').addEventListener('click',()=>{if(!busy)metadata=[];});
  for(const id of ['presetBasics','presetLoop','presetCondition','presetChallenge'])$(id)?.addEventListener('click',()=>{flagHelp(3,'example');if(!busy){queue=[];metadata=[];updateQueue();note('Example loaded. Compile again to build its execution trace.');}});
  $('hints').addEventListener('change',()=>{if($('hints').checked)flagHelp(3,'hint');});
  $('codeEditor').addEventListener('input',()=>{if(!busy){queue=[];metadata=[];updateQueue();$('learnTraceStatus').textContent='Source changed. Compile again to build a fresh trace.';}else note('Execution follows the compiled snapshot. Pause, then compile edits before running again.');});
  // Teacher evidence is added to, not substituted for, the existing roster.
  const teacher=node('section','teacher-panel learning-teacher');teacher.id='learningTeacher';teacher.setAttribute('aria-label','Learning evidence and suggested follow-up');
  document.querySelector('#teacherScreen .screen-wrap').append(teacher);
  function renderTeacherEvidence(){const host=$('learningTeacher');if(!host)return;host.replaceChildren();host.append(node('div','eyebrow','LEARNING EVIDENCE'),node('h2','','Skills and next teaching steps'),node('p','muted','Completion and XP remain in the existing dashboard. The evidence below records in-game assistance and observed practice, not verified ability or a formal grade. Older reports have no learning evidence.'));
   let roster=[];try{const saved=JSON.parse(localStorage.getItem('cb-teacher-imports-v1'));if(Array.isArray(saved))roster=saved.slice(0,500);}catch(_){}
   const records=[{student:'This browser · current learner',learning:evidence},...roster.map(r=>({student:typeof r.student==='string'?r.student.slice(0,50):'Learner',learning:E.clean(r.learning)}))];
   const table=node('table','learning-table'),head=node('thead'),heading=node('tr');for(const label of ['Learner / skill','Evidence','Support & practice','Common errors','Suggested follow-up'])heading.append(node('th','',label));head.append(heading);table.append(head);const body=node('tbody');
   for(const record of records){const data=E.clean(record.learning),ids=[0,1,3,...Object.keys(data.missions).map(Number).filter(id=>![0,1,3].includes(id))];for(const id of ids){const skill=profiles[id]||{skill:L[id].topic,follow:'Trace the first unexpected command together, then retry a related route without hints.'},m=data.missions[id],row=node('tr');const label=node('td');label.append(node('strong','',record.student),node('div','',skill.skill));row.append(label,node('td','',E.level(m)),node('td','',m?m.attempts+' attempts · '+m.hints+' hints · '+m.examples+' examples · '+m.predictionsCorrect+'/'+m.predictions+' predictions matched':'No recorded practice'));
    const errors=m?Object.entries(m.errors).filter(([,n])=>n>0).map(([k,n])=>k+': '+n).join(', '):'';row.append(node('td','',errors||'None recorded'));
    const recommendation=m?.retained?'Apply the concept in a combined mission.':m?.transfer?'Return after at least 24 hours for a different-layout review.':m?.independent?(profiles[id]?'Try the new-layout transfer challenge without hints.':'Try another mission that uses the same concept.') :skill.follow;row.append(node('td','',recommendation));body.append(row);
    if(m?.reflection){const reflection=node('tr'),td=node('td','',record.student+' reflection: '+m.reflection);td.colSpan=5;reflection.append(td);body.append(reflection);}
   }}
   table.append(body);const wrap=node('div','learning-table-wrap');wrap.append(table);host.append(wrap,node('p','muted','Independent = no in-game example or hint used in that attempt. External help cannot be detected. Transfer = a reflected layout solved independently using the target concept. Retention = a different-layout check at least 24 hours after transfer.'));
   const guide=node('details','learn-playtest');guide.append(node('summary','','Classroom playtest guide'),node('p','muted','Before play: ask the learner to predict a short program. During the first mission: observe where instructions or controls cause confusion, and ask the learner to explain one decision. After play: give a new layout without an example and ask for an explanation. On a later day: repeat with a different layout. Record understanding and enjoyment separately; do not grade speed. These observations help evaluate the activity, but the game itself has not established measured learning gains.'));host.append(guide);
  }
  window.CBLearning={exportEvidence:()=>E.clean(evidence),cleanReport:E.clean,refreshTeacher:renderTeacherEvidence};
  window.addEventListener('cb-teacher-refresh',renderTeacherEvidence);
  $('teacherMenu').addEventListener('click',renderTeacherEvidence);
  configureMission(true);renderTeacherEvidence();
 });
})();
