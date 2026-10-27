// CodeBreakers class server: serves the game and keeps a live class roster on
// this computer, so students on the same Wi-Fi show up on the teacher dashboard
// automatically. No internet and no dependencies. Data lives in classroom-data/.
// Usage: node .qa/serve.cjs [port]
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const root = path.resolve(__dirname, '..');
const dataDir = process.env.CB_DATA_DIR ? path.resolve(process.env.CB_DATA_DIR) : path.join(root, 'classroom-data');
const game = 'codebreakers_tripleA_cinematic_polish_v3.html';
const port = Number(process.argv[2]) || 3000;
const CODE = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{3}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{3}$/;
const MAX_BODY = 200000, MAX_STUDENTS = 300;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.cjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8' };

const addresses = () => Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
const classFile = code => path.join(dataDir, code + '.json');
function readClass(code) { try { return JSON.parse(fs.readFileSync(classFile(code), 'utf8')); } catch (_) { return null; } }
function writeClass(data) {
 fs.mkdirSync(dataDir, { recursive: true });
 const tmp = classFile(data.code) + '.tmp';
 fs.writeFileSync(tmp, JSON.stringify(data, null, 1));
 fs.renameSync(tmp, classFile(data.code));
}
const text = (v, n) => typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, '').trim().slice(0, n) : '';
const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
function readBody(req) {
 return new Promise((resolve, reject) => {
  let size = 0, chunks = [];
  req.on('data', c => { size += c.length; if (size > MAX_BODY) { reject(new Error('Too large')); req.destroy(); } else chunks.push(c); });
  req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (e) { reject(e); } });
 });
}

async function api(req, res, parts) {
 if (parts[1] === 'ping') return send(res, 200, { ok: true, server: 'codebreakers-class-server', addresses: addresses(), port });
 if (parts[1] === 'classes' && req.method === 'GET') {
  let list = [];
  try { list = fs.readdirSync(dataDir).filter(f => f.endsWith('.json')).map(f => readClass(f.slice(0, -5))).filter(Boolean).map(c => ({ code: c.code, teacher: c.teacher, className: c.className, createdAt: c.createdAt, students: Object.keys(c.students || {}).length })); } catch (_) { }
  return send(res, 200, { classes: list });
 }
 if (parts[1] !== 'class') return send(res, 404, { error: 'Unknown endpoint' });
 if (req.method === 'POST' && parts.length === 2) {
  const body = await readBody(req);
  const code = text(body.code, 7).toUpperCase();
  if (!CODE.test(code)) return send(res, 400, { error: 'Invalid class code' });
  const current = readClass(code) || { code, createdAt: Date.now(), students: {} };
  current.teacher = text(body.teacher, 60) || current.teacher || 'Teacher';
  current.className = text(body.className, 60) || current.className || 'Class';
  writeClass(current);
  return send(res, 200, { code, teacher: current.teacher, className: current.className });
 }
 const code = text(parts[2], 7).toUpperCase();
 if (!CODE.test(code)) return send(res, 400, { error: 'Invalid class code' });
 const cls = readClass(code);
 if (!cls) return send(res, 404, { error: 'No class with that code on this class server' });
 if (req.method === 'GET' && parts[3] === 'info') return send(res, 200, { code, teacher: cls.teacher, className: cls.className });
 if (req.method === 'GET' && parts.length === 3) return send(res, 200, { code, teacher: cls.teacher, className: cls.className, students: Object.values(cls.students || {}) });
 if (req.method === 'POST' && parts[3] === 'report') {
  const body = await readBody(req), r = body.report || {};
  if (r.format !== 'codebreakers-progress-v1' || !text(r.student, 50) || !Array.isArray(r.missions) || !Number.isFinite(r.xp)) return send(res, 400, { error: 'Invalid report' });
  const id = text(r.accountId, 24) || 'name:' + text(r.student, 50).toLowerCase();
  cls.students = cls.students || {};
  if (!cls.students[id] && Object.keys(cls.students).length >= MAX_STUDENTS) return send(res, 409, { error: 'Class is full' });
  cls.students[id] = { ...r, student: text(r.student, 50), classCode: code, receivedAt: new Date().toISOString() };
  writeClass(cls);
  return send(res, 200, { ok: true });
 }
 return send(res, 405, { error: 'Method not allowed' });
}

http.createServer((req, res) => {
 let url, rel;
 try {
  url = new URL(req.url, 'http://localhost');
  rel = decodeURIComponent(url.pathname);
  if (rel.includes('\0')) throw new Error('Invalid path');
 } catch (_) {
  return send(res, 400, { error: 'Invalid request URL' });
 }
 const parts = url.pathname.split('/').filter(Boolean);
 if (parts[0] === 'api') return api(req, res, parts).catch(e => send(res, 400, { error: e.message || 'Bad request' }));
 if (rel === '/') rel = '/' + game;
 const file = path.join(root, rel);
 if (!file.startsWith(root + path.sep) || file.startsWith(dataDir)) { res.writeHead(403); return res.end('Forbidden'); }
 fs.readFile(file, (err, data) => {
  if (err) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(data);
 });
}).listen(port, () => {
 console.log(`CodeBreakers class server running.`);
 console.log(`  On this computer:   http://localhost:${port}/`);
 for (const a of addresses()) console.log(`  Students on Wi-Fi:  http://${a}:${port}/`);
});
