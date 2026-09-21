/* Shared boot and assertion plumbing for the three suites.
   Every suite gets its own clean app instance so one cannot leave state behind
   for the next. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const FILE = path.join(__dirname, 'index.html');

function boot(opts) {
  const o = opts || {};
  const errs = [];
  const html = fs.readFileSync(o.file || FILE, 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://example.test/',
    beforeParse(w) {
      w.fetch = o.fetch || (() => Promise.reject(new Error('offline in test')));
      w.navigator.vibrate = () => {};
      w.scrollTo = () => {};
      if (!w.navigator.clipboard) {
        Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: () => Promise.resolve() } });
      }
      if (o.ua) Object.defineProperty(w.navigator, 'userAgent', { value: o.ua, configurable: true });
      if (o.before) o.before(w);
      /* keep where it happened, not just the message */
      w.onerror = (m, src, line, col, err) => errs.push(String(m) + (err && err.stack
        ? ' @ ' + err.stack.split('\n').slice(1, 4).map(x => x.trim().replace(/https:\/\/example\.test\/:/, 'line ')).join(' < ') : ''));
      w.addEventListener('unhandledrejection', e => errs.push('unhandled rejection: ' + (e.reason && e.reason.message)));
    }
  });
  dom.window.addEventListener('error', e => errs.push(e.message));
  return new Promise(res => setTimeout(() => {
    res({ dom, w: dom.window, d: dom.window.document, G: dom.window.__G, errs, source: html });
  }, o.wait || 700));
}

function suite(name) {
  const pass = [], fail = [];
  const t = (label, cond, extra) => {
    let ok = false;
    try { ok = typeof cond === 'function' ? cond() : cond; }
    catch (e) { ok = false; extra = (extra ? extra + ' :: ' : '') + 'threw ' + e.message; }
    (ok ? pass : fail).push(label + (extra && !ok ? ' :: ' + extra : ''));
    return ok;
  };
  const report = errs => {
    console.log('\n=== ' + name + ' ===');
    console.log('PASS ' + pass.length + (fail.length ? '   FAIL ' + fail.length : ''));
    fail.forEach(x => console.log('  ✗ ' + x));
    if (errs && errs.length) {
      console.log('  PAGE ERRORS ' + errs.length);
      [...new Set(errs)].slice(0, 10).forEach(x => console.log('    ! ' + x));
    }
    return { name, pass: pass.length, fail: fail.length, errors: (errs || []).length, failures: fail };
  };
  return { t, report, pass, fail };
}

/* A fresh onboarded user, so journeys do not all start at the first screen. */
function onboard(G, over) {
  const o = over || {};
  G.startOnboarding();
  Object.assign(G.onbDraft, {
    handle: o.handle || 'ferg', aim: o.aim || 'lose', sex: o.sex || 'm',
    age: 34, height: 178, weight: o.weight || 92, activity: 'mod',
    liftDays: o.liftDays === undefined ? 3 : o.liftDays,
    cardioDays: o.cardioDays === undefined ? 2 : o.cardioDays,
    checkinDay: o.checkinDay === undefined ? 6 : o.checkinDay,
    kit: o.kit || G.ALL_KIT.slice()
  });
  G.finishOnboarding();
  return G.S;
}

module.exports = { boot, suite, onboard, FILE };
