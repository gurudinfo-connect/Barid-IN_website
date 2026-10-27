'use strict';
/**
 * Barid-IN public website server (zero npm dependencies, Node >= 18).
 *
 *  - serves the marketing site from ./public
 *  - POST /api/demo/register  -> validates + saves the visitor, issues a signed, expiring, HttpOnly demo cookie
 *  - GET  /demo               -> demo page, only with a valid demo cookie
 *  - GET  /media/<name>       -> demo videos, only with a valid demo cookie, streamed (Range) and never as a download
 *  - POST /api/contact        -> saves contact-form messages
 *  - GET  /api/admin/leads    -> lead export (JSON/CSV), only with ADMIN_TOKEN
 *  - GET  /api/health
 *
 * Configuration (environment variables) - see .env.example
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

// ---------- config ----------
function loadDotEnv(file) {
  try {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = /^["']/.test(m[2]) ? m[2].replace(/^["']|["']$/g, '') : m[2].replace(/\s+#.*$/, '');
    }
  } catch { /* no .env file */ }
}
loadDotEnv(path.join(__dirname, '.env'));

const PROD = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 8080);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'dist');                          // built React app (npm run build)
const ROUTES = new Set(['/', '/privacy', '/terms']);                // client-side routes served by index.html
const MEDIA_DIR = path.resolve(process.env.MEDIA_DIR || path.join(ROOT, 'media'));
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
const SESSION_HOURS = Number(process.env.DEMO_SESSION_HOURS || 4);
const APP_URL = (process.env.APP_URL || '').trim();                       // where 'Sign In' goes (the real Barid-IN app)
const DEMO_APP_URL = (process.env.DEMO_APP_URL || '').trim() || 'https://hawmess-frontend.onrender.com';           // the real Barid-IN app in demo mode (optional)
const ADMIN_TOKEN = (process.env.ADMIN_TOKEN || '').trim();
const TRUST_PROXY = process.env.TRUST_PROXY === 'true';
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');
const CONTACT_EMAIL = (process.env.CONTACT_EMAIL || '').trim();
let COOKIE_SECRET = process.env.COOKIE_SECRET || '';
if (!COOKIE_SECRET) {
  if (PROD) { console.error('FATAL: COOKIE_SECRET must be set in production.'); process.exit(1); }
  COOKIE_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn('[warn] COOKIE_SECRET not set - using a random one (demo sessions reset on restart).');
}
fs.mkdirSync(DATA_DIR, { recursive: true });

// Only these files can ever be served from MEDIA_DIR.
const MEDIA = {
  'overview.mp4': 'Product overview',
  'walkthrough.mp4': 'Guided walkthrough',
  'ticket-raising.mp4': 'Ticket raising (full recording)',
  'navigation-menu.mp4': 'Menu and service catalogue',
  'leave-requests.mp4': 'Leave and requests',
  'visual-taskboard.mp4': 'Visual task boards',
  'projects.mp4': 'Projects',
  'people-management.mp4': 'People and chat',
  'captions-overview.vtt': 'Overview captions',
  'captions-walkthrough.vtt': 'Walkthrough chapters',
  'captions-walkthrough-steps.vtt': 'Walkthrough step captions',
};

