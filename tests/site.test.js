'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'barid-site-'));
process.env.DATA_DIR = tmp;
process.env.COOKIE_SECRET = 'test-secret-test-secret-test-secret';
process.env.ADMIN_TOKEN = 'admin-token-for-tests';
process.env.DEMO_SESSION_HOURS = '1';
process.env.DEMO_APP_URL = 'https://hawmess-frontend.onrender.com';
process.env.TRUST_PROXY = 'true';   // lets each test pretend to be a different visitor IP
const { server, sign } = require('../server.js');
let base;
before(() => new Promise((r) => server.listen(0, () => { base = 'http://127.0.0.1:' + server.address().port; r(); })));
after(() => { server.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

const J = { 'Content-Type': 'application/json' };
const good = { name: 'Test Visitor', email: 'Visitor@Example.com', organization: 'Acme Ltd', role: 'HR', interest: 'IT helpdesk', consent: true };
let ipn = 0;
async function register(body = good, extra = {}) {
  return fetch(base + '/api/demo/register', { method: 'POST', headers: { ...J, 'X-Forwarded-For': '10.0.0.' + (++ipn), ...extra }, body: JSON.stringify(body), redirect: 'manual' });
}
const cookieOf = (res) => (res.headers.get('set-cookie') || '').split(';')[0];

test('homepage loads with security headers and all nav targets exist', async () => {
  const res = await fetch(base + '/');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  const html = await res.text();
  assert.ok(html.includes('id="root"'), 'React mount point missing');
  const js = html.match(/\/assets\/app-[\w-]+\.js/)[0];
  const code = await (await fetch(base + js)).text();
  for (const id of ['product', 'features', 'solutions', 'how', 'demo', 'security', 'contact']) assert.ok(code.includes(`"${id}"`), 'missing section #' + id);
  assert.ok(!/style="/.test(html), 'inline style attributes would be blocked by CSP');
});
test('static assets, legal pages, robots and sitemap are served; traversal is blocked', async () => {
  for (const p of ['/privacy', '/terms', '/robots.txt', '/sitemap.xml', '/img/dashboard.webp', '/media-info.json']) assert.equal((await fetch(base + p)).status, 200, p);
  assert.equal((await fetch(base + '/nope')).status, 404);
  assert.equal((await fetch(base + '/demo.js')).status, 404);
  const t = await fetch(base + '/..%2fserver.js'); assert.notEqual(t.status, 200);
  const t2 = await fetch(base + '/%2e%2e/server.js'); assert.notEqual(t2.status, 200);
  assert.ok(!(await (await fetch(base + '/server.js')).text()).includes('COOKIE_SECRET'));
});
test('media and demo page are refused without a session', async () => {
  assert.equal((await fetch(base + '/media/overview.mp4')).status, 401);
  assert.equal((await fetch(base + '/media/captions-overview.vtt')).status, 401);
  const d = await fetch(base + '/demo', { redirect: 'manual' });
  assert.equal(d.status, 302);
  assert.match(d.headers.get('location'), /demo=required/);
});
test('registration redirects to the live demo app; old /experience is gone', async () => {
  const reg = await (await register({ ...good, email: 'redir@example.com' })).json();
  assert.equal(reg.redirect, 'https://hawmess-frontend.onrender.com');
  assert.notEqual((await fetch(base + '/experience', { redirect: 'manual' })).status, 200);
});
test('registration validates input on the server', async () => {
  let r = await register({ ...good, email: 'not-an-email' });
  assert.equal(r.status, 400); assert.ok((await r.json()).fields.email);
  r = await register({ ...good, name: '' }); assert.equal(r.status, 400);
  r = await register({ ...good, organization: '' }); assert.equal(r.status, 400);
  r = await register({ ...good, consent: false }); assert.equal(r.status, 400);
  r = await fetch(base + '/api/demo/register', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' }); assert.equal(r.status, 415);
  r = await fetch(base + '/api/demo/register', { method: 'POST', headers: J, body: '{bad' }); assert.equal(r.status, 400);
  r = await fetch(base + '/api/demo/register', { method: 'POST', headers: J, body: JSON.stringify({ name: 'x'.repeat(40000) }) }); assert.equal(r.status, 413);
  r = await register(good, { Origin: 'https://evil.example' }); assert.equal(r.status, 403);
});
test('honeypot stores nothing and grants no access', async () => {
  const r = await register({ ...good, email: 'bot@example.com', website: 'http://spam' });
  assert.equal(r.status, 200); assert.equal(r.headers.get('set-cookie'), null);
});
test('valid registration saves the lead, sets an HttpOnly cookie and unlocks the demo', async () => {
  const r = await register();
  assert.equal(r.status, 200);
  const sc = r.headers.get('set-cookie'); assert.match(sc, /HttpOnly/); assert.match(sc, /SameSite=Lax/);
  const cookie = cookieOf(r);
  const s = await (await fetch(base + '/api/demo/session', { headers: { cookie } })).json();
  assert.equal(s.active, true); assert.equal(s.name, 'Test');
  const demo = await fetch(base + '/demo', { headers: { cookie } }); assert.equal(demo.status, 200);
  // saved (and e-mail normalised to lower case)
  const leads = JSON.parse(fs.readFileSync(path.join(tmp, 'leads.json'), 'utf8'));
  assert.ok(leads['visitor@example.com']); assert.equal(leads['visitor@example.com'].organization, 'Acme Ltd');
  assert.ok(!('bot@example.com' in leads));
  // registering again updates the same lead instead of duplicating it
  const before = JSON.parse(fs.readFileSync(path.join(tmp, 'leads.json'), 'utf8'));
  const n0 = before['visitor@example.com'].accessCount, c0 = Object.keys(before).length;
  await register(); const again = JSON.parse(fs.readFileSync(path.join(tmp, 'leads.json'), 'utf8'));
  assert.equal(Object.keys(again).length, c0); assert.equal(again['visitor@example.com'].accessCount, n0 + 1);
});
test('videos stream (with Range) only with a session, never as a navigation download, and only whitelisted names', async () => {
  const cookie = cookieOf(await register());
  const media = process.env.MEDIA_DIR || path.join(__dirname, '..', 'media');
  const file = fs.readdirSync(media).find((f) => f.endsWith('.mp4')); assert.ok(file, 'no mp4 in media');
  const size = fs.statSync(path.join(media, file)).size;
  const name = ['overview.mp4'].find((n) => fs.existsSync(path.join(media, n))) || file;
  const full = await fetch(base + '/media/' + name, { headers: { cookie, 'Sec-Fetch-Dest': 'video' } });
  assert.equal(full.status, 200); assert.equal(full.headers.get('content-type'), 'video/mp4');
  assert.match(full.headers.get('cache-control'), /no-store/);
  await full.body.cancel();
  const part = await fetch(base + '/media/' + name, { headers: { cookie, Range: 'bytes=0-99', 'Sec-Fetch-Dest': 'video' } });
  assert.equal(part.status, 206); assert.equal((await part.arrayBuffer()).byteLength, 100);
  const bad = await fetch(base + '/media/' + name, { headers: { cookie, Range: 'bytes=999999999-' } }); assert.equal(bad.status, 416);
  assert.equal((await fetch(base + '/media/' + name, { headers: { cookie, 'Sec-Fetch-Dest': 'document' } })).status, 403);
  for (const evil of ['../server.js', '..%2fserver.js', 'leads.json', '%2e%2e%2fdata%2fleads.json', 'src-overview.mp4']) assert.equal((await fetch(base + '/media/' + evil, { headers: { cookie } })).status, 404, evil);
});
test('tampered, forged and expired demo cookies are rejected', async () => {
  const good1 = cookieOf(await register());
  const forged = good1.slice(0, -3) + (good1.endsWith('AAA') ? 'BBB' : 'AAA');
  assert.equal((await fetch(base + '/media/overview.mp4', { headers: { cookie: forged } })).status, 401);
  const expired = 'bi_demo=' + encodeURIComponent(sign({ lid: 'x', n: 'X', exp: Date.now() - 1000 }));
  assert.equal((await fetch(base + '/media/overview.mp4', { headers: { cookie: expired } })).status, 401);
  assert.equal((await fetch(base + '/demo', { headers: { cookie: expired }, redirect: 'manual' })).status, 302);
  const other = 'bi_demo=' + encodeURIComponent(Buffer.from(JSON.stringify({ lid: 'x', n: 'X', exp: Date.now() + 1e9 })).toString('base64url') + '.AAAA');
  assert.equal((await fetch(base + '/api/demo/session', { headers: { cookie: other } }).then((r) => r.json())).active, false);
});
test('logout clears access', async () => {
  const r = await fetch(base + '/api/demo/logout', { method: 'POST', headers: J, body: '{}' });
  assert.match(r.headers.get('set-cookie'), /Max-Age=0/);
});
test('contact form validates and saves; honeypot is ignored', async () => {
  const post = (b) => fetch(base + '/api/contact', { method: 'POST', headers: J, body: JSON.stringify(b) });
  assert.equal((await post({ name: 'A', email: 'x', message: 'hi' })).status, 400);
  assert.equal((await post({ name: 'Alice Doe', email: 'alice@example.com', message: 'Hello, I would like a demo.' })).status, 200);
  assert.equal((await post({ name: 'Bot Bot', email: 'b@example.com', message: 'buy cheap things now', website: 'x' })).status, 200);
  const lines = fs.readFileSync(path.join(tmp, 'contact-messages.jsonl'), 'utf8').trim().split('\n');
  assert.equal(lines.length, 1); assert.equal(JSON.parse(lines[0]).email, 'alice@example.com');
});
test('admin lead export requires the token and is CSV-injection safe', async () => {
  assert.equal((await fetch(base + '/api/admin/leads')).status, 401);
  assert.equal((await fetch(base + '/api/admin/leads', { headers: { Authorization: 'Bearer wrong' } })).status, 401);
  await register({ ...good, email: 'csv@example.com', name: '=HYPERLINK("http://evil")' });
  const ok = await fetch(base + '/api/admin/leads', { headers: { Authorization: 'Bearer admin-token-for-tests' } });
  const body = await ok.json(); assert.equal(ok.status, 200); assert.ok(body.count >= 2); assert.ok(!('ipHash' in body.leads[0]));
  const csv = await (await fetch(base + '/api/admin/leads?format=csv', { headers: { Authorization: 'Bearer admin-token-for-tests' } })).text();
  assert.ok(csv.includes(`"'=HYPERLINK`), 'formula must be neutralised'); assert.ok(csv.startsWith('createdAt,'));
});
test('registration is rate limited per IP', async () => {
  let last;
  for (let i = 0; i < 10; i++) last = await register({ ...good, email: `rl${i}@example.com` }, { 'X-Forwarded-For': '192.0.2.99' });
  assert.equal(last.status, 429);
});
test('health endpoint', async () => { assert.deepEqual((await (await fetch(base + '/api/health')).json()).ok, true); });
