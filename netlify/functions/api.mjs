// Barid-IN website backend for Netlify (Functions v2). Mirrors server.js:
//   /api/*   health, config, demo register/session/logout, contact, admin leads
//   /media/* gated demo videos (signed cookie, Range supported)
//   /demo    gated demo page (serves the built index.html)
// Leads and contact messages are stored in Netlify Blobs (a Netlify function has no persistent disk).
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const config = { path: ['/api/*', '/media/*', '/demo'] };

const env = (k, d = '') => (process.env[k] ?? d);
const ON_NETLIFY = Boolean(process.env.NETLIFY || process.env.NETLIFY_DEV || process.env.NETLIFY_LOCAL);
const SESSION_HOURS = Number(env('DEMO_SESSION_HOURS') || 4);
const APP_URL = env('APP_URL').trim();
const DEMO_APP_URL = env('DEMO_APP_URL').trim() || 'https://hawmess-frontend.onrender.com';
const ADMIN_TOKEN = env('ADMIN_TOKEN').trim();
const CONTACT_EMAIL = env('CONTACT_EMAIL').trim();
let COOKIE_SECRET = env('COOKIE_SECRET');
if (!COOKIE_SECRET && !ON_NETLIFY) COOKIE_SECRET = crypto.randomBytes(32).toString('hex');   // local/test only

const MEDIA = {
  'overview.mp4': 1, 'walkthrough.mp4': 1, 'ticket-raising.mp4': 1, 'navigation-menu.mp4': 1, 'leave-requests.mp4': 1,
  'visual-taskboard.mp4': 1, 'projects.mp4': 1, 'people-management.mp4': 1,
  'captions-overview.vtt': 1, 'captions-walkthrough.vtt': 1, 'captions-walkthrough-steps.vtt': 1,
};
const MIME = { '.mp4': 'video/mp4', '.vtt': 'text/vtt; charset=utf-8' };
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; media-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
};

// ---------- storage ----------
const memory = new Map();   // used only when not running on Netlify (tests)
async function store(name) {
  if (!ON_NETLIFY) {
    if (!memory.has(name)) memory.set(name, new Map());
    const m = memory.get(name);
    return {
      get: async (k) => (m.has(k) ? JSON.parse(m.get(k)) : null),
      setJSON: async (k, v) => { m.set(k, JSON.stringify(v)); },
      list: async () => ({ blobs: [...m.keys()].map((key) => ({ key })) }),
    };
  }
  const { getStore } = await import('@netlify/blobs');
  // Netlify normally injects the Blobs context itself; if it does not, set NETLIFY_SITE_ID and NETLIFY_BLOBS_TOKEN
  // (a personal access token) in the site's environment variables and they are used here.
  const siteID = env('NETLIFY_SITE_ID') || env('SITE_ID'), token = env('NETLIFY_BLOBS_TOKEN');
  const s = siteID && token ? getStore({ name, siteID, token, consistency: 'strong' }) : getStore({ name, consistency: 'strong' });
  return { get: (k) => s.get(k, { type: 'json' }), setJSON: (k, v) => s.setJSON(k, v), list: () => s.list() };
}
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

// ---------- helpers ----------
const log = (...a) => console.log(new Date().toISOString(), ...a);   // never log bodies, cookies or tokens
function respond(status, body, headers = {}) { return new Response(body, { status, headers: { ...SECURITY_HEADERS, ...headers } }); }
function json(status, obj, headers = {}) {
  return respond(status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
}
const httpErr = (status, message) => Object.assign(new Error(message), { status });

const buckets = new Map();   // per warm instance only: best-effort rate limit
function rateLimited(key, max, windowMs) {
  const now = Date.now(); const b = buckets.get(key);
  if (!b || now > b.reset) { buckets.set(key, { n: 1, reset: now + windowMs }); return false; }
  b.n += 1; return b.n > max;
}
function clientIp(req, context) {
  return context?.ip || String(req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}
const hashIp = (ip) => crypto.createHmac('sha256', COOKIE_SECRET).update(ip).digest('hex').slice(0, 16);

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return body + '.' + crypto.createHmac('sha256', COOKIE_SECRET).update(body).digest('base64url');
}
function verify(token) {
  if (!COOKIE_SECRET || !token || typeof token !== 'string' || token.length > 600) return null;
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  const a = Buffer.from(mac), b = Buffer.from(crypto.createHmac('sha256', COOKIE_SECRET).update(body).digest('base64url'));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return p && typeof p.exp === 'number' && Date.now() <= p.exp ? p : null;
  } catch { return null; }
}
function cookies(req) {
  const out = {};
  for (const part of String(req.headers.get('cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) { try { out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* bad cookie */ } }
  }
  return out;
}
const demoSession = (req) => verify(cookies(req).bi_demo);
const cookieHeader = (value, maxAge) => `bi_demo=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${maxAge}`;

async function readJson(req) {
  if (!String(req.headers.get('content-type') || '').includes('application/json')) throw httpErr(415, 'Content-Type must be application/json');
  const text = await req.text();
  if (text.length > 16 * 1024) throw httpErr(413, 'Request too large');
  try { return JSON.parse(text || '{}'); } catch { throw httpErr(400, 'Invalid JSON'); }
}
function sameOrigin(req, url) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).host === url.host; } catch { return false; }
}

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

