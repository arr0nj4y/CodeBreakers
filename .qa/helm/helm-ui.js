/* HELM UI: rebuilds the shell around the existing game. Every control the
   engine, code lab, arcade, teacher dashboard and learning layer created is
   moved (never cloned), so ids, listeners and saved progress stay intact. */
(() => {
 'use strict';
 if (window.__helmUI) return;
 window.__helmUI = true;
 const $ = id => document.getElementById(id);
 const qs = (s, r = document) => r.querySelector(s), qsa = (s, r = document) => [...r.querySelectorAll(s)];
 const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
 const icon = name => `<svg class="ico" aria-hidden="true"><use href="#i-${name}"/></svg>`;
 const safe = fn => { try { return fn(); } catch (error) { console.warn('HELM:', error); } };
 const app = qs('.app');
 const A = window.HELM_ASSETS || { planets: [], logo: '' };
 const WORLD_NAMES = ['Logic Labyrinth', 'Firewall Fortress', 'Encryption Vault', 'Network Nexus', "NULL's Core"];
 const WORLD_NOTES = (typeof worldDescriptions !== 'undefined' && worldDescriptions.length === 5) ? worldDescriptions : [
  'Build your first algorithms and navigate digital mazes.', 'Practice authentication, credentials, and access control.',
  'Recover encrypted data and avoid dangerous traps.', 'Repair network pathways using switches and portals.', 'Combine everything to defeat the rogue AI NULL.'];
 const AREA = { deck: 'var(--amber)', game: 'var(--amber)', arcade: 'var(--lilac)', combat: 'var(--coral)', teacher: 'var(--steel)' };
 const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
 const reduced = () => reducedQuery.matches || !!$('reducedMotion')?.checked;
 const sfx = name => window.HelmAudio?.sfx(name);

 document.documentElement.classList.add('helm');
 document.body.classList.add('helm');
 qsa('img[data-helm-logo]').forEach(img => { img.src = A.logo; img.alt = ''; });

 // ------------------------------------------------------------ campaign data helpers
 const worldMissions = w => L.map((m, i) => m.world === L[w * 2].world ? i : -1).filter(i => i >= 0);
 const worldOf = i => { for (let w = 0; w < 5; w++) if (worldMissions(w).includes(i)) return w; return 0; };
 const nextMission = () => { const n = L.findIndex((_, i) => !save.cleared.includes(i)); return n < 0 ? 0 : n; };
 const pad2 = n => String(n).padStart(2, '0');
 const pilotName = () => { try { return localStorage.getItem('cb-stellar-pilot-v1') || localStorage.getItem('cb-student-name') || 'Explorer'; } catch (_) { return 'Explorer'; } };

 // ------------------------------------------------------------ emoji and dash cleanup
 // Piece emoji become the Blender sprites; other symbols become icons or go.
 const PIECE = { '🤖': 'agent', '💎': 'core', '🔓': 'gate-open', '🔒': 'gate', '🗝': 'key', '🚪': 'door-open', '🔐': 'door', '💾': 'data', '⚡': 'hazard', '🔘': 'switch', '🟢': 'bridge-on', '⛔': 'bridge', '🌀': 'portal', '▦': 'wall' };
 const PIECE_NAME = { agent: 'agent', core: 'data core', 'gate-open': 'open gate', gate: 'checkpoint gate', key: 'keycard', 'door-open': 'open door', door: 'locked door', data: 'data fragment', hazard: 'hazard', switch: 'switch', 'switch-on': 'active switch', 'bridge-on': 'active bridge', bridge: 'inactive bridge', portal: 'portal', wall: 'firewall' };
 const ICON = { '🎯': 'target', '🧠': 'brain', '🏆': 'trophy', '🌟': 'star', '💡': 'bulb', '🛡': 'shield', '✚': 'first-aid-kit', '↻': 'refresh', '⌘': 'code', '▶': 'player-play', '📖': 'book-2', '📘': 'notebook', '🎮': 'device-gamepad-2', '🌐': 'world', '♫': 'music', '♪': 'music', '🔊': 'volume', '🔇': 'volume-off', '✓': 'check', '✔': 'check', '✅': 'circle-check', '✗': 'x', '❌': 'circle-x', '✕': 'x', '✖': 'x', '↶': 'arrow-back-up', '⚔': 'swords', '🔎': 'search', '🔍': 'search', '↑': 'arrow-up', '↓': 'arrow-down', '←': 'arrow-left', '→': 'arrow-right', '⬆': 'upload', '⬇': 'download' };
 const SKIP = 'svg,script,style,textarea,pre,code,select,option,#board,#queue,#learnTraceLines,.helm-keep';
 const SYMBOL = /[—–•←-⇿⌀-⏿■-◿☀-➿⬀-⯿️‍]|\p{Extended_Pictographic}/u;
 function cleanNode(node) {
  const text = node.nodeValue;
  if (!text || !SYMBOL.test(text)) return;
  const parent = node.parentElement;
  if (!parent || parent.closest(SKIP)) return;
  const chars = Array.from(text), frag = document.createDocumentFragment();
  let buf = '', changed = false;
  const flush = () => { if (buf) { frag.append(document.createTextNode(buf)); buf = ''; } };
  for (let i = 0; i < chars.length; i++) {
   const ch = chars[i];
   if (ch === '️' || ch === '‍') { changed = true; continue; }
   if (ch === '—') { changed = true; if (buf.endsWith(' ') && chars[i + 1] === ' ') { buf = buf.replace(/\s+$/, '') + ': '; i++; } else buf += '-'; continue; }
   if (ch === '–') { changed = true; buf += '-'; continue; }
   if (ch === '•') { changed = true; buf += '·'; continue; }
   if (PIECE[ch]) { changed = true; flush(); const g = el('span', 'glyph'); g.style.setProperty('--piece', `var(--p-${PIECE[ch]})`); g.setAttribute('role', 'img'); g.setAttribute('aria-label', PIECE_NAME[PIECE[ch]]); frag.append(g); continue; }
   if (ICON[ch]) { changed = true; flush(); const span = el('span'); span.innerHTML = icon(ICON[ch]); frag.append(span.firstChild); continue; }
   if (SYMBOL.test(ch) && ch !== '·') { changed = true; continue; }
   buf += ch;
  }
  if (!changed) return;
  flush();
  // Tidy double spaces left by removed symbols.
  for (const n of frag.childNodes) if (n.nodeType === 3) n.nodeValue = n.nodeValue.replace(/ {2,}/g, ' ');
  node.replaceWith(frag);
 }
 function cleanTree(root) {
  if (root.nodeType === 3) return cleanNode(root);
  if (root.nodeType !== 1 || root.closest?.(SKIP)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(cleanNode);
 }

 // ------------------------------------------------------------ console rail
 const rail = el('nav'); rail.id = 'helmRail'; rail.setAttribute('aria-label', 'Main');
 rail.innerHTML = `<div class="rail-brand"><img class="rail-logo" alt="" src="${A.logo}"><div><div class="rail-word">CodeBreakers</div><div class="rail-pilot"><i class="avatar" id="railAvatar" hidden></i><span id="railPilot"></span></div></div></div>
 <ul class="rail-nav">
  <li><button class="rail-item" data-go="deck" style="--item-area:var(--amber)">${icon('planet')}<span>Deck</span></button></li>
  <li><button class="rail-item" data-go="arcade" style="--item-area:var(--lilac)">${icon('device-gamepad-2')}<span>Arcade</span></button></li>
  <li><button class="rail-item" data-go="combat" style="--item-area:var(--coral)">${icon('swords')}<span>Combat</span></button></li>
  <li><button class="rail-item" data-go="teacher" style="--item-area:var(--steel)">${icon('school')}<span>Teacher</span></button></li>
  <li><button class="rail-more-btn" type="button" aria-expanded="false" aria-controls="railMore">${icon('adjustments-horizontal')}<span>More</span></button></li>
 </ul>
 <div class="rail-utility" id="railTools">
  <button class="rail-tool" data-tool="profile">${icon('user-circle')}<span>Player</span></button>
  <button class="rail-tool" data-tool="help">${icon('help-circle')}<span>How to play</span></button>
  <button class="rail-tool" data-tool="music" aria-pressed="false">${icon('music')}<span>Music</span><b class="state">Off</b></button>
  <button class="rail-tool" data-tool="settings">${icon('volume')}<span>Sound settings</span></button>
 </div>`;
 qsa('button', rail).forEach(b => b.type = 'button');
 document.body.prepend(rail);
 const more = el('div', 'rail-more'); more.id = 'railMore'; more.hidden = true;
 document.body.append(more);
 const moreBtn = qs('.rail-more-btn', rail);
 const closeMore = () => { more.hidden = true; moreBtn.setAttribute('aria-expanded', 'false'); };
 const toolsHost = $('railTools');
 const placeTools = () => { const mobile = matchMedia('(max-width:899px)').matches; const host = mobile ? more : toolsHost; qsa('.rail-tool', rail).concat(qsa('.rail-tool', more)).forEach(b => host.append(b)); if (!mobile) closeMore(); };
 matchMedia('(max-width:899px)').addEventListener('change', placeTools); placeTools();
 moreBtn.addEventListener('click', () => { more.hidden = !more.hidden; moreBtn.setAttribute('aria-expanded', String(!more.hidden)); });
 document.addEventListener('click', e => { if (!more.hidden && !e.target.closest('#railMore,.rail-more-btn')) closeMore(); });
 document.addEventListener('keydown', e => { if (e.key === 'Escape' && !more.hidden) { e.preventDefault(); closeMore(); moreBtn.focus(); } });

 const SCREENS = ['bootScreen', 'menuScreen', 'worldScreen', 'selectScreen', 'combatScreen', 'teacherScreen', 'arcadeScreen'];
 const hideAll = () => { SCREENS.forEach(id => { if ($(id)) $(id).hidden = true; }); app.hidden = true; };
 const inMission = () => !app.hidden;
 function leave(fn) {
  if (inMission() && typeof busy !== 'undefined' && busy) { safe(() => message('Your program is still running. Pause it or wait for it to finish first.')); return; }
  hideAll(); fn();
 }
 const GO = {
  deck: () => leave(() => showScreen('menu')),
  arcade: () => leave(() => $('arcadeMenu').click()),
  combat: () => leave(() => $('combatMenu').click()),
  teacher: () => leave(() => $('teacherMenu').click()),
 };
 rail.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) { sfx('select'); GO[b.dataset.go](); } });
 document.addEventListener('click', e => {
  const t = e.target.closest('.rail-tool'); if (!t) return;
  closeMore();
  const tool = t.dataset.tool;
  if (tool === 'profile') { if (window.CBAccounts) CBAccounts.openDialog(); else $('playerProfileButton').click(); }
  if (tool === 'help') $('howPlay').click();
  if (tool === 'settings') $('audioSettingsButton').click();
  if (tool === 'music') safe(() => toggleMusic());
 });
 function syncMusicTool() {
  const on = typeof musicOn !== 'undefined' && musicOn;
  qsa('[data-tool="music"]').forEach(b => { b.setAttribute('aria-pressed', String(on)); qs('.state', b).textContent = on ? 'On' : 'Off'; qs('use', b).setAttribute('href', on ? '#i-music' : '#i-music-off'); });
 }
 safe(() => { const core = applyAudioLabels; applyAudioLabels = function () { core(); syncMusicTool(); }; });
 function syncPilot() {
  const me = window.CBAccounts?.current(), avatar = $('railAvatar');
  $('railPilot').textContent = me ? me.name : pilotName();
  if (avatar) { avatar.hidden = !me; if (me) avatar.style.backgroundImage = `var(--av-${me.avatar || 0})`; }
 }

 // ------------------------------------------------------------ screen state
 function currentScreen() {
  if (!app.hidden) return 'game';
  if (!$('arcadeScreen').hidden) return 'arcade';
  if (!$('combatScreen').hidden) return 'combat';
  if (!$('teacherScreen').hidden) return 'teacher';
  return 'deck';
 }
 let lastScreen = '';
 function syncScreen() {
  if (!$('worldScreen').hidden || !$('selectScreen').hidden) { $('worldScreen').hidden = $('selectScreen').hidden = true; showScreen('menu'); return; }
  const name = currentScreen();
  document.body.dataset.screen = name;
  document.documentElement.style.setProperty('--area', AREA[name]);
  qsa('.rail-item', rail).forEach(b => b.toggleAttribute('aria-current', false));
  const current = qs(`.rail-item[data-go="${name === 'game' ? 'deck' : name}"]`, rail);
  if (current) current.setAttribute('aria-current', 'page');
  window.HelmAudio?.setTheme(name === 'game' ? 'mission' : name === 'combat' ? 'combat' : 'deck');
  table?.setVisible(name === 'deck' && !$('menuScreen').hidden);
  if (name === 'deck' && !$('menuScreen').hidden) { renderDeck(name !== lastScreen); requestAnimationFrame(syncInset); }
  if (name === 'teacher') renderChart();
  if (name !== lastScreen) { closeMore(); window.scrollTo(0, 0); qsa('.screen').forEach(s => s.scrollTop = 0); window.CBAccounts?.onScreen(name); }
  lastScreen = name;
  syncPilot();
 }
 const screenObserver = new MutationObserver(syncScreen);
 [...SCREENS.map($), app].forEach(n => n && screenObserver.observe(n, { attributes: true, attributeFilter: ['hidden'] }));

 // The world and mission-archive screens fold into the deck.
 let deckFocus = null;
 safe(() => {
  const coreShow = showScreen;
  showScreen = function (which) {
   if (which === 'world' || which === 'select') { deckFocus = which === 'select' ? activeWorld : worldOf(idx); which = 'menu'; }
   ['arcadeScreen', 'combatScreen', 'teacherScreen'].forEach(id => { if ($(id)) $(id).hidden = true; });
   return coreShow(which);
  };
 });

 // ------------------------------------------------------------ command deck
 const menu = $('menuScreen');
 const deckEl = el('div'); deckEl.id = 'helmDeck';
 deckEl.innerHTML = `<header class="helm-head deck-head"><span class="head-cap" aria-hidden="true"></span>
  <div class="head-title"><h1>Command deck</h1><p>Turn the table to a world, pick a mission, deploy.</p></div>
  <div class="head-cells"><div class="cell"><b id="deckCleared" class="num">0 / 15</b><span>Missions solved</span></div><div class="cell"><b id="deckXp" class="num">0</b><span>Experience</span></div><div class="cell"><b id="deckStreak" class="num">0</b><span>Best streak</span></div></div></header>
  <div class="account-strip" id="accountStrip"></div>
  <div class="deck-stage">
   <div class="table-wrap"><canvas id="warTable" aria-hidden="true"></canvas><div class="table-pins" id="tablePins" role="group" aria-label="Worlds on the war table"></div>
    <p class="table-hint">Drag the table to turn it</p>
    <button id="tableMotion" class="table-motion" type="button" aria-pressed="false">${icon('player-pause')}<span>Pause table</span></button></div>
   <aside class="sector" aria-labelledby="sectorName">
    <div class="sector-top"><i class="sector-thumb" aria-hidden="true"></i><div><h2 id="sectorName"></h2><span class="sector-index" id="sectorIndex">World 01</span></div></div>
    <p class="sector-note" id="sectorNote"></p>
    <div class="lib" id="sectorLib" role="img"></div>
    <ol class="sector-missions" id="sectorMissions"></ol>
    <button id="deployMission" class="btn-hazard btn-deploy" type="button">${icon('rocket')}<span>Deploy</span><small id="deployTarget"></small></button>
   </aside>
  </div>
  <div class="deck-lower" id="deckTraining"></div>`;
 menu.append(deckEl);
 const pins = $('tablePins');
 WORLD_NAMES.forEach((name, w) => {
  const b = el('button', 'pin'); b.type = 'button'; b.dataset.world = w;
  b.innerHTML = `<i class="pin-thumb" style="background-image:var(--t-w${w})" aria-hidden="true"></i><span class="pin-num">${pad2(w + 1)}</span><span class="pin-name">${name}</span><span class="pin-meter" aria-hidden="true"><i></i><i></i><i></i></span>`;
  b.addEventListener('click', () => { selectWorld(w, true); sfx('select'); });
  pins.append(b);
 });
 const deck = { world: 0, mission: 0 };
 function selectWorld(w, animate, mission) {
  deck.world = w;
  const ids = worldMissions(w);
  deck.mission = mission != null && ids.includes(mission) ? mission : (ids.find(i => !save.cleared.includes(i)) ?? ids[0]);
  table?.select(w, animate);
  renderSector();
 }
 function renderSector() {
  const w = deck.world, ids = worldMissions(w), done = ids.filter(i => save.cleared.includes(i)).length;
  qsa('.pin', pins).forEach(p => {
   const pw = Number(p.dataset.world), pids = worldMissions(pw), pd = pids.filter(i => save.cleared.includes(i)).length;
   p.setAttribute('aria-pressed', String(pw === w));
   p.setAttribute('aria-label', `World ${pw + 1}: ${WORLD_NAMES[pw]}, ${pd} of ${pids.length} missions solved`);
   qsa('.pin-meter i', p).forEach((seg, k) => seg.classList.toggle('on', k < pd));
  });
  qs('.sector-thumb', deckEl).style.backgroundImage = `var(--t-w${w})`;
  $('sectorIndex').textContent = 'World ' + pad2(w + 1) + ' of 05';
  $('sectorName').textContent = WORLD_NAMES[w];
  $('sectorNote').textContent = WORLD_NOTES[w];
  const lib = $('sectorLib'); lib.replaceChildren();
  ids.forEach((_, k) => { const seg = el('i'); if (k < done) seg.className = 'on'; lib.append(seg); });
  lib.append(el('span', '', `${done} / ${ids.length} solved`));
  lib.setAttribute('aria-label', `${done} of ${ids.length} missions solved in ${WORLD_NAMES[w]}`);
  const list = $('sectorMissions'); list.replaceChildren();
  ids.forEach(i => {
   const li = el('li'), b = el('button', 'mrow'); b.type = 'button'; b.dataset.mission = i;
   const solved = save.cleared.includes(i), best = save.best?.[i];
   const state = solved ? `Solved${best ? ' · best ' + best : ''}` : i >= 10 ? 'Code required' : i === nextMission() ? 'Next up' : 'Open';
   b.innerHTML = `<span class="mrow-num">${pad2(i + 1)}</span><span class="mrow-body"><b></b><small></small></span><span class="mrow-state ${solved ? 'solved' : i === nextMission() ? 'fresh' : ''}">${state}</span>`;
   qs('b', b).textContent = L[i].name; qs('small', b).textContent = L[i].topic;
   b.setAttribute('aria-pressed', String(i === deck.mission));
   b.addEventListener('click', () => { deck.mission = i; renderSector(); sfx('tap'); });
   b.addEventListener('dblclick', () => deploy(i));
   li.append(b); list.append(li);
  });
  $('deployTarget').textContent = `${pad2(deck.mission + 1)} · ${L[deck.mission].name}`;
  $('deployMission').setAttribute('aria-label', `Deploy to mission ${deck.mission + 1}, ${L[deck.mission].name}`);
  $('deckCleared').textContent = `${save.cleared.length} / ${L.length}`;
  $('deckXp').textContent = String(save.xp || 0);
  $('deckStreak').textContent = String(save.streak || 0);
 }
 function renderDeck(entering) {
  if (entering) {
   const focus = deckFocus != null ? deckFocus : worldOf(nextMission());
   const mission = deckFocus != null ? undefined : nextMission();
   deckFocus = null;
   selectWorld(focus, false, mission);
  } else renderSector();
 }
 function deploy(i) {
  if (typeof busy !== 'undefined' && busy) return;
  sfx('deploy');
  hideAll();
  load(i); showScreen('game'); openCheckpoint();
 }
 $('deployMission').addEventListener('click', () => deploy(deck.mission));

 // War table renderer (WebGL) with a static fallback.
 let table = null;
 const tableCanvas = $('warTable');
 let userPaused = false;
 try { userPaused = localStorage.getItem('cb_fleet_paused') === 'true'; } catch (_) { }
 const motionBtn = $('tableMotion');
 function syncMotion() {
  const paused = userPaused || reduced();
  motionBtn.setAttribute('aria-pressed', String(paused));
  qs('span', motionBtn).textContent = paused ? 'Resume table' : 'Pause table';
  qs('use', motionBtn).setAttribute('href', paused ? '#i-player-play' : '#i-player-pause');
  motionBtn.title = reducedQuery.matches ? 'Reduced motion follows your system setting' : 'Pause or resume the table animation';
  table?.setMotion({ paused: userPaused, reduced: reduced() });
  tableCanvas.dataset.paused = String(paused);
 }
 motionBtn.addEventListener('click', () => { userPaused = !userPaused; try { localStorage.setItem('cb_fleet_paused', String(userPaused)); } catch (_) { } syncMotion(); });
 reducedQuery.addEventListener('change', syncMotion);
 $('reducedMotion')?.addEventListener('change', syncMotion);
 function staticTable() {
  table = null;
  pins.classList.add('static');
  tableCanvas.hidden = true;
  tableCanvas.dataset.renderer = 'fallback';
  qs('.table-hint', deckEl).hidden = true;
  qsa('.pin', pins).forEach((p, w) => { const a = Math.PI / 2 + w * Math.PI * 2 / 5; p.style.removeProperty('transform'); p.style.left = (50 + Math.cos(a) * 34) + '%'; p.style.top = (50 + Math.sin(a) * 30) + '%'; });
 }
 try {
  table = HelmTable.create(tableCanvas, {
   planets: A.planets, paused: userPaused, reduced: reduced(),
   onPick: w => { selectWorld(w, true); sfx('select'); },
   onLayout: proj => proj.forEach((p, w) => { const pin = pins.children[w]; if (pin) pin.style.transform = `translate(${p.foot.x}px,${p.foot.y}px) translate(-50%,0)`; }),
   onLost: staticTable,
  });
 } catch (error) { table = null; staticTable(); }
 tableCanvas.dataset.renderer ||= table ? 'webgl' : 'fallback';
 // On wide screens the world plate overlays the table's lower left; the disc recentres in the free space.
 function syncInset() {
  const wrap = qs('.table-wrap', deckEl), sector = qs('.sector', deckEl);
  if (!wrap || !sector || !wrap.clientWidth) return;
  const overlay = getComputedStyle(sector).position === 'absolute';
  table?.setInset(overlay ? Math.min(.5, (sector.offsetLeft + sector.offsetWidth + 12) / wrap.clientWidth) : 0);
 }
 if (window.ResizeObserver) new ResizeObserver(syncInset).observe(qs('.table-wrap', deckEl));
 syncMotion();

 // ------------------------------------------------------------ mission screen
 function buildMission() {
  app.classList.add('helm-app');
  const head = el('header', 'helm-head mission-head'); head.id = 'missionHead';
  const back = $('toMenu'); back.innerHTML = `${icon('chevron-left')}<span>Deck</span>`; back.classList.add('btn-ghost');
  const ident = el('div', 'mission-ident'), wrap = el('div'), meta = el('p', 'mission-meta');
  $('world').classList.remove('eyebrow');
  meta.append($('world'), document.createTextNode(' · '), $('topic'));
  const qTitle = qs('#question > .eyebrow'); if (qTitle) { qTitle.className = 'question-title'; qTitle.innerHTML = '<span>Security checkpoint</span><span class="xp">+20 XP</span>'; }
  wrap.append($('title'), meta); ident.append($('number'), wrap);
  const stats = qs('.app .stats'); stats.classList.add('head-cells');
  const tools = el('div', 'view-tools'); const access = qs('.learn-accessibility'); if (access) tools.append(access);
  head.append(back, ident, stats, tools);
  const strip = el('nav', 'mission-strip'); strip.setAttribute('aria-label', 'All missions'); strip.append($('levels'));
  const body = el('div', 'mission-body');
  const tableCol = el('section', 'table-col'); tableCol.setAttribute('aria-label', 'Mission table');
  const frame = el('div', 'board-frame'); frame.append($('board'));
  const runBar = el('div', 'run-bar'), ql = el('div', 'queue-label'); ql.innerHTML = 'Queue<b> / 80</b>'; qs('b', ql).prepend($('qlen'));
  runBar.append(ql, $('queue'));
  const controls = el('div', 'run-controls'); controls.append($('run'), $('step'), $('undo'), $('clear'), $('reset'), $('moves'), $('next'));
  tableCol.append($('objective'), frame, runBar, controls, $('status'), $('debugDetails'), $('hint'), $('question'));
  const consoleCol = el('section', 'console-col'); consoleCol.setAttribute('aria-label', 'Programming console');
  if ($('learningWorkbench')) consoleCol.append($('learningWorkbench'));
  consoleCol.append($('codingLab'), buildBriefing());
  body.append(tableCol, consoleCol);
  app.prepend(head, strip, body);
  const foot = qs('.app > p.footer'); if (foot) { foot.classList.add('helm-footer'); app.append(foot); }
  $('compileRun').classList.add('primary'); $('compileCode').classList.remove('primary');
  $('compileCode').innerHTML = `${icon('code')}<span>Compile</span>`;
  $('compileRun').innerHTML = `${icon('player-play')}<span>Compile and run</span>`;
  $('codeHelp').innerHTML = `${icon('book-2')}<span>Syntax</span>`;
  $('run').innerHTML = `${icon('player-play')}<span>Run queue</span>`; $('run').classList.remove('primary');
  $('step').innerHTML = `${icon('player-track-next')}<span>Step</span>`;
  $('undo').innerHTML = `${icon('arrow-back-up')}<span>Undo</span>`;
  $('clear').innerHTML = `${icon('eraser')}<span>Clear</span>`;
  $('reset').innerHTML = `${icon('refresh')}<span>Reset</span>`;
  $('moves').classList.add('num');
  const h3 = qs('.coding-heading h3'); if (h3) h3.textContent = 'Program';
 }
 function buildBriefing() {
  const d = el('details', 'briefing'); d.id = 'helmBriefing';
  d.innerHTML = `<summary>${icon('clipboard-text')}<span>Briefing and tools</span></summary><div class="briefing-body"></div>`;
  const body = qs('.briefing-body', d);
  const section = title => { const s = el('section'); s.append(el('h4', '', title)); body.append(s); return s; };
  const legend = el('div', 'legend helm-keep');
  [['agent', 'Agent'], ['core', 'Data core'], ['wall', 'Firewall'], ['gate', 'Checkpoint gate'], ['key', 'Keycard'], ['door', 'Key door'], ['hazard', 'Hazard'], ['switch', 'Switch'], ['bridge', 'Bridge'], ['portal', 'Portal'], ['data', 'Data fragment']].forEach(([p, label]) => {
   const item = el('span', 'legend-item'); const i = el('i'); i.style.setProperty('--piece', `var(--p-${p})`); item.append(i, document.createTextNode(label)); legend.append(item);
  });
  section('Board legend').append(legend);
  const coach = section('Mission coach'); buildCoach(coach);
  const lesson = section('Lesson');
  const review = $('review'); review.innerHTML = `${icon('notebook')}<span>Lesson notes</span>`;
  const info = qs('.app .info');
  lesson.append(review);
  if (info) lesson.append(info);
  const safety = qs('.coding-lab > p.muted'); if (safety) lesson.append(el('p', 'muted', safety.textContent));
  const manual = section('Manual controls'); const drawer = $('manualDrawer'); drawer.open = true; manual.append(drawer);
  manual.append(el('p', 'muted', 'Optional. Arrow keys and W, A, S, D also add moves while the board has focus.'));
  const options = section('Options'); const row = qs('.app .controlrow'); if (row) options.append(row);
  return d;
 }
 // Plan / Explain / Reflect coaching, kept from the earlier learning coach.
 function buildCoach(host) {
  const packs = {
   sequence: { skill: 'Sequencing and logic', plan: ['Map the route before running.', 'Break the mission into smaller steps. Decide a logical order of moves and checkpoints before writing commands.'], explain: ['Order changes outcomes.', 'In coding and incident response, the right steps in the wrong order can fail. Sequencing teaches you to think procedurally instead of guessing.'], reflect: ['What was your first wrong assumption?', 'After a run, find where the plan failed, then explain how changing the order or number of commands improved the result.'], link: 'This mirrors algorithm design and procedural troubleshooting.' },
   condition: { skill: 'Conditionals and decision-making', plan: ['Look for branches and alternate paths.', 'Predict what should happen if the agent finds a locked path, hazard or key. Decide where your if / else logic should apply.'], explain: ['Conditionals model real decisions.', 'Good code reacts to different situations, like a system deciding whether to grant access, block traffic or route data.'], reflect: ['Did your condition match the mission state?', 'Check whether your logic tested the right thing. Would a different condition or else case handle the maze better?'], link: 'This reflects access control, validation and security rule engines.' },
   loop: { skill: 'Loops and efficiency', plan: ['Spot repeated movement patterns.', 'Look for commands you can repeat. Replace duplicated moves with loops so the solution is shorter and easier to debug.'], explain: ['Loops turn repetition into reusable logic.', 'Patterns can be generalized. Loops reduce command clutter and build computational efficiency.'], reflect: ['Where did repetition appear?', 'Explain one part of your code that became shorter because you used a loop, and why that makes the solution better.'], link: 'This models automation and repeatable workflows.' },
   systems: { skill: 'Systems thinking and data flow', plan: ['Identify objects and interactions.', 'Watch how keys, doors, switches, portals and data relate. Think about the whole system, not just the next square.'], explain: ['Complex problems involve connected parts.', 'Tracing how one action changes another component strengthens debugging, analysis and architecture thinking.'], reflect: ['Which object affected the system most?', 'Describe one interaction that changed the maze state and how understanding it helped you solve the mission.'], link: 'This matches network mapping and workflow analysis.' },
   security: { skill: 'Cybersecurity reasoning', plan: ['Predict risk points before moving.', 'Identify hazards, locked areas and checkpoints. Plan a safe path that balances exploration, defense and completion.'], explain: ['Cyber defense is strategic.', 'Logic connects to security thinking: protect assets, validate access, avoid hazards and respond to threats with intent.'], reflect: ['How did your strategy reduce risk?', 'Point out one risky action or path, then explain how a safer coding strategy improved the result.'], link: 'This mirrors threat analysis, incident response and secure operations.' },
  };
  const tabs = el('div', 'coach-tabs'); tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'Coaching step');
  const title = el('p', 'coach-title'), text = el('p', 'coach-body'), link = el('p', 'coach-link');
  let mode = 'plan';
  const infer = () => { const t = (($('title')?.textContent || '') + ' ' + ($('topic')?.textContent || '') + ' ' + ($('objective')?.textContent || '')).toLowerCase(); if (/condition|if|else|key|credential/.test(t)) return 'condition'; if (/loop|repeat|for |while|sort|factory/.test(t)) return 'loop'; if (/cyber|security|firewall|network|attack|defend/.test(t)) return 'security'; if (/system|data|sql|database|portal|switch/.test(t)) return 'systems'; return 'sequence'; };
  const render = () => { const p = packs[infer()], pack = p[mode]; title.textContent = pack[0]; text.textContent = pack[1]; link.textContent = p.skill + '. ' + p.link; qsa('button', tabs).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode))); };
  [['plan', 'Plan'], ['explain', 'Explain'], ['reflect', 'Reflect']].forEach(([m, label]) => { const b = el('button', '', label); b.type = 'button'; b.dataset.mode = m; b.addEventListener('click', () => { mode = m; render(); }); tabs.append(b); });
  host.append(tabs, title, text, link);
  const obs = new MutationObserver(render);
  ['title', 'topic', 'objective'].forEach(id => $(id) && obs.observe($(id), { childList: true, characterData: true, subtree: true }));
  render();
 }

 // Board pieces: the Blender sprites replace the engine's emoji labels.
 const TILE_PIECE = { '🤖': 'agent', '💎': 'core', '🔓': 'gate-open', '🔒': 'gate', '🗝️': 'key', '🗝': 'key', '🚪': 'door-open', '🔐': 'door', '💾': 'data', '⚡': 'hazard', '✅': 'switch-on', '🔘': 'switch', '🟢': 'bridge-on', '⛔': 'bridge', '🌀': 'portal', '▦': 'wall' };
 let agentAt = -1;
 function decorateBoard() {
  const tiles = qsa('#board .tile');
  tiles.forEach((t, i) => {
   const piece = TILE_PIECE[t.textContent.trim()];
   if (piece) { if (t.dataset.piece !== piece) { t.dataset.piece = piece; t.style.setProperty('--piece', `var(--p-${piece})`); } }
   else if (t.dataset.piece) { delete t.dataset.piece; t.style.removeProperty('--piece'); }
   if (t.classList.contains('agent') && agentAt !== i) { if (agentAt >= 0 && typeof busy !== 'undefined' && busy) sfx('step'); agentAt = i; }
  });
 }

 // ------------------------------------------------------------ arcade, combat, teacher
 function header(screen, title, text, cells) {
  const wrap = qs('.screen-wrap', screen);
  const h = el('header', 'helm-head'); h.innerHTML = `<span class="head-cap" aria-hidden="true"></span><div class="head-title"><h1></h1><p></p></div>`;
  qs('h1', h).textContent = title; qs('p', h).textContent = text;
  if (cells?.length) { const c = el('div', 'head-cells'); cells.forEach(([node, label]) => { const cell = el('div', 'cell'), b = el('b', 'num'); b.append(node); cell.append(b, el('span', '', label)); c.append(cell); }); h.append(c); }
  wrap.prepend(h);
  return h;
 }
 const MODE_ART = { 'bug hunter': 'bug', 'network architect': 'network', 'cipher vault': 'cipher', 'automation factory': 'factory', 'database detective': 'database', 'cyber forensics': 'forensics', 'logic circuit': 'circuit', 'bot builder': 'bot', 'api rescue': 'api', 'code sprint': 'sprint', 'attack & defend': 'combat', 'maze explorer': 'maze' };
 const artFor = title => MODE_ART[(title || '').trim().toLowerCase()] || 'maze';
 const SKILL_GROUPS = [
  { title: 'Debugging and logic', modes: ['bug', 'circuit', 'sprint'] },
  { title: 'Data and security', modes: ['cipher', 'database', 'forensics'] },
  { title: 'Systems and automation', modes: ['network', 'factory', 'bot', 'api'] },
  { title: 'Classic modes', modes: ['combat', 'maze'] },
 ];
 function decorateCatalog() {
  qsa('#arcadeCatalog .arc-mode-card').forEach(card => {
   const title = qs('.celestial-title', card)?.textContent;
   let art = qs('.helm-mode-art', card);
   if (!art) { art = el('i', 'helm-mode-art'); art.setAttribute('aria-hidden', 'true'); card.prepend(art); }
   art.style.setProperty('--art', `var(--a-${artFor(title)})`);
   const m = (card.getAttribute('aria-label') || '').match(/(\d+) of (\d+) challenges solved/i);
   if (m && !card.classList.contains('extra-arcade-link')) {
    let count = qs('.helm-mode-count', card);
    if (!count) { count = el('span', 'helm-mode-count'); count.setAttribute('aria-hidden', 'true'); card.append(count); }
    const done = Number(m[1]), total = Number(m[2]);
    count.innerHTML = `<b>${done} / ${total}</b><span>${Array.from({ length: total }, (_, k) => `<i class="${k < done ? 'on' : ''}"></i>`).join('')}</span>`;
   }
  });
  // Group the roster by skill with grid order; cards stay where the arcade engine put them.
  const catalog = $('arcadeCatalog');
  SKILL_GROUPS.forEach((g, gi) => {
   let head = qs(`.arc-catalog-divider[data-group="${gi}"]`, catalog);
   if (!head) { head = el('div', 'arc-catalog-divider', g.title); head.dataset.group = gi; head.setAttribute('role', 'presentation'); catalog.append(head); }
   head.style.order = String(gi * 100);
  });
  qsa('.arc-mode-card', catalog).forEach((card, i) => {
   const key = artFor(qs('.celestial-title', card)?.textContent);
   const gi = SKILL_GROUPS.findIndex(g => g.modes.includes(key));
   card.style.order = String((gi < 0 ? SKILL_GROUPS.length - 1 : gi) * 100 + 1 + i);
  });
  qsa('.arc-catalog-divider', catalog).forEach(head => {
   const gi = Number(head.dataset.group);
   const visible = qsa('.arc-mode-card', catalog).filter(c => !c.hidden && Math.floor(Number(c.style.order) / 100) === gi).sort((a, b) => a.style.order - b.style.order);
   if (head.hidden !== !visible.length) head.hidden = !visible.length;
   // An odd group's last mode spans both columns, so no ruled half-row is left empty.
   visible.forEach((c, k) => { const span = visible.length % 2 === 1 && k === visible.length - 1 ? '1 / -1' : ''; if (c.style.gridColumn !== span) c.style.gridColumn = span; });
  });
 }
 const ARCADE_BRIEF = {
  bug: { steps: ['Read the broken code line by line.', 'Find the comparison, loop or assignment that breaks the rule in your task.', 'Edit the code, then press Check repair.'],
   scenes: ['The academy threat scanner raised the red alert even when it found no threats. The security chief needs the alert to fire only for real threats.', 'A scan routine was left running overnight. Its loop counter moves the wrong way, so the loop never ends and the scanner froze.', 'Guests are walking into the admin console. The access check uses the wrong operator, so every role gets in.'] },
  network: { steps: ['Start at node A.', 'Click connected nodes to build a path to the target. Avoid the compromised link.', 'Keep the total latency within the budget, then press Verify route.'],
   scenes: ['A storm knocked out part of the campus network. Route the uplink from gateway A to server F without the compromised link.', 'The fastest link to the data center is corrupted. Find a detour from A to G that still arrives in time.'] },
  cipher: { steps: ['Look at the encoded message and the method named in your task.', 'Decode it: shift letters back, or turn each byte into its letter.', 'Type the plain text and press Unlock vault.'],
   scenes: ['An agent left a message in the vault using an old letter-shift code. Undo the shift to read it.', 'Your scanner caught a transmission in raw binary. Each 8-bit group is one ASCII letter.', 'The last vault door shows its password as hexadecimal bytes. Convert them to letters.'] },
  factory: { steps: ['Read which field and value decide where each item goes.', 'Write a for loop over the items with an if / else that calls sendTo().', 'Press Run factory and check that every item reaches the right chute.'],
   scenes: ['The medical supply depot is backed up. High-priority packages must leave on the urgent line first.', 'Lab equipment keeps breaking in transit. Fragile items need the padded conveyor.', 'Infected data packets slipped into the delivery queue. Divert them to quarantine before they spread.'] },
  database: { steps: ['Look at the table and its columns.', 'Write a SELECT query: WHERE filters the rows, ORDER BY sorts them.', 'Press Execute SQL and compare your rows with the expected answer.'],
   scenes: ['Headquarters needs a roll call of the agents who are active right now, in alphabetical order.', 'The access log shows denied entries overnight. List them in order so the team can investigate.', 'A security patch must reach every device marked critical. Get their hostnames for the technicians.'] },
  forensics: { steps: ['Read every log line carefully.', 'Select only the lines that show suspicious activity. Leave normal activity unselected.', 'Press Analyze evidence. Wrong picks count as false alarms.'],
   scenes: ['Something strange happened on the admin server just after 9 a.m. Separate the signs of an attack from ordinary activity.', 'Staff reported odd emails about payroll. Mark the clear signs of a phishing attempt.', 'Patient records may have left the network. Find the evidence of an unauthorized transfer.'] },
  circuit: { steps: ['Choose a logic gate for the circuit.', 'Switch inputs A and B to test all four combinations.', 'Press Test truth table when every row gives the right output.'],
   scenes: ['The reactor core needs two officers to turn their keys at the same time before it powers on.', 'An alarm must sound when exactly one door sensor trips, but not when both doors open for a drill.', 'The relay should stay on in an emergency and cut out only when both shutdown signals are active.'] },
  bot: { steps: ['Read which sensor events the robot will meet.', 'Create one rule per event: when this happens, do that.', 'Press Test robot to run it through every event.'],
   scenes: ['A warehouse robot needs its first set of reflexes before the night shift starts.', 'A rover patrols the server room. Program how it reacts to heat, strange signals and intruders.', 'After an earthquake, a rescue droid enters the lab. It must clear debris, mark hazards and return before its power runs out.'] },
  api: { steps: ['Read what the request must do: read, create or update.', 'Pick the HTTP method, type the endpoint path and add a JSON body if the task needs one.', 'Press Send request and check the status code that comes back.'],
   scenes: ['The mission control app shows an empty agent list. Ask the server for the list of academy agents.', 'The firewall is failing. Open a repair ticket so the engineers are notified.', 'Node 3 is back online after repairs. Update its record without replacing the whole node.'] },
  sprint: { steps: ['Read the problem and how much data there is.', 'Compare the options: is each one correct, and how many operations does it need?', 'Pick the correct option with the fewest operations, then press Benchmark.'],
   scenes: ['The archive holds 1,024 sorted records. Find one name with as few checks as possible.', 'Two copies of the same student record broke the roster. Find duplicates among 500 records quickly.', 'Mission control needs the exact total of 10,000 sensor readings before launch.'] },
 };
 function buildArcadeBriefing() {
  const main = qs('.arc-work-main'), head = qs('.arc-task-head'), task = $('arcadeTask'), desc = $('arcadeTaskDesc');
  if (!main || !task || !desc) return;
  const brief = el('section', 'arc-brief'); brief.setAttribute('aria-label', 'Challenge briefing');
  const title = el('h3', 'brief-title'); title.append(task);
  const grid = el('dl', 'brief-grid');
  const row = (label, node) => { const dt = el('dt', '', label), dd = el('dd'); dd.append(node); grid.append(dt, dd); return [dt, dd]; };
  const scene = el('p', 'brief-scene'), steps = el('ol', 'brief-steps');
  const [sceneLabel] = row('Scenario', scene);
  row('Your task', desc)[1].classList.add('brief-goal');
  row('How to solve', steps);
  const hint = el('details', 'brief-hint');
  hint.innerHTML = `<summary>${icon('chevron-right').replace('class="ico"', 'class="ico chev"')}<span>Need a hint?</span></summary>`;
  const hintText = $('arcadeHint');
  if (hintText) {
   hint.append(hintText);
   const strip = () => [...hintText.childNodes].forEach(n => { if (n.nodeType === 3 && /HINT\s*·\s*/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/\s*HINT\s*·\s*/, ''); });
   new MutationObserver(strip).observe(hintText, { childList: true, characterData: true, subtree: true }); strip();
  }
  brief.append(title, grid, hint);
  main.insertBefore(brief, head || main.firstChild);
  head?.remove();
  const sync = () => {
   const pack = ARCADE_BRIEF[artFor($('arcadeTitle')?.textContent)], stage = Math.max(0, (parseInt($('arcadeStage')?.textContent, 10) || 1) - 1);
   scene.textContent = pack ? pack.scenes[stage] || pack.scenes[0] : '';
   sceneLabel.hidden = scene.parentElement.hidden = !scene.textContent;
   steps.replaceChildren(...(pack?.steps || []).map(t => el('li', '', t)));
   hint.open = false;
  };
  new MutationObserver(sync).observe($('arcadeTrail'), { childList: true, characterData: true, subtree: true }); sync();
 }
 function buildArcade() {
  const screen = $('arcadeScreen');
  const xp = el('strong'); const mirror = () => { xp.textContent = ($('arcadeXP')?.textContent.match(/\d+/) || ['0'])[0]; };
  header(screen, 'Challenge arcade', 'Ten coding simulations and two classic modes. Every challenge is open.',
   [[$('arcadeSolvedCount'), 'Challenges solved'], [$('arcadeModesCount'), 'Modes completed'], [xp, 'Arcade XP']]);
  if ($('arcadeXP')) { new MutationObserver(mirror).observe($('arcadeXP'), { childList: true, characterData: true, subtree: true }); mirror(); }
  const search = qs('.cb-arcade-search > span'); if (search) search.innerHTML = icon('search');
  new MutationObserver(decorateCatalog).observe($('arcadeCatalog'), { childList: true }); decorateCatalog();
  const tools = qs('.cb-arcade-tools');
  if (tools) { const later = () => requestAnimationFrame(decorateCatalog); tools.addEventListener('input', later); tools.addEventListener('click', later); }
  const head = qs('.arc-mission-head > div'), titleEl = $('arcadeTitle');
  if (head && titleEl) {
   const art = el('i', 'helm-mode-art'); art.setAttribute('aria-hidden', 'true'); head.prepend(art);
   const sync = () => art.style.setProperty('--art', `var(--a-${artFor(titleEl.textContent)})`);
   new MutationObserver(sync).observe(titleEl, { childList: true, characterData: true, subtree: true }); sync();
  }
  const ret = $('arcadeReturn'); if (ret) ret.innerHTML = `${icon('chevron-left')}<span>All modes</span>`;
  buildArcadeBriefing();
  // The arcade scrolls inside its fixed screen, independently of the window.
  // Keep a newly opened challenge (or the returning catalog) at its heading.
  const resetArcadeView = () => requestAnimationFrame(() => {
   if (screen.hidden) return;
   screen.scrollTo({ top: 0, behavior: 'instant' });
   const heading = $('arcadePlay').hidden ? qs('.head-title h1', screen) : titleEl;
   if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  });
  const arcadeViewObserver = new MutationObserver(resetArcadeView);
  arcadeViewObserver.observe($('arcadePlay'), { attributes: true, attributeFilter: ['hidden'] });
  arcadeViewObserver.observe($('arcadeTrail'), { childList: true, characterData: true, subtree: true });
 }
 function buildCombat() {
  const screen = $('combatScreen');
  header(screen, 'Combat arena', 'Think fast. Code smart. Take down the NULL Sentinel.');
  $('playerFighter').setAttribute('role', 'img'); $('playerFighter').setAttribute('aria-label', 'Guardian');
  $('enemyFighter').setAttribute('role', 'img'); $('enemyFighter').setAttribute('aria-label', 'NULL Sentinel');
  $('attackBtn').innerHTML = `${icon('bolt')}<span>Attack</span>`;
  $('defendBtn').innerHTML = `${icon('shield')}<span>Defend</span>`;
  $('combatReset').innerHTML = `${icon('refresh')}<span>New battle</span>`;
 }
 let chartRows = null;
 function buildTeacher() {
  const screen = $('teacherScreen');
  header(screen, 'Teacher dashboard', 'Create a class, share its code, and follow each student as they play. Report files still work for students who play offline on their own devices.');
  const chart = el('section', 'teacher-chart'); chart.setAttribute('aria-label', 'Completion by student');
  chart.append(el('h3', '', 'Completion by student'));
  chartRows = el('div', 'chart-rows'); chart.append(chartRows);
  $('teacherStudentTable')?.before(chart);
  new MutationObserver(renderChart).observe($('teacherRows'), { childList: true, subtree: true, characterData: true });
  $('exportProgress').innerHTML = `${icon('download')}<span>Export my progress</span>`;
  const importLabel = qs('#teacherScreen .import-file');
  if (importLabel) {
   [...importLabel.childNodes].filter(n => n !== $('importReports')).forEach(n => n.remove());
   const span = el('span', 'import-title'); span.innerHTML = `${icon('upload')}<span>Import student reports</span>`; importLabel.prepend(span);
  }
  $('teacherClear').innerHTML = `${icon('trash')}<span>Clear imported roster</span>`;
 }
 function renderChart() {
  if (!chartRows) return;
  chartRows.replaceChildren();
  const rows = qsa('#teacherRows tr').map(tr => { const c = qsa('td', tr); return c.length > 2 ? { name: [...c[0].childNodes].filter(n => n.nodeType === 3).map(n => n.nodeValue).join('').trim(), value: Math.max(0, Math.min(100, parseFloat(c[2].textContent) || 0)) } : null; }).filter(Boolean);
  chartRows.parentElement.classList.toggle('empty', !rows.length);
  if (!rows.length) return;
  rows.slice(0, 30).forEach(r => { const row = el('div', 'chart-row'), bar = el('i'); bar.style.width = r.value + '%'; const track = el('span'); track.append(bar); row.append(el('span', '', r.name), track, el('b', '', Math.round(r.value) + '%')); chartRows.append(row); });
 }

 // ------------------------------------------------------------ dialogs
 function buildDialogs() {
  const help = $('helpOverlay'), section = help && qs('section', help);
  if (section) {
   help.removeAttribute('style'); qsa('[style]', help).forEach(n => n.removeAttribute('style'));
   const close = $('closeHelp'); close.innerHTML = `${icon('x')}<span>Close</span>`;
   const top = el('div'); const h2 = el('h2', '', 'How to play'); top.append(h2, close);
   const list = el('ol');
   [['Create your player.', 'Pick a name, a helmet and a PIN, then type the class code your teacher shows.'],
    ['Pick a world on the war table.', 'Drag the table or choose a planet, then pick one of its three missions.'],
    ['Deploy.', 'Some missions open with a security checkpoint question. Answer it to unlock the gate and the data core.'],
    ['Write your program.', 'Use moveUp(), moveDown(), moveLeft(), moveRight(), repeat, for loops and if / else in the console.'],
    ['Compile, run and trace.', 'Step through your code one move at a time and read the trace when the agent stops.'],
    ['Reach the data core.', 'Solved missions stay replayable. The arcade and combat arena give you extra practice.']].forEach(([b, t]) => { const li = el('li'); li.append(el('strong', '', b + ' '), document.createTextNode(t)); list.append(li); });
   section.replaceChildren(top, list, el('p', '', 'The editor understands a small JavaScript-style teaching language. It never runs real JavaScript.'));
   section.style.setProperty('--dialog-area', 'var(--holo)');
  }
  const profile = qs('.stellar-dialog'); if (profile) profile.style.setProperty('--dialog-area', 'var(--amber)');
  const audio = qs('.audio-card'); if (audio) audio.style.setProperty('--dialog-area', 'var(--holo)');
  const close = $('profileClose'); if (close) close.innerHTML = icon('x');
  const dismiss = $('checkpointDismiss'); if (dismiss) dismiss.classList.add('btn-ghost');
 }

 // ------------------------------------------------------------ input, audio, text size
 let primed = false;
 const prime = e => {
  if (primed) return;
  primed = true;
  window.HelmAudio?.unlock();
  let pref = null; try { pref = localStorage.getItem('cb-music'); } catch (_) { }
  if (pref !== 'false' && !(typeof musicOn !== 'undefined' && musicOn) && !e.target.closest?.('.audio-toggle,#audioMusicToggle,[data-tool="music"],#audioPreview')) safe(() => toggleMusic());
 };
 document.addEventListener('pointerdown', prime, true);
 document.addEventListener('keydown', prime, true);
 window.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && document.activeElement === $('codeEditor')) { e.preventDefault(); e.stopImmediatePropagation(); $('compileRun').click(); }
 }, true);
 const size = $('learnTextSize');
 const syncSize = () => { const v = Number(size?.value) || 1; document.documentElement.style.fontSize = (16 * v) + 'px'; };
 size?.addEventListener('change', syncSize);

 // Short confirmations (sign-up, class link).
 function toast(message) {
  let t = $('helmToast');
  if (!t) { t = el('div', 'helm-toast'); t.id = 'helmToast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = message; t.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('show'), 3600);
 }
 window.HelmUI = { toast, syncPilot };

 // ------------------------------------------------------------ boot
 function init() {
  safe(() => clearInterval(bootTimer));
  const fallbackArt = table ? [] : WORLD_NAMES.map((_, w) => {
   const value = getComputedStyle(document.documentElement).getPropertyValue(`--t-w${w}`).trim();
   return value.startsWith('url(') ? value.slice(4, -1).trim().replace(/^['"]|['"]$/g, '') : '';
  });
  const boot = window.CBBoot?.start({ images: [A.logo, ...fallbackArt], tableReady: table?.ready, canvas: tableCanvas });
  const learnPath = $('learningPath'); if (learnPath) $('deckTraining').append(learnPath);
  safe(buildMission); safe(buildArcade); safe(buildCombat); safe(buildTeacher); safe(buildDialogs);
  safe(syncSize); safe(syncMusicTool); safe(syncPilot);
  qsa('.learning-workbench details>summary,.code-reference>summary').forEach(s => { if (!qs('.chev', s)) s.insertAdjacentHTML('afterbegin', icon('chevron-right').replace('class="ico"', 'class="ico chev"')); });
  new MutationObserver(decorateBoard).observe($('board'), { childList: true }); decorateBoard();
  ['xp', 'welcomePilot'].forEach(id => $(id) && new MutationObserver(syncPilot).observe($(id), { childList: true, characterData: true, subtree: true }));
  cleanTree(document.body);
  new MutationObserver(list => {
   for (const m of list) {
    if (m.type === 'characterData') cleanNode(m.target);
    else m.addedNodes.forEach(cleanTree);
   }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
  if (!$('bootScreen').hidden || [...SCREENS.map($)].every(s => !s || s.hidden) && app.hidden) { hideAll(); showScreen('menu'); }
  if (boot) $('bootScreen').hidden = false;
  syncScreen();
  if (boot) { boot.markUIReady(); boot.ready.then(() => safe(() => window.CBAccounts?.init())); }
  else safe(() => window.CBAccounts?.init());
 }
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
