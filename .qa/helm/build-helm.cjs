// HELM build: removes the stacked legacy presentation layers and injects the
// single War Table presentation layer (CSS, icons, fonts, Blender assets, JS).
// Idempotent: running it on its own output produces the same file.
const fs = require('fs');
const path = require('path');
const dir = __dirname;

// Decorative layers that only restyle or re-skin. The game engine, code lab,
// arcade, teacher dashboard, profile and learning scripts are kept.
const LEGACY_STYLES = ['orbital-redesign', 'stellar-ui-design', 'captains-bridge-skin', 'cb-hyperdrive-style',
 'cb-war-table-v2', 'cb-higgsfield-production-polish', 'cb-uiux-polish-patch', 'cb-premium-design-system',
 'cb-reference-implementation', 'cb-tactical-hologram-theme', 'cb-complete-polish', 'cb-million-polish',
 'cb-tripleA-style', 'cb-immersive-style', 'cb-active3d-style', 'cb-motion-style', 'cb-cinematic-polish-v3',
 'cb-compact-dock-polish', 'cb-background-edge-fix', 'cb-bg-hardfix-v3'];
const LEGACY_SCRIPTS = ['orbital-interactions', 'bridge-enhancements', 'cb-hyperdrive-engine', 'cb-command-v2',
 'cb-higgsfield-visual-engine', 'cb-uiux-polish-script', 'cb-reference-ui-controller', 'cb-tactical-hologram-engine',
 'cb-complete-polish-script', 'cb-million-polish-script', 'cb-tripleA-script', 'cb-immersive-script',
 'cb-active3d-script', 'cb-motion-script', 'cb-cinematic-polish-v3-script', 'cb-compact-dock-script',
 'cb-background-edge-fix-script', 'cb-bg-hardfix-runner-v3'];
// Anonymous head styles that were whole-app re-skins.
const LEGACY_ANON = ['/* Launch-ready visual design */', '/* CodeBreakers Neon UI v2.0'];

function removeBlock(html, tag, id) {
 const re = new RegExp(`<${tag} id="${id}">[\\s\\S]*?<\\/${tag}>\\n?`, 'g');
 return html.replace(re, '');
}

function strip(html) {
 for (const id of LEGACY_STYLES) html = removeBlock(html, 'style', id);
 for (const id of LEGACY_SCRIPTS) html = removeBlock(html, 'script', id);
 for (const marker of LEGACY_ANON) {
  const at = html.indexOf(marker);
  if (at < 0) continue;
  const open = html.lastIndexOf('<style>', at), close = html.indexOf('</style>', at);
  if (open >= 0 && close > at) html = html.slice(0, open) + html.slice(close + 8);
 }
 // Audio is synthesized at runtime (helm-audio.js); drop the embedded MP3s.
 html = html.replace(/(<audio id="(?:musicTrack|soundTap|soundSuccess|soundError|soundAttack|soundDefend)"[^>]*?) src="data:audio\/mpeg;base64,[A-Za-z0-9+/=]+"/g, '$1');
 // Six inline copies of the large logo become one shared copy set by helm-ui.js.
 const logos = {};
 html.replace(/src="data:image\/webp;base64,([A-Za-z0-9+/=]{100000,140000})"/g, (m, b64) => { logos[b64] = (logos[b64] || 0) + 1; return m; });
 for (const [b64, count] of Object.entries(logos)) if (count > 2) html = html.split(`src="data:image/webp;base64,${b64}"`).join('data-helm-logo=""');
 // Menu hero art belonged to the retired layout.
 html = html.replace(/(<div class="stellar-home-hero") style="--hero-art:url\('data:image\/webp;base64,[A-Za-z0-9+/=]+'\)"/, '$1');
 return html;
}

// Small hooks into the original teacher/export code so local accounts, class
// codes and the class server can feed the existing roster. Idempotent.
function patchCore(html) {
 const swaps = [
  ["const rosterKey='cb-teacher-imports-v1';let roster=[];try{roster=JSON.parse(localStorage.getItem(rosterKey))||[]}catch{}",
   "const rosterKey='cb-teacher-imports-v1';let roster=[];try{roster=JSON.parse(localStorage.getItem(rosterKey))||[]}catch{}window.CBRoster={list:()=>roster.slice(),replace:list=>{roster=list;saveRoster();renderTeacher()},report:()=>studentRecord(),render:()=>renderTeacher()};", 'window.CBRoster='],
  ["learning:window.CBLearning?.exportEvidence(),exportedAt:new Date().toISOString()}}",
   "learning:window.CBLearning?.exportEvidence(),...(window.CBAccounts?.exportFields()||{}),exportedAt:new Date().toISOString()}}", 'CBAccounts?.exportFields()'],
  ["learning:window.CBLearning?.cleanReport(r.learning),exportedAt:!isNaN(Date.parse(r.exportedAt))?r.exportedAt:new Date().toISOString()};roster=roster.filter(x=>x.student!==obj.student);",
   "learning:window.CBLearning?.cleanReport(r.learning),classCode:typeof r.classCode==='string'?r.classCode.slice(0,7).toUpperCase():'',accountId:typeof r.accountId==='string'?r.accountId.slice(0,24):'',source:'file',exportedAt:!isNaN(Date.parse(r.exportedAt))?r.exportedAt:new Date().toISOString()};roster=roster.filter(x=>obj.accountId&&x.accountId?x.accountId!==obj.accountId:x.student!==obj.student);", "source:'file',exportedAt"],
  ["roster.forEach(item=>{const row=document.createElement('tr');",
   "roster.forEach(item=>{const row=document.createElement('tr');row.dataset.source=item.source||'file';row.dataset.demo=item.demo?'1':'';row.dataset.classCode=item.classCode||'';", 'row.dataset.source='],
  ["<th>Last imported</th>", "<th>Last update</th>", '<th>Last update</th>'],
  ["let name=$('studentName').value.trim()||'Anonymous student';", "let name=window.CBAccounts?.name()||$('studentName').value.trim()||'Anonymous student';", 'CBAccounts?.name()'],
 ];
 for (const [from, to, marker] of swaps) {
  if (html.includes(marker)) continue;
  if (!html.includes(from)) throw new Error('patchCore: expected source not found: ' + from.slice(0, 60));
  html = html.replace(from, to);
 }
 return html;
}

