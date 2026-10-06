#!/usr/bin/env node
/* Builds the app.

   The source lives in src/. src/index.html is the page, with lines like
       <!-- include: js/today.js -->
   each of which is replaced by that file's exact contents. The result is
   written to index.html at the top of the repo, which is what GitHub Pages
   serves and what every test loads. Never edit index.html by hand: edit src/
   and run this.

     node build.js           write index.html
     node build.js --check   exit 1 if index.html is not a fresh build

   No dependencies and no transformation: what is in src/ is what ships. */
const fs = require('fs');
const path = require('path');

const DEFAULT_SRC = path.join(__dirname, 'src');
const OUT = path.join(__dirname, 'index.html');
const MARK = /^<!-- include: ([\w./-]+) -->$/;

function build(srcDir) {
  const SRC = srcDir || DEFAULT_SRC;
  const tpl = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
  if (!tpl.endsWith('\n')) throw new Error('src/index.html must end with a newline');
  const seen = new Set();
  const lines = tpl.slice(0, -1).split('\n');
  let html = '';
  for (const line of lines) {
    const m = MARK.exec(line);
    if (!m) { html += line + '\n'; continue; }
    const rel = m[1];
    if (rel.includes('..')) throw new Error('include outside src/: ' + rel);
    if (seen.has(rel)) throw new Error('included twice: ' + rel);
    seen.add(rel);
    const body = fs.readFileSync(path.join(SRC, rel), 'utf8');
    if (body.includes('\r')) throw new Error(rel + ' has Windows line endings');
    if (!body.endsWith('\n')) throw new Error(rel + ' must end with a newline');
    if (/\.js$/.test(rel) && /<\/script/i.test(body)) throw new Error(rel + ' contains </script, which would end its block early; write <\\/script');
    if (/\.css$/.test(rel) && /<\/style/i.test(body)) throw new Error(rel + ' contains </style');
    html += body;
  }
  /* every file in src/ must be used, so nothing is edited that never ships */
  const all = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (p !== path.join(SRC, 'index.html')) all.push(path.relative(SRC, p).split(path.sep).join('/'));
    }
  })(SRC);
  const unused = all.filter(f => !seen.has(f));
  if (unused.length) throw new Error('in src/ but never included: ' + unused.join(', '));
  return html;
}

module.exports = { build, OUT };

if (require.main === module) {
  const html = build();
  if (process.argv.includes('--check')) {
    const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (now !== html) {
      console.error('index.html is not a fresh build of src/. Run: node build.js');
      process.exit(1);
    }
    console.log('index.html matches src/ (' + Buffer.byteLength(html) + ' bytes)');
  } else {
    fs.writeFileSync(OUT, html);
    console.log('built index.html (' + Buffer.byteLength(html) + ' bytes)');
  }
}
