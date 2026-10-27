/* Offline command-deck presentation. No dependencies; original game owns state. */
(() => {
 'use strict';
 const ready = fn => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, {once:true}) : fn();
 ready(() => {
  const hero = document.querySelector('#menuScreen .stellar-home-hero');
  if (!hero || document.getElementById('commandFleet')) return;
  document.body.classList.add('command-deck');
  const make = (tag, cls, text) => { const el=document.createElement(tag);el.className=cls;if(text)el.textContent=text;return el; };
  const primary = hero.querySelector('.ref-menu-primary');
  primary.prepend(make('div','command-kicker','EXPEDITIONARY CODE DIVISION / 01'));
  const brand=hero.querySelector('.ref-menu-brand');
  brand.querySelector('.ref-brand-tag').textContent='THINK. EXECUTE. BREAK THROUGH.';
  brand.append(make('p','command-description','Five worlds. Fifteen operations. Program your route, breach hostile systems, and bring every data core home.'));
  const labels=[['refMenuContinue','DEPLOY TO MISSION','Resume your current operation'],['refMenuWorld','GALACTIC OPERATIONS','Select a world and mission'],['refMenuArcade','TRAINING SIMULATIONS','Sharpen your coding skills']];
  labels.forEach(([id,title,sub])=>{const b=document.getElementById(id);if(b){b.querySelector('strong').textContent=title;b.querySelector('small').textContent=sub;b.setAttribute('aria-label',title);}});
  const orbit=make('div','command-orbit-label');orbit.innerHTML='<b>ORBITAL COMMAND</b>CBV–01 // RESOLUTE<br>EXPEDITION FLEET';hero.append(orbit);
  const label=make('div','command-ship-label');label.innerHTML='CBV–01 / RESOLUTE<small>COMMAND FRIGATE · STANDING BY</small>';hero.append(label);
  const bottom=make('div','command-bottom');bottom.append(make('span','','MISSION NETWORK ONLINE'));
  const motion=make('button','','PAUSE SCENERY');motion.id='fleetMotion';motion.type='button';motion.setAttribute('aria-pressed','false');bottom.append(motion);hero.append(bottom);
  const bridge=document.querySelector('.captain-bridge-label');if(bridge)bridge.textContent='COMMAND DECK / OPERATIONS';
  const subtitle=document.querySelector('.stellar-subtitle');if(subtitle)subtitle.textContent='EXPEDITIONARY DIVISION';
  // Keep the editor immediately accessible; retain coaching in an optional drawer.
  const coach=document.querySelector('.learn-boost-panel');
  if(coach){const drawer=make('details','command-coach');drawer.append(make('summary','','MISSION COACH / PLAN · EXPLAIN · REFLECT'));coach.before(drawer);drawer.append(coach);document.getElementById('codingLab').append(drawer);}
  const canvas=make('canvas','');canvas.id='commandFleet';canvas.setAttribute('aria-hidden','true');hero.prepend(canvas);
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  let userPaused=false;try{userPaused=localStorage.getItem('cb_fleet_paused')==='true';}catch(_){}
  let renderer=null;
  const reduced=()=>userPaused||media.matches||!!document.getElementById('reducedMotion')?.checked;
  const syncMotion=()=>{const paused=reduced();motion.setAttribute('aria-pressed',String(paused));motion.textContent=paused?'SCENERY PAUSED':'PAUSE SCENERY';motion.title=media.matches?'Reduced motion follows your system preference':'Toggle animated scenery';canvas.dataset.paused=String(paused);document.body.classList.toggle('fleet-paused',paused);renderer?.refresh();};
  motion.addEventListener('click',()=>{userPaused=!userPaused;try{localStorage.setItem('cb_fleet_paused',String(userPaused));}catch(_){}syncMotion();});
  media.addEventListener('change',syncMotion);
  document.getElementById('reducedMotion')?.addEventListener('change',syncMotion);
  try { renderer=createFleet(canvas,hero,reduced);canvas.dataset.renderer='webgl'; }
  catch(error) { canvas.hidden=true;const fallback=make('div','fleet-fallback');fallback.setAttribute('aria-hidden','true');hero.prepend(fallback);canvas.dataset.renderer='fallback'; }
  syncMotion();
 });

 function createFleet(canvas,hero,reduced) {
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
  if(!gl)throw new Error('WebGL unavailable');
  const vertex=`
   attribute vec3 position; attribute vec3 normal;
   uniform mat4 projection; uniform vec3 origin; uniform vec3 rotation; uniform float scale;
   varying vec3 vNormal; varying vec3 vLocal; varying vec3 vWorld;
   void main(){
    vec3 c=cos(rotation),s=sin(rotation);
    mat3 rx=mat3(1.,0.,0.,0.,c.x,s.x,0.,-s.x,c.x);
    mat3 ry=mat3(c.y,0.,-s.y,0.,1.,0.,s.y,0.,c.y);
    mat3 rz=mat3(c.z,s.z,0.,-s.z,c.z,0.,0.,0.,1.);
    mat3 r=rz*ry*rx;
    vLocal=position;vNormal=r*normal;vWorld=r*position*scale+origin;
    gl_Position=projection*vec4(vWorld,1.);
   }`;
  const fragment=`
   precision mediump float;
   uniform vec3 color; uniform float material; uniform float time;
   varying vec3 vNormal; varying vec3 vLocal; varying vec3 vWorld;
   float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
   float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
   void main(){
    vec3 n=normalize(vNormal),light=normalize(vec3(-.6,.8,1.));
    float diffuse=max(dot(n,light),0.);
    vec3 base=color;
    if(material>1.5){
     vec3 p=vLocal*3.;float terrain=noise(p*2.)*.5+noise(p*5.)*.28+noise(p*14.)*.15+noise(p*32.)*.07;
     base=mix(vec3(.055,.13,.17),vec3(.24,.29,.23),smoothstep(.46,.57,terrain));
     float cloud=noise(p*4.+vec3(time*.009,0.,0.))*.5+noise(p*9.)*.3+noise(p*24.)*.2;
     base=mix(base,vec3(.69,.75,.73),smoothstep(.57,.72,cloud)*.65);
     float rim=pow(1.-max(dot(n,normalize(-vWorld)),0.),3.);
     base=base*(.10+diffuse*.95)+vec3(.24,.45,.55)*rim*.55;
    }else if(material>.5){base=color*(.85+.15*sin(time*3.));}
    else{
     float spec=pow(max(dot(reflect(-light,n),normalize(-vWorld)),0.),24.);
     base=color*(.22+diffuse*.88)+vec3(.75,.8,.72)*spec*.35;
    }
    gl_FragColor=vec4(base,1.);
   }`;
  const compile=(kind,src)=>{const shader=gl.createShader(kind);gl.shaderSource(shader,src);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;};
  const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const locations={};for(const key of ['projection','origin','rotation','scale','color','material','time'])locations[key]=gl.getUniformLocation(program,key);
  const pos=gl.getAttribLocation(program,'position'),norm=gl.getAttribLocation(program,'normal');
  gl.enableVertexAttribArray(pos);gl.enableVertexAttribArray(norm);gl.enable(gl.DEPTH_TEST);
  const mesh=(vertices)=>{const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);return{buffer,count:vertices.length/6};};
  const triangle=(out,a,b,c)=>{const u=b.map((v,i)=>v-a[i]),v=c.map((x,i)=>x-a[i]);const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const len=Math.hypot(...n)||1;for(const p of [a,b,c])out.push(...p,...n.map(x=>x/len));};
  const cuboid=(x,y,z,w,h,d,taper=1)=>{
   const a=[x-w/2,y-h/2,z-d/2],b=[x+w/2,y-h*taper/2,z-d*taper/2],c=[x+w/2,y+h*taper/2,z-d*taper/2],e=[x-w/2,y+h/2,z-d/2];
   const f=[x-w/2,y-h/2,z+d/2],g=[x+w/2,y-h*taper/2,z+d*taper/2],j=[x+w/2,y+h*taper/2,z+d*taper/2],k=[x-w/2,y+h/2,z+d/2];
   const out=[];for(const [p,q,r,s] of [[a,e,c,b],[f,g,j,k],[a,b,g,f],[e,k,j,c],[a,f,k,e],[b,c,j,g]]){triangle(out,p,q,r);triangle(out,p,r,s);}return mesh(out);
  };
  const sphereVertices=[];
  const spherePoint=(lat,lon)=>[Math.cos(lat)*Math.cos(lon),Math.sin(lat),Math.cos(lat)*Math.sin(lon)];
  for(let y=0;y<48;y++)for(let x=0;x<72;x++){
   const a=spherePoint(y/48*Math.PI-Math.PI/2,x/72*Math.PI*2),b=spherePoint((y+1)/48*Math.PI-Math.PI/2,x/72*Math.PI*2),c=spherePoint((y+1)/48*Math.PI-Math.PI/2,(x+1)/72*Math.PI*2),d=spherePoint(y/48*Math.PI-Math.PI/2,(x+1)/72*Math.PI*2);
   for(const p of [a,b,c,a,c,d])sphereVertices.push(...p,...p);
  }
  const sphere=mesh(sphereVertices);
  const parts=[];
  const hull=[.31,.36,.37],armor=[.48,.51,.48],dark=[.12,.17,.19],yellow=[.88,.7,.17],engine=[.42,.85,1.];
  const box=(x,y,z,w,h,d,color=hull,taper=1,material=0)=>parts.push({mesh:cuboid(x,y,z,w,h,d,taper),color,material});
  // Tapered armored hull, twin engine nacelles, flight deck, bridge and turrets.
  box(.2,0,0,4.7,.6,1.15,hull,.28);
  box(-.2,.3,0,3.1,.19,1.05,armor,.65);
  box(-.5,-.3,0,2.9,.25,.8,dark,.7);
  for(const side of [-1,1]){
   box(-1.05,-.03,side*.82,2.1,.48,.46,hull,.85);
   box(-.9,.26,side*.82,1.6,.12,.47,armor,.85);
   box(-1.15,.33,side*.82,.75,.025,.26,yellow);
   box(-.3,-.02,side*.6,.6,.22,.5,dark);
   box(-2.14,-.03,side*.82,.14,.30,.33,dark);
   box(-2.23,-.03,side*.82,.07,.19,.22,engine,1,1);
   box(-2.57,-.03,side*.82,.62,.09,.10,[.28,.57,.72],.25,1);
   for(let i=0;i<6;i++)box(-1.65+i*.25,.1,side*1.06,.08,.15,.025,dark);
   for(let i=0;i<5;i++)box(-.9+i*.42,.405,side*.34,.3,.035,.19,dark);
  }
  box(-.85,.52,0,1.0,.34,.65,hull,.8);
  box(-.92,.76,0,.7,.16,.72,armor,.8);
  box(-.56,.72,0,.045,.10,.56,[.46,.8,.82],1,1);
  box(-1.17,1.04,0,.055,.49,.055,armor);
  box(-1.17,1.18,0,.055,.055,.56,armor);
  box(-1.17,1.31,0,.08,.06,.08,yellow,1,1);
  for(const x of [.1,.88]){
   box(x,.46,0,.35,.16,.37,dark);
   box(x+.20,.54,0,.54,.07,.09,armor);
  }
  box(1.40,.23,0,.74,.04,.15,yellow,.5);
  for(const side of [-1,1]){
   // Layered armor, warning stripes and inset service lights.
   for(let i=0;i<7;i++){
    box(-1.5+i*.38,-.05,side*(.50-i*.032),.27,.26,.035,i%2?armor:hull,.9);
    box(-1.42+i*.38,.12,side*(.52-i*.032),.07,.035,.035,[.61,.76,.73],1,1);
   }
   box(.4,.32,side*.25,1.7,.065,.10,armor,.8);
   box(-1.7,.43,side*.63,.38,.48,.07,armor,.25);
   box(-1.35,-.34,side*.65,1.1,.15,.3,dark,.5);
   for(let i=0;i<3;i++)box(-1.65+i*.14,.333,side*.82,.07,.03,.27,dark);
  }
  box(-2.1,0,0,.10,.31,.61,dark);
  box(-2.17,0,0,.05,.21,.40,engine,1,1);
  const starVertices=[];let seed=37;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  for(let i=0;i<180;i++){const x=(random()-.5)*48,y=(random()-.5)*28,z=-25-random()*15,r=.009+random()*.015;triangle(starVertices,[x-r,y-r,z],[x+r,y-r,z],[x,y+r,z]);}
  const stars=mesh(starVertices);
  const draw=(m,origin,rotation,scale,color,material=0)=>{
   gl.bindBuffer(gl.ARRAY_BUFFER,m.buffer);gl.vertexAttribPointer(pos,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(norm,3,gl.FLOAT,false,24,12);
   gl.uniform3fv(locations.origin,origin);gl.uniform3fv(locations.rotation,rotation);gl.uniform1f(locations.scale,scale);gl.uniform3fv(locations.color,color);gl.uniform1f(locations.material,material);gl.drawArrays(gl.TRIANGLES,0,m.count);
  };
  let width=0,height=0,time=0,last=0,request=0,dirty=true,lost=false,visible=true;
  const menu=document.getElementById('menuScreen');
  const resize=()=>{const r=hero.getBoundingClientRect();if(!r.width||!r.height)return;const dpr=Math.min(devicePixelRatio||1,1.5);width=r.width;height=r.height;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);dirty=true;refresh();};
  function frame(now){
   request=0;if(lost||document.hidden||menu.hidden||!visible){last=0;return;}
   if(!reduced()&&last)time+=Math.min((now-last)/1000,.05);last=now;
   if(dirty||!reduced()){
    dirty=false;gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    const aspect=width/height,f=1/Math.tan(Math.PI/8),near=.1,far=100;
    gl.uniformMatrix4fv(locations.projection,false,new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]));gl.uniform1f(locations.time,time);
    const mobile=width<600;
    draw(stars,[Math.sin(time*.015)*.3,0,0],[0,0,time*.0007],1,[.52,.62,.62],1);
    draw(sphere,mobile?[1.4,4.4,-15]:[4.7,1.6,-17],[.15,time*.018,.16],mobile?3.4:4.4,[1,1,1],2);
    const origin=mobile?[.4,2.65,-10]:[2.8,.05+Math.sin(time*.5)*.045,-10];
    const rotation=[.28+Math.sin(time*.2)*.025,-.52+Math.sin(time*.17)*.065,-.18];
    for(const part of parts)draw(part.mesh,origin,rotation,mobile?.66:1.02,part.color,part.material);
    if(!mobile){for(const part of parts)draw(part.mesh,[5.3,2.0,-14],[.28,-.52,-.18],.26,part.color,part.material);for(const part of parts)draw(part.mesh,[.6,1.75,-15],[.28,-.52,-.18],.18,part.color,part.material);}
    canvas.dataset.frame=String(Math.round(time*1000));
   }
   if(!reduced())request=requestAnimationFrame(frame);
  }
  function refresh(){dirty=true;if(!request&&!lost&&!document.hidden&&!menu.hidden&&visible)request=requestAnimationFrame(frame);}
  new ResizeObserver(resize).observe(hero);
  new MutationObserver(()=>{last=0;refresh();}).observe(menu,{attributes:true,attributeFilter:['hidden']});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;last=0;refresh();}).observe(hero);
  document.addEventListener('visibilitychange',()=>{last=0;refresh();});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;cancelAnimationFrame(request);request=0;canvas.hidden=true;const fallback=document.createElement('div');fallback.className='fleet-fallback';fallback.setAttribute('aria-hidden','true');hero.prepend(fallback);});
  // A lost context keeps a static planet; gameplay remains available.
  resize();return{refresh};
 }
})();