const b64 = file => fs.readFileSync(file).toString('base64');

function fontsCss() {
 const f = (file, family, weight) => `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${b64(path.join(dir, 'fonts', file))}) format('woff2')}`;
 return [f('antonio.woff2', 'Antonio', '500 700'), f('barlow-400.woff2', 'Barlow', 400), f('barlow-500.woff2', 'Barlow', 500),
  f('barlow-600.woff2', 'Barlow', 600), f('jetbrains-mono.woff2', 'JetBrains Mono', '400 600')].join('\n');
}

function iconSprite() {
 const files = fs.readdirSync(path.join(dir, 'icons')).filter(f => f.endsWith('.svg')).sort();
 const symbols = files.map(f => {
  const svg = fs.readFileSync(path.join(dir, 'icons', f), 'utf8');
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<path stroke="none" d="M0 0h24v24H0z" fill="none"\s*\/>/, '').replace(/\s*\n\s*/g, '');
  return `<symbol id="i-${f.replace('.svg', '')}" viewBox="0 0 24 24">${inner}</symbol>`;
 });
 return `<svg id="helm-icons" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${symbols.join('')}</svg>`;
}

function assetVars() {
 const assets = path.join(dir, 'assets');
 const pick = prefix => fs.readdirSync(assets).filter(f => f.startsWith(prefix) && f.endsWith('.webp')).sort();
 const css = [];
 for (const f of pick('piece_')) css.push(`--p-${f.slice(6, -5).replace(/_/g, '-')}:url(data:image/webp;base64,${b64(path.join(assets, f))})`);
 for (const f of pick('arcade_')) css.push(`--a-${f.slice(7, -5)}:url(data:image/webp;base64,${b64(path.join(assets, f))})`);
 for (const f of pick('avatar_')) css.push(`--av-${f.slice(7, -5)}:url(data:image/webp;base64,${b64(path.join(assets, f))})`);
 for (const f of pick('fighter_')) css.push(`--f-${f.slice(8, -5)}:url(data:image/webp;base64,${b64(path.join(assets, f))})`);
 for (const f of pick('planet_').filter(f => f.endsWith('_thumb.webp'))) css.push(`--t-${f.slice(7, -11)}:url(data:image/webp;base64,${b64(path.join(assets, f))})`);
 const planets = [0, 1, 2, 3, 4].map(i => ({
  map: 'data:image/webp;base64,' + b64(path.join(assets, `planet_w${i}.webp`)),
  glow: 'data:image/webp;base64,' + b64(path.join(assets, `planet_w${i}_glow.webp`)),
 }));
 return { css: `:root{${css.join(';')}}`, planets };
}

function inject(html) {
 html = html.replace(/\n?<!-- HELM START -->[\s\S]*?<!-- HELM END -->\n?/g, '\n');
 const read = f => fs.readFileSync(path.join(dir, f), 'utf8');
 const assets = assetVars();
 const logo = html.match(/class="stellar-logo-glow"><img alt="CodeBreakers logo" src="(data:image\/webp;base64,[A-Za-z0-9+/=]+)"/);
 const block = '\n<!-- HELM START -->\n'
  + `<style id="helm-fonts">${fontsCss()}</style>\n`
  + `<style id="helm-assets-css">${assets.css}</style>\n`
  + `<style id="helm-style">\n${read('helm.css')}\n${read('../combat.css')}\n${read('../teacher-dashboard.css')}\n${read('../arcade.css')}\n${read('../command-deck-modern.css')}\n${read('../navigation.css')}\n${read('../loading.css')}\n</style>\n`
  + iconSprite() + '\n'
  + `<script id="helm-assets">window.HELM_ASSETS=${JSON.stringify({ planets: assets.planets, logo: logo ? logo[1] : '' })};</script>\n`
  + `<script id="helm-audio">\n${read('helm-audio.js')}\n</script>\n`
  + `<script id="helm-table">\n${read('helm-table.js')}\n</script>\n`
  + `<script id="helm-accounts">\n${read('helm-accounts.js')}\n</script>\n`
  + `<script id="helm-loading">\n${read('../loading.js')}\n</script>\n`
  + `<script id="helm-ui">\n${read('helm-ui.js')}\n</script>\n`
  + '<!-- HELM END -->\n';
 return html.replace(/<\/body>/, block + '</body>');
}

module.exports = { strip, inject, patchCore };
