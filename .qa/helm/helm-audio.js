/* HELM audio: a synthesized soundtrack and effects built with Web Audio.
   No audio files ship. The original <audio> elements stay in the page and keep
   their API (play, pause, volume), so every existing toggle and slider drives
   this engine unchanged. Three moods crossfade by screen: deck, mission, combat. */
(() => {
 'use strict';
 const AC = window.AudioContext || window.webkitAudioContext;
 let ctx = null, comp, master, musicBus, sfxBus, reverb, delay, noise, padFilter;
 const layers = {};
 let musicWanted = false, running = false, stopTimer = 0;
 let musicVol = 0.3, sfxVol = 0.6;
 let theme = 'deck', pending = 'deck', nextTime = 0, step = 0, chord = 0, barInChord = 0, seed = 7, timer = 0;

 const THEMES = {
  deck: { bpm: 74, bars: 2, gains: { pad: 1, bass: .75, arp: .5, drums: 0, brass: 0, ping: 1 } },
  mission: { bpm: 96, bars: 1, gains: { pad: .62, bass: .85, arp: .8, drums: .5, brass: 0, ping: .25 } },
  combat: { bpm: 124, bars: 1, gains: { pad: .5, bass: 1, arp: .55, drums: 1, brass: .75, ping: 0 } },
 };
 // D minor world. Each chord: bass root, pad voicing, arpeggio tones (MIDI).
 const PROG = {
  deck: [[38, [50, 57, 62, 65, 69], [62, 65, 69, 72, 74]], [34, [46, 53, 58, 62, 65], [58, 62, 65, 69, 70]],
   [41, [53, 57, 60, 65, 67], [60, 65, 67, 69, 72]], [36, [48, 55, 60, 62, 67], [60, 62, 67, 72, 74]]],
  mission: [[38, [50, 57, 62, 65], [62, 65, 69, 74]], [36, [48, 55, 60, 64], [60, 64, 67, 72]],
   [34, [46, 53, 58, 62], [58, 62, 65, 70]], [36, [48, 55, 60, 62], [60, 62, 67, 72]]],
  combat: [[38, [50, 57, 62, 65], [62, 65, 69, 74]], [34, [46, 53, 58, 62], [58, 62, 65, 70]],
   [36, [48, 55, 60, 64], [60, 64, 67, 72]], [33, [45, 52, 57, 61], [57, 61, 64, 69]]],
 };
 const hz = m => 440 * Math.pow(2, (m - 69) / 12);
 const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

 function build() {
  if (ctx || !AC) return !!ctx;
  ctx = new AC();
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 3.5; comp.attack.value = .01; comp.release.value = .2;
  master = ctx.createGain(); master.gain.value = .9;
  master.connect(comp).connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = sfxVol; sfxBus.connect(master);
  // Reverb from a generated decaying-noise impulse.
  reverb = ctx.createConvolver();
  const len = ctx.sampleRate * 3.4, ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  reverb.buffer = ir;
  const wet = ctx.createGain(); wet.gain.value = .42; reverb.connect(wet).connect(musicBus);
  delay = ctx.createDelay(1.5);
  const fb = ctx.createGain(), tone = ctx.createBiquadFilter(), dwet = ctx.createGain();
  fb.gain.value = .34; tone.type = 'lowpass'; tone.frequency.value = 2800; dwet.gain.value = .5;
  delay.connect(tone).connect(fb).connect(delay); delay.connect(dwet).connect(musicBus);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  padFilter = ctx.createBiquadFilter(); padFilter.type = 'lowpass'; padFilter.frequency.value = 1150; padFilter.Q.value = .6;
  const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
  lfo.frequency.value = .055; lfoGain.gain.value = 420; lfo.connect(lfoGain).connect(padFilter.frequency); lfo.start();
  for (const name of ['pad', 'bass', 'arp', 'drums', 'brass', 'ping']) {
   layers[name] = ctx.createGain(); layers[name].gain.value = THEMES.deck.gains[name]; layers[name].connect(musicBus);
  }
  padFilter.connect(layers.pad);
  document.addEventListener('visibilitychange', () => {
   if (!ctx) return;
   if (document.hidden) ctx.suspend(); else if (musicWanted || running) ctx.resume();
  });
  return true;
 }

 function voice(type, freq, t, dur, dest, o = {}) {
  const osc = ctx.createOscillator(), g = ctx.createGain(), peak = o.gain ?? .2, a = o.attack ?? .004, r = o.release ?? .08;
  osc.type = type; osc.frequency.setValueAtTime(freq, t);
  if (o.detune) osc.detune.value = o.detune;
  if (o.glide) osc.frequency.exponentialRampToValueAtTime(o.glide, t + (o.glideTime ?? dur));
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.setTargetAtTime(0, t + Math.max(a, dur), r / 3);
  osc.connect(g); g.connect(dest);
  if (o.send) { const s = ctx.createGain(); s.gain.value = o.send; g.connect(s); s.connect(o.sendTo || reverb); }
  osc.start(t); osc.stop(t + dur + r * 2.5 + .05);
  return osc;
 }
 function burst(t, dur, filterType, freq, gain, dest, q = .8) {
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noise; f.type = filterType; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  src.connect(f).connect(g).connect(dest); src.start(t, rand() * .5); src.stop(t + dur + .02);
 }

 // ------------------------------------------------------------ music voices
 function pad(t, notes, dur) {
  for (const n of notes) for (const d of [-7, 7]) voice('sawtooth', hz(n), t, dur, padFilter, { gain: .022, attack: 1.1, release: 1.6, detune: d, send: .5 });
 }
 function bassNote(t, root, dur, kind) {
  if (kind === 'deck') { voice('sine', hz(root), t, dur, layers.bass, { gain: .3, attack: .35, release: 1.2 }); voice('triangle', hz(root + 12), t, dur, layers.bass, { gain: .05, attack: .5, release: 1 }); return; }
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 4;
  f.frequency.setValueAtTime(kind === 'combat' ? 1500 : 900, t); f.frequency.exponentialRampToValueAtTime(260, t + .16); f.connect(layers.bass);
  voice(kind === 'combat' ? 'sawtooth' : 'triangle', hz(root), t, dur, f, { gain: kind === 'combat' ? .16 : .22, release: .07 });
  voice('sine', hz(root - 12), t, dur, layers.bass, { gain: .16, release: .08 });
 }
 function arpNote(t, n, kind) {
  if (kind === 'deck') { voice('sine', hz(n + 12), t, .05, layers.arp, { gain: .05, release: .9, send: .6, sendTo: reverb }); voice('triangle', hz(n), t, .05, layers.arp, { gain: .035, release: .7, send: .4, sendTo: delay }); return; }
  voice('square', hz(n + 12), t, .06, layers.arp, { gain: kind === 'combat' ? .026 : .03, release: .09, send: .45, sendTo: delay });
 }
 function kick(t) { voice('sine', 150, t, .12, layers.drums, { gain: .9, release: .28, glide: 42, glideTime: .12 }); }
 function snare(t) { burst(t, .17, 'bandpass', 1900, .32, layers.drums); voice('triangle', 190, t, .03, layers.drums, { gain: .12, release: .07 }); }
 function hat(t, accent) { burst(t, accent ? .05 : .03, 'highpass', 7600, accent ? .1 : .06, layers.drums); }
 function ping(t) { voice('sine', hz(88), t, .02, layers.ping, { gain: .06, release: 2.4, send: .9 }); voice('sine', hz(95), t + .19, .02, layers.ping, { gain: .025, release: 1.8, send: .9 }); }
 function brass(t, notes) {
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.1;
  f.frequency.setValueAtTime(500, t); f.frequency.exponentialRampToValueAtTime(1500, t + .08); f.frequency.exponentialRampToValueAtTime(700, t + .4); f.connect(layers.brass);
  for (const n of notes.slice(0, 3)) voice('sawtooth', hz(n), t, .22, f, { gain: .07, attack: .02, release: .25, send: .3 });
 }

 function schedule(s, t) {
  const T = THEMES[theme], spb = 60 / T.bpm, prog = PROG[theme];
  if (s === 0) {
   if (pending !== theme) {
    theme = pending; chord = 0; barInChord = 0;
    for (const [name, g] of Object.entries(THEMES[theme].gains)) layers[name].gain.setTargetAtTime(g, t, .6);
    return schedule(s, t);
   }
   if (barInChord === 0) {
    const [root, voicing] = prog[chord];
    pad(t, voicing, spb * 4 * T.bars - .2);
    if (theme === 'deck') bassNote(t, root, spb * 4 * T.bars - .3, 'deck');
    if (theme === 'combat') brass(t, voicing);
   }
   if (theme === 'deck' && barInChord === 1) ping(t);
  }
  const [root, , tones] = prog[chord];
  if (theme === 'mission') {
   if ([0, 3, 6, 8, 11, 14].includes(s)) bassNote(t, s === 6 || s === 14 ? root + 12 : root, spb * .22, 'mission');
   arpNote(t, tones[[0, 1, 2, 3, 2, 1, 0, 1][s % 8] % tones.length], 'mission');
   if (s === 0 || s === 8) kick(t);
   if (s === 12) snare(t);
   if (s % 4 === 2) hat(t, false);
  } else if (theme === 'combat') {
   if (s % 2 === 0) bassNote(t, s === 6 || s === 14 ? root + 12 : root, spb * .2, 'combat');
   if (s % 2 === 0) arpNote(t, tones[(s / 2) % tones.length], 'combat');
   if ([0, 3, 8, 11].includes(s)) kick(t);
   if (s === 4 || s === 12) snare(t);
   hat(t, s % 2 === 1);
  } else if ([0, 6, 10].includes(s) && rand() > .25) {
   arpNote(t, tones[Math.floor(rand() * tones.length)], 'deck');
  }
  if (s === 15) { barInChord++; if (barInChord >= T.bars) { barInChord = 0; chord = (chord + 1) % prog.length; } }
 }

 function tick() {
  if (!running || !ctx) return;
  while (nextTime < ctx.currentTime + .14) {
   schedule(step, nextTime);
   nextTime += 60 / THEMES[theme].bpm / 4;
   step = (step + 1) % 16;
  }
 }

 function startMusic() {
  if (!build()) return Promise.reject(new Error('Web Audio unavailable'));
  clearTimeout(stopTimer);
  const go = () => {
   if (!running) { running = true; step = 0; barInChord = 0; nextTime = ctx.currentTime + .08; clearInterval(timer); timer = setInterval(tick, 30); }
   musicBus.gain.cancelScheduledValues(ctx.currentTime);
   musicBus.gain.setTargetAtTime(musicVol, ctx.currentTime, .5);
  };
  if (ctx.state === 'running') { go(); return Promise.resolve(); }
  return ctx.resume().then(go);
 }
 function stopMusic() {
  if (!ctx) return;
  musicBus.gain.cancelScheduledValues(ctx.currentTime);
  musicBus.gain.setTargetAtTime(0, ctx.currentTime, .25);
  clearTimeout(stopTimer);
  stopTimer = setTimeout(() => { running = false; clearInterval(timer); }, 1400);
 }

 // ------------------------------------------------------------ effects
 const FX = {
  tap(t) { voice('sine', 1180, t, .03, sfxBus, { gain: .16, release: .04 }); voice('sine', 1570, t + .045, .03, sfxBus, { gain: .13, release: .05 }); },
  select(t) { voice('triangle', 880, t, .07, sfxBus, { gain: .16, release: .06, glide: 1320, glideTime: .06 }); },
  step(t) { burst(t, .02, 'bandpass', 3200, .1, sfxBus, 2); voice('sine', 640, t, .015, sfxBus, { gain: .06, release: .03 }); },
  success(t) { [74, 77, 81, 86].forEach((n, i) => { voice('triangle', hz(n), t + i * .075, .08, sfxBus, { gain: .15, release: .3 }); voice('sine', hz(n + 12), t + i * .075, .05, sfxBus, { gain: .05, release: .4 }); }); },
  error(t) {
   const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; f.connect(sfxBus);
   voice('square', 155, t, .1, f, { gain: .16, release: .05, glide: 120 }); voice('square', 130, t + .14, .12, f, { gain: .16, release: .08, glide: 96 });
  },
  attack(t) { burst(t, .22, 'highpass', 2400, .22, sfxBus); voice('sawtooth', 900, t, .2, sfxBus, { gain: .12, release: .1, glide: 110 }); },
  defend(t) { [62, 69, 74].forEach(n => voice('sine', hz(n), t, .3, sfxBus, { gain: .07, attack: .12, release: .35 })); burst(t, .4, 'bandpass', 1200, .06, sfxBus, .5); },
  deploy(t) { voice('sine', 96, t, .3, sfxBus, { gain: .45, release: .4, glide: 38 }); burst(t + .02, .5, 'lowpass', 900, .16, sfxBus); voice('sawtooth', 220, t + .05, .3, sfxBus, { gain: .04, attack: .15, release: .2, glide: 660 }); },
 };
 function sfx(name) {
  if (!build()) return;
  const play = () => { try { (FX[name] || FX.tap)(ctx.currentTime + .005); } catch (_) { } };
  if (ctx.state === 'running') play(); else ctx.resume().then(play).catch(() => { });
 }

 // ------------------------------------------------------------ bind to the page's <audio> elements
 function hook() {
  const music = document.getElementById('musicTrack');
  if (music && !music.__helm) {
   music.__helm = true;
   let vol = musicVol;
   Object.defineProperty(music, 'volume', { configurable: true, get: () => vol, set: v => { vol = Math.max(0, Math.min(1, Number(v) || 0)); musicVol = Math.min(1, vol * 1.15); if (ctx && musicWanted) musicBus.gain.setTargetAtTime(musicVol, ctx.currentTime, .2); } });
   Object.defineProperty(music, 'paused', { configurable: true, get: () => !musicWanted });
   music.play = () => { musicWanted = true; return startMusic(); };
   music.pause = () => { musicWanted = false; stopMusic(); };
  }
  const map = { soundTap: 'tap', soundSuccess: 'success', soundError: 'error', soundAttack: 'attack', soundDefend: 'defend' };
  for (const [id, name] of Object.entries(map)) {
   const el = document.getElementById(id);
   if (!el || el.__helm) continue;
   el.__helm = true;
   let v = sfxVol;
   Object.defineProperty(el, 'volume', { configurable: true, get: () => v, set: x => { v = Math.max(0, Math.min(1, Number(x) || 0)); sfxVol = v; if (ctx) sfxBus.gain.setTargetAtTime(sfxVol, ctx.currentTime, .05); } });
   Object.defineProperty(el, 'currentTime', { configurable: true, get: () => 0, set: () => { } });
   el.pause = () => { };
   el.play = () => { sfx(name); return Promise.resolve(); };
  }
 }
 hook();

 window.HelmAudio = {
  setTheme(name) { if (THEMES[name]) pending = name; },
  sfx(name) { if (document.getElementById('sound')?.checked !== false) sfx(name); },
  unlock() { if (build() && ctx.state !== 'running') ctx.resume().catch(() => { }); },
  get playing() { return musicWanted && running; },
  get theme() { return theme; },
  get target() { return pending; },
 };
})();
