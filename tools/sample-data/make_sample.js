/* Builds a fictional five-week Gauntlet history by driving the app's own
   functions day by day (the clock is moved back, then forward one day at a
   time), then writes the app's own "download everything" JSON. The history
   ends yesterday, so today opens with its prompts. Dates are absolute: run it
   again close to the day it will be used.
   Run from the repo root (after npm install): node tools/sample-data/make_sample.js <out.json> [checkin day 0 Mon to 6 Sun, default 6]
   Load it in the app: You, the gear, Your data, Restore from a download. */
const fs = require('fs');
const { boot, onboard } = require('../../harness');

const OUT = process.argv[2] || 'gauntlet-sample-data.json';
const CHECKIN_DAY = process.argv[3] === undefined ? 6 : +process.argv[3]; // 0 Monday ... 6 Sunday: the day the weekly check-in is offered
const DAYS = 35;           // simulated days, ending yesterday
let seed = 20261022;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const pick = a => a[Math.floor(rnd() * a.length)];

const BASE = { bench: 60, incline: 22, ohp: 38, squat: 80, deadlift: 100, row: 60, rdl: 70, lunge: 20, legpress: 140,
  pulldown: 55, curl: 14, tricep: 25, latraise: 8, facepull: 20, hipthrust: 80 };

const BREAKFAST = [[['oats', 1], ['egg', 2]], [['weetabix', 1], ['greekyog', 1], ['banana', 1]], [['porridge_milk', 1], ['whey', 1]], [['egg', 3], ['brownbread', 1]]];
const LUNCH = [[['chicken', 1], ['rice', 1], ['broccoli', 1]], [['tuna', 1], ['wrap', 1]], [['chicken', 1], ['pasta', 1]], [['salmon', 1], ['rice', 1]]];
const DINNER = [[['salmon', 1], ['potato', 1], ['broccoli', 1]], [['mince5', 1], ['rice', 1]], [['steak', 1], ['potato', 1]], [['chicken', 1], ['pasta', 1]]];
const SNACK = [[['apple', 1], ['peanutbutter', 1]], [['greekyog', 1]], [['banana', 1]], [['whey', 1]]];
const LIGHT_DINNER = [[['pasta', 1], ['broccoli', 1]], [['chips_bag', 1]], [['potato', 1], ['beans', 1]]];

