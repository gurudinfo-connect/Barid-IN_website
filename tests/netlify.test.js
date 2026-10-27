'use strict';
// Exercises netlify/functions/api.mjs directly with Request objects (in-memory store, no Netlify needed).
const { test, before } = require('node:test');
const assert = require('node:assert/strict');

process.env.COOKIE_SECRET = 'test-secret-test-secret-test-secret';
process.env.ADMIN_TOKEN = 'admin-token-for-tests';
process.env.DEMO_APP_URL = 'https://demo.example.com';
delete process.env.NETLIFY;
let handler;
before(async () => { handler = (await import('../netlify/functions/api.mjs')).default; });

const H = 'https://site.test';
let n = 0;
const call = (p, init = {}, ip = '10.1.0.' + ++n) => handler(new Request(H + p, init), { ip });
const post = (p, body, headers = {}, ip) => call(p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }, ip);
const good = { name: 'Test Visitor', email: 'Visitor@Example.com', organization: 'Acme Ltd', role: 'HR', interest: 'IT helpdesk', consent: true };
const cookieOf = (r) => (r.headers.get('set-cookie') || '').split(';')[0];

test('health and config', async () => {
  assert.equal((await (await call('/api/health')).json()).ok, true);
  const c = await (await call('/api/config')).json();
  assert.equal(c.liveDemoConfigured, true);
});
test('register validates, saves, sets a secure HttpOnly cookie and redirects', async () => {
  const bad = await post('/api/demo/register', { ...good, email: 'nope', consent: false });
  assert.equal(bad.status, 400);
  assert.ok((await bad.json()).fields.email);
  const ok = await post('/api/demo/register', good);
  assert.equal(ok.status, 200);
  const b = await ok.json();
  assert.equal(b.ok, true); assert.equal(b.redirect, 'https://demo.example.com');
  const sc = ok.headers.get('set-cookie');
  assert.match(sc, /HttpOnly/); assert.match(sc, /Secure/); assert.match(sc, /SameSite=Lax/);
});
test('session reflects the cookie; logout clears it', async () => {
  const ck = cookieOf(await post('/api/demo/register', good));
  assert.equal((await (await call('/api/demo/session')).json()).active, false);
  const s = await (await call('/api/demo/session', { headers: { cookie: ck } })).json();
  assert.equal(s.active, true); assert.equal(s.name, 'Test');
  assert.match((await post('/api/demo/logout', {})).headers.get('set-cookie'), /Max-Age=0/);
});
test('tampered or missing cookie is rejected', async () => {
  const ck = cookieOf(await post('/api/demo/register', good));
  assert.equal((await call('/api/demo/session', { headers: { cookie: ck.slice(0, -2) + 'xx' } })).status, 200);
  assert.equal((await (await call('/api/demo/session', { headers: { cookie: ck.slice(0, -2) + 'xx' } })).json()).active, false);
});
test('cross-origin register is blocked; honeypot stores nothing', async () => {
  assert.equal((await post('/api/demo/register', good, { Origin: 'https://evil.test' })).status, 403);
  const r = await post('/api/demo/register', { ...good, website: 'spam' });
  assert.equal((await r.json()).redirect, '/'); assert.equal(r.headers.get('set-cookie'), null);
});
test('rate limit kicks in after 8 attempts from one IP', async () => {
  let last; for (let i = 0; i < 10; i++) last = await post('/api/demo/register', good, {}, '10.9.9.9');
  assert.equal(last.status, 429);
});
test('contact form validates and saves', async () => {
  assert.equal((await post('/api/contact', { name: 'A', email: 'x', message: 'hi' })).status, 400);
  assert.equal((await post('/api/contact', { name: 'Test Person', email: 'p@example.com', message: 'Hello, I would like a demo.' })).status, 200);
});
test('admin leads needs the token; csv export is injection-safe', async () => {
  await post('/api/demo/register', { ...good, email: 'csv@example.com', name: '=cmd()' });
  assert.equal((await call('/api/admin/leads')).status, 401);
  const h = { Authorization: 'Bearer admin-token-for-tests' };
  const j = await (await call('/api/admin/leads', { headers: h })).json();
  assert.ok(j.count >= 2); assert.ok(!('ipHash' in j.leads[0]));
  const csv = await (await call('/api/admin/leads?format=csv', { headers: h })).text();
  assert.ok(csv.includes(`"'=cmd()"`));
});
test('media: 401 without cookie, 404 for unknown, ranged 206 and 416 with cookie', async () => {
  assert.equal((await call('/media/overview.mp4')).status, 401);
  const ck = cookieOf(await post('/api/demo/register', good));
  const h = { cookie: ck };
  assert.equal((await call('/media/secret.txt', { headers: h })).status, 404);
  assert.equal((await call('/media/overview.mp4', { headers: { ...h, 'Sec-Fetch-Dest': 'document' } })).status, 403);
  const full = await call('/media/overview.mp4', { headers: h });
  assert.equal(full.status, 200); assert.equal(full.headers.get('content-type'), 'video/mp4');
  const part = await call('/media/overview.mp4', { headers: { ...h, Range: 'bytes=0-99' } });
  assert.equal(part.status, 206); assert.equal((await part.arrayBuffer()).byteLength, 100);
  assert.equal((await call('/media/overview.mp4', { headers: { ...h, Range: 'bytes=999999999-' } })).status, 416);
  assert.equal((await call('/media/captions-overview.vtt', { headers: h })).status, 200);
});
test('/demo redirects without a cookie and serves the app shell with one', async () => {
  const r = await call('/demo');
  assert.equal(r.status, 302); assert.match(r.headers.get('location'), /demo=required/);
  const ck = cookieOf(await post('/api/demo/register', good));
  const ok = await call('/demo', { headers: { cookie: ck } });
  assert.equal(ok.status, 200); assert.ok((await ok.text()).includes('id="root"'));
});