// ---------- tiny JSON store (atomic writes) ----------
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const CONTACT_FILE = path.join(DATA_DIR, 'contact-messages.jsonl');
function readLeads() { try { return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')); } catch { return {}; } }
function writeLeads(obj) {
  const tmp = LEADS_FILE + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, LEADS_FILE);
}

// ---------- helpers ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.mp4': 'video/mp4', '.vtt': 'text/vtt; charset=utf-8', '.webmanifest': 'application/manifest+json',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.svg', '.txt', '.xml', '.webmanifest']);

function clientIp(req) {
  if (TRUST_PROXY) { const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim(); if (xf) return xf; }
  return req.socket.remoteAddress || 'unknown';
}
function isHttps(req) { return req.socket.encrypted || (TRUST_PROXY && req.headers['x-forwarded-proto'] === 'https'); }
function hashIp(ip) { return crypto.createHmac('sha256', COOKIE_SECRET).update(ip).digest('hex').slice(0, 16); }
function log(...a) { console.log(new Date().toISOString(), ...a); }   // never log bodies, cookies or tokens

const rateBuckets = new Map();
function rateLimited(key, max, windowMs) {
  const now = Date.now();
  const b = rateBuckets.get(key);
  if (!b || now > b.reset) { rateBuckets.set(key, { n: 1, reset: now + windowMs }); return false; }
  b.n += 1;
  return b.n > max;
}
setInterval(() => { const now = Date.now(); for (const [k, b] of rateBuckets) if (now > b.reset) rateBuckets.delete(k); }, 60_000).unref();

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', COOKIE_SECRET).update(body).digest('base64url');
  return body + '.' + mac;
}
function verify(token) {
  if (!token || typeof token !== 'string' || token.length > 600) return null;
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  const expect = crypto.createHmac('sha256', COOKIE_SECRET).update(body).digest('base64url');
  const a = Buffer.from(mac), b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!p || typeof p.exp !== 'number' || Date.now() > p.exp) return null;
    return p;
  } catch { return null; }
}
function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function demoSession(req) { return verify(parseCookies(req).bi_demo); }
function setCookie(res, req, value, maxAgeSec) {
  const attrs = ['bi_demo=' + encodeURIComponent(value), 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=' + maxAgeSec];
  if (isHttps(req)) attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; media-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
};
function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...SECURITY_HEADERS, ...headers });
  res.end(body);
}
function sendJson(res, status, obj, headers = {}) {
  send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
}
function readBody(req, limit = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    let tooBig = false;
    req.on('data', (c) => { size += c.length; if (size > limit) tooBig = true; else chunks.push(c); });   // keep draining so the client gets a clean 413
    req.on('end', () => (tooBig ? reject(Object.assign(new Error('too large'), { status: 413 })) : resolve(Buffer.concat(chunks).toString('utf8'))));
    req.on('error', reject);
  });
}
async function readJson(req) {
  const ct = String(req.headers['content-type'] || '');
  if (!ct.includes('application/json')) throw Object.assign(new Error('Content-Type must be application/json'), { status: 415 });
  try { return JSON.parse((await readBody(req)) || '{}'); } catch (e) { throw Object.assign(new Error(e.status === 413 ? 'Request too large' : 'Invalid JSON'), { status: e.status || 400 }); }
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;                      // non-browser clients / same-origin GET-like
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

// ---------- validation ----------
const EMAIL_RE = /^[^\s@<>()[\]\\,;:]+@[^\s@<>()[\]\\,;:]+\.[A-Za-z]{2,}$/;
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
function validateRegistration(b) {
  const errors = {};
  const name = clean(b.name, 80), email = clean(b.email, 254).toLowerCase(), organization = clean(b.organization, 120);
  const role = clean(b.role, 80), interest = clean(b.interest, 40);
  if (name.length < 2) errors.name = 'Please enter your name.';
  if (!EMAIL_RE.test(email) || email.length > 254) errors.email = 'Please enter a valid email address.';
  if (organization.length < 2) errors.organization = 'Please enter your organisation.';
  if (b.consent !== true) errors.consent = 'Please confirm you agree to be contacted about Barid-IN.';
  return { errors, value: { name, email, organization, role, interest } };
}

// ---------- API ----------
async function handleApi(req, res, url) {
  const p = url.pathname;
  const ip = clientIp(req);

  if (p === '/api/health' && req.method === 'GET') return sendJson(res, 200, { ok: true, time: new Date().toISOString() });

  if (p === '/api/config' && req.method === 'GET') {
    return sendJson(res, 200, { liveDemoConfigured: Boolean(DEMO_APP_URL), appUrl: APP_URL || null, contactEmail: CONTACT_EMAIL || null, sessionHours: SESSION_HOURS });
  }

  if (p === '/api/demo/session' && req.method === 'GET') {
    const s = demoSession(req);
    if (!s) return sendJson(res, 200, { active: false });
    return sendJson(res, 200, { active: true, name: s.n, expiresAt: s.exp, liveDemoUrl: DEMO_APP_URL || null, videos: Object.keys(MEDIA).filter((k) => k.endsWith('.mp4')) });
  }

  if (p === '/api/demo/register' && req.method === 'POST') {
    if (!sameOrigin(req)) return sendJson(res, 403, { error: 'Cross-origin request blocked.' });
    if (rateLimited('reg:' + ip, 8, 10 * 60_000)) return sendJson(res, 429, { error: 'Too many attempts. Please wait a few minutes and try again.' });
    const body = await readJson(req);
    if (body.website) return sendJson(res, 200, { ok: true, redirect: '/' });          // honeypot: pretend, store nothing
    const { errors, value } = validateRegistration(body);
    if (Object.keys(errors).length) return sendJson(res, 400, { error: 'Please correct the highlighted fields.', fields: errors });
    const leads = readLeads();
    const now = new Date().toISOString();
    const prev = leads[value.email];
    const lead = prev
      ? { ...prev, ...value, lastAccessAt: now, accessCount: (prev.accessCount || 1) + 1 }
      : { id: crypto.randomUUID(), ...value, consent: true, consentAt: now, createdAt: now, lastAccessAt: now, accessCount: 1, ipHash: hashIp(ip), userAgent: clean(req.headers['user-agent'], 200) };
    leads[value.email] = lead;
    try { writeLeads(leads); } catch (e) { log('lead save failed:', e.code || e.message); return sendJson(res, 500, { error: 'We could not save your details. Please try again shortly.' }); }
    const exp = Date.now() + SESSION_HOURS * 3600_000;
    setCookie(res, req, sign({ lid: lead.id, n: value.name.split(' ')[0], exp }), SESSION_HOURS * 3600);
    log('demo access granted', lead.id);
    return sendJson(res, 200, { ok: true, redirect: DEMO_APP_URL });
  }

  if (p === '/api/demo/logout' && req.method === 'POST') {
    setCookie(res, req, '', 0);
    return sendJson(res, 200, { ok: true });
  }

  if (p === '/api/contact' && req.method === 'POST') {
    if (!sameOrigin(req)) return sendJson(res, 403, { error: 'Cross-origin request blocked.' });
    if (rateLimited('contact:' + ip, 5, 10 * 60_000)) return sendJson(res, 429, { error: 'Too many messages. Please wait a few minutes and try again.' });
    const b = await readJson(req);
    if (b.website) return sendJson(res, 200, { ok: true });
    const name = clean(b.name, 80), email = clean(b.email, 254).toLowerCase(), message = String(b.message ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, 4000);
    const fields = {};
    if (name.length < 2) fields.name = 'Please enter your name.';
    if (!EMAIL_RE.test(email)) fields.email = 'Please enter a valid email address.';
    if (message.length < 10) fields.message = 'Please write at least a short message (10+ characters).';
    if (Object.keys(fields).length) return sendJson(res, 400, { error: 'Please correct the highlighted fields.', fields });
    try {
      fs.appendFileSync(CONTACT_FILE, JSON.stringify({ id: crypto.randomUUID(), name, email, organization: clean(b.organization, 120), message, createdAt: new Date().toISOString(), ipHash: hashIp(ip) }) + '\n', { mode: 0o600 });
    } catch (e) { log('contact save failed:', e.code || e.message); return sendJson(res, 500, { error: 'We could not send your message. Please try again shortly.' }); }
    return sendJson(res, 200, { ok: true });
  }

  if (p === '/api/admin/leads' && req.method === 'GET') {
    if (!ADMIN_TOKEN) return sendJson(res, 404, { error: 'Not found' });
    if (rateLimited('admin:' + ip, 20, 10 * 60_000)) return sendJson(res, 429, { error: 'Too many attempts.' });
    const given = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const a = crypto.createHash('sha256').update(given).digest(), b = crypto.createHash('sha256').update(ADMIN_TOKEN).digest();
    if (!crypto.timingSafeEqual(a, b)) return sendJson(res, 401, { error: 'Unauthorized' });
    const rows = Object.values(readLeads()).sort((x, y) => String(y.createdAt).localeCompare(String(x.createdAt)));
    if (url.searchParams.get('format') === 'csv') {
      const cols = ['createdAt', 'lastAccessAt', 'accessCount', 'name', 'email', 'organization', 'role', 'interest', 'consentAt'];
      const esc = (v) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };   // CSV-injection safe
      const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
      return send(res, 200, csv, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="barid-in-leads.csv"', 'Cache-Control': 'no-store' });
    }
    return sendJson(res, 200, { count: rows.length, leads: rows.map(({ ipHash, userAgent, ...r }) => r) });
  }

  return sendJson(res, 404, { error: 'Not found' });
}

// ---------- gated media ----------
function serveMedia(req, res, url) {
  const name = decodeURIComponent(url.pathname.slice('/media/'.length));
  if (!Object.prototype.hasOwnProperty.call(MEDIA, name)) return sendJson(res, 404, { error: 'Not found' });
  if (!demoSession(req)) return sendJson(res, 401, { error: 'Demo access required. Please register to watch.' }, { 'Cache-Control': 'no-store' });
  // Browsers send Sec-Fetch-Dest: video for <video>; a plain navigation ("open in new tab" / "save as") is refused.
  const dest = req.headers['sec-fetch-dest'];
  if (dest && !['video', 'track', 'empty'].includes(dest)) return sendJson(res, 403, { error: 'This file can only be played inside the demo page.' });
  const file = path.join(MEDIA_DIR, name);
  let st;
  try { st = fs.statSync(file); } catch { return sendJson(res, 404, { error: 'Video not available yet.' }); }
  const ext = path.extname(name);
  const base = { ...SECURITY_HEADERS, 'Content-Type': MIME[ext], 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store', 'Content-Disposition': 'inline', 'Cross-Origin-Resource-Policy': 'same-origin' };
  const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
  if (range && ext === '.mp4') {
    let start = range[1] === '' ? NaN : Number(range[1]);
    let end = range[2] === '' ? st.size - 1 : Number(range[2]);
    if (range[1] === '' && range[2] !== '') { start = Math.max(0, st.size - Number(range[2])); end = st.size - 1; }
    if (!(start >= 0) || start >= st.size || end < start) { res.writeHead(416, { ...base, 'Content-Range': `bytes */${st.size}` }); return res.end(); }
    end = Math.min(end, st.size - 1);
    res.writeHead(206, { ...base, 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1 });
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { ...base, 'Content-Length': st.size });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

// ---------- static ----------
function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel.includes('\0')) return send(res, 400, 'Bad request');
  let status = 200;
  if (!path.extname(rel)) {                                           // client-side route -> the React shell
    status = ROUTES.has(rel.replace(/\/+$/, '') || '/') ? 200 : 404;
    rel = '/index.html';
  }
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (file !== PUBLIC_DIR && !file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 403, 'Forbidden');
  let st;
  try { st = fs.statSync(file); if (!st.isFile()) throw new Error(); } catch {
    return send(res, 404, 'Not found', { 'Content-Type': 'text/plain; charset=utf-8' });
  }
  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const cache = ext === '.html' ? 'no-cache' : rel.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600';
  const etag = '"' + st.size.toString(16) + '-' + Math.floor(st.mtimeMs).toString(16) + '"';
  if (status === 200 && req.headers['if-none-match'] === etag) return send(res, 304, '', { ETag: etag, 'Cache-Control': cache });
  let body = fs.readFileSync(file);
  if (ext === '.html' && SITE_URL) body = Buffer.from(body.toString('utf8').replaceAll('__SITE_URL__', SITE_URL));
  else if (ext === '.html') body = Buffer.from(body.toString('utf8').replaceAll('__SITE_URL__', ''));
  if ((ext === '.xml' || ext === '.txt') && SITE_URL) body = Buffer.from(body.toString('utf8').replaceAll('__SITE_URL__', SITE_URL));
  const headers = { 'Content-Type': type, 'Cache-Control': cache, ETag: etag, Vary: 'Accept-Encoding' };
  if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(String(req.headers['accept-encoding'] || '')) && body.length > 1024) {
    body = zlib.gzipSync(body); headers['Content-Encoding'] = 'gzip';
  }
  headers['Content-Length'] = body.length;
  res.writeHead(status, { ...SECURITY_HEADERS, ...headers });
  res.end(req.method === 'HEAD' ? undefined : body);
}

