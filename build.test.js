/* The build: the published index.html is exactly what src/ produces, and the
   build refuses the mistakes that would quietly break the page. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { build, OUT } = require('./build.js');

const ok = [], bad = [];
const t = (name, pass, why) => (pass ? ok : bad).push(name + (pass || !why ? '' : ' (' + why + ')'));

function refuses(name, files, want) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'gauntlet-build-'));
  try {
    for (const [f, body] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true });
      fs.writeFileSync(path.join(d, f), body);
    }
    try { build(d); t(name, false, 'built without complaint'); }
    catch (e) { t(name, want.test(e.message), e.message); }
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
}

/* the one that matters: what is committed is what src/ builds */
const fresh = build();
const committed = fs.readFileSync(OUT, 'utf8');
t('the committed index.html is a fresh build of src/ (run: node build.js)', fresh === committed,
  committed.length + ' committed vs ' + fresh.length + ' built');

t('every script block in the page is closed', (fresh.match(/<script>/g) || []).length === (fresh.match(/<\/script>/g) || []).length);
t('the page starts and ends as a page', fresh.startsWith('<!doctype html>') && fresh.trimEnd().endsWith('</html>'));
t('no include markers survive into the page', !/<!-- include:/.test(fresh));

/* a minimal working source, to break one way at a time */
const page = '<script>\n<!-- include: a.js -->\n</script>\n';
{
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'gauntlet-build-'));
  fs.writeFileSync(path.join(d, 'index.html'), page);
  fs.writeFileSync(path.join(d, 'a.js'), 'var a = 1;\n');
  t('a file is included byte for byte', build(d) === '<script>\nvar a = 1;\n</script>\n');
  fs.rmSync(d, { recursive: true, force: true });
}
refuses('refuses a script containing </script', { 'index.html': page, 'a.js': 'var s = "</script>";\n' }, /<\/script/);
refuses('refuses a file in src/ that is never included', { 'index.html': page, 'a.js': 'var a;\n', 'b.js': 'var b;\n' }, /never included: b\.js/);
refuses('refuses the same file included twice', { 'index.html': page + '<!-- include: a.js -->\n', 'a.js': 'var a;\n' }, /twice/);
refuses('refuses a missing file', { 'index.html': page }, /ENOENT/);
refuses('refuses a file without a final newline', { 'index.html': page, 'a.js': 'var a;' }, /newline/);
refuses('refuses Windows line endings', { 'index.html': page, 'a.js': 'var a;\r\n' }, /line endings/);
refuses('refuses an include outside src/', { 'index.html': '<!-- include: ../x.js -->\n' }, /outside/);

console.log('PASS ' + ok.length);
ok.forEach(x => console.log('  + ' + x));
if (bad.length) { console.log('FAIL ' + bad.length); bad.forEach(x => console.log('  - ' + x)); }
process.exit(bad.length ? 1 : 0);
