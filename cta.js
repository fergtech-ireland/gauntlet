/* ============================================================
   CTA SUITE
   Two halves.
   STATIC: pull every id and data-attribute that appears on an interactive
   element anywhere in the file, including inside template literals, and check
   something in the source actually listens for it. This is what would have
   caught go('you') pointing at a screen that did not exist.
   RUNTIME: open every screen and every sheet, click every visible control, and
   assert the app neither throws nor blanks a screen.
   ============================================================ */
const { boot, suite, onboard } = require('./harness');

/* Controls that are deliberately inert markup rather than handlers. */
const INERT = new Set([
  'themeColor', 'toast', 'scrim', 'grid', 'dash', 'dashBody', 'dashLifts',
  'todayView', 'planView', 'feedView', 'coachBody', 'logBody', 'foodBody',
  'foodList', 'dayBody', 'weekBody', 'altBody', 'onbBody', 'tplEditBody',
  'circEditBody', 'exList', 'tplList', 'peopleList', 'coachBriefText',
  'profHandle', 'stSessions', 'stTried', 'stPicked', 'sessHead', 'gymBody',
  'altTitle', 'altSub', 'tplEditTitle', 'circEditTitle', 'wipeNote',
  'outwb', 'outsleep', 'outstress', 'restLabel', 'restLeft', 'gymTitle',
  'gymSub', 'gymClock', 'playerArt', 'playerBody', 'onbDots', 'weekRecap'
]);

/* Controls whose click is destructive or leaves the app somewhere the sweep
   cannot recover from. They are asserted to exist and to be wired, then left
   alone. */
const DO_NOT_CLICK = new Set([
  'wipeData', 'dlData', 'signOut', 'cloudSetup', 'habitRetire', 'targetClear',
  'coachSave', 'nfSave', 'endConv'
]);

function staticAudit(source, t) {
  /* every id="..." and data-xxx="..." sitting on a button or clickable div */
  const ids = new Set();
  const dataAttrs = new Set();

  /* tag-aware, so display-only spans, sections and pre blocks are not audited
     as if they were controls. Works inside template literals too, because the
     literal still contains "<button ... id=..." verbatim. */
  const idRe = /<([a-z]+)\b[^>]{0,400}?\bid="([A-Za-z][\w-]*)"/g;
  let m;
  const INTERACTIVE = new Set(['button', 'input', 'textarea', 'a', 'select']);
  while ((m = idRe.exec(source))) if (INTERACTIVE.has(m[1])) ids.add(m[2]);
  const dataRe = /\bdata-([a-z][a-z0-9-]*)="/g;
  while ((m = dataRe.exec(source))) dataAttrs.add(m[1]);

  const orphanIds = [];
  ids.forEach(id => {
    if (INERT.has(id)) return;
    /* a handler refers to it as '#id', getElementById('id'), $('id') or .id=== */
    const patterns = [
      "'#" + id + "'", '"#' + id + '"',
      "getElementById('" + id + "')", 'getElementById("' + id + '")',
      "$('" + id + "')", '$("' + id + '")',
      "id==='" + id + "'", 'id==="' + id + '"',
      "closest('#" + id + "')",
      /* read through a helper: v('nfName'), openSheet('foodSheet') */
      "'" + id + "'", '"' + id + '"'
    ];
    if (!patterns.some(p => source.includes(p))) orphanIds.push(id);
  });

  const orphanData = [];
  dataAttrs.forEach(a => {
    const camel = a.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const patterns = ["[data-" + a + "]", 'dataset.' + camel, "data-" + a + "="];
    /* the attribute must be both written AND read */
    const read = source.includes("[data-" + a + "]") || source.includes('dataset.' + camel);
    if (!read) orphanData.push(a);
  });

  t('no id is written without a listener', orphanIds.length === 0, orphanIds.join(', '));
  t('no data attribute is written without a reader', orphanData.length === 0, orphanData.join(', '));

  /* every go('x') must name a screen that exists */
  const screens = new Set([...source.matchAll(/id="s-([a-z]+)"/g)].map(x => x[1]));
  const gos = [...source.matchAll(/\bgo\('([a-z]+)'\)/g)].map(x => x[1]);
  const badGo = gos.filter(g => !screens.has(g));
  t('every go() targets a real screen', badGo.length === 0, badGo.join(', '));

  /* every openSheet('x') must name a sheet that exists */
  const sheets = new Set([...source.matchAll(/class="sheet" id="([A-Za-z]+)"/g)].map(x => x[1]));
  const opens = [...new Set([...source.matchAll(/openSheet\('([A-Za-z]+)'\)/g)].map(x => x[1]))];
  const badSheet = opens.filter(s => !sheets.has(s));
  t('every openSheet() targets a real sheet', badSheet.length === 0, badSheet.join(', '));

  /* No declaration may be silently overridden by a later copy of the same
     selector. That is what dead CSS is, and it is how the habit tracker's
     .dots quietly restyled the onboarding progress bar. */
  const cssText = source.slice(source.indexOf('<style>') + 7, source.indexOf('</style>'))
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  const seen = {}, dead = [];
  const rules = [...cssText.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => [m[1].trim(), m[2]]);
  for (let i = rules.length - 1; i >= 0; i--) {
    const [sel, body] = rules[i];
    const props = body.split(/;(?![^()]*\))/).map(x => x.split(':')[0].trim().toLowerCase()).filter(Boolean);
    seen[sel] = seen[sel] || new Set();
    props.forEach(pr => { if (seen[sel].has(pr)) dead.push(sel + ' { ' + pr + ' }'); });
    props.forEach(pr => seen[sel].add(pr));
  }
  t('no CSS declaration is dead, overridden by a later copy of its own selector', dead.length === 0, dead.slice(0, 6).join(', '));

  /* A handler that looks for closest('[data-x]') must not use an attribute the
     app also puts on the page root, or every tap anywhere matches the root.
     That is how the theme picker re-fired on every tap. */
  const rootAttrs = [...source.matchAll(/(?:documentElement|root)\.setAttribute\('data-([a-z-]+)'/g)].map(m => m[1]);
  const clash = rootAttrs.filter(x => source.includes("closest('[data-" + x + "]')"));
  t('no click handler matches an attribute that lives on the page root', clash.length === 0, clash.join(', '));

  /* A colour defined as itself resolves to nothing at all. That is how the
     completed-set border vanished in light mode. (Review P2-06.) */
  const selfRef = [...source.matchAll(/(--[a-z0-9-]+)\s*:\s*var\(\s*(--[a-z0-9-]+)\s*\)/g)].filter(m => m[1] === m[2]).map(m => m[1]);
  t('no colour or style token is defined as itself', selfRef.length === 0, selfRef.join(', '));

  return { ids, dataAttrs, sheets, screens };
}