// Bundled files (see included_files in netlify.toml) live under the function root.
const HERE = path.dirname(fileURLToPath(import.meta.url));
function findFile(rel) {
  for (const root of [process.env.LAMBDA_TASK_ROOT, process.cwd(), path.join(HERE, '..', '..'), HERE].filter(Boolean)) {
    const f = path.join(root, rel);
    if (fs.existsSync(f)) return f;
  }
  return null;
}

// ---------- API ----------
async function handleApi(req, url, context) {
  const p = url.pathname, ip = clientIp(req, context);

  if (p === '/api/health' && req.method === 'GET') return json(200, { ok: true, time: new Date().toISOString() });

  if (p === '/api/config' && req.method === 'GET') {
    return json(200, { liveDemoConfigured: Boolean(DEMO_APP_URL), appUrl: APP_URL || null, contactEmail: CONTACT_EMAIL || null, sessionHours: SESSION_HOURS });
  }

  if (p === '/api/demo/session' && req.method === 'GET') {
    const s = demoSession(req);
    if (!s) return json(200, { active: false });
    return json(200, { active: true, name: s.n, expiresAt: s.exp, liveDemoUrl: DEMO_APP_URL || null, videos: Object.keys(MEDIA).filter((k) => k.endsWith('.mp4')) });
  }

  if (p === '/api/demo/register' && req.method === 'POST') {
    if (!COOKIE_SECRET) { log('COOKIE_SECRET is not set'); return json(500, { error: 'The server is not configured yet (COOKIE_SECRET missing).' }); }
    if (!sameOrigin(req, url)) return json(403, { error: 'Cross-origin request blocked.' });
    if (rateLimited('reg:' + ip, 8, 10 * 60_000)) return json(429, { error: 'Too many attempts. Please wait a few minutes and try again.' });
    const body = await readJson(req);
    if (body.website) return json(200, { ok: true, redirect: '/' });   // honeypot
    const { errors, value } = validateRegistration(body);
    if (Object.keys(errors).length) return json(400, { error: 'Please correct the highlighted fields.', fields: errors });
    const leads = await store('leads');
    const key = sha(value.email), now = new Date().toISOString();
    let prev = null;
    try { prev = await leads.get(key); } catch (e) { log('lead lookup failed:', e.name, e.message); }
    const lead = prev
      ? { ...prev, ...value, lastAccessAt: now, accessCount: (prev.accessCount || 1) + 1 }
      : { id: crypto.randomUUID(), ...value, consent: true, consentAt: now, createdAt: now, lastAccessAt: now, accessCount: 1, ipHash: hashIp(ip), userAgent: clean(req.headers.get('user-agent'), 200) };
    try { await leads.setJSON(key, lead); } catch (e) { log('lead save failed:', e.name, e.message); return json(500, { error: 'We could not save your details. Please try again shortly.' }); }
    const exp = Date.now() + SESSION_HOURS * 3600_000;
    log('demo access granted', lead.id);
    return json(200, { ok: true, redirect: DEMO_APP_URL }, { 'Set-Cookie': cookieHeader(sign({ lid: lead.id, n: value.name.split(' ')[0], exp }), SESSION_HOURS * 3600) });
  }

  if (p === '/api/demo/logout' && req.method === 'POST') return json(200, { ok: true }, { 'Set-Cookie': cookieHeader('', 0) });

  if (p === '/api/contact' && req.method === 'POST') {
    if (!sameOrigin(req, url)) return json(403, { error: 'Cross-origin request blocked.' });
    if (rateLimited('contact:' + ip, 5, 10 * 60_000)) return json(429, { error: 'Too many messages. Please wait a few minutes and try again.' });
    const b = await readJson(req);
    if (b.website) return json(200, { ok: true });
    const name = clean(b.name, 80), email = clean(b.email, 254).toLowerCase();
    const message = String(b.message ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, 4000);
    const fields = {};
    if (name.length < 2) fields.name = 'Please enter your name.';
    if (!EMAIL_RE.test(email)) fields.email = 'Please enter a valid email address.';
    if (message.length < 10) fields.message = 'Please write at least a short message (10+ characters).';
    if (Object.keys(fields).length) return json(400, { error: 'Please correct the highlighted fields.', fields });
    try {
      const id = crypto.randomUUID();
      await (await store('contact-messages')).setJSON(id, { id, name, email, organization: clean(b.organization, 120), message, createdAt: new Date().toISOString(), ipHash: hashIp(ip || 'x') });
    } catch (e) { log('contact save failed:', e.message); return json(500, { error: 'We could not send your message. Please try again shortly.' }); }
    return json(200, { ok: true });
  }

  if (p === '/api/admin/leads' && req.method === 'GET') {
    if (!ADMIN_TOKEN) return json(404, { error: 'Not found' });
    if (rateLimited('admin:' + ip, 20, 10 * 60_000)) return json(429, { error: 'Too many attempts.' });
    const given = String(req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!crypto.timingSafeEqual(crypto.createHash('sha256').update(given).digest(), crypto.createHash('sha256').update(ADMIN_TOKEN).digest())) return json(401, { error: 'Unauthorized' });
    const s = await store('leads');
    const { blobs } = await s.list();
    const rows = (await Promise.all(blobs.map((b) => s.get(b.key)))).filter(Boolean).sort((x, y) => String(y.createdAt).localeCompare(String(x.createdAt)));
    if (url.searchParams.get('format') === 'csv') {
      const cols = ['createdAt', 'lastAccessAt', 'accessCount', 'name', 'email', 'organization', 'role', 'interest', 'consentAt'];
      const esc = (v) => { let t = String(v ?? ''); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return '"' + t.replace(/"/g, '""') + '"'; };
      const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
      return respond(200, csv, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="barid-in-leads.csv"', 'Cache-Control': 'no-store' });
    }
    return json(200, { count: rows.length, leads: rows.map(({ ipHash, userAgent, ...r }) => r) });
  }

  return json(404, { error: 'Not found' });
}

// ---------- gated media ----------
function serveMedia(req, url) {
  let name; try { name = decodeURIComponent(url.pathname.slice('/media/'.length)); } catch { return json(404, { error: 'Not found' }); }
  if (!Object.prototype.hasOwnProperty.call(MEDIA, name)) return json(404, { error: 'Not found' });
  if (!demoSession(req)) return json(401, { error: 'Demo access required. Please register to watch.' });
  const dest = req.headers.get('sec-fetch-dest');
  if (dest && !['video', 'track', 'empty'].includes(dest)) return json(403, { error: 'This file can only be played inside the demo page.' });
  const file = findFile('media/' + name);
  if (!file) return json(404, { error: 'Video not available yet.' });
  const buf = fs.readFileSync(file), size = buf.length, ext = path.extname(name);
  const base = { 'Content-Type': MIME[ext], 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store', 'Content-Disposition': 'inline', 'Cross-Origin-Resource-Policy': 'same-origin' };
  const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.get('range') || ''));
  if (range && ext === '.mp4') {
    let start = range[1] === '' ? NaN : Number(range[1]);
    let end = range[2] === '' ? size - 1 : Number(range[2]);
    if (range[1] === '' && range[2] !== '') { start = Math.max(0, size - Number(range[2])); end = size - 1; }
    if (!(start >= 0) || start >= size || end < start) return respond(416, '', { ...base, 'Content-Range': `bytes */${size}` });
    end = Math.min(end, size - 1);
    return respond(206, req.method === 'HEAD' ? null : buf.subarray(start, end + 1), { ...base, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) });
  }
  return respond(200, req.method === 'HEAD' ? null : buf, { ...base, 'Content-Length': String(size) });
}

// ---------- gated demo page ----------
async function serveDemoPage(req, url) {
  if (!demoSession(req)) return respond(302, '', { Location: '/?demo=required#try-demo', 'Cache-Control': 'no-store' });
  const f = findFile('dist/index.html');
  const html = f ? fs.readFileSync(f) : Buffer.from(await (await fetch(new URL('/index.html', url))).text());
  return respond(200, html, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
}

export default async function handler(req, context) {
  try {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) return await handleApi(req, url, context);
    if (!['GET', 'HEAD'].includes(req.method)) return respond(405, 'Method not allowed', { Allow: 'GET, HEAD' });
    if (url.pathname.startsWith('/media/')) return serveMedia(req, url);
    if (url.pathname === '/demo') return await serveDemoPage(req, url);
    return json(404, { error: 'Not found' });
  } catch (err) {
    const status = err.status && err.status < 500 ? err.status : 500;
    if (status === 500) log('error:', err.message);
    return json(status, { error: status === 500 ? 'Something went wrong. Please try again.' : err.message });
  }
}
export { sign };
