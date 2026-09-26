#!/usr/bin/env node
/* Runs every suite and reports one verdict.
   node test.js            all three
   node test.js cta        just one
*/
const { spawn } = require('child_process');

const SUITES = [
  ['regression', 'regression.js', 'Every fix made, asserted individually'],
  ['cta',        'cta.js',        'Every control audited statically and clicked'],
  ['uat',        'uat.js',        'Forty-five end to end journeys on clean installs'],
  ['sw',         'sw.test.js',    'The service worker, against a simulated GitHub Pages']
];

const want = process.argv.slice(2);
const run = SUITES.filter(s => !want.length || want.includes(s[0]));

(async () => {
  const results = [];
  for (const [name, file, blurb] of run) {
    const out = await new Promise(res => {
      let buf = '';
      const p = spawn('node', [file], { env: Object.assign({}, process.env, { TZ: process.env.TZ || 'Europe/Dublin' }) });
      p.stdout.on('data', d => { buf += d; process.stdout.write(d); });
      p.stderr.on('data', d => { const s = String(d); if (!/Not implemented/.test(s)) { buf += s; process.stderr.write(d); } });
      p.on('close', code => res({ code, buf }));
    });
    const pass = +(/PASS (\d+)/.exec(out.buf) || [0, 0])[1];
    const fail = +(/FAIL (\d+)/.exec(out.buf) || [0, 0])[1];
    const errs = +(/PAGE ERRORS (\d+)/.exec(out.buf) || [0, 0])[1];
    results.push({ name, blurb, pass, fail, errs, code: out.code });
  }

  const tp = results.reduce((a, r) => a + r.pass, 0);
  const tf = results.reduce((a, r) => a + r.fail, 0);
  const te = results.reduce((a, r) => a + r.errs, 0);
  console.log('\n' + '='.repeat(56));
  results.forEach(r => console.log(
    '  ' + (r.fail || r.errs ? 'FAIL' : ' OK ') + '  ' + r.name.padEnd(12) +
    String(r.pass).padStart(4) + ' passed' +
    (r.fail ? '   ' + r.fail + ' failed' : '') +
    (r.errs ? '   ' + r.errs + ' page errors' : '')));
  console.log('='.repeat(56));
  console.log('  ' + tp + ' assertions, ' + tf + ' failures, ' + te + ' page errors');
  process.exit(tf || te ? 1 : 0);
})();