(async () => {
  let sh = 0;
  const { w, G, errs } = await boot({
    before: w => {
      const Real = w.Date;
      w.__sh = 0;
      class Moved extends Real {
        constructor(...a) { if (a.length) super(...a); else super(Real.now() + w.__sh * 864e5); }
        static now() { return Real.now() + w.__sh * 864e5; }
      }
      w.Date = Moved;
    }
  });
  const setDay = n => { w.__sh = n; };
  const realToday = G.todayKey();

  setDay(-DAYS);
  onboard(G, { aim: 'lose', weight: 94, sex: 'm', handle: 'sample_user', liftDays: 3, cardioDays: 2, checkinDay: CHECKIN_DAY });
  G.startHabit('walk_after', 'start');
  G.startHabit('no_sugary_drinks', 'stop');

  let skipped = 0, lowWeek = [3, 4]; // days offset inside the run with short sleep
  for (let i = 0; i < DAYS; i++) {
    const off = -DAYS + i;           // -35 ... -1, so today is left open
    setDay(off);
    const k = G.todayKey();
    const dow = new w.Date().getDay(); // 0 Sun
    const weekend = dow === 0 || dow === 6;

    /* food */
    const weekIdx = Math.floor(i / 7);
    const logs = rnd() > 0.1; // about one day in ten not logged
    if (logs) {
      const add = (list, meal) => list.forEach(([id, q]) => { if (G.foodOf(id)) G.addFood(id, q, meal); });
      add(pick(BREAKFAST), 'b');
      add(pick(LUNCH), 'l');
      const lowProtein = weekIdx === 2 && rnd() > 0.4;  // a patch of missed protein for the Week in review
      add(weekend && rnd() > 0.5 ? [['chips_bag', 1], ['chicken', 1]] : (lowProtein ? pick(LIGHT_DINNER) : pick(DINNER)), 'd');
      if (rnd() > 0.35) add(pick(SNACK), 's');
    }

    /* the day: weigh in, sleep, how it felt */
    const trend = 94.0 - 0.075 * i;
    const draft = { sleep: +(6.2 + rnd() * 2).toFixed(1), wb: 4 + Math.floor(rnd() * 5), stress: 2 + Math.floor(rnd() * 5) };
    if (weekIdx === 3 && (dow === 2 || dow === 3 || dow === 4)) { draft.sleep = +(5.0 + rnd()).toFixed(1); draft.wb = 3; draft.stress = 7; }
    if (rnd() > 0.14) draft.w = +(trend + (rnd() - 0.5) * 0.9 + (dow === 1 ? 0.3 : 0)).toFixed(1);
    if (draft.w !== undefined || logs) G.saveDayRecord(draft);

    if (i === 0 && draft.w !== undefined) {
      const tg = G.setTarget('weight', 88, G.addDays(realToday, 100));
      tg.from = draft.w; tg.set = k; G.save();
    }

    /* habits: ticked about seven days in ten, better as the weeks go on */
    ['start', 'stop'].forEach(slot => { if (rnd() < 0.55 + 0.05 * weekIdx) G.toggleHabitDay(k, slot); });

    /* training: Mon push, Wed lower, Fri pull; two missed */
    const tid = { 1: 't_push', 3: 't_lower', 5: 't_pull' }[dow];
    if (tid && !(skipped < 2 && rnd() > 0.88 && ++skipped)) {
      G.startWorkout(tid);
      const gym = G.GYM;
      gym.ex.forEach(e => {
        const rx = e.rx || {}, lo = (rx.range && rx.range.bottom) || e.repMin || 6, hi = (rx.range && rx.range.top) || e.reps || 10;
        const kg = typeof rx.kg === 'number' ? rx.kg : (BASE[e.exId] || 25);
        e.sets.forEach((s, j) => {
          if (s.warm) return;
          s.kg = kg;
          s.reps = Math.max(lo, Math.min(hi, hi - Math.floor(rnd() * 2) - (j > 1 ? 1 : 0)));
          s.done = true;
        });
      });
      gym.started = Date.now() - (42 + Math.floor(rnd() * 14)) * 60000;
      G.finishWorkout();
      if (G.minimiseGym) G.minimiseGym();
      try { G.closeSheets(); } catch (e) {}
    }

    /* the weekly check-in, done through the real wizard with its own defaults */
    if (G.dowIdx() === CHECKIN_DAY && i >= 6) {
      G.openWeek();
      for (let n = 0; n < 3; n++) w.document.getElementById('saveWeek').click();
      try { G.closeSheets(); } catch (e) {}
    }
  }

  setDay(0);
  G.save();
  const payload = G.exportPayload();
  payload.note = 'FICTIONAL sample data for reviewing Gauntlet. Not a real person. Load it from You, Your data, "Restore from a download".';
  fs.writeFileSync(OUT, JSON.stringify(payload));
  const S = G.S;
  console.log('weights', S.weights.length, 'days', Object.keys(S.days).length, 'workouts', S.workouts.length,
    'lifts', Object.keys(S.lifts).length, 'checkins', S.checkins.length, 'habits', JSON.stringify(Object.keys(S.habits || S.routine || {})).slice(0, 120));
  console.log('weight first/last', S.weights[0] && S.weights[0].kg, S.weights[S.weights.length - 1] && S.weights[S.weights.length - 1].kg);
  console.log('target', JSON.stringify(S.target).slice(0, 200));
  console.log('errors', errs.length, errs.slice(0, 3));
  process.exit(0);
})();