// ---------- server ----------
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (PROD && TRUST_PROXY && req.headers['x-forwarded-proto'] === 'http') {
      return send(res, 308, '', { Location: 'https://' + req.headers.host + req.url });
    }
    if (PROD && isHttps(req)) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (!['GET', 'HEAD'].includes(req.method)) return send(res, 405, 'Method not allowed', { Allow: 'GET, HEAD' });
    if (url.pathname.startsWith('/media/')) return serveMedia(req, res, url);
    const gated = { '/demo': 'index.html', '/demo.html': 'index.html' }[url.pathname];
    if (gated) {
      if (!demoSession(req)) return send(res, 302, '', { Location: '/?demo=required#try-demo', 'Cache-Control': 'no-store' });
      const html = fs.readFileSync(path.join(PUBLIC_DIR, gated));
      return send(res, 200, html, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-store' });
    }
    return serveStatic(req, res, url);
  } catch (err) {
    const status = err.status && err.status < 500 ? err.status : 500;
    if (status === 500) log('error:', err.message);
    if (!res.headersSent) sendJson(res, status, { error: status === 500 ? 'Something went wrong. Please try again.' : err.message });
    else res.end();
  }
});

if (require.main === module) {
  server.listen(PORT, () => log(`Barid-IN website on http://localhost:${PORT} (media: ${MEDIA_DIR})`));
}
module.exports = { server, sign, verify };
