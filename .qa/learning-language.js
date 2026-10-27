/* Restricted teaching language. Parsed as data; never eval/Function. */
((root)=>{
 'use strict';
 const vectors={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};
 function compile(source,map,initial){
  if(typeof source!=='string'||source.length>20000)throw Error('Program is too long.');
  const tokens=[],rx=/\s+|\/\/[^\n]*|\/\*[\s\S]*?\*\/|\d+|[A-Za-z_$][\w$]*|"[^"\n]*"|'[^'\n]*'|\+\+|<=|<|==|=|\{|\}|\(|\)|;|,/gy;
  let offset=0,line=1;
  while(offset<source.length){rx.lastIndex=offset;const m=rx.exec(source);if(!m)throw Error('Unexpected character at line '+line+': '+source[offset]);const text=m[0];if(!/^\s|^\/\//.test(text)&&!text.startsWith('/*'))tokens.push({text,line,offset});line+=(text.match(/\n/g)||[]).length;offset=rx.lastIndex;if(tokens.length>1400)throw Error('Program is too long (1400 tokens).');}
  let p=0,depth=0;
  const peek=()=>tokens[p]?.text;
  const fail=text=>{throw Error(text+' at line '+(tokens[p]?.line||line));};
  const eat=value=>{if(peek()!==value)fail('Expected '+value+', found '+(peek()||'end of program'));return tokens[p++];};
  const take=()=>{if(!tokens[p])fail('Unexpected end of program');return tokens[p++];};
  const number=()=>{const t=take();if(!/^\d+$/.test(t.text))fail('Expected a whole number');const n=Number(t.text);if(n>80)fail('Repeat count cannot exceed 80');return n;};
  const features={loop:false,condition:false,otherwise:false};
  function block(){eat('{');if(++depth>24)fail('Too many nested blocks');const nodes=[];while(peek()!=='}'){if(!peek())fail('Missing closing brace }');nodes.push(statement());}eat('}');depth--;return nodes;}
  function condition(){let negate=false;if(peek()==='not'){take();eat('(');negate=true;}const token=take(),name=token.text;if(!['hasKey','hasData','switchActive','pathClear','atGoal'].includes(name))fail('Unknown condition '+name);eat('(');let arg='';if(name==='pathClear'){arg=take().text;if(!/^["'][UDLR]["']$/.test(arg))fail('Use pathClear("R") with U, D, L or R');arg=arg.slice(1,-1);}eat(')');if(negate)eat(')');return{name,arg,negate,line:token.line};}
  function statement(){const token=take(),name=token.text;
   const directions={moveUp:'U',moveDown:'D',moveLeft:'L',moveRight:'R'};
   if(directions[name]){eat('(');const count=peek()===')'?1:number();eat(')');eat(';');return{kind:'move',direction:directions[name],count,line:token.line};}
   if(name==='repeat'){features.loop=true;eat('(');const count=number();eat(')');return{kind:'loop',count,body:block(),line:token.line};}
   if(name==='for'){features.loop=true;eat('(');eat('let');const variable=take().text;if(!/^[A-Za-z_$][\w$]*$/.test(variable))fail('Invalid loop variable');eat('=');eat('0');eat(';');eat(variable);const op=take().text;if(!['<','<='].includes(op))fail('Use < or <= in a for loop');const limit=number();eat(';');eat(variable);eat('++');eat(')');return{kind:'loop',count:limit+(op==='<='?1:0),body:block(),line:token.line};}
   if(name==='if'){features.condition=true;eat('(');const test=condition();eat(')');const yes=block();let no=[];if(peek()==='else'){take();features.otherwise=true;no=block();}return{kind:'if',test,yes,no,line:token.line};}
   fail('Unknown instruction '+name);
  }
  const tree=[];while(p<tokens.length)tree.push(statement());
  const state={...initial,visited:new Set(initial.visited||[])},moves=[],trace=[],decisions=[];
  const at=(x,y)=>map[y]?.[x]||'#';let budget=0;
  function passable(d){const [dx,dy]=vectors[d],t=at(state.x+dx,state.y+dy);return t!=='#'&&t!=='!'&&!(t==='G'&&!state.unlocked)&&!(t==='D'&&!state.key)&&!(t==='B'&&!state.switchOn);}
  function test(c){const value=c.name==='hasKey'?state.key:c.name==='hasData'?state.fragments>0:c.name==='switchActive'?state.switchOn:c.name==='atGoal'?at(state.x,state.y)==='E':passable(c.arg);return c.negate?!value:!!value;}
  function simulate(d){if(!passable(d))return;const [dx,dy]=vectors[d];state.x+=dx;state.y+=dy;const t=at(state.x,state.y);if(t==='K')state.key=true;if(t==='T')state.switchOn=true;if(t==='C'&&!state.visited.has(state.x+','+state.y)){state.visited.add(state.x+','+state.y);state.fragments++;}if(t==='P'){const ports=[];map.forEach((row,y)=>[...row].forEach((t,x)=>{if(t==='P')ports.push([x,y]);}));const other=ports.find(([x,y])=>x!==state.x||y!==state.y);if(other)[state.x,state.y]=other;}}
  function execute(nodes,loops=[],conditions=[]){for(const node of nodes){if(++budget>4000)throw Error('Program too complex (4000 statement limit).');
   if(node.kind==='move'){for(let k=0;k<node.count;k++){if(moves.length>=80)throw Error('Program exceeds 80 movements.');const from=[state.x,state.y];simulate(node.direction);moves.push(node.direction);trace.push({line:node.line,direction:node.direction,loops:loops.map(x=>({...x})),conditions:conditions.map(x=>({...x})),from,to:[state.x,state.y],repeat:k+1,count:node.count});}}
   if(node.kind==='loop')for(let i=0;i<node.count;i++)execute(node.body,[...loops,{line:node.line,iteration:i+1,count:node.count}],conditions);
   if(node.kind==='if'){const result=test(node.test),decision={line:node.line,name:node.test.name,stateResult:node.test.negate?!result:result,label:(node.test.negate?'not ':'')+node.test.name+'('+node.test.arg+')',result};decisions.push(decision);execute(result?node.yes:node.no,loops,[...conditions,decision]);}
  }}
  execute(tree);return{moves,trace,features,decisions,source};
 }
 const api={compile};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CBLanguage=api;
})(typeof window!=='undefined'?window:globalThis);
