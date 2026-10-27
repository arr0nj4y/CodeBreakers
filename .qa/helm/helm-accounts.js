/* HELM accounts: local player profiles (name + 4-digit PIN), class codes that
   link a player to a teacher, a labeled demo class, and automatic roster updates.
   Progress stays on this device or the classroom network (.qa/serve.cjs); nothing
   goes to the internet. The game's own save keys are unchanged: each profile keeps
   a snapshot of them, and signing in swaps the snapshot into place. */
(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const qs = (s, r = document) => r.querySelector(s), qsa = (s, r = document) => [...r.querySelectorAll(s)];
 const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
 const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
 const icon = name => `<svg class="ico" aria-hidden="true"><use href="#i-${name}"/></svg>`;
 const sfx = name => window.HelmAudio?.sfx(name);

 const ACCOUNTS = 'cb-accounts-v1', CLASSES = 'cb-classes-v1', SESSION = 'cb-session-v1', REMEMBER = 'cb-remember-v1';
 const PLAYER_KEYS = ['codebreakers-deluxe-v1', 'cb-arcade-progress-v1', 'cb-combat-stats', 'cb-learning-evidence-v1', 'cb-stellar-pilot-v1', 'cb-learning-focus', 'cb-learning-text-size'];
 const ARCADE_LENGTHS = { bug: 3, network: 2, cipher: 3, factory: 3, database: 3, forensics: 3, circuit: 3, bot: 3, api: 3, sprint: 3 };
 const AVATARS = 8, GUEST = 'guest', DEMO_PIN = '1234';
 const slot = id => 'cb-player-' + id;
 const parse = (raw, fallback) => { try { const v = JSON.parse(raw); return v ?? fallback; } catch (_) { return fallback; } };
 const read = (k, fallback) => { try { return parse(localStorage.getItem(k), fallback); } catch (_) { return fallback; } };
 const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { } };
 const uid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
 const hash = s => { let h = 0x811c9dc5; for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
 const pinHash = (id, pin) => hash(`cb:${id}:${pin}`) + hash(`${pin}:${id}:cb`);

 // ------------------------------------------------------------ class codes
 // 31 unambiguous characters; the sixth character is a checksum so typos are caught offline.
 const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
 const checksum = five => ALPHABET[[...five].reduce((sum, ch, i) => sum + ALPHABET.indexOf(ch) * (i + 3), 7) % ALPHABET.length];
 const makeCode = five => { const body = five || Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join(''); const full = body + checksum(body); return full.slice(0, 3) + '-' + full.slice(3); };
 function normalizeCode(raw) {
  const chars = String(raw || '').toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  if (chars.length !== 6 || [...chars].some(c => !ALPHABET.includes(c))) return null;
  if (checksum(chars.slice(0, 5)) !== chars[5]) return null;
  return chars.slice(0, 3) + '-' + chars.slice(3);
 }

 // ------------------------------------------------------------ stores
 const clean = s => ({ version: 1, owner: typeof s?.owner === 'string' ? s.owner : null, accounts: Array.isArray(s?.accounts) ? s.accounts.filter(a => a && typeof a.id === 'string' && typeof a.name === 'string') : [] });
 let store = clean(read(ACCOUNTS, null));
 const saveStore = () => write(ACCOUNTS, store);
 let classes = (() => { const c = read(CLASSES, null); return { active: typeof c?.active === 'string' ? c.active : null, list: Array.isArray(c?.list) ? c.list.filter(x => x && normalizeCode(x.code)) : [] }; })();
 const saveClasses = () => write(CLASSES, classes);
 const activeClass = () => classes.list.find(c => c.code === classes.active) || null;
 const findAccount = id => store.accounts.find(a => a.id === id) || null;

 function sessionId() { try { return sessionStorage.getItem(SESSION) || localStorage.getItem(REMEMBER) || ''; } catch (_) { return ''; } }
 function setSession(id, remember) { try { sessionStorage.setItem(SESSION, id); if (remember && id !== GUEST) localStorage.setItem(REMEMBER, id); else localStorage.removeItem(REMEMBER); } catch (_) { } }
 function clearSession() { try { sessionStorage.removeItem(SESSION); localStorage.removeItem(REMEMBER); } catch (_) { } }
 function liveData() { const data = {}; for (const k of PLAYER_KEYS) { try { const v = localStorage.getItem(k); if (v != null) data[k] = v; } catch (_) { } } return data; }
 function snapshot(id) { if (!id) return; const data = liveData(); data.__savedAt = Date.now(); write(slot(id), data); }
 function restore(id) { const data = read(slot(id), {}) || {}; for (const k of PLAYER_KEYS) { try { if (typeof data[k] === 'string') localStorage.setItem(k, data[k]); else localStorage.removeItem(k); } catch (_) { } } }
 // Puts a profile's saved progress into the live save keys. Returns true when a reload is needed.
 function becomeOwner(id) {
  if (store.owner === id) return false;
  if (store.owner) snapshot(store.owner);
  restore(id);
  store.owner = id; saveStore();
  return true;
 }
 function current() {
  const id = sessionId();
  if (id === GUEST) return { id: GUEST, name: 'Guest', guest: true, avatar: 3 };
  return findAccount(id);
 }

 // ------------------------------------------------------------ reports (same shape as the export file)
 function reportFrom(data, account) {
  const s = parse(data['codebreakers-deluxe-v1'], {}) || {}, raw = parse(data['cb-arcade-progress-v1'], {}) || {};
  const solved = {}; let axp = 0;
  for (const [name, len] of Object.entries(ARCADE_LENGTHS)) { const o = raw[name]; solved[name] = Array.isArray(o?.solved) ? [...new Set(o.solved.filter(n => Number.isInteger(n) && n >= 0 && n < len))] : []; axp += Math.max(0, Math.min(100000, Number(o?.xp) || 0)); }
  return {
   format: 'codebreakers-progress-v1', student: account.name,
   missions: Array.isArray(s.cleared) ? [...new Set(s.cleared)].filter(x => Number.isInteger(x) && x >= 0 && x < 15) : [],
   xp: Math.max(0, Number(s.xp) || 0), combatWins: Math.max(0, Number(parse(data['cb-combat-stats'], {})?.wins) || 0),
   arcade: { solved, xp: Math.floor(axp) }, learning: window.CBLearning?.cleanReport(parse(data['cb-learning-evidence-v1'], null)),
   classCode: account.classCode || '', accountId: account.id, avatar: account.avatar || 0, demo: !!account.demo,
   exportedAt: new Date(data.__savedAt || Date.now()).toISOString(), source: 'device',
  };
 }

 // ------------------------------------------------------------ demo class
 const DEMO_CODE = makeCode('DEM2A');
 const DEMO_STUDENTS = [
  ['Andrea Villanueva', [0, 1, 2, 3, 4, 5, 6, 7, 10, 11], 1490, 6, { bug: [0, 1, 2], network: [0, 1], cipher: [0, 1, 2], circuit: [0, 1] }, 4, { 0: 'transfer', 1: 'independent', 3: 'independent' }],
  ['Miguel Santos', [0, 1, 2], 410, 2, { bug: [0], cipher: [0] }, 1, { 0: 'independent', 1: 'supported' }],
  ['Bea Ramirez', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], 2280, 9, { bug: [0, 1, 2], network: [0, 1], database: [0, 1, 2], forensics: [0, 1, 2], api: [0, 1] }, 6, { 0: 'retained', 1: 'transfer', 3: 'transfer' }],
  ['Paolo Cruz', [0], 150, 1, {}, 0, { 0: 'supported' }],
  ['Jasmine Dela Cruz', [0, 1, 3, 4], 620, 3, { database: [0, 1], forensics: [0] }, 2, { 0: 'independent', 1: 'independent', 3: 'supported' }],
  ['Carlo Mendoza', [0, 1, 2, 3, 4, 5], 880, 4, { sprint: [0, 1, 2], api: [0] }, 3, { 0: 'independent', 1: 'transfer', 3: 'supported' }],
  ['Trisha Gonzales', [], 40, 0, {}, 0, { 0: 'practicing' }],
  ['Nico Bautista', [0, 1, 2, 3, 4, 5, 6, 7, 8], 1210, 5, { bot: [0, 1, 2], factory: [0, 1] }, 5, { 0: 'independent', 1: 'independent', 3: 'transfer' }],
 ];
 function demoEvidence(levels, k) {
  const day = 86400000, now = Date.now(), missions = {};
  for (const [id, level] of Object.entries(levels)) {
   const m = { attempts: 2 + k % 3, completed: 0, supported: 0, independent: 0, transfer: 0, retained: 0, hints: 0, examples: 0, predictions: 1, predictionsCorrect: 0, lastPracticed: now - (k + 1) * day, lastIndependentAt: 0, lastTransferAt: 0, errors: { syntax: k % 3, collision: 1 + k % 2, hazard: 0, checkpoint: k % 2 }, reflection: '' };
   if (level !== 'practicing') m.completed = 1;
   if (level === 'supported') { m.supported = 1; m.hints = 2; m.examples = 1; }
   if (['independent', 'transfer', 'retained'].includes(level)) { m.completed = 2; m.independent = 1; m.lastIndependentAt = now - 3 * day; m.predictionsCorrect = 1; }
   if (['transfer', 'retained'].includes(level)) { m.completed = 3; m.transfer = 1; m.lastTransferAt = now - 2 * day; }
   if (level === 'retained') { m.completed = 4; m.retained = 1; m.lastTransferAt = now - 3 * day; }
   missions[id] = m;
  }
  return { version: 1, missions };
 }
 function loadDemoClass() {
  if (!classes.list.some(c => c.code === DEMO_CODE)) classes.list.push({ code: DEMO_CODE, teacher: 'Demo teacher', className: 'Demo class (sample students)', createdAt: Date.now(), demo: true });
  classes.active = DEMO_CODE; saveClasses();
  DEMO_STUDENTS.forEach(([name, cleared, xp, streak, arcade, wins, levels], k) => {
   if (store.accounts.some(a => a.demo && a.name === name)) return;
   const id = 'demo' + k;
   const arc = {}; for (const [mode, list] of Object.entries(arcade)) arc[mode] = { solved: list, xp: list.length * 40 };
   write(slot(id), {
    'codebreakers-deluxe-v1': JSON.stringify({ xp, unlocked: 15, cleared, best: Object.fromEntries(cleared.map(i => [i, 12 + (i * 3 + k) % 11])), streak }),
    'cb-arcade-progress-v1': JSON.stringify(arc), 'cb-combat-stats': JSON.stringify({ wins }),
    'cb-learning-evidence-v1': JSON.stringify(demoEvidence(levels, k)), 'cb-stellar-pilot-v1': name,
    __savedAt: Date.now() - k * 3600000,
   });
   store.accounts.push({ id, name, pin: pinHash(id, DEMO_PIN), avatar: k % AVATARS, classCode: DEMO_CODE, classInfo: { teacher: 'Demo teacher', className: 'Demo class (sample students)' }, linkedAt: Date.now(), createdAt: Date.now(), demo: true });
  });
  saveStore();
  syncTeacher(true);
 }
 function removeDemoClass() {
  const reload = store.accounts.some(a => a.demo && a.id === store.owner);
  store.accounts.filter(a => a.demo).forEach(a => { try { localStorage.removeItem(slot(a.id)); } catch (_) { } });
  store.accounts = store.accounts.filter(a => !a.demo);
  if (reload) { store.owner = null; PLAYER_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch (_) { } }); clearSession(); }
  saveStore();
  classes.list = classes.list.filter(c => !c.demo);
  if (classes.active === DEMO_CODE) classes.active = classes.list[0]?.code || null;
  saveClasses();
  window.CBRoster?.replace(window.CBRoster.list().filter(x => !x.demo));
  if (reload) location.reload(); else renderClassPanel();
 }

 // ------------------------------------------------------------ class server (optional, same Wi-Fi)
 const server = { ok: false, addresses: [], port: location.port };
 const served = /^https?:$/.test(location.protocol);
 async function api(path, options) {
  const res = await fetch('/api/' + path, { headers: { 'Content-Type': 'application/json' }, cache: 'no-store', ...options });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error || 'Request failed'), { status: res.status });
  return body;
 }
 async function ping() {
  if (!served) return false;
  try { const r = await api('ping'); server.ok = r.server === 'codebreakers-class-server'; server.addresses = r.addresses || []; server.port = r.port || location.port; }
  catch (_) { server.ok = false; }
  return server.ok;
 }
 const registerClass = cls => server.ok && cls && !cls.demo ? api('class', { method: 'POST', body: JSON.stringify({ code: cls.code, teacher: cls.teacher, className: cls.className }) }).catch(() => { }) : Promise.resolve();
 async function classInfo(code) {
  const local = classes.list.find(c => c.code === code);
  if (local) return { teacher: local.teacher, className: local.className, source: 'device' };
  const own = store.accounts.find(a => a.classCode === code && a.classInfo);
  if (server.ok) { try { const r = await api('class/' + code + '/info'); return { teacher: r.teacher, className: r.className, source: 'server' }; } catch (e) { if (e.status === 404) return { missing: true }; } }
  return own ? { ...own.classInfo, source: 'device' } : null;
 }

 // Student side: push the signed-in player's report to the class server when it changes.
 let lastPushed = '', syncState = '';
 async function pushReport() {
  const me = current();
  if (!server.ok || !me || me.guest || me.demo || !me.classCode || !window.CBRoster) return;
  const report = window.CBRoster.report();
  const key = hash(JSON.stringify({ ...report, exportedAt: 0 }));
  if (key === lastPushed) return;
  try { await api('class/' + me.classCode + '/report', { method: 'POST', body: JSON.stringify({ report }) }); lastPushed = key; syncState = 'Synced ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch (e) { syncState = e.status === 404 ? 'This class is not on this class server' : 'Sync paused. Check the Wi-Fi.'; }
  const line = $('playerSync'); if (line) line.textContent = syncState;
 }

 // Teacher side: roster entries from this device and from the class server.
 function deviceEntries() {
  return store.accounts.filter(a => a.classCode && classes.list.some(c => c.code === a.classCode))
   .map(a => reportFrom(a.id === store.owner ? { ...liveData(), __savedAt: Date.now() } : read(slot(a.id), {}) || {}, a));
 }
 async function liveEntries() {
  const cls = activeClass();
  if (!server.ok || !cls || cls.demo) return [];
  try { const r = await api('class/' + cls.code); return (r.students || []).map(s => ({ ...s, learning: window.CBLearning?.cleanReport(s.learning), source: 'live', exportedAt: s.receivedAt || s.exportedAt })); }
  catch (_) { return []; }
 }
 let syncing = false;
 async function syncTeacher(force) {
  if (!window.CBRoster || syncing) return;
  syncing = true;
  try {
   const device = deviceEntries(), live = await liveEntries();
   const before = window.CBRoster.list(), merged = before.filter(x => (x.source || 'file') === 'file');
   for (const e of [...live, ...device]) {
    const i = merged.findIndex(x => e.accountId && x.accountId ? x.accountId === e.accountId : x.student === e.student);
    if (i >= 0) merged[i] = e; else merged.push(e);
   }
   if (force || JSON.stringify(merged) !== JSON.stringify(before)) window.CBRoster.replace(merged);
   const mine = device.filter(d => d.classCode === classes.active);
   counts.device = mine.length; counts.live = live.length; counts.linked = new Set([...mine, ...live].map(e => e.accountId || e.student)).size;
   renderClassPanel();
  } finally { syncing = false; }
 }
 const counts = { device: 0, live: 0, linked: 0 };

 // ------------------------------------------------------------ the "Who's playing?" gate and sign-up
 const avatarStyle = i => `background-image:var(--av-${Math.max(0, Math.min(AVATARS - 1, Number(i) || 0))})`;
 const classLine = a => a.demo ? 'Demo student' : a.classCode ? (a.classInfo?.className ? `${a.classInfo.className}` : `Class ${a.classCode}`) : 'Not in a class yet';
 let gate = null, wizard = null, pinFails = 0, lockedUntil = 0;
 function buildGate() {
  gate = el('div', 'gate'); gate.id = 'helmGate'; gate.hidden = true;
  gate.setAttribute('role', 'dialog'); gate.setAttribute('aria-modal', 'true'); gate.setAttribute('aria-labelledby', 'gateTitle');
  gate.innerHTML = `<div class="gate-panel"><img class="gate-logo" alt="" src="${esc(window.HELM_ASSETS?.logo || '')}"><div class="gate-body"></div></div>`;
  document.body.append(gate);
  gate.addEventListener('keydown', e => { if (e.key === 'Escape' && gate.dataset.dismissable === '1') closeGate(); });
 }
 const gateBody = () => qs('.gate-body', gate);
 function openGate(view = 'players', dismissable = false) { if (!gate) buildGate(); gate.hidden = false; gate.dataset.dismissable = dismissable ? '1' : ''; document.body.classList.add('gate-open'); render[view](); }
 function closeGate() { gate.hidden = true; document.body.classList.remove('gate-open'); }
 const render = {
  players() {
   const list = store.accounts.slice().sort((a, b) => (a.demo - b.demo) || a.name.localeCompare(b.name));
   gateBody().innerHTML = `<h1 id="gateTitle">Who's playing?</h1><p class="gate-lead">Pick your player and enter your PIN. Each player keeps their own progress on this device.</p>
    <div class="gate-players">${list.map(a => `<button type="button" class="gate-player" data-id="${esc(a.id)}"><i class="avatar" style="${avatarStyle(a.avatar)}"></i><span><b>${esc(a.name)}</b><small>${esc(classLine(a))}</small></span>${a.demo ? '<em class="badge">Demo</em>' : ''}</button>`).join('')}</div>
    <div class="gate-actions"><button type="button" class="btn-hazard" data-act="new">${icon('user-circle')}<span>New player</span></button><button type="button" data-act="guest">Play as guest</button>${gate.dataset.dismissable ? '<button type="button" class="btn-ghost" data-act="close">Cancel</button>' : ''}</div>`;
   qsa('.gate-player', gate).forEach(b => b.addEventListener('click', () => render.pin(b.dataset.id)));
   qs('[data-act="new"]', gate).addEventListener('click', () => startWizard());
   qs('[data-act="guest"]', gate).addEventListener('click', playGuest);
   qs('[data-act="close"]', gate)?.addEventListener('click', closeGate);
   qs('.gate-player, [data-act="new"]', gate)?.focus();
  },
  pin(id) {
   const a = findAccount(id); if (!a) return render.players();
   gateBody().innerHTML = `<form class="gate-form" novalidate><i class="avatar avatar-lg" style="${avatarStyle(a.avatar)}"></i><h1 id="gateTitle">${esc(a.name)}</h1><p class="gate-lead">${esc(classLine(a))}${a.demo ? ' · demo PIN ' + DEMO_PIN : ''}</p>
    <label class="field"><span>PIN</span><input id="gatePin" class="pin-input" inputmode="numeric" autocomplete="off" maxlength="4" pattern="[0-9]{4}" aria-describedby="gateError" required></label>
    <label class="check"><input type="checkbox" id="gateRemember" checked> Stay signed in on this device</label>
    <p class="form-error" id="gateError" role="alert"></p>
    <div class="gate-actions"><button type="submit" class="btn-hazard">${icon('player-play')}<span>Sign in</span></button><button type="button" class="btn-ghost" data-act="back">${icon('chevron-left')}<span>Back</span></button></div></form>`;
   const form = qs('form', gate), input = $('gatePin'), error = $('gateError');
   input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, '').slice(0, 4); error.textContent = ''; });
   qs('[data-act="back"]', gate).addEventListener('click', () => render.players());
   form.addEventListener('submit', e => {
    e.preventDefault();
    if (Date.now() < lockedUntil) { error.textContent = `Too many tries. Wait ${Math.ceil((lockedUntil - Date.now()) / 1000)} seconds.`; return; }
    if (!/^\d{4}$/.test(input.value)) { error.textContent = 'Enter your 4-digit PIN.'; return; }
    if (pinHash(a.id, input.value) !== a.pin) {
     pinFails++; sfx('error');
     if (pinFails >= 5) { lockedUntil = Date.now() + 30000; pinFails = 0; }
     error.textContent = 'That PIN does not match. Ask your teacher if you forgot it.'; input.select(); return;
    }
    pinFails = 0; signIn(a.id, $('gateRemember').checked);
   });
   input.focus();
  },
 };
 function signIn(id, remember) {
  setSession(id, remember);
  sfx('success');
  if (becomeOwner(id)) { location.reload(); return; }
  closeGate(); refreshAll();
 }
 function playGuest() { setSession(GUEST, false); if (becomeOwner(GUEST)) { location.reload(); return; } closeGate(); refreshAll(); }
 function signOut() { const me = current(); if (me && store.owner === me.id) snapshot(me.id); clearSession(); if (store.accounts.length) openGate('players'); refreshAll(); }

 // Three-step sign-up: name and helmet, PIN, then join the class.
 function startWizard() { if (!gate || gate.hidden) openGate('players', true); wizard = { step: 1, name: '', avatar: Math.floor(Math.random() * AVATARS), pin: '', remember: true, code: '', info: null }; renderWizard(); }
 function steps(n) { return `<ol class="wizard-steps" aria-label="Sign-up steps">${['Your player', 'PIN', 'Join your class'].map((t, i) => `<li class="${i + 1 === n ? 'on' : i + 1 < n ? 'done' : ''}"${i + 1 === n ? ' aria-current="step"' : ''}><span class="num">${i + 1}</span>${t}</li>`).join('')}</ol>`; }
 function renderWizard() {
  const w = wizard, body = gateBody();
  if (w.step === 1) {
   body.innerHTML = `${steps(1)}<form class="gate-form" novalidate><h1 id="gateTitle">Create your player</h1>
    <label class="field"><span>Your name</span><input id="wizName" maxlength="40" autocomplete="name" placeholder="First and last name" value="${esc(w.name)}"></label>
    <fieldset class="avatar-pick"><legend>Pick a helmet</legend>${Array.from({ length: AVATARS }, (_, i) => `<label><input type="radio" name="wizAvatar" value="${i}"${i === w.avatar ? ' checked' : ''}><i class="avatar" style="${avatarStyle(i)}"></i><span class="sr-only">Helmet ${i + 1}</span></label>`).join('')}</fieldset>
    <p class="form-error" id="wizError" role="alert"></p>
    <div class="gate-actions"><button type="submit" class="btn-hazard"><span>Next</span>${icon('chevron-right')}</button><button type="button" class="btn-ghost" data-act="back">${icon('chevron-left')}<span>Back</span></button></div></form>`;
   const form = qs('form', body);
   qs('[data-act="back"]', body).addEventListener('click', () => store.accounts.length ? render.players() : closeGate());
   form.addEventListener('submit', e => {
    e.preventDefault();
    const name = $('wizName').value.trim().replace(/\s+/g, ' ');
    if (name.length < 2) { $('wizError').textContent = 'Type your name (at least 2 letters).'; return; }
    if (store.accounts.some(a => a.name.toLowerCase() === name.toLowerCase())) { $('wizError').textContent = 'A player with that name is already on this device. Add your last name or initial.'; return; }
    w.name = name; w.avatar = Number(qs('input[name="wizAvatar"]:checked', body)?.value || 0); w.step = 2; renderWizard();
   });
   $('wizName').focus();
  } else if (w.step === 2) {
   body.innerHTML = `${steps(2)}<form class="gate-form" novalidate><h1 id="gateTitle">Choose a PIN</h1><p class="gate-lead">Four digits you will remember. It keeps classmates on a shared computer out of your progress.</p>
    <div class="field-row"><label class="field"><span>PIN</span><input id="wizPin" class="pin-input" inputmode="numeric" maxlength="4" autocomplete="off"></label><label class="field"><span>Type it again</span><input id="wizPin2" class="pin-input" inputmode="numeric" maxlength="4" autocomplete="off"></label></div>
    <label class="check"><input type="checkbox" id="wizRemember"${w.remember ? ' checked' : ''}> Stay signed in on this device</label>
    <p class="form-error" id="wizError" role="alert"></p>
    <div class="gate-actions"><button type="submit" class="btn-hazard"><span>Next</span>${icon('chevron-right')}</button><button type="button" class="btn-ghost" data-act="back">${icon('chevron-left')}<span>Back</span></button></div></form>`;
   qsa('.pin-input', body).forEach(i => i.addEventListener('input', () => { i.value = i.value.replace(/\D/g, '').slice(0, 4); }));
   qs('[data-act="back"]', body).addEventListener('click', () => { w.step = 1; renderWizard(); });
   qs('form', body).addEventListener('submit', e => {
    e.preventDefault();
    const a = $('wizPin').value, b = $('wizPin2').value;
    if (!/^\d{4}$/.test(a)) { $('wizError').textContent = 'Your PIN needs exactly 4 digits.'; return; }
    if (a !== b) { $('wizError').textContent = 'The two PINs do not match. Type them again.'; return; }
    w.pin = a; w.remember = $('wizRemember').checked; w.step = 3; renderWizard();
   });
   $('wizPin').focus();
  } else {
   body.innerHTML = `${steps(3)}<form class="gate-form" novalidate><h1 id="gateTitle">Join your class</h1><p class="gate-lead">Type the class code your teacher shows. Your progress will then appear on their dashboard.</p>
    <label class="field"><span>Class code</span><input id="wizCode" class="code-input" maxlength="7" autocomplete="off" autocapitalize="characters" placeholder="ABC-123" value="${esc(w.code)}"></label>
    <p class="form-note" id="wizInfo" aria-live="polite"></p><p class="form-error" id="wizError" role="alert"></p>
    <div class="gate-actions"><button type="submit" class="btn-hazard">${icon('users')}<span>Join and start</span></button><button type="button" data-act="skip">Skip for now</button><button type="button" class="btn-ghost" data-act="back">${icon('chevron-left')}<span>Back</span></button></div></form>`;
   const input = $('wizCode');
   input.addEventListener('input', () => { input.value = formatCodeTyping(input.value); $('wizError').textContent = ''; $('wizInfo').textContent = ''; });
   qs('[data-act="back"]', body).addEventListener('click', () => { w.step = 2; renderWizard(); });
   qs('[data-act="skip"]', body).addEventListener('click', () => finishWizard(''));
   qs('form', body).addEventListener('submit', async e => {
    e.preventDefault();
    const code = normalizeCode(input.value);
    if (!code) { $('wizError').textContent = 'That code does not look right. Check each letter and number on the board.'; return; }
    const info = await classInfo(code);
    if (info?.missing) { $('wizError').textContent = 'No class with that code is running on this class server. Check the code with your teacher.'; return; }
    w.info = info; finishWizard(code);
   });
   input.focus();
  }
 }
 const formatCodeTyping = v => { const c = v.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 6); return c.length > 3 ? c.slice(0, 3) + '-' + c.slice(3) : c; };
 function finishWizard(code) {
  const w = wizard, id = uid();
  const account = { id, name: w.name, pin: pinHash(id, w.pin), avatar: w.avatar, classCode: code, classInfo: code && w.info && !w.info.missing ? { teacher: w.info.teacher, className: w.info.className } : null, linkedAt: code ? Date.now() : 0, createdAt: Date.now() };
  // Progress made before any player existed (or as a guest) carries over to the first new player.
  const adopting = !store.owner || store.owner === GUEST;
  store.accounts.push(account);
  let reload = false;
  if (adopting) { store.owner = id; }
  else { if (store.owner) snapshot(store.owner); PLAYER_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch (_) { } }); store.owner = id; reload = true; }
  saveStore();
  try { localStorage.setItem('cb-stellar-pilot-v1', w.name); } catch (_) { }
  setSession(id, w.remember);
  wizard = null; sfx('success');
  if (reload) { location.reload(); return; }
  closeGate(); refreshAll(); pushReport();
  window.HelmUI?.toast(code ? `Welcome, ${w.name}. You joined class ${code}.` : `Welcome, ${w.name}. You can join a class later from Player.`);
 }

 // ------------------------------------------------------------ player dialog (rail "Player")
 let dialog = null;
 function buildDialog() {
  dialog = el('div', 'player-dialog-backdrop'); dialog.id = 'playerDialog'; dialog.hidden = true;
  dialog.innerHTML = `<div class="player-dialog" role="dialog" aria-modal="true" aria-labelledby="playerTitle"><button type="button" class="dialog-close" data-act="close" aria-label="Close">${icon('x')}</button><div class="player-body"></div></div>`;
  document.body.append(dialog);
  dialog.addEventListener('click', e => { if (e.target === dialog || e.target.closest('[data-act="close"]')) closeDialog(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && dialog && !dialog.hidden) closeDialog(); });
 }
 function openDialog() { if (!dialog) buildDialog(); dialog.hidden = false; renderDialog(); qs('.dialog-close', dialog).focus(); }
 function closeDialog() { if (dialog) dialog.hidden = true; }
 function renderDialog(joining) {
  const me = current(), body = qs('.player-body', dialog);
  const stats = `<div class="profile-report"><div><span>Missions solved</span><b>${(save.cleared || []).length} / ${L.length}</b></div><div><span>Experience</span><b>${save.xp || 0} XP</b></div></div>`;
  if (!me || me.guest) {
   body.innerHTML = `<h2 id="playerTitle">${me ? 'Playing as guest' : 'No player signed in'}</h2><p>Create a player to keep your own progress and link it to your teacher's class.${store.accounts.length ? ' Already have one? Sign in.' : ''}</p>${stats}
    <div class="gate-actions"><button type="button" class="btn-hazard" data-act="new">${icon('user-circle')}<span>Create a player</span></button>${store.accounts.length ? `<button type="button" data-act="switch">Sign in</button>` : ''}</div>`;
  } else {
   const linked = me.classCode;
   body.innerHTML = `<div class="player-top"><i class="avatar avatar-lg" style="${avatarStyle(me.avatar)}"></i><div><h2 id="playerTitle">${esc(me.name)}</h2><p class="player-class">${linked ? `${icon('users')}<span>${esc(me.classInfo?.className ? me.classInfo.className + ' · ' + (me.classInfo.teacher || '') : 'Class ' + me.classCode)}</span>` : '<span>Not linked to a class yet</span>'}</p>${me.demo ? '<em class="badge">Demo student</em>' : ''}</div></div>${stats}
    ${linked && served ? `<p class="form-note" id="playerSync">${esc(syncState || (server.ok ? 'Live sync on' : 'Class server not reachable'))}</p>` : ''}
    <form class="join-form"${joining || !linked ? '' : ' hidden'} novalidate><label class="field"><span>${linked ? 'New class code' : 'Class code from your teacher'}</span><input id="joinCode" class="code-input" maxlength="7" autocomplete="off" placeholder="ABC-123"></label><p class="form-error" id="joinError" role="alert"></p><button type="submit" class="btn-hazard">${icon('users')}<span>${linked ? 'Change class' : 'Join class'}</span></button></form>
    <div class="gate-actions">${linked && !joining ? `<button type="button" data-act="join">Change class</button>` : ''}<button type="button" data-act="switch">${icon('users')}<span>Switch player</span></button><button type="button" class="btn-ghost" data-act="signout">Sign out</button></div>`;
   const form = qs('.join-form', body), input = $('joinCode');
   input?.addEventListener('input', () => { input.value = formatCodeTyping(input.value); $('joinError').textContent = ''; });
   form?.addEventListener('submit', async e => {
    e.preventDefault();
    const code = normalizeCode(input.value);
    if (!code) { $('joinError').textContent = 'That code does not look right. Check each letter and number.'; return; }
    const info = await classInfo(code);
    if (info?.missing) { $('joinError').textContent = 'No class with that code is running on this class server.'; return; }
    const acct = findAccount(me.id); acct.classCode = code; acct.classInfo = info ? { teacher: info.teacher, className: info.className } : null; acct.linkedAt = Date.now(); saveStore();
    lastPushed = ''; sfx('success'); renderDialog(); refreshAll(); pushReport();
    window.HelmUI?.toast(`Linked to ${info?.className || 'class ' + code}.`);
   });
  }
  qs('[data-act="new"]', body)?.addEventListener('click', () => { closeDialog(); startWizard(); });
  qs('[data-act="switch"]', body)?.addEventListener('click', () => { closeDialog(); openGate('players', true); });
  qs('[data-act="join"]', body)?.addEventListener('click', () => renderDialog(true));
  qs('[data-act="signout"]', body)?.addEventListener('click', () => { closeDialog(); signOut(); });
 }

 // ------------------------------------------------------------ teacher class panel
 let panel = null;
 function buildClassPanel() {
  const layout = qs('#teacherScreen .stellar-teacher-layout'); if (!layout) return;
  panel = el('section', 'class-panel'); panel.id = 'classPanel'; panel.setAttribute('aria-label', 'Your class');
  layout.before(panel);
  renderClassPanel();
 }
 function renderClassPanel() {
  if (!panel) return;
  const cls = activeClass(), linked = cls ? store.accounts.filter(a => a.classCode === cls.code).length : 0;
  const liveText = !served ? `<b>Same-device updates are on.</b> Players who sign in on this computer appear below automatically. For students on their own phones or laptops, start the class server here (<code>node .qa/serve.cjs</code>) and open the address it prints.`
   : server.ok ? `<b>Live updates are on.</b> Students on this Wi-Fi open ${server.addresses.length ? server.addresses.map(a => `<code>http://${esc(a)}:${esc(server.port)}</code>`).join(' or ') : 'this page'} and join with the code. Their progress appears here within a few seconds.`
    : '<b>Class server not reachable.</b> Same-device players still update automatically.';
  if (!cls) {
   panel.innerHTML = `<div class="class-empty"><h2>Set up your class</h2><p>Create a class to get a code. Students type it in the last sign-up step, and their progress then shows up here automatically.</p>
    <form class="class-create" novalidate><label class="field"><span>Teacher name</span><input id="classTeacher" maxlength="60" placeholder="e.g. Ms. Reyes" autocomplete="name"></label><label class="field"><span>Class name</span><input id="classNameInput" maxlength="60" placeholder="e.g. ICT 11 - Rizal"></label><button type="submit" class="btn-hazard">${icon('users')}<span>Create class</span></button></form>
    <p class="form-error" id="classError" role="alert"></p>
    <div class="class-demo"><button type="button" data-act="demo">${icon('sparkles')}<span>Load demo class</span></button><span>Adds 8 sample students, marked Demo, so you can try every view. Remove them any time.</span></div></div>`;
  } else {
   const options = classes.list.map(c => `<option value="${esc(c.code)}"${c.code === cls.code ? ' selected' : ''}>${esc(c.className)} (${esc(c.code)})</option>`).join('');
   panel.innerHTML = `<div class="class-top"><div class="class-code-block"><span class="class-code-label">Class code</span><span class="class-code" id="classCode">${esc(cls.code)}</span></div>
    <div class="class-meta"><h2>${esc(cls.className)}</h2><p>${esc(cls.teacher)}${cls.demo ? ' · <em class="badge">Demo</em>' : ''}</p><p class="class-counts"><b class="num">${Math.max(linked, counts.linked)}</b> linked · <b class="num">${counts.device}</b> on this device · <b class="num">${counts.live}</b> live</p></div>
    <div class="class-actions"><button type="button" data-act="project">${icon('focus-2')}<span>Show code</span></button>${classes.list.length > 1 ? `<label class="class-switch"><span class="sr-only">Switch class</span><select id="classSwitch">${options}</select></label>` : ''}<button type="button" class="btn-ghost" data-act="new">${icon('users')}<span>New class</span></button>${cls.demo ? `<button type="button" class="warn" data-act="remove-demo">${icon('trash')}<span>Remove demo class</span></button>` : ''}</div></div>
    <p class="class-howto">Students: create a player, then type <b>${esc(cls.code)}</b> in the <b>Join your class</b> step (or Player, then Join class).${cls.demo ? ` Demo students sign in with PIN <b>${DEMO_PIN}</b>.` : ''}</p>
    <p class="class-live" data-on="${served && server.ok ? '1' : ''}">${liveText}</p>`;
   $('classSwitch')?.addEventListener('change', e => { classes.active = e.target.value; saveClasses(); registerClass(activeClass()); syncTeacher(true); });
  }
  qs('.class-create', panel)?.addEventListener('submit', e => {
   e.preventDefault();
   const teacher = $('classTeacher').value.trim(), name = $('classNameInput').value.trim();
   if (!teacher || !name) { $('classError').textContent = 'Add your name and a class name.'; return; }
   const cls2 = { code: makeCode(), teacher, className: name, createdAt: Date.now() };
   classes.list.push(cls2); classes.active = cls2.code; saveClasses(); registerClass(cls2); sfx('success'); renderClassPanel();
  });
  qs('[data-act="demo"]', panel)?.addEventListener('click', () => { loadDemoClass(); sfx('success'); });
  qs('[data-act="new"]', panel)?.addEventListener('click', () => { classes.active = null; saveClasses(); renderClassPanel(); $('classTeacher')?.focus(); });
  qs('[data-act="remove-demo"]', panel)?.addEventListener('click', removeDemoClass);
  qs('[data-act="project"]', panel)?.addEventListener('click', () => projectCode(cls));
 }
 function projectCode(cls) {
  const o = el('div', 'code-projector'); o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', 'Class code');
  o.innerHTML = `<p>Join <b>${esc(cls.className)}</b></p><div class="projector-code">${esc(cls.code)}</div><p>Create a player, then type this code in the <b>Join your class</b> step.</p>${served && server.ok && server.addresses[0] ? `<p class="projector-url">Open <b>http://${esc(server.addresses[0])}:${esc(server.port)}</b></p>` : ''}<button type="button" class="btn-ghost">${icon('x')}<span>Close</span></button>`;
  document.body.append(o);
  const close = () => o.remove();
  qs('button', o).addEventListener('click', close); qs('button', o).focus();
  o.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
 }
 // Source badges on roster rows (Demo / This device / Live / File).
 function badgeRows() {
  const cls = activeClass();
  qsa('#teacherRows tr[data-source]').forEach(tr => {
   const cell = tr.firstElementChild; if (!cell || qs('.src-badge', cell)) return;
   const src = tr.dataset.demo ? 'demo' : tr.dataset.source;
   const label = { demo: 'Demo', device: 'This device', live: 'Live', file: 'File' }[src] || 'File';
   const b = el('span', 'src-badge', label); b.dataset.src = src; cell.append(b);
   if (cls && tr.dataset.classCode && tr.dataset.classCode !== cls.code) { const o = el('span', 'src-badge', 'Other class'); o.dataset.src = 'other'; cell.append(o); }
  });
 }

 // ------------------------------------------------------------ deck strip + wiring
 function refreshAll() {
  const me = current(), strip = $('accountStrip');
  if (strip) {
   if (!me) strip.innerHTML = `<span>Playing without a player profile.</span><button type="button" data-act="new">${icon('user-circle')}<span>Create a player</span></button>${store.accounts.length ? '<button type="button" class="btn-ghost" data-act="switch">Sign in</button>' : ''}`;
   else if (me.guest) strip.innerHTML = `<span>Playing as guest. Progress is not linked to a class.</span><button type="button" data-act="new">${icon('user-circle')}<span>Create a player</span></button><button type="button" class="btn-ghost" data-act="switch">Sign in</button>`;
   else if (!me.classCode) strip.innerHTML = `<i class="avatar" style="${avatarStyle(me.avatar)}"></i><span><b>${esc(me.name)}</b> is not linked to a class yet.</span><button type="button" data-act="join">${icon('users')}<span>Join your class</span></button>`;
   else strip.innerHTML = `<i class="avatar" style="${avatarStyle(me.avatar)}"></i><span><b>${esc(me.name)}</b> · ${esc(me.classInfo?.className || 'Class ' + me.classCode)}</span>`;
   qs('[data-act="new"]', strip)?.addEventListener('click', startWizard);
   qs('[data-act="switch"]', strip)?.addEventListener('click', () => openGate('players', true));
   qs('[data-act="join"]', strip)?.addEventListener('click', () => { openDialog(); renderDialog(true); $('joinCode')?.focus(); });
  }
  window.HelmUI?.syncPilot();
 }
 let teacherTimer = 0;
 function onScreen(name) {
  clearInterval(teacherTimer);
  if (name === 'teacher') { if (!panel) buildClassPanel(); ping().then(() => { mergeServerClasses(); syncTeacher(); }); teacherTimer = setInterval(() => syncTeacher(), 4000); }
 }
 async function mergeServerClasses() {
  if (!server.ok) return;
  try { const r = await api('classes'); let changed = false; for (const c of r.classes || []) if (normalizeCode(c.code) && !classes.list.some(x => x.code === c.code)) { classes.list.push({ code: c.code, teacher: c.teacher, className: c.className, createdAt: c.createdAt }); changed = true; } if (changed) { if (!classes.active) classes.active = classes.list[0].code; saveClasses(); renderClassPanel(); } } catch (_) { }
 }
 function init() {
  // Keep a signed-in session pointed at its own progress (another tab may have switched).
  const id = sessionId();
  if (id && (id === GUEST || findAccount(id)) && store.owner !== id) { if (becomeOwner(id)) { location.reload(); return; } }
  if (id && id !== GUEST && !findAccount(id)) clearSession();
  new MutationObserver(badgeRows).observe($('teacherRows'), { childList: true });
  ping().then(ok => { if (ok) { pushReport(); setInterval(pushReport, 8000); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pushReport(); });
  refreshAll();
  if (store.accounts.length && !current()) openGate('players');
 }

 window.CBAccounts = {
  init, onScreen, openDialog, openGate: () => openGate('players', true), startWizard, current,
  name: () => { const me = current(); return me && !me.guest ? me.name : ''; },
  exportFields: () => { const me = current(); return me && !me.guest ? { classCode: me.classCode || undefined, accountId: me.id, avatar: me.avatar } : {}; },
  normalizeCode, makeCode,
 };
})();
