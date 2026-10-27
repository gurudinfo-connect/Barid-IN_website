'use strict';
// After build.js: replace the __SITE_URL__ placeholder (server.js does this at request time; static hosting cannot).
// Uses SITE_URL if set, otherwise Netlify's own URL variable.
const fs = require('node:fs');
const path = require('node:path');
const site = String(process.env.SITE_URL || process.env.URL || '').replace(/\/$/, '');
const dist = path.join(__dirname, '..', 'dist');
for (const f of ['index.html', 'sitemap.xml', 'robots.txt']) {
  const file = path.join(dist, f);
  if (fs.existsSync(file)) fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replaceAll('__SITE_URL__', site));
}
console.log('postbuild: __SITE_URL__ ->', site || '(empty)');
