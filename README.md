# Barid-IN public website

Marketing site + gated demo videos + lead capture for the Barid-IN Ticketing Tool.
Built with **React, HTML, CSS and JavaScript only**: a React front end (`src/`) served by a small Node server (`server.js`).

    npm install              # react, react-dom, esbuild
    cp .env.example .env     # set COOKIE_SECRET (and ADMIN_TOKEN)
    npm run dev              # builds the React app, then http://localhost:8090
    npm test                 # builds, then runs 14 integration tests

A prebuilt `dist/` is included, so `node server.js` also works straight away with no install.
After changing anything in `src/` or `public/`, run `npm run build`.

## Layout
- `src/content.js`: all page copy (features, FAQ, security, legal text). Edit text here.
- `src/Home.jsx`: home page sections, including the sample ticket in the hero.
- `src/Pages.jsx`: gated demo-videos page (`/demo`), privacy, terms, 404.
- `src/shared.jsx`: router, dialogs, forms, header and footer. `src/main.jsx`: entry point. `src/styles.css`: all styling.
- `public/`: images, robots.txt, sitemap.xml, media-info.json (copied into `dist/` by the build).
- `server.js`: API, demo gate, video streaming; serves `dist/`. `media/`: private demo videos.

## How the demo gate works
1. "Try Live Demo" opens a form (name, work email, organisation, optional role/interest, consent).
2. `POST /api/demo/register` validates on the server, rate-limits (8 / 10 min / IP), ignores bots (honeypot),
   saves the visitor to `DATA_DIR/leads.json` and sets a signed, HttpOnly cookie that expires after `DEMO_SESSION_HOURS` (default 4).
3. After registering, visitors go to `DEMO_APP_URL`. With an active session, the video cards on the home page open `/demo`.
4. `/demo` and `/media/*` require the cookie. Videos stream with Range support and `Cache-Control: no-store`, with no download link or right-click menu.
5. View leads: `curl -H "Authorization: Bearer $ADMIN_TOKEN" "https://your-site/api/admin/leads?format=csv"`.
   Contact-form messages are in `DATA_DIR/contact-messages.jsonl`.

## Limits (be aware)
- Download protection is a deterrent: a determined visitor can still capture a video they are allowed to play.
- Leads and messages are stored in files; use a persistent disk and back it up. Messages are not emailed.
- `privacy` and `terms` text are drafts and need legal review before launch.
- The sample ticket in the hero is illustrative, not real data.

## Animations and navigation
- Floating glass navigation pill (`Header` in `src/shared.jsx`, styles at the top of `src/styles.css`): ticket-shaped sliding tab, scroll-progress line, turns dark over dark sections.
- Scroll reveals, counters and parallax are in `src/anim.js`. Everything respects `prefers-reduced-motion`.
