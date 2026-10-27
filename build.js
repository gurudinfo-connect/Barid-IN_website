'use strict';
// Bundles the React app (src/) into dist/. Run: npm run build
const esbuild = require('esbuild');
const fs = require('node:fs');
const path = require('node:path');

const dist = path.join(__dirname, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.cpSync(path.join(__dirname, 'public'), dist, { recursive: true });   // images, robots, sitemap, media-info

esbuild.build({
  entryPoints: { app: path.join(__dirname, 'src/main.jsx') },
  outdir: path.join(dist, 'assets'),
  entryNames: '[name]-[hash]',
  bundle: true, minify: true, external: ['/fonts/*'], format: 'iife', target: 'es2020', metafile: true,
  jsx: 'automatic', loader: { '.js': 'jsx' },
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'warning',
}).then((r) => {
  const out = Object.keys(r.metafile.outputs).map((f) => '/assets/' + path.basename(f));
  const js = out.find((f) => f.endsWith('.js')), css = out.find((f) => f.endsWith('.css'));
  const html = fs.readFileSync(path.join(__dirname, 'src/index.html'), 'utf8').replace('__JS__', js).replace('__CSS__', css);
  fs.writeFileSync(path.join(dist, 'index.html'), html);
  console.log('Built dist/ ->', js, css);
}).catch(() => process.exit(1));
