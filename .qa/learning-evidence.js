((root)=>{
 'use strict';
 const REVIEW_DELAY=24*60*60*1000;
 const numbers=['attempts','completed','supported','independent','transfer','retained','hints','examples','predictions','predictionsCorrect','lastPracticed','lastIndependentAt','lastTransferAt'];
 const errorNames=['syntax','collision','hazard','checkpoint'];
 const empty=()=>Object.fromEntries([...numbers.map(k=>[k,0]),['errors',{syntax:0,collision:0,hazard:0,checkpoint:0}],['reflection','']]);
 function clean(input){const output={version:1,missions:{}};for(let i=0;i<15;i++){const raw=input?.missions?.[String(i)];if(!raw||typeof raw!=='object'||Array.isArray(raw))continue;const m=empty();for(const name of numbers){const value=raw[name];m[name]=Number.isFinite(value)?Math.max(0,Math.min(name.endsWith('At')||name==='lastPracticed'?Date.now()+60000:100000,Math.floor(value))):0;}for(const name of errorNames){const v=raw.errors?.[name];m.errors[name]=Number.isFinite(v)?Math.max(0,Math.min(100000,Math.floor(v))):0;}m.reflection=typeof raw.reflection==='string'?raw.reflection.slice(0,280):'';output.missions[i]=m;}return output;}
 function entry(data,id){if(!Number.isInteger(id)||id<0||id>=15)throw Error('Unknown mission');return data.missions[id]||(data.missions[id]=empty());}
 function record(data,id,attempt,now=Date.now()){
  const m=entry(data,id);m.completed++;m.lastPracticed=now;
  if(attempt.assistance||!attempt.usedCode||!attempt.concept){m.supported++;return 'With support';}
  if(attempt.variant==='transfer'){m.transfer++;m.lastTransferAt=now;}
  else if(attempt.variant==='retention'){
   if(m.lastTransferAt&&now-m.lastTransferAt>=REVIEW_DELAY)m.retained++;
   else return 'Independent replay (review interval not yet reached)';
  }else{m.independent++;m.lastIndependentAt=now;}
  return level(m);
 }
 function level(m){return !m?'Not yet observed':m.retained?'Retained on later check':m.transfer?'Transfer demonstrated':m.independent?'Independent practice':m.completed?'With support':m.attempts?'Practicing':'Not yet observed';}
 const api={clean,entry,record,level,REVIEW_DELAY};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CBEvidence=api;
})(typeof window!=='undefined'?window:globalThis);
