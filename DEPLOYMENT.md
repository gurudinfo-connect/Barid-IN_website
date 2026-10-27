# Deployment

The website needs a server (cookies, lead storage), so it cannot run on static hosting alone.
Recommended: one small Node/Docker service with a persistent disk, separate from the Barid-IN app.

## 1. Repository
    git init && git add . && git commit -m "Barid-IN website"
`.env`, `data/` and `node_modules` are git-ignored. Never commit secrets.

## 2. Host (Render / Railway / Fly.io / any VPS with Docker)
- Deploy the `Dockerfile` (it builds the React app, then runs `node server.js`). Without Docker: `npm install && npm run build`, then start with `node server.js`.
- Attach a persistent disk mounted at `/data` and set `DATA_DIR=/data`.
- Set env vars from `.env.example`: `NODE_ENV=production`, `SITE_URL`, `COOKIE_SECRET` (random 32+ bytes),
  `ADMIN_TOKEN`, `TRUST_PROXY=true`, `APP_URL`, `CONTACT_EMAIL`. In production the server refuses to start without `COOKIE_SECRET`.
- Health check path: `/api/health`.
- Videos (~8 MB) ship in `media/` (private; only served through the gate).

## 3. Domain and HTTPS
Point your domain at the host and enable its managed TLS certificate. With `TRUST_PROXY=true` the server redirects http to https, sends HSTS and Secure cookies.

## 4. Smoke test
- `/` loads, nav links work, `/api/health` returns ok.
- `curl -i https://site/media/overview.mp4` returns 401.
- Register via the form, confirm the demo page plays the videos, then GET `/api/admin/leads` with the token shows your entry.

## 5. Rollback / recovery
Redeploy the previous image or commit. Back up `/data/leads.json` and `contact-messages.jsonl`; restore by copying them back.

## 6. Before connecting the real Barid-IN app
- `.env` and `backend/.env` are committed in your repo: rotate every secret, `git rm --cached` them, purge history.
- `frontend/src/api.ts` default API URL and `backend/src/index.ts` CORS list still point at old hawmess onrender hosts.
- Set `APP_URL` here so "Sign In" opens your app.

Proposed live demo (NOT implemented, needs your approval): a separate backend + database with fictional seed data and `DEMO_MODE=true`;
a server-side `POST /auth/demo-login` issuing a short-lived token for a least-privilege demo user (no shared password in frontend code);
blocked admin/config/user-management routes, per-IP rate limits, scheduled database reset. Then set `DEMO_APP_URL`.
