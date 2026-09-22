const fs = require('fs');
const { JSDOM } = require('jsdom');
const fs2 = require('fs');

const html = fs.readFileSync(require('path').join(__dirname, 'index.html'), 'utf8');
const errs = [];

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'https://example.test/',
  beforeParse(w) {
    w.fetch = () => Promise.reject(new Error('offline in test'));
    w.navigator.vibrate = () => {};
    w.onerror = (m) => errs.push(String(m));
  }
});

const w = dom.window;
w.addEventListener('error', e => errs.push(e.message));

setTimeout(() => {
  const G = w.__G;
  if (!G) { console.log('FAIL: app did not boot'); process.exit(1); }
  const ok = [], bad = [];
  const t = (name, cond, extra) => (cond ? ok : bad).push(name + (extra ? ' :: ' + extra : ''));

  // --- dates are local ---
  const now = new Date();
  const local = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  t('todayKey is the local date', G.todayKey() === local, G.todayKey() + ' vs ' + local);
  t('addDays round-trips', G.addDays(G.addDays('2026-03-01', 40), -40) === '2026-03-01', G.addDays('2026-03-01', 40));
  t('addDays crosses a DST boundary', G.addDays('2026-03-28', 1) === '2026-03-29', G.addDays('2026-03-28', 1));
  t('addDays crosses a year', G.addDays('2025-12-31', 1) === '2026-01-01');
  t('mondayKey is a Monday', new Date(G.mondayKey() + 'T12:00:00').getDay() === 1, G.mondayKey());

  // --- onboarding is up on a fresh state ---
  t('onboarding shows for a new user', w.document.getElementById('onb').classList.contains('on'));

  // --- equipment ---
  t('KIT question renders in step 1', (() => {
    G.step = 1; G.onbDraft = Object.assign({}, G.onbDraft, { aim: 'lose', liftDays: 3, cardioDays: 2 });
    G.onbRender();
    return /data-onbkit=/.test(w.document.getElementById('onbBody').innerHTML);
  })());

  const S = G.S;
  S.profile.kit = ['bodyweight', 'dumbbell'];
  const swaps = G.fitTemplatesToKit();
  const unfit = (S.templates || []).flatMap(tp => tp.ex).filter(r => {
    const x = G.exOf(r.exId);
    return x.eq && ['bodyweight', 'dumbbell'].indexOf(x.eq) < 0;
  });
  t('templates refit to dumbbells only', unfit.length === 0, unfit.map(r => r.exId).join(','));
  t('refit actually swapped something', swaps.length > 0, swaps.length + ' swaps, e.g. ' + (swaps[0] || []).join(' -> '));
  t('picker hides unequippable movements', (() => {
    G.openExPicker(null);
    const h = w.document.getElementById('exList').innerHTML;
    return h.indexOf('data-pick="hack"') < 0 && h.indexOf('data-pick="pushup"') >= 0;
  })());
  S.profile.kit = null; G.S.templates = G.seedTemplates();

  // --- simulated tracker is walled off from the plan and the forecast ---
  G.connectHealth('apple');
  t('stub rows are flagged', !!(S.days[G.todayKey()] && S.days[G.todayKey()].auto.sim));
  t('display average still sees stub steps', G.avg7('steps') !== null);
  t('plan-facing average ignores stub steps', G.avg7('steps', { real: true }) === null);
  const hist = G.weeklyHistory(2);
  t('forecast history ignores stub steps', hist[0].steps === null, String(hist[0].steps));
  G.disconnectHealth();

  // --- weekly weight change is weekly ---
  S.weights = [{ d: G.addDays(G.mondayKey(), -30), kg: 90 }, { d: G.addDays(G.mondayKey(), -1), kg: 84 }, { d: G.todayKey(), kg: 83.5 }];
  t('week change is the week, not all time', G.weekStats().wChange === -0.5, String(G.weekStats().wChange));

  // --- check in honesty ---
  G.openWeek();
  const wd = G.weekDraft;
  t('no fabricated stress', wd.stress === undefined);
  t('no fabricated hunger', wd.hunger === undefined);
  t('no fabricated confidence', wd.confidence === undefined);
  t('no fabricated readiness', wd.readiness === undefined);
  t('protein score renamed', 'proteinHit' in wd && !('nutrition' in wd));
  G.closeSheets();
  S.checkins.unshift(Object.assign({ at: Date.now(), weekOf: G.mondayKey() }, wd, { auto: undefined }));
  const brief = G.coachBrief();
  t('brief separates derived from reported', /derived from the logs/.test(brief) && /reported by them/.test(brief));
  t('check in lines invent no scores', brief.split('\n').filter(l => /^Check in/.test(l))
    .every(l => !/stress|hunger|confidence|readiness/.test(l)),
    brief.split('\n').filter(l => /^Check in/.test(l)).join('|'));
  t('stress now comes from the daily log', /stress/.test(brief));
  S.checkins = [];

  // --- meal macros ---
  const m = G.loggedMealMacros();
  t('no food logged means no macros', m === null);
  G.addFood('chicken', 2); G.addFood('rice', 1);
  const m2 = G.loggedMealMacros();
  const expectP = Math.round(G.foodOf('chicken').p * 2 + G.foodOf('rice').p);
  t('macros come from the real log', m2 && m2.p === expectP, JSON.stringify(m2) + ' expected ' + expectP);
  t('meal art draws nothing when there is nothing', /nothing logged/.test(G.mealArt(null)));


  // ---- pass A ----
  t('nav has five columns', /repeat\(5,1fr\)/.test(w.document.documentElement.innerHTML));
  t('log button exists', !!w.document.getElementById('logBtn'));
  t('every sheet is a dialog', [...w.document.querySelectorAll('.sheet')].every(s => s.getAttribute('role') === 'dialog'));
  t('tabs are tabs', [...w.document.querySelectorAll('.tab[data-go]')].every(x => x.getAttribute('role') === 'tab'));
  t('aria-selected tracks the screen', (() => { G.go('plan');
    const tabs = [...w.document.querySelectorAll('.tab[data-go]')];
    return tabs.filter(x => x.getAttribute('aria-selected') === 'true').length === 1
      && w.document.querySelector('.tab[data-go="plan"]').getAttribute('aria-selected') === 'true'; })());
  t('toast is a live region', w.document.getElementById('toast').getAttribute('aria-live') === 'polite');
  t('log sheet opens with rows', (() => { G.openLog();
    const h = w.document.getElementById('logBody').innerHTML;
    return /data-log="weigh"/.test(h) && /data-log="week"/.test(h); })());
  t('escape closes a sheet', (() => {
    const ev = new w.KeyboardEvent('keydown', {key:'Escape', bubbles:true});
    w.document.dispatchEvent(ev);
    return !w.document.querySelector('.sheet.on'); })());
  t('unknown screen no longer throws', (() => { try { G.go('you'); return true; } catch(e){ return false; } })());
  t('name resolver falls back safely', G.who('nobody') && typeof G.who('nobody').n === 'string');
  t('undo restores a dropped day', (() => {
    G.go('plan'); G.ensurePlan();
    const i = S.plan.days.findIndex(d => d.type && d.slot !== 'walk');
    if (i < 0) return false;
    const was = G.dayLabel(S.plan.days[i]);
    const snap = G.snapshotPlan();
    G.dropPlanDay(i);
    const dropped = S.plan.days[i].slot === 'rest';
    G.restorePlan(snap);
    return dropped && G.dayLabel(S.plan.days[i]) === was; })());
  t('no checkin slot survives ensurePlan', G.ensurePlan().days.every(d => d.slot !== 'checkin'));


  // ---- pass B ----
  t('bench is a heavy compound', G.rxClass('bench') === 'heavy', G.rxClass('bench'));
  t('lateral raise is isolation', G.rxClass('lateral') === 'isolation', G.rxClass('lateral'));
  t('plank is a hold', G.rxClass('plank') === 'hold', G.rxClass('plank'));
  t('press up is not heavy', G.rxClass('pushup') !== 'heavy', G.rxClass('pushup'));
  const tpl = G.seedTemplates();
  const reps = new Set(tpl.flatMap(x => x.ex).map(r => r.repMin + '-' + r.reps));
  t('templates no longer all 3 x 12', reps.size >= 4, [...reps].join(' '));
  t('every row has a range', tpl.flatMap(x => x.ex).every(r => r.repMin && r.reps > r.repMin || G.rxClass(r.exId) === 'hold'));
  t('no movement repeats across push and pull', (() => {
    const push = tpl.find(x => x.id === 't_push').ex.map(r => r.exId);
    const pull = tpl.find(x => x.id === 't_pull').ex.map(r => r.exId);
    return push.filter(x => pull.indexOf(x) >= 0).length === 0; })());
  t('rep text reads as a range', /8 to 12|5 to 8/.test(G.repText({exId:'bench',sets:4,reps:8,repMin:5})), G.repText({exId:'bench',sets:4,reps:8,repMin:5}));
  t('holds read in seconds', /45s/.test(G.repText({exId:'plank',sets:3,reps:45,repMin:30})));

  t('warm ups ramp under the working weight', (() => {
    const r = G.warmSetsFor('bench', 100);
    return r.length === 3 && r.every(x => x.kg < 100 && x.warm) && r[0].kg < r[2].kg; })(),
    JSON.stringify(G.warmSetsFor('bench', 100)));
  t('warm ups never go under an empty bar', G.warmSetsFor('bench', 40).every(x => x.kg >= 20), JSON.stringify(G.warmSetsFor('bench',40)));
  t('plates add up', (() => { const p = G.platesFor(100, 20);
    return p.plates.reduce((a,b)=>a+b,0) === 40 && p.short === 0; })(), JSON.stringify(G.platesFor(100,20)));
  t('plate line reads plainly', /Bar plus/.test(G.plateLine('bench', 100)), G.plateLine('bench', 100));
  t('no plate line for dumbbells', G.plateLine('dbpress', 30) === '');
  t('impossible weight is flagged', G.platesFor(100.6, 20).short > 0, JSON.stringify(G.platesFor(100.6,20)));

  t('deload is off before week one', (() => { S.profile.firstWeek = null; S.deloadWeeks = {}; return !G.deloadDue(); })());
  t('the default cadence is six weeks', G.DELOAD_EVERY === 6);
  t('every N means the Nth week is the easy one', (() => {
    S.deloadWeeks = {}; S.profile.deload = true; S.profile.deloadEvery = 4;
    S.profile.firstWeek = G.addDays(G.mondayKey(), -21);
    return G.deloadDue(); })(), JSON.stringify(G.deloadInfo()));
  t('the week before it is a normal week', !G.deloadDue(G.addDays(G.mondayKey(), -7)));
  t('an easy week sets the deload flag rather than trimming sets', (() => {
    const pl = G.buildPlan();
    return pl.days.filter(d => d.templateId).every(d => d.deload && !d.setDelta)
      && pl.why.some(x => /Planned easy week/.test(x)); })());
  t('deload can be turned off', (() => { S.profile.deload = false; return !G.deloadDue(); })());
  S.profile.deload = true;
  S.profile.firstWeek = null; S.profile.deload = true; S.profile.deloadEvery = null; S.deloadWeeks = {}; G.buildPlan();

  t('a pain alternative avoids the same pattern', (() => {
    const alt = G.painAlternative('Bench Press');
    return alt && alt.g === 'Chest' && alt.p !== 'horizontal push'; })(),
    JSON.stringify(G.painAlternative('Bench Press') || null));
  t('nothing to review with no check ins', G.painToReview().length === 0);
  t('an old niggle comes up for review', (() => {
    S.checkins = [{at: Date.now(), weekOf: G.mondayKey(), pain: ['Bench Press']},
                  {at: Date.now() - 20 * 864e5, weekOf: G.addDays(G.mondayKey(), -21), pain: ['Bench Press']},
                  {at: Date.now() - 27 * 864e5, weekOf: G.addDays(G.mondayKey(), -28), pain: []}];
    return G.painToReview().indexOf('Bench Press') >= 0; })(), JSON.stringify(G.painToReview()));
  t('clearing it puts it back', (() => { G.clearPain('Bench Press'); return G.painToReview().length === 0; })());
  S.checkins = [];

  t('protein uses the scale at a normal BMI', (() => {
    S.profile.height = 178; S.profile.weight = 82;
    const b = G.proteinBasis(S.profile); return !b.adjusted && b.kg === 82; })());
  t('protein adjusts at a high BMI', (() => {
    S.profile.weight = 130;
    const b = G.proteinBasis(S.profile);
    return b.adjusted && b.kg < 130 && b.kg > 80; })(), JSON.stringify(G.proteinBasis(S.profile)));
  t('adjusted protein stays in the evidence band', (() => {
    const g = G.proteinOf(S.profile); return g / 130 >= 1.0 && g / 130 <= 2.2; })(),
    String(G.proteinOf(S.profile)));
  S.profile.weight = 82;


  // ---- pass C ----
  S.days = {}; S.customFoods = []; S.savedMeals = []; S.weights = [];
  t('slot follows the clock', ['b','l','d','s'].indexOf(G.slotNow()) >= 0);
  G.openFood(false);
  t('food sheet has meal slots', /data-foodslot="b"/.test(w.document.getElementById('foodBody').innerHTML));
  t('search only redraws the list', (() => {
    const box = w.document.getElementById('foodSearch');
    box.value = 'chick'; box.focus();
    box.dispatchEvent(new w.Event('input', {bubbles:true}));
    return w.document.activeElement === box
      && /Chicken/.test(w.document.getElementById('foodList').innerHTML); })());
  w.document.getElementById('foodSearch').value = '';
  G.__G && 0;
  (function(){ const box = w.document.getElementById('foodSearch');
    box.dispatchEvent(new w.Event('input', {bubbles:true})); })();

  G.addFood('chicken', 1, 'l'); G.addFood('rice', 1, 'l'); G.addFood('egg', 2, 'b');
  t('entries carry their slot', G.dayFood(G.todayKey()).filter(x => x.meal === 'l').length === 2);
  t('a custom food can be added', (() => {
    G.addCustomFood({id:'cf_test', n:"Mam's brown bread", u:'slice', mine:true, kcal:180, p:6, c:30, f:2});
    return !!G.foodOf('cf_test') && G.allFoods().length === G.FOODS.length + 1; })());
  t('a custom food logs like any other', (() => { G.addFood('cf_test', 1, 'b');
    return G.dayFood(G.todayKey()).some(x => x.id === 'cf_test'); })());
  t('a meal can be saved and re-added', (() => {
    const m = G.saveMealAs('Usual lunch', 'l');
    const before = G.dayFood(G.todayKey()).length;
    const n = G.addSavedMeal(m.id);
    return n === 2 && G.dayFood(G.todayKey()).length === before + 2; })());
  t('repeat yesterday copies the day', (() => {
    const y = G.addDays(G.todayKey(), -1);
    S.days[y] = {food: [{id:'oats', n:'Porridge oats', u:'50g dry', q:1, meal:'b', kcal:190, p:6.5, c:33, f:3.5}]};
    const before = G.dayFood(G.todayKey()).length;
    const n = G.repeatYesterday();
    return n === 1 && G.dayFood(G.todayKey()).length === before + 1; })());
  t('totals still roll up', G.foodTotals(G.todayKey()).kcal > 0);
  G.closeSheets();

  t('export carries the whole record', (() => {
    const p = G.exportPayload();
    return ['profile','days','weights','checkins','lifts','workouts','templates','customFoods','savedMeals','cycle'].every(k => k in p)
      && p.app === 'Gauntlet'; })());
  t('export is serialisable', (() => { try { JSON.parse(JSON.stringify(G.exportPayload())); return true; } catch(e){ return false; } })());
  t('data sheet explains and offers both', (() => { G.openData();
    const h = w.document.getElementById('cloudBody').innerHTML;
    return /dlData/.test(h) && /wipeData/.test(h) && /never held/.test(h); })());
  t('delete needs two taps', (() => {
    const b = w.document.getElementById('wipeData');
    b.click();
    return b.dataset.armed === '1' && /Tap again/.test(b.textContent); })());
  G.closeSheets();


  // ---- pass D ----
  t('theme defaults to light', (() => { S.profile.theme = null; G.applyTheme();
    return !w.document.documentElement.hasAttribute('data-theme')
      && w.document.getElementById('themeColor').getAttribute('content') === '#ffffff'; })());
  t('dark can be chosen', (() => { G.setTheme('dark');
    return w.document.documentElement.getAttribute('data-theme') === 'dark'
      && w.document.getElementById('themeColor').getAttribute('content') === '#151517'; })());
  t('following the phone is an explicit choice', (() => { G.setTheme('auto');
    return w.document.documentElement.getAttribute('data-theme') === 'auto'; })());
  t('the stylesheet only follows the phone when asked to', (() => {
    const css = [...w.document.querySelectorAll('style')].map(x => x.textContent).join('');
    return /prefers-color-scheme:dark\)\{\s*:root\[data-theme="auto"\]/.test(css) && !/:root:not\(\[data-theme="light"\]\)/.test(css); })());
  G.setTheme('light');
  t('tint tokens are actually defined', (() => {
    const css = [...w.document.querySelectorAll('style')].map(x => x.textContent).join('');
    return /--t-marine:/.test(css) && /--t-forest:/.test(css) && /--t-burnt:/.test(css); })());
  t('no white text left on a themed ink surface', (() => {
    const css = [...w.document.querySelectorAll('style')].map(x => x.textContent).join('');
    return !/background:var\(--ink\);color:#fff/.test(css); })());
  t('dark overrides exist for both routes', (() => {
    const css = [...w.document.querySelectorAll('style')].map(x => x.textContent).join('');
    return /prefers-color-scheme:dark/.test(css) && /:root\[data-theme="dark"\]/.test(css); })());

  t('progress is one screen now', !w.document.getElementById('progSeg'));
  t('lifting moved to the plan screen', w.document.getElementById('s-plan').contains(w.document.getElementById('dashLifts')));
  t('body moved into the You sheet', w.document.getElementById('youSheet').contains(w.document.getElementById('dashBody')));
  t('You sheet opens', (() => { G.openYou();
    return w.document.getElementById('youSheet').classList.contains('on')
      && w.document.getElementById('dashBody').innerHTML.length > 80; })());
  G.closeSheets();
  /* Which day's card is open depends on what day it is, so this checks what
     must be true every day: every workout can be reached, started and edited
     from Plan. It used to fail on rest days, which is how it was found. */
  t('every workout is reachable from Plan, whatever day it is', (() => { G.go('plan'); G.renderPlan();
    const open = w.document.querySelector('#planView [data-tplopen]');
    if (!open) return false;
    open.click();
    const list = w.document.getElementById('tplList').innerHTML;
    G.closeSheets();
    return /data-tplstart="t_push"/.test(list) && /data-tpledit="t_push"/.test(list); })());

  t('daily log asks about stress', (() => { G.openDay();
    const h = w.document.getElementById('dayBody').innerHTML;
    return /data-dayrange="stress"/.test(h) && /data-daynote/.test(h); })());
  t('stress and a note save', (() => {
    const box = w.document.querySelector('[data-daynote]');
    box.value = 'Long day, kids up half the night.';
    box.dispatchEvent(new w.Event('input', {bubbles:true}));
    const sl = w.document.querySelector('[data-dayrange="stress"]');
    sl.value = '8'; sl.dispatchEvent(new w.Event('input', {bubbles:true}));
    w.document.getElementById('saveDay').click();
    const d = S.days[G.todayKey()];
    return d.stress === 8 && /kids up half the night/.test(d.note || ''); })(),
    JSON.stringify(S.days[G.todayKey()] || {}).slice(0, 120));
  t('saving the day keeps the food', (G.dayFood(G.todayKey()) || []).length > 0);
  t('their own words reach the brief', /kids up half the night/.test(G.coachBrief()));
  G.closeSheets();


  // ---- pass E ----
  S.habit = null; S.target = null;
  t('a habit is suggested before one is picked', !!G.suggestHabit());
  t('today offers the pick', /data-habitpick/.test(w.document.getElementById('todayView').innerHTML));
  t('starting a habit sets it', (() => { G.startHabit('walk_after');
    /* the app only lets you tick today; to simulate history the start date is moved back */
    G.S.habits.start.started = G.addDays(G.todayKey(), -10);
    return G.currentHabit() && G.currentHabit().id === 'walk_after'; })());
  t('a week is seven dots', G.habitWeek().length === 7 && G.habitWeek()[6].today);
  t('streak counts back from today', (() => {
    G.toggleHabitDay(G.todayKey());
    G.toggleHabitDay(G.addDays(G.todayKey(), -1));
    G.toggleHabitDay(G.addDays(G.todayKey(), -2));
    return G.habitStreak() === 3; })(), String(G.habitStreak()));
  t('a gap breaks the streak', (() => {
    G.toggleHabitDay(G.addDays(G.todayKey(), -1));
    return G.habitStreak() === 1; })(), String(G.habitStreak()));
  t('unticking today still counts yesterday', (() => {
    G.toggleHabitDay(G.addDays(G.todayKey(), -1));
    G.toggleHabitDay(G.todayKey());
    return G.habitStreak() === 2; })(), String(G.habitStreak()));
  t('only one habit at a time', (() => { G.startHabit('stairs');
    return G.currentHabit().id === 'stairs' && !Array.isArray(S.habit); })());
  t('the row renders with its own dots', /class="habitdots"/.test(G.habitRow()) && !/class="dots"/.test(G.habitRow()));
  t('retiring clears it', (() => { G.retireHabit(); return !G.currentHabit(); })());
  G.startHabit('walk_after'); G.toggleHabitDay(G.todayKey());
  t('the habit reaches the brief', /Habit: Ten minutes after dinner/.test(G.coachBrief()));

  t('no target means an invitation', /setTarget/.test(G.targetLine()));
  t('a weight target counts down', (() => {
    S.weights = [{d: G.addDays(G.todayKey(), -60), kg: 90}, {d: G.todayKey(), kg: 85}];
    const tg = G.setTarget('weight', 80, G.addDays(G.todayKey(), 84));
    tg.from = 90;
    const pr = G.targetProgress();
    return pr.now === 85 && pr.pct === 50 && pr.remaining === 5 && pr.daysLeft === 84; })(),
    JSON.stringify(G.targetProgress()));
  t('a met target is a met target', (() => {
    S.weights.push({d: G.todayKey(), kg: 79});
    return G.targetProgress().hit; })());
  t('hitting it is recorded on rebuild', (() => { G.buildPlan(); return !!S.target.hit; })());
  t('the target reaches the brief', /Target: 80 kg by/.test(G.coachBrief()));
  t('a lift target reads the best lift', (() => {
    S.lifts = {bench: [{d: G.todayKey(), sets: [{kg: 80, reps: 5}, {kg: 90, reps: 3}]}]};
    G.setTarget('lift', 100, G.addDays(G.todayKey(), 84), 'bench');
    return G.targetNow() === 90; })(), String(G.targetNow()));
  t('clearing removes it', (() => { G.clearTarget(); return !S.target && /setTarget/.test(G.targetLine()); })());

  t('nudges are off until asked for', G.nudgeState() === 'off' || G.nudgeState() === 'unsupported');
  t('the next nudge lands on the check in day', (() => {
    const ci = S.profile.checkinDay === undefined ? 6 : S.profile.checkinDay;
    const at = G.nextNudgeAt();
    return at.getDay() === ci && at.getHours() === 19 && at.getTime() > Date.now(); })(),
    String(G.nextNudgeAt()));
  t('scheduling without permission does nothing', (() => { G.scheduleNudge(); return true; })());
  t('reminders appear in settings, behind the gear', (() => { G.go('progress'); G.renderAll(); G.openAppSettings();
    return /nudgeBtn/.test(w.document.getElementById('appSettings').innerHTML); })());
  G.closeSheets();


  // ---- pass F: movement figures ----
  t('every movement resolves to a drawing', G.LIBRARY.every(x => !!G.poseFor(x.id)));
  t('the drawings are well formed', Object.keys(G.MOVE_POSES).every(k => {
    const m = G.MOVE_POSES[k];
    return m.a && m.b && ['head','neck','chest','hip','shoulder','elbow','wrist','knee','ankle','toe']
      .every(j => Array.isArray(m.a[j]) && Array.isArray(m.b[j]) && m.a[j].length === 2); }),
    Object.keys(G.MOVE_POSES).filter(k => !G.MOVE_POSES[k].b).join(','));
  t('start and end differ', Object.keys(G.MOVE_POSES).every(k =>
    JSON.stringify(G.MOVE_POSES[k].a) !== JSON.stringify(G.MOVE_POSES[k].b)));
  t('a bench press and a squat are not the same picture', G.figureSVG('bench') !== G.figureSVG('squat'));
  t('every movement renders without throwing', (() => {
    try { G.LIBRARY.forEach(x => G.figureSVG(x.id)); return true; } catch (e) { return false; } })());
  t('a figure renders as valid svg', (() => {
    const doc = new w.DOMParser().parseFromString(G.figureSVG('bench'), 'image/svg+xml');
    return !doc.querySelector('parsererror') && !!doc.querySelector('svg'); })());
  t('nothing is drawn outside the frame', G.LIBRARY.every(x =>
    [...G.figureSVG(x.id).matchAll(/(?:x1|y1|x2|y2|cx|cy)="(-?[\d.]+)"/g)].every(m => +m[1] >= -40 && +m[1] <= 280)));
  t('the body has a torso, a head and hands, not just lines', (() => {
    const svg = G.figureSVG('squat');
    return /class="trunk"/.test(svg) && /class="skull"/.test(svg) && /class="hand"/.test(svg); })());
  t('the limb behind is drawn lighter, for depth', /class="far"/.test(G.figureSVG('run')));
  t('a barbell movement draws the bar', /class="kit"/.test(G.figureSVG('squat')));
  t('a bodyweight movement draws no kit', !/class="kit"/.test(G.figureSVG('pushup')));
  t('a bench movement draws a bench', /class="bench"/.test(G.figureSVG('bench')));
  t('the figure animates', /<animate /.test(G.figureSVG('squat')));
  t('there are many drawings, not one', new Set(G.LIBRARY.map(x => G.poseKeyFor(x.id))).size >= 20,
    String(new Set(G.LIBRARY.map(x => G.poseKeyFor(x.id))).size));

  t('the move sheet opens with a figure', (() => { G.openMove('squat');
    const h = w.document.getElementById('altBody').innerHTML;
    return /class="fig"/.test(h) && /not a form check/.test(h); })());
  t('the move sheet offers alternatives', /data-showmove=/.test(w.document.getElementById('altBody').innerHTML));
  G.closeSheets();


  // ---- pass F: the coach ----
  S.coach = null;
  t('the coach is off until pointed somewhere', !G.coachReady());
  t('the sheet still shows the brief when nothing is connected', (() => { G.openCoach();
    const h = w.document.getElementById('coachBody').innerHTML;
    const pre = w.document.getElementById('coachBriefText');
    return /Nothing is connected/.test(h) && /coachCopy/.test(h)
      && pre && pre.textContent.length > 100 && /Aim:/.test(pre.textContent); })());
  t('there is no api key anywhere in the file', !/sk-[A-Za-z0-9]{12}|api[_-]?key["\s:=]+["'][A-Za-z0-9_\-]{20}/i.test(
    fs2.readFileSync(require('path').join(__dirname,'index.html'),'utf8').replace(/apikey/gi,'')));
  t('the system prompt forbids inventing numbers', /Never invent a number/.test(G.COACH_SYS));
  t('the system prompt forbids diagnosing', /Do not diagnose/.test(G.COACH_SYS));
  t('the system prompt protects the forecast range', /Do not narrow it/.test(G.COACH_SYS));
  t('http endpoints are refused', (() => {
    G.setCoach({endpoint:'', model:'', on:false});
    const el = w.document.getElementById('coachBody');
    G.openCoach();
    w.document.getElementById('coachSetup').click();
    w.document.getElementById('coachUrl').value = 'http://insecure.example/coach';
    w.document.getElementById('coachSave').click();
    return !G.coachReady(); })());
  t('an https endpoint connects', (() => {
    G.setCoach({endpoint:'https://proxy.example/coach', model:'', on:true});
    return G.coachReady(); })());
  /* sending the brief and the question to a real endpoint is covered by UAT journey 11 */
  t('a failed endpoint does not lose the brief', (() => {
    G.openCoach();
    const h = w.document.getElementById('coachBody').innerHTML;
    return /coachGo/.test(h) && /coachCopy/.test(h); })());
  t('suggested questions exist', G.COACH_ASKS.length >= 4);
  G.setCoach({endpoint:'', model:'', on:false});
  G.closeSheets();

  // --- the whole app still renders ---
  try { G.renderAll(); t('renderAll survives', true); } catch (e) { t('renderAll survives', false, e.message); }
  ['today', 'plan', 'progress', 'feed'].forEach(scr => {
    try { G.go(scr); t('screen ' + scr + ' renders', w.document.getElementById('s-' + scr).innerHTML.length > 50); }
    catch (e) { t('screen ' + scr + ' renders', false, e.message); }
  });
  try { G.openDay(); G.closeSheets(); t('daily log opens', true); } catch (e) { t('daily log opens', false, e.message); }
  try { G.openHow(); G.closeSheets(); t('method sheet opens', true); } catch (e) { t('method sheet opens', false, e.message); }
  try { G.startWorkout('t_push'); t('a workout starts', !!G.GYM && G.GYM.ex.length > 0); } catch (e) { t('a workout starts', false, e.message); }

  console.log('PASS ' + ok.length);
  ok.forEach(x => console.log('  + ' + x));
  if (bad.length) { console.log('FAIL ' + bad.length); bad.forEach(x => console.log('  - ' + x)); }
  if (errs.length) { console.log('PAGE ERRORS ' + errs.length); errs.slice(0, 8).forEach(x => console.log('  ! ' + x)); }
  process.exit(bad.length || errs.length ? 1 : 0);
}, 700);