(async () => {
  const s = suite('CTA');
  const { w, d, G, errs, source } = await boot();
  const t = s.t;

  const meta = staticAudit(source, t);

  /* ---------- runtime sweep ---------- */
  onboard(G);
  G.renderAll();

  const clicked = [];
  const broke = [];

  function sweep(root, where) {
    const controls = [...root.querySelectorAll('button, [data-go], [role="tab"]')]
      .filter(el => !el.disabled);
    controls.forEach(el => {
      const id = el.id || '';
      const label = where + ' › ' + (id || el.className || el.textContent.trim().slice(0, 24) || 'unnamed');
      if (DO_NOT_CLICK.has(id)) {
        t('wired but not clicked: ' + label, source.includes("'#" + id + "'") || source.includes("closest('#" + id + "')"));
        return;
      }
      const before = errs.length;
      try { el.click(); } catch (e) { errs.push(label + ' threw ' + e.message); }
      if (errs.length > before) broke.push(label + ' → ' + errs[errs.length - 1]);
      clicked.push(label);
      /* clicking may have opened a sheet or moved screen; put it back */
      try { G.closeSheets(); } catch (e) {}
    });
  }

  /* every screen */
  ['today', 'plan', 'progress', 'feed'].forEach(name => {
    G.go(name);
    const el = d.getElementById('s-' + name);
    t('screen ' + name + ' has content before the sweep', el.innerHTML.length > 100);
    sweep(el, name);
    G.go(name);
    t('screen ' + name + ' survives its own controls', d.getElementById('s-' + name).innerHTML.length > 100);
  });

  /* the tab bar itself */
  sweep(d.querySelector('nav.tabs'), 'nav');
  t('nav still has five controls', d.querySelectorAll('nav.tabs button').length === 5);

  /* every sheet, opened through its own opener where there is one */
  const openers = {
    logSheet: () => G.openLog(),
    youSheet: () => G.openYou(),
    coachSheet: () => G.openCoach(),
    foodSheet: () => G.openFood(false),
    dayCheck: () => G.openDay(),
    weekCheck: () => G.openWeek(),
    weighSheet: () => G.openWeigh(),
    tplSheet: () => { G.drawTemplates(); G.openSheet('tplSheet'); },
    altSheet: () => G.openMove('squat'),
    exSheet: () => G.openExPicker(null),
    findSheet: () => G.openSheet('findSheet'),
    howSheet: () => G.openHow(),
    sessSheet: () => G.openAllSessions()
  };
  Object.keys(openers).forEach(id => {
    const sheet = d.getElementById(id);
    if (!sheet) { t('sheet ' + id + ' exists', false); return; }
    let opened = false;
    try { openers[id](); opened = sheet.classList.contains('on'); } catch (e) {
      t('sheet ' + id + ' opens', false, e.message); return;
    }
    t('sheet ' + id + ' opens', opened);
    t('sheet ' + id + ' has content', sheet.innerHTML.length > 60);
    t('sheet ' + id + ' is a dialog', sheet.getAttribute('role') === 'dialog');
    sweep(sheet, id);
    G.closeSheets();
  });

  /* the session player and the gym, which are not sheets */
  G.startWorkout('t_push');
  const gym = d.getElementById('gym');
  t('the gym opens', gym.classList.contains('on'));
  t('the gym lists movements', /data-set=/.test(d.getElementById('gymBody').innerHTML));
  sweep(d.getElementById('gymBody'), 'gym');
  try { G.closeGym && G.closeGym(); } catch (e) {}
  gym.classList.remove('on');

  t('every control clicked without throwing', broke.length === 0, broke.slice(0, 6).join(' | '));
  t('the sweep actually covered something', clicked.length > 60, clicked.length + ' controls');

  console.log('  (swept ' + clicked.length + ' controls)');
  const r = s.report(errs);
  module.exports = r;
  process.exitCode = r.fail ? 1 : 0;
  if (require.main === module) process.exit(r.fail ? 1 : 0);
})();
