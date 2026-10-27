/* HELM war table: a real-time WebGL table carrying five planets textured
   with the Blender bakes. Choosing a world turns the table to bring it
   forward; turning the table by hand chooses the world that ends in front.
   No libraries. Falls back to the Blender planet renders without WebGL. */
(() => {
 'use strict';
 const TAU = Math.PI * 2, R_ORBIT = 2.35, TABLE_R = 3.4, FRONT = Math.PI / 2;
 const WORLD = [
  { atmo: [.5, .85, 1], glow: [.5, .9, 1], gain: .9 },
  { atmo: [1, .55, .2], glow: [1, .48, .12], gain: 1.5 },
  { atmo: [.75, .92, 1], glow: [.35, .85, 1], gain: .8 },
  { atmo: [.8, .65, .95], glow: [.95, .9, 1], gain: .5, ring: true },
  { atmo: [1, .32, .25], glow: [1, .23, .18], gain: 1.6 },
 ];
 const v3 = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
 };
 function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
 }
 function lookAt(e, c, u) {
  const z = v3.norm(v3.sub(e, c)), x = v3.norm(v3.cross(u, z)), y = v3.cross(z, x);
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -v3.dot(x, e), -v3.dot(y, e), -v3.dot(z, e), 1]);
 }
 function mul(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; }
  return o;
 }
 function project(m, p, w, h) {
  const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
  const ww = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
  return { x: (x / ww * .5 + .5) * w, y: (1 - (y / ww * .5 + .5)) * h, w: ww };
 }
 const angleDelta = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

 const PLANET_VS = `attribute vec3 aPos;attribute vec2 aUv;uniform mat4 uVP;uniform vec3 uC;uniform float uR,uSpin,uTilt;
 varying vec3 vN,vW;varying vec2 vUv;
 void main(){float c=cos(uSpin),s=sin(uSpin);vec3 p=vec3(aPos.x*c+aPos.z*s,aPos.y,-aPos.x*s+aPos.z*c);
 float ct=cos(uTilt),st=sin(uTilt);p=vec3(p.x*ct-p.y*st,p.x*st+p.y*ct,p.z);vN=p;vUv=aUv;vW=uC+p*uR;gl_Position=uVP*vec4(vW,1.);}`;
 const PLANET_FS = `precision mediump float;uniform sampler2D uMap,uGlow;uniform vec3 uL,uEye,uAtmo,uGlowC,uEmit;uniform float uGain,uSel,uMode;
 varying vec3 vN,vW;varying vec2 vUv;
 void main(){vec3 n=normalize(vN),V=normalize(uEye-vW);float rim=pow(1.-max(dot(n,V),0.),2.6);
 if(uMode>.5){gl_FragColor=vec4(uEmit*(.75+rim*.9),1.);return;}
 float ndl=dot(n,uL),lit=smoothstep(-.12,.55,ndl);vec3 base=texture2D(uMap,vUv).rgb;float g=texture2D(uGlow,vUv).r;
 vec3 col=base*(.05+1.02*lit*max(ndl,0.)+.06*lit);
 col+=uGlowC*g*uGain*(.28+.85*(1.-lit));
 col+=uAtmo*rim*(.18+.8*lit);
 col+=vec3(pow(max(dot(reflect(-uL,n),V),0.),28.)*.16*lit);
 col*=.9+.1*uSel;gl_FragColor=vec4(col,1.);}`;
 const TABLE_VS = `attribute vec2 aXZ;uniform mat4 uVP;varying vec2 vXZ;void main(){vXZ=aXZ;gl_Position=uVP*vec4(aXZ.x,0.,aXZ.y,1.);}`;
 const TABLE_FS = `precision mediump float;uniform float uYaw,uSweep;uniform vec3 uHolo;varying vec2 vXZ;
 float ln(float d,float w){return 1.-smoothstep(0.,w,abs(d));}
 void main(){float r=length(vXZ);if(r>3.4)discard;float a=atan(vXZ.y,vXZ.x);
 vec3 base=mix(vec3(.04,.058,.072),vec3(.018,.026,.033),smoothstep(.4,3.4,r));
 float l=ln(r-2.35,.016)*.75+ln(r-1.2,.012)*.28+ln(r-3.05,.012)*.4+ln(r-3.37,.02)*.9+ln(r-.55,.01)*.3;
 l+=step(.992,cos((a-uYaw)*36.))*step(3.08,r)*step(r,3.3)*.65+step(.9995,cos((a-uYaw)*5.))*step(r,3.05)*step(.6,r)*.22;
 vec2 g=abs(fract(vXZ*2.5)-.5);l+=(1.-smoothstep(0.,.025,min(g.x,g.y)))*.06*step(r,3.0);
 float sw=fract((a-uSweep)/6.2831853);l+=pow(sw,22.)*.32*step(r,3.05)*step(.55,r);
 gl_FragColor=vec4(base+uHolo*l,1.);}`;
 const LINE_VS = `attribute vec3 aPos;uniform mat4 uVP;void main(){gl_Position=uVP*vec4(aPos,1.);}`;
 const LINE_FS = `precision mediump float;uniform vec4 uColor;void main(){gl_FragColor=uColor;}`;
 const RING_VS = `attribute vec2 aXZ;uniform mat4 uVP;uniform vec3 uC;uniform float uR,uTilt;varying float vR;
 void main(){vR=length(aXZ);vec3 p=vec3(aXZ.x,0.,aXZ.y);float ct=cos(uTilt),st=sin(uTilt);p=vec3(p.x*ct-p.y*st,p.x*st+p.y*ct,p.z);
 float cx=cos(.32),sx=sin(.32);p=vec3(p.x,p.y*cx-p.z*sx,p.y*sx+p.z*cx);gl_Position=uVP*vec4(uC+p*uR,1.);}`;
 const RING_FS = `precision mediump float;varying float vR;void main(){float b=.55+.45*sin(vR*38.);float edge=smoothstep(1.35,1.45,vR)*(1.-smoothstep(2.0,2.15,vR));
 gl_FragColor=vec4(vec3(.82,.72,.94)*b*edge*.8,edge*b*.62);}`;

 function create(canvas, opts = {}) {
  const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  if (!gl) throw new Error('WebGL unavailable');
  const compile = (vs, fs) => {
   const p = gl.createProgram();
   for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    gl.attachShader(p, s);
   }
   gl.linkProgram(p);
   if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
   const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
   for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
   return { p, u, a: name => gl.getAttribLocation(p, name) };
  };
  const planetP = compile(PLANET_VS, PLANET_FS), tableP = compile(TABLE_VS, TABLE_FS), lineP = compile(LINE_VS, LINE_FS), ringP = compile(RING_VS, RING_FS);
  const buffer = data => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); return b; };

  // Sphere with equirect UVs (seam duplicated so textures wrap cleanly).
  const sv = [], si = [], SEG = 64, RINGS = 32;
  for (let y = 0; y <= RINGS; y++) for (let x = 0; x <= SEG; x++) {
   const u = x / SEG, v = y / RINGS, th = u * TAU, ph = v * Math.PI;
   sv.push(-Math.cos(th) * Math.sin(ph), Math.cos(ph), Math.sin(th) * Math.sin(ph), u, v);
  }
  for (let y = 0; y < RINGS; y++) for (let x = 0; x < SEG; x++) { const a = y * (SEG + 1) + x, b = a + SEG + 1; si.push(a, b, a + 1, b, b + 1, a + 1); }
  const sphereBuf = buffer(sv), sphereIdx = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIdx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(si), gl.STATIC_DRAW);
  const disc = [0, 0]; for (let i = 0; i <= 120; i++) { const a = i / 120 * TAU; disc.push(Math.cos(a) * TABLE_R, Math.sin(a) * TABLE_R); }
  const discBuf = buffer(disc);
  const ann = []; for (let i = 0; i <= 96; i++) { const a = i / 96 * TAU, c = Math.cos(a), s = Math.sin(a); ann.push(c * 1.35, s * 1.35, c * 2.15, s * 2.15); }
  const ringBuf = buffer(ann);
  const lineBuf = gl.createBuffer();

  const blank = (() => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([20, 28, 36, 255])); return t; })();
  const textures = WORLD.map(() => ({ map: blank, glow: blank }));
  const loadTexture = (src, w, h, done) => {
   const img = new Image();
   img.onload = () => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    done(t); state.dirty = true;
   };
   img.src = src;
  };
  (opts.planets || []).forEach((p, i) => {
   if (!textures[i]) return;
   loadTexture(p.map, 1024, 512, t => textures[i].map = t);
   loadTexture(p.glow, 512, 256, t => textures[i].glow = t);
  });

  const state = { yaw: FRONT, target: FRONT, from: FRONT, t0: 0, dur: 0, selected: 0, scale: WORLD.map(() => .5), time: 0, last: 0,
   paused: !!opts.paused, reduced: !!opts.reduced, inset: 0, visible: false, dirty: true, raf: 0, frame: 0, w: 1, h: 1, dpr: 1, vp: null, eye: [0, 0, 0], proj: [] };
  const onPick = opts.onPick || (() => { });
  const onLayout = opts.onLayout || (() => { });

  function resize() {
   const r = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
   state.w = Math.max(1, r.width); state.h = Math.max(1, r.height); state.dpr = dpr;
   canvas.width = Math.round(state.w * dpr); canvas.height = Math.round(state.h * dpr);
   state.dirty = true;
  }
  const ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
  ro ? ro.observe(canvas) : window.addEventListener('resize', resize);
  resize();

  function planetPos(i, t) {
   const a = state.yaw + i * TAU / 5, bob = state.paused || state.reduced ? 0 : Math.sin(t * .9 + i * 1.7) * .05;
   return [Math.cos(a) * R_ORBIT, .9 + bob, Math.sin(a) * R_ORBIT];
  }

  function draw(now) {
   const t = now / 1000, dt = state.last ? Math.min(.05, t - state.last) : 0;
   state.last = t;
   const ambient = !(state.paused || state.reduced);
   if (ambient) state.time += dt;
   if (state.dur) {
    const k = Math.min(1, (now - state.t0) / state.dur), e = 1 - Math.pow(1 - k, 3);
    state.yaw = state.from + angleDelta(state.from, state.target) * e;
    if (k >= 1) state.dur = 0;
   }
   for (let i = 0; i < 5; i++) { const goal = i === state.selected ? .64 : .5; state.scale[i] += (goal - state.scale[i]) * (state.reduced ? 1 : Math.min(1, dt * 9 || 1)); }

   gl.viewport(0, 0, canvas.width, canvas.height);
   gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
   const aspect = state.w / state.h, fov = .62, el = .78;
   const free = aspect * (1 - state.inset), dist = Math.max(10.4, 3.75 / (Math.tan(fov / 2) * free) * 1.02);
   const eye = [0, Math.sin(el) * dist + .2, Math.cos(el) * dist];
   const P = perspective(fov, aspect, .1, 60); P[8] = -state.inset;
   const vp = mul(P, lookAt(eye, [0, .1, .75], [0, 1, 0]));
   state.vp = vp; state.eye = eye;
   gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND);

   gl.useProgram(tableP.p);
   gl.uniformMatrix4fv(tableP.u.uVP, false, vp);
   gl.uniform1f(tableP.u.uYaw, state.yaw); gl.uniform1f(tableP.u.uSweep, state.time * .45);
   gl.uniform3fv(tableP.u.uHolo, [.5, .85, 1]);
   gl.bindBuffer(gl.ARRAY_BUFFER, discBuf);
   const ax = tableP.a('aXZ'); gl.enableVertexAttribArray(ax); gl.vertexAttribPointer(ax, 2, gl.FLOAT, false, 0, 0);
   gl.drawArrays(gl.TRIANGLE_FAN, 0, disc.length / 2);
   gl.disableVertexAttribArray(ax);

   gl.useProgram(planetP.p);
   gl.uniformMatrix4fv(planetP.u.uVP, false, vp);
   gl.uniform3fv(planetP.u.uL, v3.norm([-.55, .62, .58]));
   gl.uniform3fv(planetP.u.uEye, eye);
   gl.bindBuffer(gl.ARRAY_BUFFER, sphereBuf); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIdx);
   const ap = planetP.a('aPos'), au = planetP.a('aUv');
   gl.enableVertexAttribArray(ap); gl.enableVertexAttribArray(au);
   gl.vertexAttribPointer(ap, 3, gl.FLOAT, false, 20, 0); gl.vertexAttribPointer(au, 2, gl.FLOAT, false, 20, 12);
   gl.uniform1i(planetP.u.uMap, 0); gl.uniform1i(planetP.u.uGlow, 1);
   const pos = [];
   for (let i = 0; i < 5; i++) {
    const c = planetPos(i, t); pos.push(c);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, textures[i].map);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, textures[i].glow);
    gl.uniform3fv(planetP.u.uC, c); gl.uniform1f(planetP.u.uR, state.scale[i]);
    gl.uniform1f(planetP.u.uSpin, state.time * .12 + i * 1.3); gl.uniform1f(planetP.u.uTilt, .32 + i * .05);
    gl.uniform3fv(planetP.u.uAtmo, WORLD[i].atmo); gl.uniform3fv(planetP.u.uGlowC, WORLD[i].glow);
    gl.uniform1f(planetP.u.uGain, WORLD[i].gain); gl.uniform1f(planetP.u.uSel, i === state.selected ? 1 : 0); gl.uniform1f(planetP.u.uMode, 0);
    gl.drawElements(gl.TRIANGLES, si.length, gl.UNSIGNED_SHORT, 0);
   }
   gl.uniform3fv(planetP.u.uC, [0, .42, 0]); gl.uniform1f(planetP.u.uR, .16); gl.uniform1f(planetP.u.uMode, 1);
   gl.uniform3fv(planetP.u.uEmit, [.45, .82, 1]);
   gl.drawElements(gl.TRIANGLES, si.length, gl.UNSIGNED_SHORT, 0);
   gl.disableVertexAttribArray(ap); gl.disableVertexAttribArray(au);

   // Projection beams and table markers.
   gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
   gl.useProgram(lineP.p); gl.uniformMatrix4fv(lineP.u.uVP, false, vp);
   const al = lineP.a('aPos'); gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf); gl.enableVertexAttribArray(al);
   for (let i = 0; i < 5; i++) {
    const c = pos[i], sel = i === state.selected, pts = [c[0], c[1] - state.scale[i], c[2], c[0], .004, c[2]];
    const loop = r => { for (let k = 0; k <= 48; k++) { const a = k / 48 * TAU; pts.push(c[0] + Math.cos(a) * r, .004, c[2] + Math.sin(a) * r); } };
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pts.slice(0, 6)), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(al, 3, gl.FLOAT, false, 0, 0);
    gl.uniform4fv(lineP.u.uColor, sel ? [1, .62, .27, .7] : [.5, .85, 1, .28]);
    gl.drawArrays(gl.LINES, 0, 2);
    for (const r of sel ? [.5, .62] : [.42]) {
     pts.length = 0; loop(r);
     gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pts), gl.DYNAMIC_DRAW);
     gl.drawArrays(gl.LINE_STRIP, 0, pts.length / 3);
    }
   }
   gl.disableVertexAttribArray(al);
   // Rings for the gas giant.
   gl.useProgram(ringP.p); gl.uniformMatrix4fv(ringP.u.uVP, false, vp);
   WORLD.forEach((w, i) => {
    if (!w.ring) return;
    gl.uniform3fv(ringP.u.uC, pos[i]); gl.uniform1f(ringP.u.uR, state.scale[i]); gl.uniform1f(ringP.u.uTilt, .32 + i * .05);
    const ar = ringP.a('aXZ'); gl.bindBuffer(gl.ARRAY_BUFFER, ringBuf); gl.enableVertexAttribArray(ar);
    gl.vertexAttribPointer(ar, 2, gl.FLOAT, false, 0, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, ann.length / 2);
    gl.disableVertexAttribArray(ar);
   });
   gl.depthMask(true); gl.disable(gl.BLEND);

   state.proj = pos.map((c, i) => {
    const center = project(vp, c, state.w, state.h), foot = project(vp, [c[0], .9 - state.scale[i] - .12, c[2]], state.w, state.h);
    const edge = project(vp, [c[0] + state.scale[i], c[1], c[2]], state.w, state.h);
    return { x: center.x, y: center.y, r: Math.abs(edge.x - center.x), depth: center.w, foot };
   });
   onLayout(state.proj);
   state.frame++; canvas.dataset.frame = String(state.frame);
   state.dirty = false;
  }

  function loop(now) {
   state.raf = 0;
   if (!state.visible) return;
   const animating = state.dur || !(state.paused || state.reduced) || state.dirty || state.scale.some((s, i) => Math.abs(s - (i === state.selected ? .64 : .5)) > .002);
   if (animating) draw(now);
   if (animating) state.raf = requestAnimationFrame(loop);
  }
  const wake = () => { if (state.visible && !state.raf) state.raf = requestAnimationFrame(loop); };

  // Pointer: tap a planet to choose it, drag the table to turn it.
  let drag = null;
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, yaw: state.yaw, moved: false, id: e.pointerId }; });
  canvas.addEventListener('pointermove', e => {
   if (!drag) return;
   const dx = e.clientX - drag.x;
   if (Math.abs(dx) > 4 && !drag.moved) { drag.moved = true; canvas.setPointerCapture?.(drag.id); canvas.classList.add('dragging'); }
   if (drag.moved) { state.dur = 0; state.yaw = drag.yaw + dx * .009; state.dirty = true; wake(); }
  });
  const end = e => {
   if (!drag) return;
   const d = drag; drag = null; canvas.classList.remove('dragging');
   if (d.moved) {
    let best = 0, bestD = 9;
    for (let i = 0; i < 5; i++) { const dd = Math.abs(angleDelta(state.yaw + i * TAU / 5, FRONT)); if (dd < bestD) { bestD = dd; best = i; } }
    onPick(best, 'drag');
    return;
   }
   if (e.type !== 'pointerup') return;
   const r = canvas.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
   let hit = -1, depth = 1e9;
   state.proj.forEach((p, i) => { if (Math.hypot(px - p.x, py - p.y) < p.r * 1.3 + 8 && p.depth < depth) { depth = p.depth; hit = i; } });
   if (hit >= 0) onPick(hit, 'tap');
  };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); opts.onLost?.(); });

  canvas.dataset.renderer = 'webgl';
  canvas.dataset.paused = String(state.paused || state.reduced);
  return {
   select(i, animate = true) {
    state.selected = i;
    const target = FRONT - i * TAU / 5;
    if (!animate || state.reduced) { state.yaw = target; state.dur = 0; }
    else { state.from = state.yaw; state.target = target; state.t0 = performance.now(); state.dur = 720; }
    state.dirty = true; wake();
   },
   setVisible(v) { state.visible = v; if (v) { state.dirty = true; state.last = 0; resize(); wake(); } },
   setMotion({ paused, reduced }) { if (paused !== undefined) state.paused = paused; if (reduced !== undefined) state.reduced = reduced; canvas.dataset.paused = String(state.paused || state.reduced); state.dirty = true; wake(); },
   setInset(v) { if (Math.abs(v - state.inset) > .002) { state.inset = v; state.dirty = true; wake(); } },
   get frame() { return state.frame; },
  };
 }
 window.HelmTable = { create };
})();
