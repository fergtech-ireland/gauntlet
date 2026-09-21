/* ============================================================
   UAT SUITE
   Twelve journeys a real person would actually take, each on its own clean
   instance of the app so nothing leaks between them. These are acceptance
   tests, not unit tests: each one asserts the OUTCOME the person came for, not
   the mechanism underneath.
   ============================================================ */
const { boot, suite, onboard } = require('./harness');

const s = suite('UAT');
const t = s.t;
const allErrs = [];

function journey(n, title) { console.log('  ' + n + '. ' + title); }

(async () => {

  /* ---------------------------------------------------------- 1 */
  journey(1, 'A new person opens the app and gets a week they can start today');
  {
    const { w, d, G, errs } = await boot(); allErrs.push(...errs);
    t('1 · onboarding is waiting', d.getElementById('onb').classList.contains('on'));
    t('1 · it opens on the handle step', G.step === 0);
    onboard(G);
    t('1 · onboarding closes', !d.getElementById('onb').classList.contains('on'));
    t('1 · they land on Today', d.getElementById('s-today').classList.contains('on'));
    const plan = G.ensurePlan();
    t('1 · a full week exists', plan.days.length === 7);
    t('1 · the week has the days they asked for',
      plan.days.filter(x => x.templateId).length === 3, String(plan.days.filter(x => x.templateId).length));
    t('1 · the week explains itself', plan.why.length > 0 && plan.why[0].length > 20);
    t('1 · today has something to press',
      /id="startToday"|data-go="plan"/.test(d.getElementById('todayView').innerHTML));
    t('1 · calories and protein were worked out', G.S.targets.kcal > 1200 && G.S.targets.protein > 80);
    t('1 · nothing is logged yet, and it says so honestly',
      G.S.weights.length === 0 && !G.checkinDone());
  }

  /* ---------------------------------------------------------- 2 */
  journey(2, 'Someone with two dumbbells in a spare room never sees a barbell');
  {
    const { d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G, { kit: ['bodyweight', 'dumbbell'] });
    const all = G.S.templates.flatMap(x => x.ex).map(r => G.exOf(r.exId));
    const impossible = all.filter(x => x.eq && ['bodyweight', 'dumbbell'].indexOf(x.eq) < 0);
    t('2 · every movement in their plan is one they can do',
      impossible.length === 0, impossible.map(x => x.n).join(', '));
    t('2 · the plan is not empty', all.length >= 20, String(all.length));
    G.openExPicker(null);
    const pickerHTML = () => d.getElementById('exList').innerHTML;
    t('2 · the picker hides what they cannot equip', (() => {
      const barbells = G.LIBRARY.filter(x => x.eq === 'barbell').slice(0, 6);
      return barbells.every(x => !new RegExp('data-pick="' + x.id + '"').test(pickerHTML())); })());
    t('2 · and still offers plenty they can do',
      (pickerHTML().match(/data-pick="/g) || []).length >= 8,
      String((pickerHTML().match(/data-pick="/g) || []).length));
    G.closeSheets();
    t('2 · patterns are preserved, not dropped',
      new Set(all.map(x => x.p)).size >= 4, [...new Set(all.map(x => x.p))].join(', '));
  }

  /* ---------------------------------------------------------- 3 */
  journey(3, 'They do a lifting session and it is recorded properly');
  {
    const { w, d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    G.startWorkout('t_push');
    t('3 · the session opens', d.getElementById('gym').classList.contains('on'));
    t('3 · it is prescribed as a range, not a single number',
      /to /.test(G.repText(G.S.templates[0].ex[0])), G.repText(G.S.templates[0].ex[0]));
    const ex = G.GYM.ex[0];
    ex.sets.forEach((set, i) => { set.kg = 60; set.reps = 8; set.done = true; });
    t('3 · warm ups can be built from the working weight', (() => {
      const ramp = G.warmSetsFor(ex.exId, 60);
      return ramp.length >= 2 && ramp.every(r => r.kg < 60); })());
    const before = G.S.workouts.length;
    G.finishWorkout();
    t('3 · the workout is saved', G.S.workouts.length === before + 1);
    const wk = G.S.workouts[0];
    t('3 · volume was counted', wk.volume > 0, String(wk.volume));
    t('3 · the lift has a history now', (G.S.lifts[ex.exId] || []).length === 1);
    t('3 · it posted to their own feed', G.S.mine.some(p => p.kind === 'workout'));
    t('3 · next time is prescribed, with a reason in plain words', (() => {
      const row = G.S.templates.find(x => x.id === 't_push').ex[0];
      const n = G.nextPrescription(ex.exId, row);
      return n && typeof n.why === 'string' && n.why.length > 20
        && (n.kg === null || typeof n.kg === 'number') && n.range; })(),
      JSON.stringify(G.nextPrescription(ex.exId, G.S.templates.find(x => x.id === 't_push').ex[0])));
    t('3 · hitting the top of the range earns more weight', (() => {
      const row = G.S.templates.find(x => x.id === 't_push').ex[0];
      G.S.lifts[ex.exId] = [{ d: G.todayKey(),
        sets: [{ kg: 60, reps: row.reps }, { kg: 60, reps: row.reps }, { kg: 60, reps: row.reps }] }];
      const n = G.nextPrescription(ex.exId, row);
      return n.kg > 60; })());
    t('3 · a session on the record counts toward the weekly goal', typeof G.S.goal.now === 'number');
  }

  /* ---------------------------------------------------------- 4 */
  journey(4, 'The daily loop: weigh in, log food across meals, rate the day');
  {
    const { w, d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    G.openWeigh();
    G.S.profile.weight = 91.4;
    G.S.weights.push({ d: G.todayKey(), kg: 91.4 });
    G.save(); G.closeSheets();
    t('4 · the weigh in is on the record', G.S.weights.length === 1);

    G.openFood(false);
    G.addFood('oats', 1, 'b'); G.addFood('egg', 2, 'b');
    G.addFood('chicken', 1, 'l'); G.addFood('rice', 1, 'l');
    const food = G.dayFood(G.todayKey());
    t('4 · food lands in the meal it was added to',
      food.filter(x => x.meal === 'b').length === 2 && food.filter(x => x.meal === 'l').length === 2);
    t('4 · the totals add up', G.foodTotals(G.todayKey()).kcal > 400);
    t('4 · the sheet groups by meal', /Breakfast/.test(d.getElementById('foodBody').innerHTML));
    t('4 · a meal can be saved for reuse', !!G.saveMealAs('Usual breakfast', 'b'));
    G.closeSheets();

    G.openDay();
    const note = d.querySelector('[data-daynote]');
    note.value = 'Legs heavy, slept badly.';
    note.dispatchEvent(new w.Event('input', { bubbles: true }));
    const st = d.querySelector('[data-dayrange="stress"]');
    st.value = '8'; st.dispatchEvent(new w.Event('input', { bubbles: true }));
    d.getElementById('saveDay').click();
    const day = G.S.days[G.todayKey()];
    t('4 · the day is saved with stress and their words',
      day.stress === 8 && /slept badly/.test(day.note || ''));
    t('4 · saving the day does not eat the food log', (day.food || []).length === 4);
    G.renderAll();
    t('4 · Today shows the weigh in as done', /todoWeigh[^>]*"/.test(d.getElementById('todayView').innerHTML));
  }

  /* ---------------------------------------------------------- 5 */
  journey(5, 'A bad week, a check in, and next week is visibly different');
  {
    const { G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    /* seven days of poor sleep and low protein, logged honestly */
    for (let i = 0; i < 7; i++) {
      const k = G.addDays(G.todayKey(), -i);
      G.S.days[k] = { sleep: 5.2, wb: 4, stress: 8, protein: 60, kcal: 2400 };
    }
    G.save();
    const before = JSON.stringify(G.buildPlan().days.map(d => d.setDelta || 0));
    G.openWeek();
    G.weekDraft.recovery = 3; G.weekDraft.motivation = 4;
    const c = Object.assign({ at: Date.now(), weekOf: G.mondayKey() }, G.weekDraft);
    delete c.auto;
    G.S.checkins.unshift(c); G.save();
    const plan = G.buildPlan(); G.save();
    t('5 · the check in was recorded', G.S.checkins.length === 1);
    t('5 · next week is lighter', plan.days.some(d => (d.setDelta || 0) < 0),
      JSON.stringify(plan.days.map(d => d.setDelta || 0)));
    t('5 · and it says why in plain words',
      plan.why.some(x => /sleep|recovery|lighter/i.test(x)), plan.why.join(' | '));
    const st = G.steers();
    t('5 · the coach flags the sleep', st.some(x => /Sleep is averaging/.test(x.t)));
    t('5 · the coach flags the stress', st.some(x => /Stress is averaging/.test(x.t)));
    t('5 · nothing invented in the brief', (() => {
      const lines = G.coachBrief().split('\n').filter(l => /^Check in/.test(l));
      return lines.length > 0 && lines.every(l => !/hunger|confidence|readiness/.test(l)); })());
    t('5 · what they wrote is not derived, and is labelled as reported',
      /reported by them: recovery 3\/10, motivation 4\/10/.test(G.coachBrief()), 
      G.coachBrief().split('\n').filter(l => /reported/.test(l)).join());
  }

  /* ---------------------------------------------------------- 6 */
  journey(6, 'Picking one habit and keeping it for a week');
  {
    const { d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    t('6 · Today invites them to pick one', /data-habitpick/.test(d.getElementById('todayView').innerHTML));
    G.startHabit('walk_after');
    G.S.habits.start.started = G.addDays(G.todayKey(), -10);   // simulate a habit begun earlier
    for (let i = 4; i >= 0; i--) G.toggleHabitDay(G.addDays(G.todayKey(), -i));
    t('6 · five days running', G.habitStreak() === 5, String(G.habitStreak()));
    t('6 · the row shows a week of dots', (G.habitRow().match(/<i class=/g) || []).length === 7);
    G.toggleHabitDay(G.addDays(G.todayKey(), -2));
    t('6 · a miss breaks it honestly', G.habitStreak() === 2, String(G.habitStreak()));
    t('6 · only ever one habit to start', !Array.isArray(G.S.habits.start) && !!G.currentHabit());
    G.startHabit('phone_out');
    t('6 · changing it starts a new count', G.currentHabit().id === 'phone_out' && G.habitStreak() === 0);
    t('6 · the habit reaches the coach brief', /Habit: Phone out of the bedroom/.test(G.coachBrief()));
  }

  /* ---------------------------------------------------------- 7 */
  journey(7, 'Setting a target, getting there, and being told they got there');
  {
    const { G, errs } = await boot(); allErrs.push(...errs);
    onboard(G, { weight: 92 });
    G.S.weights = [{ d: G.addDays(G.todayKey(), -1), kg: 92 }];
    const tg = G.setTarget('weight', 85, G.addDays(G.todayKey(), 112));
    tg.from = 92; G.save();
    let pr = G.targetProgress();
    t('7 · nothing achieved yet', pr.pct === 0 && pr.remaining === 7, JSON.stringify(pr));
    t('7 · it shows on the hero with a date', /days left/.test(G.targetLine()));
    G.S.weights.push({ d: G.todayKey(), kg: 88.5 });
    pr = G.targetProgress();
    t('7 · halfway is halfway', pr.pct === 50, String(pr.pct));
    G.S.weights.push({ d: G.todayKey(), kg: 84.8 });
    t('7 · the target is met', G.targetProgress().hit);
    G.buildPlan();
    t('7 · and the day it happened is kept', !!G.S.target.hit);
    t('7 · the hero says so', /Target met/.test(G.targetLine()));
    t('7 · the brief carries it', /Target: 85 kg by/.test(G.coachBrief()));
  }

  /* ---------------------------------------------------------- 8 */
  journey(8, 'Something hurts, it comes out, and the app asks about it later');
  {
    const { d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    const c = { at: Date.now() - 20 * 864e5, weekOf: G.addDays(G.mondayKey(), -21), pain: ['Bench Press'], recovery: 6, motivation: 6 };
    G.S.checkins = [{ at: Date.now(), weekOf: G.mondayKey(), pain: ['Bench Press'], recovery: 6, motivation: 6 }, c,
      { at: Date.now() - 27 * 864e5, weekOf: G.addDays(G.mondayKey(), -28), pain: [] }];
    const plan = G.buildPlan(); G.save();
    t('8 · it is out of every session',
      plan.days.filter(x => x.templateId).every(x => (x.exclude || []).indexOf('Bench Press') >= 0));
    t('8 · a stand in is named rather than a hole left',
      plan.why.some(x => /Suggested stand ins/.test(x)), plan.why.join(' | '));
    t('8 · the stand in trains the same body part, not the same pattern', (() => {
      const alt = G.painAlternative('Bench Press');
      return alt && alt.g === 'Chest' && alt.p !== 'horizontal push'; })());
    G.renderAll();
    t('8 · after two weeks the app asks if it is better',
      /Is Bench Press alright now/.test(d.getElementById('todayView').innerHTML));
    G.clearPain('Bench Press');
    t('8 · saying yes puts it back', G.painToReview().length === 0
      && G.buildPlan().days.filter(x => x.templateId).every(x => (x.exclude || []).indexOf('Bench Press') < 0));
  }

  /* ---------------------------------------------------------- 9 */
  journey(9, 'Easy weeks arrive on schedule, and the person can move them');
  {
    const { d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S;
    t('9 · six weeks by default', G.DELOAD_EVERY === 6 && !S.profile.deloadEvery);
    S.profile.firstWeek = G.addDays(G.mondayKey(), -35); G.save();
    t('9 · week six is the easy one', G.deloadDue(), JSON.stringify(G.deloadInfo()));
    t('9 · the next one is six weeks later',
      G.nextDeload() === G.addDays(G.mondayKey(), 42), G.nextDeload());
    const plan = G.buildPlan();
    t('9 · every lifting day is marked easy', plan.days.filter(x => x.templateId).every(x => x.deload));
    t('9 · it says next week goes back to working weights',
      plan.why.some(x => /Next week picks up from the weights you were lifting/.test(x)), plan.why[0]);

    G.setDeloadMark(G.mondayKey(), 'skipped');
    t('9 · skipping it makes this a normal week', !G.deloadDue());
    t('9 · and the count starts again from here',
      G.nextDeload() === G.addDays(G.mondayKey(), 42), G.nextDeload());
    G.setDeloadMark(G.mondayKey(), null);

    const nextWk = G.addDays(G.mondayKey(), 14);
    G.setDeloadMark(nextWk, 'added');
    t('9 · they can add one to any week', G.deloadDue(nextWk));
    t('9 · an added one resets what follows',
      G.deloadSchedule(20).filter(r => r.wk > nextWk && r.kind === 'deload')[0].wk === G.addDays(nextWk, 42));

    S.profile.deloadEvery = 8; G.save();
    t('9 · the cadence is theirs to change', G.deloadSchedule(0).slice(-1)[0].kind === 'work');
    S.profile.deload = false; G.save();
    t('9 · switching the schedule off leaves only the weeks they add',
      !G.deloadDue() && G.deloadDue(nextWk));

    G.openDeloadSheet();
    const h = d.getElementById('altBody').innerHTML;
    t('9 · the sheet shows ten weeks they can tap', (h.match(/data-dlweek=/g) || []).length === 10);
    t('9 · and cites where the numbers come from',
      /Bell and colleagues/.test(h) && /Rogerson and colleagues/.test(h) && /Coleman and colleagues/.test(h));
    G.closeSheets();
  }

  /* ---------------------------------------------------------- 10 */
  journey(10, 'Taking their data with them, and destroying it');
  {
    const { d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    G.S.weights.push({ d: G.todayKey(), kg: 90 });
    G.addFood('chicken', 1, 'l');
    const p = G.exportPayload();
    t('10 · the export names itself', p.app === 'Gauntlet' && !!p.exported);
    t('10 · it carries everything', ['profile', 'plan', 'days', 'weights', 'checkins',
      'lifts', 'workouts', 'templates', 'customFoods', 'savedMeals', 'cycle', 'forecasts']
      .every(k => k in p), Object.keys(p).join(','));
    t('10 · with their actual data in it', p.weights.length === 1 && Object.keys(p.days).length >= 1);
    t('10 · and it survives a round trip', (() => {
      const back = JSON.parse(JSON.stringify(p));
      return back.weights[0].kg === 90; })());
    G.openData();
    t('10 · the sheet says what is held and what is not',
      /What is held/.test(d.getElementById('cloudBody').innerHTML)
      && /never held/.test(d.getElementById('cloudBody').innerHTML));
    const btn = d.getElementById('wipeData');
    btn.click();
    t('10 · deleting asks twice', btn.dataset.armed === '1' && /Tap again/.test(btn.textContent));
    t('10 · and nothing is gone yet', G.S.weights.length === 1);
    G.closeSheets();
  }

  /* ---------------------------------------------------------- 11 */
  journey(11, 'The coach: nothing connected, then connected');
  {
    const replies = [];
    const stub = (url, init) => {
      replies.push(JSON.parse(init.body));
      return Promise.resolve({ ok: true, status: 200,
        json: () => Promise.resolve({ text: 'Do another week of this. Nothing in the record says otherwise.' }) });
    };
    const { d, G, errs } = await boot({ fetch: stub }); allErrs.push(...errs);
    onboard(G);
    G.openCoach();
    t('11 · with nothing connected they still get the brief',
      d.getElementById('coachBriefText').textContent.length > 150);
    t('11 · and can copy it', !!d.getElementById('coachCopy'));
    t('11 · and it explains why there is no key in the app',
      /key in it is a key they can spend/.test(d.getElementById('coachBody').innerHTML));
    G.setCoach({ endpoint: 'https://proxy.example/coach', model: 'test', on: true });
    G.openCoach();
    t('11 · connected, they get somewhere to ask', !!d.getElementById('coachGo'));
    const reply = await G.askCoach('What should I change this week?');
    t('11 · the question reached the endpoint', replies.length === 1);
    t('11 · the whole brief went with it',
      /Aim: lose/.test(replies[0].messages[0].content));
    t('11 · the rules went with it',
      /Never invent a number/.test(replies[0].system) && /Do not diagnose/.test(replies[0].system));
    t('11 · the answer comes back', /Do another week/.test(reply));
    const reply2 = await G.askCoach('And what about my sleep?');
    t('11 · a second question carries the first exchange with it',
      replies.length === 2 && replies[1].messages.length > replies[0].messages.length,
      JSON.stringify(replies.map(r => r.messages.length)));
    t('11 · the second answer comes back too', typeof reply2 === 'string' && reply2.length > 10);
  }

  /* ---------------------------------------------------------- 12 */
  journey(12, 'Missing a day, and the week absorbing it');
  {
    const { G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    const i = G.S.plan.days.findIndex(x => x.templateId);
    const label = G.dayLabel(G.S.plan.days[i]);
    const snap = G.snapshotPlan();
    const r = G.pushPlanDay(i);
    t('12 · the session moved rather than vanishing',
      !!r.moved && (r.to !== undefined || !!r.dropped), JSON.stringify(r));
    t('12 · the week is still seven days', G.S.plan.days.length === 7);
    G.restorePlan(snap);
    t('12 · undo puts the week back exactly', G.dayLabel(G.S.plan.days[i]) === label);
    const snap2 = G.snapshotPlan();
    const dr = G.dropPlanDay(i);
    t('12 · dropping it turns the day to rest', G.S.plan.days[i].slot === 'rest', dr.dropped);
    G.restorePlan(snap2);
    t('12 · and that undoes too', G.dayLabel(G.S.plan.days[i]) === label);
  }


  /* ---------------------------------------------------------- 13 */
  journey(13, 'An easy week gives lighter weights, and never drags next week down');
  {
    const { d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S;
    const tpl = S.templates.find(x => x.id === 't_push');
    const row = tpl.ex[0];                              // bench, heavy class, 4 x 5 to 8
    const ex = row.exId;
    /* last working session: 80kg, not yet at the top of the range */
    S.lifts[ex] = [{ d: G.addDays(G.todayKey(), -7), sets: [{kg:80,reps:6},{kg:80,reps:6},{kg:80,reps:6},{kg:80,reps:5}] }];
    const before = G.nextPrescription(ex, row);
    t('13 · a normal week would ask for 80kg', before.kg === 80, JSON.stringify(before));

    S.profile.firstWeek = G.addDays(G.mondayKey(), -35); G.save();
    G.buildPlan();
    t('13 · this is an easy week', G.deloadDue());

    const dp = G.deloadPrescription(ex, row, G.DELOAD_TIERS.moderate);
    t('13 · the easy weight is about 10% lighter, on a real plate', dp.kg === 72.5, JSON.stringify(dp));
    t('13 · with fewer sets', dp.sets < row.sets, dp.sets + ' vs ' + row.sets);
    t('13 · the easy weight stays within a step of 10% across kit and loads', (() => {
      const saved = JSON.parse(JSON.stringify(S.lifts));
      try {
      const cases = [['bench',80],['bench',100],['squat',100],['squat',140],['rdl',60],['dbpress',24],['goblet',20],['pulldown',55]];
      return cases.every(([id, w]) => {
        S.lifts[id] = [{ d: G.addDays(G.todayKey(), -7), sets: [{ kg: w, reps: 8 }] }];
        const r = S.templates.flatMap(x => x.ex).find(x => x.exId === id) || { exId: id, sets: 3, reps: 12, repMin: 8 };
        const p = G.deloadPrescription(id, r, G.DELOAD_TIERS.moderate);
        const off = (w - p.kg) / w;
        return p.kg < w && off >= 0.05 && off <= 0.16; });
      } finally { S.lifts = saved; } })(),
      'see diagnostic below');
    console.log('     easy weights: ' + (() => { const saved = JSON.parse(JSON.stringify(S.lifts));
      const out = [['bench',80],['bench',100],['squat',100],['squat',140],['rdl',60],['dbpress',24],['goblet',20],['pulldown',55]].map(([id,w]) => {
        S.lifts[id] = [{ d: G.addDays(G.todayKey(), -7), sets: [{ kg: w, reps: 8 }] }];
        const r = S.templates.flatMap(x => x.ex).find(x => x.exId === id) || { exId: id, sets: 3, reps: 12, repMin: 8 };
        return id + ' ' + w + '→' + G.deloadPrescription(id, r, G.DELOAD_TIERS.moderate).kg; }).join(', ');
      S.lifts = saved; return out; })());

    t('13 · at the bottom of the rep range', dp.reps === row.repMin, dp.reps + ' vs ' + row.repMin);
    t('13 · and it says what the working weight is', /working weight is 80kg/.test(dp.why));

    G.startWorkout('t_push', { deload: 'moderate' });
    const gx = G.GYM.ex.find(e => e.exId === ex);
    t('13 · the session opens already filled in at the easy weight',
      gx.sets.length === dp.sets && gx.sets.every(st => st.kg === 72.5 && st.reps === dp.reps));
    t('13 · the session says it is an easy week',
      /Easy week/.test(d.getElementById('gymBody').innerHTML)
      && /normally 80kg/.test(d.getElementById('gymBody').innerHTML));
    G.GYM.ex.forEach(e => e.sets.forEach(st => { if (st.kg === '') st.kg = 10; st.done = true; }));
    const prsBefore = S.mine.length;
    G.finishWorkout();

    t('13 · the easy session is kept on the record',
      G.exHistory(ex, { all: true })[0].deload === 'moderate');
    t('13 · but is marked so nothing reads it as a working session',
      G.exHistory(ex)[0].sets[0].kg === 80);
    t('13 · the workout itself is marked', S.workouts[0].deload === 'moderate');

    const after = G.nextPrescription(ex, row);
    t('13 · NEXT WEEK GOES BACK TO 80KG, NOT 72.5', after.kg === 80, JSON.stringify(after));
    t('13 · with the same reasoning as before the easy week', after.kind === before.kind && after.reps === before.reps,
      before.kind + '/' + before.reps + ' vs ' + after.kind + '/' + after.reps);

    t('13 · no personal best is claimed on an easy week', (() => {
      const w = S.workouts[0]; return !(w.prs && w.prs.length); })());
    t('13 · the easy week does not lower their best', (() => {
      const st = G.exerciseStats ? G.exerciseStats(ex) : null;
      return !st || st.heaviest === 80; })());

    /* the same day, a working session and then an easy one, must not collide */
    S.lifts[ex] = [{ d: G.todayKey(), sets: [{kg:82.5,reps:8}] }];
    G.startWorkout('t_push', { deload: 'moderate' });
    G.GYM.ex.forEach(e => e.sets.forEach(st => { if (st.kg === '') st.kg = 10; st.done = true; }));
    G.finishWorkout();
    t('13 · an easy session never overwrites a working one from the same day',
      G.exHistory(ex)[0].sets[0].kg === 82.5 && G.exHistory(ex, { all: true }).length === 2);

    t('13 · a deep easy week drops the accessory work', (() => {
      G.startWorkout('t_push', { deload: 'high' });
      const ids = G.GYM.ex.map(e => e.exId);
      G.GYM = null;
      return ids.every(id => ['isolation', 'core', 'hold'].indexOf(G.rxClass(id)) < 0) && ids.length >= 2; })());

    t('13 · each depth lands inside its published range', (() => {
      const bands = { low: [25, 45], moderate: [40, 60], high: [60, 90] };
      const rows = S.templates.flatMap(x => x.ex).filter(r => G.rxClass(r.exId) !== 'hold');
      return Object.keys(bands).every(k => {
        const cuts = rows.map(r => G.deloadPrescription(r.exId, r, G.DELOAD_TIERS[k]).cut);
        const avg = cuts.reduce((a, b) => a + b, 0) / cuts.length;
        return avg >= bands[k][0] && avg <= bands[k][1]; }); })(),
      ['low','moderate','high'].map(k => {
        const rows = S.templates.flatMap(x => x.ex).filter(r => G.rxClass(r.exId) !== 'hold');
        const cuts = rows.map(r => G.deloadPrescription(r.exId, r, G.DELOAD_TIERS[k]).cut);
        return k + ' ' + Math.round(cuts.reduce((a,b)=>a+b,0)/cuts.length) + '%'; }).join(', '));

    t('13 · depth follows the check in when left on auto', (() => {
      S.profile.deloadDepth = null;
      S.checkins = [{ at: Date.now(), weekOf: G.mondayKey(), recovery: 8, motivation: 7 }];
      const hi = G.deloadTier().id;
      S.checkins[0].recovery = 2;
      const lo = G.deloadTier().id;
      return hi === 'low' && lo === 'high'; })());
  }

  /* ---------------------------------------------------------- 14 */
  journey(14, 'Calories: one maintenance figure everywhere, and a target from their goal');
  {
    const { w, d, G, errs } = await boot(); allErrs.push(...errs);
    const type = (id, v) => { const el = d.getElementById(id); el.value = String(v); el.dispatchEvent(new w.Event('input', { bubbles: true })); };
    const P = { age: 38, height: 180, weight: 95, activity: 'mod', detailsSet: true };
    const bmr = s => 10 * 95 + 6.25 * 180 - 5 * 38 + s;

    t('14 · Mifflin St Jeor for a man is exact', G.bmrOf(Object.assign({ sex: 'm' }, P)) === bmr(5));
    t('14 · and for a woman', G.bmrOf(Object.assign({ sex: 'f' }, P)) === bmr(-161));
    t('14 · rather not say uses the midpoint, as the screen promises',
      G.bmrOf(Object.assign({ sex: 'x' }, P)) === bmr(-78));
    G.startOnboarding(); G.onbDraft.aim = 'lose'; G.step = 2; G.onbRender();
    d.querySelector('[data-onbsex="m"]').click();
    type('onbAge', 38); type('onbHeight', 18); type('onbWeight', 95); G.onbRender();
    t('14 · half-typed numbers never produce a figure',
      !/kcal a day/.test(d.getElementById('onbBody').textContent)
      && /does not look like a real number/.test(d.getElementById('onbBody').textContent));
    type('onbHeight', 180); type('onbGoal', 85); G.onbRender();
    const ob = d.getElementById('onbBody').textContent;
    const obMaint = +(ob.match(/([\d,]+) kcal a day to stay/) || [0, '0'])[1].replace(',', '');
    const obEat = +(ob.match(/([\d,]+) kcal a day to eat/) || [0, '0'])[1].replace(',', '');
    /* the step-driven build, worked independently of the app */
    const liftPerDay = 3 * ((57 + 57 + 63) / 3) / 7;            // three lifting days of the seeded templates
    const expected = Math.round(bmr(5) * 1.2 + (8000 - 2500) / 100 * (2 * 3.5 * 95 / 200) + liftPerDay * (3 * 3.5 * 95 / 200));
    t('14 · onboarding shows maintenance built from the step target', Math.abs(obMaint - expected) <= 2, obMaint + ' vs ' + expected);
    t('14 · and shows what each 1,000 steps is worth', /Each 1,000 steps is about 33 kcal/.test(ob), (ob.match(/Each 1,000[^.]*\./) || [''])[0]);
    t('14 · a step target field is on the numbers step', !!d.getElementById('onbSteps') && d.querySelectorAll('[data-onbsteps]').length === 4);
    t('14 · and a lower figure to eat', obEat > 0 && obEat < obMaint, String(obEat));
    Object.assign(G.onbDraft, { handle: 'ferg', liftDays: 3, cardioDays: 2, checkinDay: 6, kit: G.ALL_KIT.slice() });
    G.finishOnboarding();
    const S = G.S;

    const ct = G.calorieTarget();
    t('14 · onboarding, You and the target all agree on maintenance',
      ct.maintenance === obMaint && S.targets.maintenance === obMaint, ct.maintenance + ' / ' + S.targets.maintenance);
    t('14 · and on what to eat', ct.kcal === obEat && S.targets.kcal === obEat, ct.kcal + ' / ' + S.targets.kcal);
    t('14 · the forecast agrees when there is no tracker', G.tdeeEstimate(95, null, 0) === obMaint, String(G.tdeeEstimate(95, null, 0)));
    t('14 · the step target was saved and is the one the app uses', S.profile.stepTarget === 8000 && S.targets.steps === 8000);
    t('14 · the target is no longer maintenance', S.targets.kcal < S.targets.maintenance);
    t('14 · at 95kg the 750 kcal cap is tighter than 0.75%, so it wins', ct.limit === 'cap' && ct.deficit === 750, ct.limit + ' ' + ct.deficit);
    t('14 · the goal weight became a dated target', S.target && S.target.value === 85 && !!S.target.by);
    G.openYou();
    t('14 · the You sheet shows maintenance, the target and the steps',
      new RegExp('Maintenance\\s*' + obMaint.toLocaleString('en-GB')).test(d.getElementById('dashBody').textContent)
      && new RegExp('Eat\\s*' + obEat.toLocaleString('en-GB')).test(d.getElementById('dashBody').textContent)
      && /Steps\s*8,000/.test(d.getElementById('dashBody').textContent), d.getElementById('dashBody').textContent.slice(0, 160));
    G.closeSheets();


    /* ---- the step target moves the calories ---- */
    const at = n => { S.profile.stepTarget = n; S.targets = G.ownTargets(); return { m: G.maintenance().kcal, eat: S.targets.kcal }; };
    const s8 = at(8000), s12 = at(12000), s2 = at(2000), s25 = at(2500);
    t('14 · 4,000 more steps adds about 133 kcal to maintenance', Math.abs((s12.m - s8.m) - 133) <= 1, (s12.m - s8.m) + ' kcal');
    t('14 · and moves what to eat by the same amount', Math.abs((s12.eat - s8.eat) - (s12.m - s8.m)) <= 1, (s12.eat - s8.eat) + ' vs ' + (s12.m - s8.m));
    t('14 · steps below the basal 2,500 never subtract anything', s2.m === s25.m, s2.m + ' vs ' + s25.m);
    at(12000);
    t('14 · the line says what the target assumes', /That assumes you hit 12,000 steps/.test(G.calorieLine(G.calorieTarget())),
      G.calorieLine(G.calorieTarget()));
    G.connectHealth('apple');
    const walkDay = S.plan.days.find(x => x.slot === 'walk');
    const keepDay = S.plan.days[G.dowIdx()];
    if (walkDay) S.plan.days[G.dowIdx()] = Object.assign({}, walkDay, { dow: G.dowIdx() });
    G.go('today'); G.renderAll();
    const tv = d.getElementById('todayView').innerHTML;
    t('14 · Today\'s walk tracker counts against their target, not a hardcoded 8,000',
      /of 12,000 steps/.test(tv) && !/of 8,000 steps/.test(tv), (tv.match(/of [\d,]+ steps/) || ['none'])[0]);
    t('14 · demo tracker steps never replace the target in the calories', G.maintenance().source === 'planned');
    S.plan.days[G.dowIdx()] = keepDay;
    G.disconnectHealth();
    /* real steps take over from the target */
    for (let i = 0; i < 21; i++) { const k = G.addDays(G.todayKey(), -i); S.days[k] = Object.assign({}, S.days[k], { steps: 6000 }); }
    const meas = G.maintenance();
    t('14 · real steps replace the target once they exist', meas.source === 'measured' && meas.steps === 6000, JSON.stringify(meas));
    t('14 · and measured maintenance is lower than the 12,000 target implied', meas.kcal < s12.m, meas.kcal + ' vs ' + s12.m);
    Object.keys(S.days).forEach(k => { delete S.days[k].steps; });
    at(8000);
    /* the details editor has a step slider */
    G.openDetails();
    const sl = d.querySelector('[data-range="stepTarget"]');
    t('14 · the details editor has a step target slider', !!sl && /about 33 kcal a day/.test(d.getElementById('stepsWorth').textContent));
    sl.value = '10000'; sl.dispatchEvent(new w.Event('input', { bubbles: true }));
    t('14 · moving it reads out the new figure', /10,000/.test(d.getElementById('outstepTarget').textContent));
    d.getElementById('saveDetails').click();
    t('14 · saving it moves the calories', S.profile.stepTarget === 10000 && S.targets.steps === 10000 && S.targets.kcal > s8.eat, S.targets.kcal + ' vs ' + s8.eat);
    at(8000);

    /* a date that is too soon */
    G.setTarget('weight', 85, G.addDays(G.todayKey(), 28)); S.target.from = 95;
    const rush = G.calorieTarget();
    t('14 · a date needing more than 1% a week is not delivered', rush.capped && rush.asked > 1 && rush.deficit <= 750, JSON.stringify(rush));
    t('14 · and says when they will actually get there', !!rush.eta && rush.eta > S.target.by, rush.eta + ' vs ' + S.target.by);
    t('14 · and says why in plain words', /Your goal date needs 2\.63% a week/.test(G.calorieLine(rush)) && /750 kcal deficit/.test(G.calorieLine(rush)), G.calorieLine(rush));

    /* a date that is further out gives a gentler deficit */
    G.setTarget('weight', 85, G.addDays(G.todayKey(), 7 * 40)); S.target.from = 95;
    const easy = G.calorieTarget();
    t('14 · a distant date gives a gentler rate', easy.ratePct < 0.75 && easy.kcal > obEat, JSON.stringify(easy));

    /* the floor */
    S.profile = Object.assign({}, S.profile, { sex: 'f', age: 60, height: 152, weight: 52, activity: 'low' });
    S.weights = [{ d: G.todayKey(), kg: 52 }];
    G.setTarget('weight', 45, G.addDays(G.todayKey(), 28));
    const fl = G.calorieTarget();
    t('14 · never below 1,200 for a woman', fl.kcal >= 1200 && fl.floored, JSON.stringify(fl));
    t('14 · and the line says it is the floor', /floor/.test(G.calorieLine(fl)));

    /* gaining */
    S.profile = Object.assign({}, S.profile, { sex: 'm', age: 25, height: 180, weight: 70, activity: 'mod', aim: 'build' });
    S.weights = [{ d: G.todayKey(), kg: 70 }];
    G.clearTarget();
    const gn = G.calorieTarget();
    t('14 · gaining sits in the 0.25 to 0.5% range', gn.dir === 'gain' && gn.ratePct >= 0.25 && gn.ratePct <= 0.5, JSON.stringify(gn));
    t('14 · and never more than 20% over maintenance', gn.kcal <= Math.round(gn.maintenance * 1.2) + 1);

    /* reaching the goal */
    S.profile = Object.assign({}, S.profile, { aim: 'lose', weight: 86 });
    S.weights = [{ d: G.addDays(G.todayKey(), -10), kg: 90 }, { d: G.todayKey(), kg: 84.9 }];
    G.setTarget('weight', 85, G.addDays(G.todayKey(), 60)); S.target.from = 90;
    G.buildPlan();
    t('14 · hitting the goal is recorded', !!S.target.hit);
    t('14 · and eating returns to maintenance, even with the aim still set to lose',
      S.profile.aim === 'lose' && S.targets.kcal === S.targets.maintenance && G.calorieTarget().dir === 'hold',
      JSON.stringify({ kcal: S.targets.kcal, m: S.targets.maintenance, dir: G.calorieTarget().dir }));

    /* three weeks of real data takes over */
    S.target = null; S.profile.aim = 'hold';
    S.weights = []; S.days = {};
    for (let i = 21; i >= 0; i--) {
      const k = G.addDays(G.todayKey(), -i);
      S.days[k] = { kcal: 2500 };
      S.weights.push({ d: k, kg: +(86 - (21 - i) * 0.03).toFixed(2) });
    }
    const obs = G.maintenance();
    t('14 · real intake and weigh ins take over from the estimate', obs.source === 'observed', JSON.stringify(obs));
    t('14 · and the estimate is sensible', obs.kcal > 2500 && obs.kcal < 3200, String(obs.kcal));

    /* the target sheet shows the consequence before saving */
    S.profile.aim = 'lose'; S.days = {}; S.weights = [{ d: G.todayKey(), kg: 90 }]; S.profile.weight = 90;
    G.openTargetSheet();
    d.getElementById('targetValue').value = '80';
    d.getElementById('targetValue').dispatchEvent(new w.Event('input', { bubbles: true }));
    t('14 · the target sheet shows the calories before saving',
      /kcal to lose about/.test(d.getElementById('targetKcal').textContent), d.getElementById('targetKcal').textContent);
    G.closeSheets();
  }

  /* ---------------------------------------------------------- 15 */
  journey(15, 'Deficits by body size, and exactly what the steps add');
  {
    const { w, d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S;
    /* everything below is worked out here, from the published formulas, and
       compared with what the app says. Nothing is read back from the app to
       check itself. */
    const KPK = 7700, BASAL = 2500;
    const deur = (kg, cm, age, sx) => 1.2 * (kg / Math.pow(cm / 100, 2)) + 0.23 * age - 10.8 * sx - 5.4;
    const walkK = (steps, kg) => (3 - 1) * 3.5 * kg / 200 * (Math.max(0, steps - BASAL) / 100);
    const set = (o) => { S.profile = Object.assign({}, S.profile, o, { detailsSet: true }); S.weights = [{ d: G.todayKey(), kg: o.weight }]; S.target = null; S.days = {}; };

    t('15 · Deurenberg for a man is exact', Math.abs(G.bodyFatPct({ weight: 95, height: 180, age: 38, sex: 'm' }).pct - +deur(95, 180, 38, 1).toFixed(1)) < 0.001);
    t('15 · and for a woman', Math.abs(G.bodyFatPct({ weight: 60, height: 165, age: 30, sex: 'f' }).pct - +deur(60, 165, 30, 0).toFixed(1)) < 0.001);
    t('15 · rather not say uses the midpoint', Math.abs(G.bodyFatPct({ weight: 80, height: 175, age: 40, sex: 'x' }).pct - +deur(80, 175, 40, 0.5).toFixed(1)) < 0.001);
    t('15 · an entered figure wins over the estimate', G.bodyFatPct({ weight: 95, height: 180, age: 38, sex: 'm', bodyFat: 15 }).pct === 15);
    t('15 · nonsense body fat is ignored', G.bodyFatPct({ weight: 95, height: 180, age: 38, sex: 'm', bodyFat: 90 }).source === 'estimated');
    t('15 · no adult estimate under 16', G.bodyFatPct({ weight: 60, height: 165, age: 15, sex: 'f' }) === null);

    /* the table from the research, person by person */
    const people = [
      ['60kg woman', { sex: 'f', age: 30, height: 165, weight: 60 }, 'rate'],
      ['70kg man', { sex: 'm', age: 30, height: 178, weight: 70 }, 'rate'],
      ['95kg man', { sex: 'm', age: 38, height: 180, weight: 95 }, 'cap'],
      ['120kg man', { sex: 'm', age: 45, height: 180, weight: 120 }, 'cap'],
      ['110kg woman', { sex: 'f', age: 45, height: 165, weight: 110 }, 'cap']];
    people.forEach(([name, body, want]) => {
      set(Object.assign({ aim: 'lose', stepTarget: 8000, bodyFat: null }, body));
      const ct = G.calorieTarget();
      const pctDef = body.weight * 0.0075 * KPK / 7;
      const fatDef = 69.3 * body.weight * (+deur(body.weight, body.height, body.age, body.sex === 'm' ? 1 : 0).toFixed(1)) / 100;
      const expect = Math.min(pctDef, 750, fatDef);
      const expectEat = Math.max(Math.round(ct.maintenance - expect), body.sex === 'm' ? 1500 : 1200);
      t('15 · ' + name + ': the ' + want + ' limit sets it', ct.limit === want, ct.limit);
      t('15 · ' + name + ': eat figure matches the formulas', ct.kcal === Math.min(expectEat, ct.maintenance), ct.kcal + ' vs ' + expectEat);
      t('15 · ' + name + ': deficit is maintenance minus eat', ct.deficit === ct.maintenance - ct.kcal);
      t('15 · ' + name + ': rate is the deficit in kilos, to two places', ct.rateKg === +(ct.deficit * 7 / KPK).toFixed(2), ct.rateKg + ' vs ' + (ct.deficit * 7 / KPK).toFixed(2));
    });

    /* a lean man with a measured body fat, asking for a fast date */
    set({ aim: 'lose', sex: 'm', age: 30, height: 180, weight: 80, bodyFat: 8, stepTarget: 8000 });
    G.setTarget('weight', 76, G.addDays(G.todayKey(), 28)); S.target.from = 80;
    const lean = G.calorieTarget();
    t('15 · lean and in a hurry: the fat ceiling binds', lean.limit === 'fat', lean.limit);
    const fatCeiling = 69.3 * 80 * 0.08;                       // 6.4 kg of fat
    t('15 · at exactly 69.3 kcal per kilo of fat', lean.deficit === lean.maintenance - Math.round(lean.maintenance - fatCeiling),
      lean.deficit + ' vs ' + (lean.maintenance - Math.round(lean.maintenance - fatCeiling)));
    t('15 · and the line names body fat as the reason', /8% body fat/.test(G.calorieLine(lean)) && !/estimated/.test(G.calorieLine(lean)), G.calorieLine(lean));

    /* the floor can never make a diet into a surplus */
    set({ aim: 'lose', sex: 'f', age: 80, height: 145, weight: 42, bodyFat: null, stepTarget: 2000 });
    S.plan = null; S.profile.liftDays = 0;
    const tiny = G.calorieTarget();
    t('15 · if maintenance is under the floor, eat is maintenance, not more', tiny.kcal <= tiny.maintenance, tiny.kcal + ' vs ' + tiny.maintenance);
    t('15 · and the line says there is no deficit to set', tiny.maintenance >= 1200 || /no deficit an app should set/.test(G.calorieLine(tiny)), G.calorieLine(tiny));
    G.buildPlan();

    /* ---- the split: food plus steps is exactly the deficit ---- */
    [4000, 8000, 12500, 20000].forEach(n => {
      set({ aim: 'lose', sex: 'm', age: 38, height: 180, weight: 95, bodyFat: null, stepTarget: n });
      const m = G.maintenance(), ct = G.calorieTarget(), sp = G.stepSplit(ct, m, S.profile);
      const walk = Math.round(walkK(n, 95));
      t('15 · ' + n + ' steps: the walking figure matches the formula', sp.walk === walk, sp.walk + ' vs ' + walk);
      t('15 · ' + n + ' steps: food plus steps equals the deficit', sp.food + sp.walk === sp.deficit, sp.food + '+' + sp.walk + ' vs ' + sp.deficit);
      t('15 · ' + n + ' steps: without steps is the food part in kilos', Math.abs(sp.withoutKg - +(Math.max(0, sp.food) * 7 / KPK).toFixed(2)) < 1e-9);
      const txt = G.splitText(sp);
      t('15 · ' + n + ' steps: the words carry those exact numbers',
        txt.indexOf(sp.walk.toLocaleString('en-GB')) > -1 && txt.indexOf(sp.deficit.toLocaleString('en-GB')) > -1, txt);
    });
    set({ aim: 'lose', sex: 'm', age: 38, height: 180, weight: 95, bodyFat: null, stepTarget: 2000 });
    t('15 · under 2,500 steps it says walking adds nothing', /walking adds nothing/.test(G.splitText(G.stepSplit(G.calorieTarget(), G.maintenance(), S.profile))));
    set({ aim: 'lose', sex: 'm', age: 38, height: 180, weight: 95, bodyFat: null, stepTarget: 40000 });
    const huge = G.stepSplit(G.calorieTarget(), G.maintenance(), S.profile);
    t('15 · when the steps make all the deficit it says so', huge.food <= 0 && /the steps make all of it/.test(G.splitText(huge)), JSON.stringify(huge));

    /* ---- tracked steps ---- */
    set({ aim: 'lose', sex: 'm', age: 38, height: 180, weight: 95, bodyFat: null, stepTarget: 10000 });
    for (let i = 0; i < 21; i++) S.days[G.addDays(G.todayKey(), -i)] = { steps: 6000 };
    const mm = G.maintenance(), mct = G.calorieTarget(), msp = G.stepSplit(mct, mm, S.profile);
    t('15 · tracked: the split uses the tracker, not the target', mm.source === 'measured' && msp.steps === 6000 && msp.walk === Math.round(walkK(6000, 95)));
    t('15 · tracked: food plus steps still equals the deficit', msp.food + msp.walk === msp.deficit);
    t('15 · tracked: reaching the target is costed exactly',
      msp.extra === Math.round(walkK(10000, 95) - walkK(6000, 95)), msp.extra + ' vs ' + Math.round(walkK(10000, 95) - walkK(6000, 95)));
    t('15 · tracked: and says calories follow the tracker', /follow what the tracker counts/.test(G.splitText(msp)));
    S.days = {};

    /* ---- onboarding shows it, from what is typed ---- */
    const b2 = await boot(); allErrs.push(...b2.errs);
    const W = b2.w, D = b2.d, G2 = b2.G;
    const type = (id, v) => { const el = D.getElementById(id); el.value = String(v); el.dispatchEvent(new W.Event('input', { bubbles: true })); };
    G2.startOnboarding(); G2.onbDraft.aim = 'lose'; G2.onbDraft.liftDays = 3; G2.step = 2; G2.onbRender();
    D.querySelector('[data-onbsex="m"]').click();
    type('onbAge', 38); type('onbHeight', 180); type('onbWeight', 95); type('onbSteps', 12000); G2.onbRender();
    const ob = D.getElementById('onbBody').textContent;
    t('15 · onboarding shows where the deficit comes from', !!D.getElementById('onbSplit') && /Where the deficit comes from/.test(ob));
    const obWalk = Math.round(walkK(12000, 95));
    t('15 · with the walking figure for the steps typed', ob.indexOf(obWalk.toLocaleString('en-GB') + ' of it from your 12,000 step target') > -1, (ob.match(/[\d,]+ of it from[^.]*/) || [''])[0]);
    t('15 · the calorie line quotes the steps typed, not the saved profile', /assumes you hit 12,000 steps/.test(ob) && !/assumes you hit 8,000/.test(ob));
    const obEat = +(ob.match(/([\d,]+) kcal a day to eat/) || [0, '0'])[1].replace(/,/g, '');
    const obMaint = +(ob.match(/([\d,]+) kcal a day to stay/) || [0, '0'])[1].replace(/,/g, '');
    const obDef = +(ob.match(/a ([\d,]+) kcal deficit/) || [0, '0'])[1].replace(/,/g, '');
    t('15 · the deficit shown is maintenance minus eat, on screen', obDef === obMaint - obEat, obMaint + ' - ' + obEat + ' vs ' + obDef);
    type('onbBf', 99); G2.onbRender();
    t('15 · an impossible body fat is refused with a reason', /between 3 and 70%/.test(D.getElementById('onbBody').textContent));
    type('onbBf', 22); G2.onbRender();
    Object.assign(G2.onbDraft, { handle: 'ferg', cardioDays: 2, checkinDay: 6, kit: G2.ALL_KIT.slice() });
    G2.finishOnboarding();
    t('15 · body fat and steps are saved', G2.S.profile.bodyFat === 22 && G2.S.profile.stepTarget === 12000);
    t('15 · and what onboarding promised is what the app then uses', G2.S.targets.kcal === obEat, G2.S.targets.kcal + ' vs ' + obEat);

    /* ---- the details editor shows it live, before saving ---- */
    G2.openDetails();
    const sl = D.querySelector('[data-range="stepTarget"]');
    const before = D.getElementById('stepsWorth').textContent;
    sl.value = '6000'; sl.dispatchEvent(new W.Event('input', { bubbles: true }));
    const after = D.getElementById('stepsWorth').textContent;
    t('15 · moving the slider updates the split before saving', before !== after && /6,000 step target/.test(after), after.slice(0, 120));
    const previewEat = +(after.match(/([\d,]+) kcal a day once saved/) || [0, '0'])[1].replace(/,/g, '');
    t('15 · the saved figure is not changed until they save', G2.S.targets.kcal === obEat);
    D.getElementById('saveDetails').click();
    t('15 · after saving, the app uses exactly the previewed figure', G2.S.targets.kcal === previewEat, G2.S.targets.kcal + ' vs ' + previewEat);
    G2.closeSheets();
  }

  /* ---------------------------------------------------------- 16 */
  journey(16, 'Theme choice sticks, the brief never says null, reminders tell the truth');
  {
    /* ---- theme ---- */
    const { w, d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    t('16 · by default the app is light', !d.documentElement.hasAttribute('data-theme') && !G.S.profile.theme);
    G.go('progress'); G.renderAll();
    d.querySelector('[data-setting="theme"]').click();
    const pick = v => d.querySelector('[data-themepick="' + v + '"]');
    t('16 · the picker offers all three, light first and marked as chosen',
      !!pick('auto') && !!pick('light') && !!pick('dark') && pick('light').classList.contains('on')
      && d.querySelector('[data-themepick]').dataset.themepick === 'light');
    pick('dark').click();
    t('16 · choosing dark sets dark', d.documentElement.getAttribute('data-theme') === 'dark' && G.S.profile.theme === 'dark');
    G.closeSheets();
    let undone = false;
    G.toast('Tuesday dropped', 'Undo', () => { undone = true; });
    const toastBefore = d.getElementById('toast').textContent;
    d.querySelector('.tab[data-go="plan"]').click();
    const toastAfter = d.getElementById('toast').textContent;
    t('16 · tapping elsewhere does not re-run the theme', !/Theme:/.test(toastAfter), toastAfter);
    t('16 · and does not wipe an Undo that is showing', /Tuesday dropped/.test(toastAfter) && /Undo/.test(toastAfter), toastBefore + ' -> ' + toastAfter);
    d.querySelector('[data-setting="theme"]').click();
    pick('light').click();
    t('16 · choosing light sets light', !d.documentElement.hasAttribute('data-theme') && G.S.profile.theme === 'light');
    const t0 = d.getElementById('toast').textContent;
    pick('light').click();
    t('16 · tapping the theme already chosen does nothing', d.getElementById('toast').textContent === t0);
    pick('auto').click();
    t('16 · following the phone is there as a choice', d.documentElement.getAttribute('data-theme') === 'auto' && G.S.profile.theme === 'auto');
    G.closeSheets();

    /* ---- the onboarding progress bar and the habit dots are separate ---- */
    const src = require('fs').readFileSync(require('path').join(__dirname, 'index.html'), 'utf8');
    t('16 · onboarding progress keeps its thin bars', /\.dots i\{width:20px;height:2px/.test(src) && !/\.dots i\{[^}]*border-radius:50%/.test(src));
    t('16 · habit dots have their own styles', /\.habitdots i\{[^}]*border-radius:50%/.test(src));

    /* ---- the brief ---- */
    const bad = s => /\bnull\b|\bundefined\b|\bNaN\b/.test(s);
    const f = await boot(); allErrs.push(...f.errs);
    t('16 · a fresh install brief has no nulls', !bad(f.G.coachBrief()), (f.G.coachBrief().match(/.*(null|undefined|NaN).*/) || [''])[0]);
    onboard(f.G);
    const b0 = f.G.coachBrief();
    t('16 · onboarded, nothing logged: no nulls', !bad(b0), (b0.match(/.*(null|undefined|NaN).*/) || [''])[0]);
    t('16 · and it says nothing is logged, in words', /Nothing logged in the last 7 days/.test(b0));
    f.G.S.days[f.G.todayKey()] = { sleep: 7 };
    const b1 = f.G.coachBrief();
    t('16 · one partial day: no nulls', !bad(b1), (b1.match(/.*(null|undefined|NaN).*/) || [''])[0]);
    t('16 · missing fields say not logged', /protein not logged/.test(b1) && /sleep 7h/.test(b1), b1.split('\n').filter(l => /Averages|Steps/.test(l)).join(' | '));

    /* ---- reminders ---- */
    const ios = await boot({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1' });
    allErrs.push(...ios.errs); onboard(ios.G); ios.G.openYou();
    t('16 · on iPhone in a tab, it says to add to the Home Screen first',
      /Add to Home Screen/.test(ios.d.getElementById('nudgeNote').textContent), ios.d.getElementById('nudgeNote').textContent);
    ios.d.getElementById('nudgeBtn').click();
    t('16 · and the button says the same instead of a dead end', /Home Screen/.test(ios.d.getElementById('toast').textContent), ios.d.getElementById('toast').textContent);

    const desk = await boot(); allErrs.push(...desk.errs); onboard(desk.G); desk.G.openYou();
    t('16 · elsewhere, it states the limit plainly',
      /only arrive while Gauntlet is open/.test(desk.d.getElementById('nudgeNote').textContent)
      && /waits for you on Today/.test(desk.d.getElementById('nudgeNote').textContent));

    const shown = [];
    const withSW = await boot({ before: w2 => {
      w2.Notification = function () { throw new TypeError('Illegal constructor. Use ServiceWorkerRegistration.showNotification() instead.'); };
      w2.Notification.permission = 'granted'; w2.Notification.requestPermission = async () => 'granted';
      Object.defineProperty(w2.navigator, 'serviceWorker', { configurable: true, value: {
        register: () => Promise.resolve({}), getRegistration: async () => ({ showNotification: async (title, o) => { shown.push(title); } }) } });
    } });
    allErrs.push(...withSW.errs); onboard(withSW.G);
    withSW.G.S.profile.nudge = true;
    try { withSW.w.localStorage.removeItem(withSW.G.NUDGE_KEY); } catch (e) {}
    const sent = await withSW.G.fireNudge();
    t('16 · where page notifications are refused, it goes through the service worker', sent === true && shown.length === 1, sent + ' / ' + shown.length);
    t('16 · and records it as sent', !!withSW.w.localStorage.getItem(withSW.G.NUDGE_KEY));
    t('16 · but not twice in the same evening', (await withSW.G.fireNudge()) === false && shown.length === 1);

    const noWay = await boot({ before: w2 => {
      w2.Notification = function () { throw new TypeError('Illegal constructor'); };
      w2.Notification.permission = 'granted'; w2.Notification.requestPermission = async () => 'granted';
    } });
    allErrs.push(...noWay.errs); onboard(noWay.G);
    noWay.G.S.profile.nudge = true;
    try { noWay.w.localStorage.removeItem(noWay.G.NUDGE_KEY); } catch (e) {}
    const sent2 = await noWay.G.fireNudge();
    t('16 · when nothing can deliver it, it is not marked as sent', sent2 === false && !noWay.w.localStorage.getItem(noWay.G.NUDGE_KEY));
  }

  /* ---------------------------------------------------------- 17 */
  journey(17, 'Delete everything means everything, and never claims more than it did');
  {
    /* A small fake Supabase: four tables, rows owned by the test user, and a
       switch for the case where the database's rules refuse a delete, which
       Supabase answers with 204 and nothing removed. */
    const ME = '11111111-1111-1111-1111-111111111111';
    const makeDb = refuse => ({
      refuse,
      rows: { state: [{ user_id: ME }], profiles: [{ user_id: ME }], posts: [{ user_id: ME }, { user_id: 'other' }],
              follows: [{ follower: ME, followee: 'other' }, { follower: 'other', followee: ME }, { follower: 'a', followee: 'b' }] },
      calls: [] });
    const fakeFetch = db => (url, init) => {
      const u = new URL(url), table = u.pathname.split('/').pop(), method = (init && init.method) || 'GET';
      db.calls.push(method + ' ' + table + u.search);
      if (!db.rows[table]) return Promise.resolve({ ok: true, status: 200, json: async () => [] });
      const filters = [...u.searchParams].filter(([k, v]) => /^eq\./.test(v)).map(([k, v]) => [k, v.slice(3)]);
      const match = r => filters.every(([k, v]) => String(r[k]) === v);
      if (method === 'DELETE') {
        if (!db.refuse.includes(table)) db.rows[table] = db.rows[table].filter(r => !match(r));
        return Promise.resolve({ ok: true, status: 204, json: async () => [] });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => db.rows[table].filter(match) });
    };
    const signIn = w2 => w2.localStorage.setItem('gauntlet.cloud', JSON.stringify({
      url: 'https://fake.supabase.co', key: 'anon', fromConfig: false, auto: false,
      session: { access_token: 'tok', user_id: ME, email: 'x@y.z' } }));

    /* everything allowed */
    const ok = makeDb([]);
    const A = await boot({ fetch: fakeFetch(ok), before: signIn }); allErrs.push(...A.errs);
    onboard(A.G);
    A.G.S.weights.push({ d: A.G.todayKey(), kg: 90 }); A.G.save();
    const ra = await A.G.eraseEverything();
    t('17 · it clears all four tables', ra.ok && ok.rows.state.length === 0 && ok.rows.profiles.length === 0, JSON.stringify(ra));
    t('17 · including follows in both directions', !ok.rows.follows.some(r => r.follower === ME || r.followee === ME) && ok.rows.follows.length === 1);
    t('17 · and only this person\'s rows', ok.rows.posts.length === 1 && ok.rows.posts[0].user_id === 'other');
    t('17 · it checks each table afterwards rather than trusting the answer',
      A.G.ERASE_TABLES.every(([, table, col]) => ok.calls.some(c => c.startsWith('GET ' + table) && c.includes(col + '=eq.' + ME))));
    t('17 · then nothing of the app is left on the device', Object.keys(A.w.localStorage).filter(k => /^gauntlet/.test(k)).length === 0,
      Object.keys(A.w.localStorage).join(', '));

    /* the database silently refuses to delete saved data and the profile */
    const no = makeDb(['state', 'profiles']);
    const B = await boot({ fetch: fakeFetch(no), before: signIn }); allErrs.push(...B.errs);
    onboard(B.G);
    B.G.S.weights.push({ d: B.G.todayKey(), kg: 90 }); B.G.save();
    const keysBefore = Object.keys(B.w.localStorage).filter(k => /^gauntlet/.test(k)).sort().join();
    const rb = await B.G.eraseEverything();
    t('17 · a silent refusal is caught, not reported as success', !rb.ok, JSON.stringify(rb));
    t('17 · and it names exactly what is left', rb.left.join() === 'your profile,your saved data', rb.left.join());
    t('17 · nothing on the device is touched, so they can retry', Object.keys(B.w.localStorage).filter(k => /^gauntlet/.test(k)).sort().join() === keysBefore
      && !!B.w.localStorage.getItem('gauntlet.cloud'));

    /* the screen, end to end */
    B.G.openData();
    const wipe = B.d.getElementById('wipeData');
    wipe.click(); wipe.click();
    await new Promise(r => setTimeout(r, 50));
    const note = B.d.getElementById('wipeNote').textContent;
    t('17 · the screen says what is still in the database', /Still in the database: your profile, your saved data/.test(note), note);
    t('17 · says nothing was removed from the device', /Nothing has been removed from this device/.test(note));
    t('17 · and offers to try again, or wipe the device only', wipe.textContent === 'Try again' && !!B.d.getElementById('wipeLocalOnly'));
    t('17 · the privacy copy says what other people can see', /other people using the app can see those/.test(B.d.getElementById('cloudBody').textContent));
    B.G.closeSheets();

    /* not signed in: the device is simply wiped */
    const C = await boot(); allErrs.push(...C.errs);
    onboard(C.G);
    const rc = await C.G.eraseEverything();
    t('17 · signed out, it just wipes the device', rc.ok && Object.keys(C.w.localStorage).filter(k => /^gauntlet/.test(k)).length === 0);
  }

  /* ---------------------------------------------------------- 18 */
  journey(18, 'An app left open in the background finds out about a new version');
  {
    const server = { html: '<html>v1</html>', offline: false, calls: 0 };
    const pageFetch = (url, init) => {
      if (String(url).split('#')[0] !== 'https://example.test/') return Promise.reject(new Error('offline in test'));
      server.calls++;
      if (server.offline) return Promise.reject(new TypeError('Failed to fetch'));
      return Promise.resolve({ ok: true, status: 200, text: async () => server.html });
    };
    let reloads = 0;
    const { w, d, G, errs, source } = await boot({ fetch: pageFetch, before: w2 => { w2.__reload = () => { reloads++; }; } });
    allErrs.push(...errs);
    onboard(G);
    const bar = () => d.getElementById('updateBar').classList.contains('on');

    await G.checkForUpdate(true);
    t('18 · the first check just records which version is running', G.upd.base !== null && !bar());
    await G.checkForUpdate(true);
    t('18 · nothing published, no banner', !bar());

    const calls = server.calls;
    await G.checkForUpdate(false);
    t('18 · returning to the app within 30 minutes does not re-download anything', server.calls === calls);

    server.html = '<html>v2</html>';
    await G.checkForUpdate(true);
    t('18 · once something is published, the banner appears', bar() && /new version of Gauntlet is ready/.test(d.getElementById('updateBar').textContent));
    t('18 · and says their data is safe', /Your data stays exactly as it is/.test(d.getElementById('updateBar').textContent));
    t('18 · it never reloads on its own', reloads === 0);
    d.getElementById('updateNow').click();
    t('18 · tapping Update reloads into the new version', reloads === 1);
    t('18 · the button is a proper tap target', /\.updatebar button\{min-height:44px/.test(source));

    /* never in the middle of something */
    const b2 = await boot({ fetch: pageFetch }); allErrs.push(...b2.errs);
    onboard(b2.G);
    server.html = '<html>v2</html>';
    await b2.G.checkForUpdate(true);
    server.html = '<html>v3</html>';
    b2.G.startWorkout('t_push');
    await b2.G.checkForUpdate(true);
    const bar2 = () => b2.d.getElementById('updateBar').classList.contains('on');
    t('18 · mid-workout, the banner waits', b2.G.upd.ready && !bar2());
    b2.G.GYM.ex.forEach(e => e.sets.forEach(st => { if (st.kg === '') st.kg = 10; st.done = true; }));
    b2.G.finishWorkout();
    b2.d.getElementById('gym').classList.remove('on');
    b2.G.closeSheets();
    b2.G.showUpdateBar();
    t('18 · and appears once the session is finished', bar2());
    b2.G.openFood(false);
    b2.G.showUpdateBar();
    t('18 · it also steps aside while a form is open', !bar2());
    b2.G.closeSheets();

    /* starting with no signal */
    server.offline = true;
    const b3 = await boot({ fetch: pageFetch }); allErrs.push(...b3.errs);
    onboard(b3.G);
    await b3.G.checkForUpdate(true);
    t('18 · with no signal, the check fails quietly', !b3.d.getElementById('updateBar').classList.contains('on'));
    server.offline = false;
    await b3.G.checkForUpdate(true);
    t('18 · and never shows a false alarm once the signal returns', !b3.d.getElementById('updateBar').classList.contains('on'));

    t('18 · the service worker file is always fetched fresh', /register\('sw\.js',\{updateViaCache:'none'\}\)/.test(source));
  }

  /* ---------------------------------------------------------- 19 */
  journey(19, 'The You screen: your plan and settings where you would look for them');
  {
    const { w, d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G, { kit: ['bodyweight', 'dumbbell'] });
    const S = G.S;
    G.setTarget('weight', 85, G.addDays(G.todayKey(), 84)); S.target.from = 92;
    G.startHabit('walk_after'); G.startHabit('no_sugary_drinks');
    S.profile.stepTarget = 10000; S.targets = G.ownTargets(); G.save();
    G.go('progress'); G.renderAll();
    const tab = d.querySelector('.tab[data-go="progress"]');
    t('19 · the tab is called You', /You/.test(tab.textContent) && !/Progress/.test(tab.textContent), tab.textContent.trim());
    const top = d.getElementById('settingsList'), more = d.getElementById('settingsMore');
    const row = k => d.querySelector('[data-setting="' + k + '"]');
    const val = k => (row(k) && row(k).querySelector('.sv') || {}).textContent || '';
    t('19 · your plan sits at the top of the screen, above the trends',
      !!top && top.compareDocumentPosition(d.getElementById('dash')) === w.Node.DOCUMENT_POSITION_FOLLOWING);
    t('19 · app settings sit at the bottom, below the sessions',
      d.getElementById('grid').compareDocumentPosition(more) === w.Node.DOCUMENT_POSITION_FOLLOWING);
    t('19 · the plan group has its seven rows', ['aim','goal','body','steps','habits','deload','kit'].every(k => top.contains(row(k))));
    t('19 · the settings groups have theirs', ['records','coach','data','theme','tempo','nudge','account','how'].every(k => more.contains(row(k))));
    t('19 · aim row shows the aim and days', /Lose fat/.test(val('aim')) && /3 lifting, 2 cardio/.test(val('aim')), val('aim'));
    t('19 · goal row shows the target and date', /^85 kg by /.test(val('goal')), val('goal'));
    t('19 · calories row shows what to eat and maintenance',
      val('body') === 'Eat ' + S.targets.kcal.toLocaleString('en-GB') + ' kcal · maintenance ' + S.targets.maintenance.toLocaleString('en-GB'), val('body'));
    t('19 · steps row shows their target', val('steps') === '10,000 a day', val('steps'));
    t('19 · habits row shows both habits', /Ten minutes after dinner/.test(val('habits')) && /Stop: No sugary drinks/.test(val('habits')), val('habits'));
    t('19 · easy weeks row shows the cadence', /Every 6 weeks/.test(val('deload')) || /easy week/.test(val('deload')), val('deload'));
    t('19 · kit row names the kit', val('kit') === 'Bodyweight, Dumbbells', val('kit'));
    t('19 · theme row says Light', val('theme') === 'Light', val('theme'));
    t('19 · reminders row says Off and explains the limit', val('nudge') === 'Off' && !!d.getElementById('nudgeNote'));
    t('19 · account row says where data lives', val('account') === 'On this device only', val('account'));
    t('19 · no cycle row unless it applies', !row('cycle'));

    /* every row opens the right thing */
    const opens = {
      aim: () => d.getElementById('aimSheet').classList.contains('on'),
      goal: () => /What are you actually after/.test(d.getElementById('altTitle').textContent),
      body: () => d.getElementById('detailsSheet').classList.contains('on'),
      steps: () => d.getElementById('detailsSheet').classList.contains('on') && !!d.querySelector('[data-range="stepTarget"]'),
      habits: () => d.getElementById('altTitle').textContent === 'Habits',
      deload: () => d.getElementById('altTitle').textContent === 'Easy weeks',
      kit: () => d.getElementById('altTitle').textContent === 'What you train with',
      records: () => d.getElementById('youSheet').classList.contains('on'),
      coach: () => d.getElementById('coachSheet').classList.contains('on'),
      data: () => d.getElementById('cloudSheet').classList.contains('on') && /Download everything/.test(d.getElementById('cloudBody').textContent),
      theme: () => d.getElementById('altTitle').textContent === 'Theme',
      account: () => d.getElementById('youSheet').classList.contains('on') && !!d.getElementById('cloudPanel'),
      how: () => d.getElementById('howSheet').classList.contains('on')
    };
    Object.keys(opens).forEach(k => {
      G.closeSheets(); G.go('progress'); G.renderAll();
      row(k).click();
      t('19 · the ' + k + ' row opens its editor', opens[k]());
    });
    G.closeSheets(); G.go('progress'); G.renderAll();
    const before = G.showTempoSafe();
    row('tempo').click();
    t('19 · the tempo row switches it in one tap', G.showTempoSafe() === !before && val('tempo') === (before ? 'Off' : 'On'));
    row('tempo').click();

    /* rows keep up with changes */
    G.openDetails();
    const sl = d.querySelector('[data-range="stepTarget"]'); sl.value = '6000'; sl.dispatchEvent(new w.Event('input', { bubbles: true }));
    d.getElementById('saveDetails').click(); G.closeSheets(); G.go('progress'); G.renderAll();
    t('19 · change the steps and the row shows it', val('steps') === '6,000 a day', val('steps'));
    t('19 · and the calories row moved with it', val('body').indexOf(S.targets.kcal.toLocaleString('en-GB')) > -1);

    /* a woman gets the cycle row */
    S.profile.sex = 'f'; G.renderAll();
    t('19 · the cycle row appears when it applies', !!row('cycle'));
    row('cycle').click();
    t('19 · and opens the cycle sheet', d.getElementById('cycleSheet').classList.contains('on'));
    G.closeSheets();

    const sheetText = (G.openYou(), d.getElementById('youSheet').textContent); G.closeSheets();
    t('19 · the old "Coaching detail" panel is gone', !/Coaching detail/.test(sheetText));
    t('19 · every id on the page is used once', (() => { const ids = [...d.querySelectorAll('[id]')].map(x => x.id);
      return ids.length === new Set(ids).size; })(), (() => { const ids = [...d.querySelectorAll('[id]')].map(x => x.id);
      return ids.filter((x, i) => ids.indexOf(x) !== i).join(', '); })());
    t('19 · rows are comfortable to tap', /\.ysrow\{[^}]*min-height:56px/.test(require('fs').readFileSync(require('path').join(__dirname, 'index.html'), 'utf8')));
  }

  /* ---------------------------------------------------------- 20 */
  journey(20, 'Changing the theme shows one message, once, however you move around');
  {
    const { w, d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    const seen = [];
    const toastEl = d.getElementById('toast');
    /* count each time a message appears, not every change to the element while
       it is showing: a new message, or the toast coming back on */
    let wasOn = false, lastMsg = '';
    new w.MutationObserver(() => {
      const on = toastEl.classList.contains('on'), msg = toastEl.querySelector('.msg').textContent;
      if (on && (!wasOn || msg !== lastMsg)) seen.push(msg);
      wasOn = on; lastMsg = msg;
    }).observe(toastEl, { attributes: true, childList: true, subtree: true, characterData: true });
    /* the browser reports page changes just after each action, so wait for
       those reports before counting */
    const settle = () => new Promise(r => setTimeout(r, 0));
    const act = async fn => { fn(); await settle(); };
    const themeRow = () => d.querySelector('[data-setting="theme"]');
    G.go('progress'); G.renderAll();
    await act(() => themeRow().click());
    await act(() => d.querySelector('[data-themepick="dark"]').click());
    await act(() => G.closeSheets());
    await act(() => themeRow().click());
    await act(() => d.querySelector('[data-themepick="light"]').click());
    await act(() => G.closeSheets());
    const themeMsgs = () => seen.filter(m => /Theme/.test(m)).length;
    const after = themeMsgs();
    t('20 · each change says so once', after === 2, seen.join(' | '));
    await new Promise(r => setTimeout(r, 4500));
    t('20 · and the message goes away', !toastEl.classList.contains('on'));
    /* exactly what you did: move from and to areas of the app */
    for (let lap = 0; lap < 3; lap++) {
      for (const tab of ['today', 'plan', 'progress', 'feed', 'progress', 'today'])
        await act(() => d.querySelector('.tab[data-go="' + tab + '"]').click());
      await act(() => d.getElementById('logBtn').click()); await act(() => G.closeSheets());
      await act(() => G.openFood(false)); await act(() => G.closeSheets());
      await act(() => G.openDay()); await act(() => G.closeSheets());
      await act(() => { G.go('progress'); G.renderAll(); });
      for (const k of ['habits', 'goal', 'deload', 'records']) {
        await act(() => d.querySelector('[data-setting="' + k + '"]').click()); await act(() => G.closeSheets()); }
    }
    t('20 · moving around never brings the theme message back', themeMsgs() === after, seen.filter(m => /Theme/.test(m)).join(' | '));
    t('20 · and the theme is still light', !d.documentElement.hasAttribute('data-theme') && G.S.profile.theme === 'light');
    await act(() => themeRow().click());
    await act(() => d.querySelector('[data-themepick="light"]').click());
    t('20 · picking the theme you already have says nothing', themeMsgs() === after);
    G.closeSheets();
  }

  /* ---------------------------------------------------------- 21 */
  journey(21, 'Past sessions open, and show exactly what was done');
  {
    const { w, d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S;
    G.startWorkout('t_push');
    const ex0 = G.GYM.ex[0];
    ex0.sets.unshift({ kg: 40, reps: 8, warm: true, done: true });
    ex0.sets.forEach((st, i) => { if (!st.warm) { st.kg = 60 + (i === 2 ? 2.5 : 0); st.reps = 8; } st.done = true; });
    G.GYM.ex.slice(1).forEach(e => e.sets.forEach(st => { st.kg = st.kg === '' ? 12 : st.kg; st.reps = st.reps === '' ? 10 : st.reps; st.done = true; }));
    G.finishWorkout(); d.getElementById('gym').classList.remove('on'); G.closeSheets();
    G.go('progress'); G.renderAll();
    const tile = d.querySelector('#grid .gcell');
    t('21 · each session tile is a button', tile && tile.tagName === 'BUTTON' && !!tile.dataset.sess);
    t('21 · with a label a screen reader can read', /Push, /.test(tile.getAttribute('aria-label')), tile.getAttribute('aria-label'));
    t('21 · the post points at its full workout record', S.mine[0].session.workoutId === S.workouts[0].id);
    tile.click();
    const sheet = d.getElementById('sessSheet'), body = d.getElementById('sessBody');
    t('21 · tapping it opens the session', sheet.classList.contains('on') && d.getElementById('sessTitle').textContent === 'Push');
    t('21 · labelled as a workout with its date', /^Workout · /.test(d.getElementById('sessSub').textContent), d.getElementById('sessSub').textContent);
    const w0 = S.workouts[0];
    t('21 · it shows minutes, sets and kilos lifted',
      body.textContent.indexOf(w0.minutes + ' min') > -1 && body.textContent.indexOf(w0.sets + ' sets') > -1
      && body.textContent.indexOf(w0.volume.toLocaleString('en-GB') + ' kg lifted') > -1, body.textContent.slice(0, 80));
    t('21 · every movement is listed', w0.ex.filter(e => e.sets.length).every(e => body.textContent.indexOf(G.exOf(e.exId).n) > -1));
    t('21 · every set, with its weight and reps', /60kg × 8/.test(body.textContent) && /62\.5kg × 8/.test(body.textContent), body.textContent.slice(0, 200));
    t('21 · warm ups are marked as warm ups', /warm up 40kg × 8/.test(body.textContent));
    t('21 · the heaviest working set stands out', /62\.5kg × 8/.test((body.querySelector('.sxs span.best') || {}).textContent || ''));
    t('21 · each movement can be shown', body.querySelectorAll('[data-showmove]').length === w0.ex.filter(e => e.sets.length).length);
    d.querySelector('[data-redo]').click();
    t('21 · "Do this again" starts the same session', !!G.GYM && G.GYM.templateId === 't_push' && !G.GYM.done);
    G.GYM.done = true; d.getElementById('gym').classList.remove('on');

    /* an older post with no link, matched by day and name */
    delete S.mine[0].session.workoutId;
    t('21 · older sessions without the link are still found', G.workoutFor(S.mine[0]) === w0);
    /* an older workout with no record at all */
    /* shaped exactly like a real post, minus the link to its workout */
    const fakePost = (id, d, kind, title) => ({ id, d, by: 'me', mine: true, kind, title, unit: 'logged', when: '30d',
      chips: ['just logged', '0 parts', 'your own'], cap: 'Done and logged.', origin: null, baseTries: 0, session: { type: kind } });
    S.mine.unshift(fakePost('old1', G.addDays(G.todayKey(), -30), 'workout', 'Legs'));
    G.openSession('old1');
    t('21 · a workout from before records were kept says so plainly', /was not kept/.test(body.textContent));
    /* a run */
    G.logSession({ title: 'Easy run', type: 'run', adds: 5, steps: [{ n: 'Warm up', r: '5 min' }, { n: 'Run', r: '25 min' }] });
    G.renderAll(); G.openSession(S.mine[0].id);
    t('21 · other sessions open too, with what was in them', d.getElementById('sessSub').textContent.startsWith('Run') && /Warm up/.test(body.textContent) && /25 min/.test(body.textContent));
    /* an easy week session */
    S.workouts[0] = Object.assign({}, w0, { deload: 'moderate' });
    const pw = S.mine.find(m => m.session && m.session.type === 'workout' && m.title === 'Push');
    pw.session.workoutId = w0.id;
    G.openSession(pw.id);
    t('21 · an easy week session says it was one', /An easy week session/.test(body.textContent));
    G.closeSheets();

    /* more than a grid's worth */
    for (let i = 0; i < 15; i++) S.mine.push(fakePost('x' + i, G.addDays(G.todayKey(), -40 - i), 'meal', 'Meal ' + i));
    G.go('progress'); G.renderAll();
    t('21 · the grid shows the latest twelve', d.querySelectorAll('#grid .gcell').length === 12);
    d.getElementById('allSess').click();
    t('21 · "See all" lists every one', d.querySelectorAll('#sessBody [data-sess]').length === S.mine.length, d.querySelectorAll('#sessBody [data-sess]').length + ' of ' + S.mine.length);
    t('21 · grouped by month', d.querySelectorAll('#sessBody .slab').length >= 2);
    d.querySelector('#sessBody [data-sess="x3"]').click();
    t('21 · and each one opens from there', d.getElementById('sessTitle').textContent === 'Meal 3');
    G.closeSheets();
  }

  /* ---------------------------------------------------------- 22 */
  journey(22, 'Habits to start and habits to stop');
  {
    const { w, d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S;
    const starts = G.HABITS.filter(h => h.kind === 'start'), stops = G.HABITS.filter(h => h.kind === 'stop');
    t('22 · there are habits to start', starts.length === 12, String(starts.length));
    t('22 · and habits to stop', stops.length === 8, String(stops.length));
    t('22 · nothing that restricts eating or encourages skipping meals',
      !stops.some(h => /snack|carb|skip|fast|eat less|after [0-9]+ ?pm.*eat|no food/i.test(h.t + ' ' + h.s)));
    t('22 · quitting smoking points to real support', /quit\.ie/.test(G.habitOf('no_smoking').s) && /GP or pharmacist/.test(G.habitOf('no_smoking').s));

    G.openHabitSheet();
    const alt = d.getElementById('altBody');
    t('22 · the picker has both sections', /Start something/.test(alt.textContent) && /Stop something/.test(alt.textContent));
    t('22 · with every habit in it', alt.querySelectorAll('[data-habitchoose]').length === G.HABITS.length);
    t('22 · weeknight ones say which days count', /Mon, Tue, Wed, Thu/.test(alt.textContent));
    t('22 · and it says how long habits take, with the source', /66 days/.test(alt.textContent) && /Lally/.test(alt.textContent));
    alt.querySelector('[data-habitchoose="walk_after"]').click();
    G.openHabitSheet(); d.querySelector('[data-habitchoose="no_sugary_drinks"]').click();
    t('22 · one to start and one to stop at the same time', G.currentHabit('start').id === 'walk_after' && G.currentHabit('stop').id === 'no_sugary_drinks');
    G.go('today'); G.renderAll();
    const tv = d.getElementById('todayView');
    t('22 · both show on Today', tv.querySelectorAll('.todo.habit').length === 2);
    t('22 · the stop one is marked as a stop', /Stop: No sugary drinks/.test(tv.textContent) && !!tv.querySelector('.todo.habit.stop'));
    G.openHabitSheet(); d.querySelector('[data-habitchoose="stairs"]').click();
    t('22 · choosing another to start replaces it and leaves the stop alone', G.currentHabit('start').id === 'stairs' && G.currentHabit('stop').id === 'no_sugary_drinks');

    tv.querySelector('[data-habittoggle="stop"]').click();
    t('22 · ticking the stop habit says "went without"', /went without|days without/.test(d.getElementById('toast').textContent), d.getElementById('toast').textContent);
    S.habits.stop.started = G.addDays(G.todayKey(), -10);
    [1, 2].forEach(i => G.toggleHabitDay(G.addDays(G.todayKey(), -i), 'stop'));
    G.renderAll();
    t('22 · and counts days without', G.habitStreak('stop') === 3 && /3 days without/.test(d.getElementById('todayView').textContent));

    /* weeknights only */
    const meta = G.habitOf('no_alcohol_wk');
    t('22 · Thursday counts for a weeknight habit', G.habitApplies(meta, '2026-09-24'));
    t('22 · Friday does not', !G.habitApplies(meta, '2026-09-25'));
    t('22 · Sunday does not', !G.habitApplies(meta, '2026-09-27'));
    t('22 · Monday does', G.habitApplies(meta, '2026-09-28'));
    G.startHabit('no_alcohol_wk');
    const h = S.habits.stop; h.started = G.addDays(G.todayKey(), -20);
    const weekdayOf = k => { const p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]).getDay(); };
    let expected = 0;
    for (let i = 20; i >= 0; i--) { const k = G.addDays(G.todayKey(), -i); if ([1, 2, 3, 4].includes(weekdayOf(k))) { h.days[k] = true; expected++; } }
    G.save();
    t('22 · weekends never break the streak', G.habitStreak('stop') === expected, G.habitStreak('stop') + ' vs ' + expected);
    t('22 · and only the days that count are in the rate', Math.abs(G.habitRate('stop') - 1) < 1e-9, String(G.habitRate('stop')));
    const fri = [...Array(7)].map((_, i) => G.addDays(G.todayKey(), -i)).find(k => weekdayOf(k) === 5);
    G.toggleHabitDay(fri, 'stop');
    t('22 · a day that does not count cannot be ticked', !h.days[fri]);
    G.go('today'); G.renderAll();
    const todayOff = ![1, 2, 3, 4].includes(weekdayOf(G.todayKey()));
    const btn = d.querySelector('[data-habittoggle="stop"]');
    t('22 · today\'s tick is ' + (todayOff ? 'disabled, it is not a weeknight' : 'available, it is a weeknight'),
      todayOff ? (btn.disabled && /Not one of its days/.test(btn.getAttribute('aria-label'))) : !btn.disabled);
    t('22 · days that do not count look different in the dots', d.querySelectorAll('.habit.stop .habitdots i.off').length === [...Array(7)].map((_, i) => G.addDays(G.todayKey(), -i)).filter(k => ![1, 2, 3, 4].includes(weekdayOf(k))).length);

    const brief = G.coachBrief();
    t('22 · the brief carries both habits', /Habit: Stairs, not the lift/.test(brief) && /Habit to stop: No alcohol on weeknights/.test(brief));
    G.openHabitSheet();
    d.querySelector('[data-habitretire="stop"]').click();
    t('22 · putting down the stop habit keeps the start one', !G.currentHabit('stop') && G.currentHabit('start').id === 'stairs');
    d.getElementById('toastAct').click();
    t('22 · and it can be undone', G.currentHabit('stop') && G.currentHabit('stop').id === 'no_alcohol_wk');

    /* someone upgrading from the version with a single habit */
    const raw = JSON.parse(w.localStorage.getItem('gauntlet.v4'));
    delete raw.habits;
    raw.habit = { id: 'walk_after', started: '2026-09-01', days: { '2026-09-02': true }, retired: false };
    const old = JSON.stringify(raw);
    const up = await boot({ before: w2 => w2.localStorage.setItem('gauntlet.v4', old) }); allErrs.push(...up.errs);
    t('22 · an existing habit carries over as the habit to start',
      up.G.currentHabit('start') && up.G.currentHabit('start').id === 'walk_after' && up.G.S.habits.start.days['2026-09-02'] === true);
    t('22 · and nothing is left in the old place', up.G.S.habit === null);
  }

  /* ---------------------------------------------------------- 23 */
  journey(23, 'Returning users open the app with their history, with no errors');
  {
    /* Every other journey starts from a fresh install. Real people open the app
       with weeks of history already saved, and code that runs at startup sees
       that history before every script has loaded. Two startup bugs hid here.
       Each variant builds a saved state through the app itself, then opens a
       brand new copy of the app with it, the way a phone does every morning. */
    const variants = {
      'heavy user in an easy week': G => {
        const S = G.S;
        for (let i = 30; i >= 0; i--) { const k = G.addDays(G.todayKey(), -i);
          S.days[k] = { kcal: 2300, protein: 150, sleep: 7, wb: 7, stress: 4, steps: 8000, note: 'fine' };
          S.weights.push({ d: k, kg: +(95 - (30 - i) * 0.05).toFixed(2) }); }
        G.startHabit('walk_after'); G.startHabit('no_alcohol_wk');
        G.setTarget('weight', 85, G.addDays(G.todayKey(), 90)); S.target.from = 95;
        S.profile.firstWeek = G.addDays(G.mondayKey(), -35);
        G.addCustomFood({ id: 'cf1', n: 'Brown bread', u: 'slice', mine: true, kcal: 90, p: 3, c: 15, f: 1 });
        G.addFood('cf1', 2, 'b'); G.saveMealAs('Usual breakfast', 'b');
        G.startWorkout('t_push'); G.GYM.ex.forEach(e => e.sets.forEach(st => { st.kg = st.kg === '' ? 20 : st.kg; st.reps = st.reps === '' ? 8 : st.reps; st.done = true; }));
        G.finishWorkout();
        S.checkins.unshift({ at: Date.now() - 864e5, weekOf: G.mondayKey(), recovery: 6, motivation: 7, pain: ['Bench Press'] });
        S.profile.theme = 'dark';
      },
      'onboarded last week, next easy week ahead': G => {
        G.S.profile.firstWeek = G.addDays(G.mondayKey(), -7);
        G.S.weights.push({ d: G.todayKey(), kg: 92 });
      },
      'woman tracking her cycle, building, goal met': G => {
        const S = G.S;
        S.profile.sex = 'f'; S.profile.aim = 'build';
        S.cycle = Object.assign({}, S.cycle, { tracking: true, lastPeriod: G.addDays(G.todayKey(), -9) });
        S.weights = [{ d: G.addDays(G.todayKey(), -20), kg: 60 }, { d: G.todayKey(), kg: 62.4 }];
        G.setTarget('weight', 62, G.addDays(G.todayKey(), 30)); S.target.from = 60;
        G.startHabit('protein_am'); G.toggleHabitDay(G.todayKey());
        G.connectHealth('apple'); G.setCoach({ endpoint: 'https://proxy.example/coach', model: '', on: true });
      },
      'rather not say, bodyweight only, easy weeks off': G => {
        const S = G.S;
        S.profile.sex = 'x'; S.profile.kit = ['bodyweight']; S.profile.deload = false; S.profile.theme = 'auto';
        G.fitTemplatesToKit(); G.startHabit('no_smoking');
        G.logSession({ title: 'Easy run', type: 'run', adds: 5, steps: [{ n: 'Run', r: '30 min' }] });
      },
      'saved by the previous version': null
    };
    for (const [name, build] of Object.entries(variants)) {
      const a = await boot(); allErrs.push(...a.errs);
      onboard(a.G, { weight: 95 });
      let saved;
      if (build) { build(a.G); a.G.buildPlan(); a.G.save(); saved = a.w.localStorage.getItem('gauntlet.v4'); }
      else {
        /* the shape the last version wrote: one habit, no step target, no body fat, no theme */
        a.G.startHabit('walk_after'); a.G.save();
        const raw = JSON.parse(a.w.localStorage.getItem('gauntlet.v4'));
        raw.habit = raw.habits.start; delete raw.habits;
        delete raw.profile.stepTarget; delete raw.profile.bodyFat; delete raw.profile.theme; delete raw.deloadWeeks;
        saved = JSON.stringify(raw);
      }
      const b = await boot({ before: w2 => w2.localStorage.setItem('gauntlet.v4', saved) });
      t('23 · ' + name + ': opens with no errors', b.errs.length === 0, [...new Set(b.errs)].join(' | '));
      for (const scr of ['today', 'plan', 'progress', 'feed']) {
        let ok = false; try { b.G.go(scr); b.G.renderAll(); ok = b.d.getElementById('s-' + scr).innerHTML.length > 200; } catch (e) {}
        t('23 · ' + name + ': ' + scr + ' draws', ok);
      }
      t('23 · ' + name + ': still onboarded, not sent back to the start', !b.d.getElementById('onb').classList.contains('on'));
      t('23 · ' + name + ': settings list is there', !!b.d.querySelector('[data-setting="goal"]'));
      t('23 · ' + name + ': the calorie target is a real number', b.G.S.targets.kcal > 1000 && Number.isFinite(b.G.S.targets.kcal), String(b.G.S.targets.kcal));
      t('23 · ' + name + ': nothing reads undefined, null or NaN on any screen',
        !['today', 'plan', 'progress'].some(scr => /\bundefined\b|\bNaN\b|>null</.test(b.d.getElementById('s-' + scr).textContent)),
        ['today', 'plan', 'progress'].map(scr => (b.d.getElementById('s-' + scr).textContent.match(/.{0,40}(undefined|NaN).{0,20}/) || [''])[0]).join(' | '));
      /* use it for a bit, the way someone would, and make sure nothing breaks */
      try { b.G.openLog(); b.G.closeSheets(); b.G.openHabitSheet(); b.G.closeSheets(); b.G.openDeloadSheet(); b.G.closeSheets(); b.G.openYou(); b.G.closeSheets(); } catch (e) { b.errs.push(e.message); }
      t('23 · ' + name + ': still no errors after using it', b.errs.length === 0, [...new Set(b.errs)].join(' | '));
      allErrs.push(...b.errs);
    }
  }

  /* ---------------------------------------------------------- 24 */
  journey(24, 'Your own habits, a theme sheet that closes, and a footer that tells the truth');
  {
    const { w, d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S;
    const txt = el => el.textContent.replace(/\s+/g, ' ').trim();

    /* ---- theme ---- */
    G.go('progress'); G.renderAll();
    d.querySelector('[data-setting="theme"]').click();
    t('24 · the theme sheet opens with Light ticked', d.querySelector('#themeOpts .opt.on').dataset.themepick === 'light');
    d.querySelector('[data-themepick="dark"]').click();
    t('24 · choosing a theme closes the sheet', !d.getElementById('altSheet').classList.contains('on'));
    t('24 · the app is dark', d.documentElement.getAttribute('data-theme') === 'dark');
    d.querySelector('[data-setting="theme"]').click();
    t('24 · reopening shows the new choice ticked', d.querySelector('#themeOpts .opt.on').dataset.themepick === 'dark');
    t('24 · and the row says Dark', /Dark/.test(txt(d.querySelector('[data-setting="theme"]'))));
    d.querySelector('[data-themepick="light"]').click();

    /* ---- footer ---- */
    const foot = () => txt(d.querySelector('#s-progress .colophon .sub'));
    t('24 · the footer shows build 21', /build 21\./.test(foot()), foot());
    t('24 · signed out, it says the week stays on this device', /on this device and nowhere else/.test(foot()));
    t('24 · every screen has exactly one footer', ['today', 'plan', 'progress', 'feed'].every(s => d.querySelectorAll('#s-' + s + ' .colophon').length === 1));
    const signed = await boot({ before: w2 => w2.localStorage.setItem('gauntlet.cloud', JSON.stringify({
      url: 'https://fake.supabase.co', key: 'anon', auto: false, session: { access_token: 'tok', user_id: 'u1', email: 'x@y.z' } })) });
    allErrs.push(...signed.errs); onboard(signed.G); signed.G.renderAll();
    const sfoot = txt(signed.d.querySelector('#s-today .colophon .sub'));
    t('24 · signed in, it no longer claims the week is only on this device', !/nowhere else/.test(sfoot) && /copy in your account/.test(sfoot), sfoot);
    t('24 · the export carries the new build number', G.exportPayload().version === '21');

    /* ---- your own habits ---- */
    G.openHabitSheet();
    t('24 · each section has a place to write your own', !!d.getElementById('own_start') && !!d.getElementById('own_stop')
      && d.querySelector('[data-habitown="start"]') && d.querySelector('[data-habitown="stop"]'));
    const type = (id, v) => { const el = d.getElementById(id); el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); };
    type('own_stop', '   '); d.querySelector('[data-habitown="stop"]').click();
    t('24 · an empty habit is refused with a reason', /Write the habit first/.test(txt(d.getElementById('ownmsg_stop'))) && !G.currentHabit('stop'));
    t('24 · and the box enforces the length', +d.getElementById('own_stop').getAttribute('maxlength') === 60);
    t('24 · too long is refused even if the limit is bypassed', !!G.addOwnHabit('stop', 'x'.repeat(61)).error);
    type('own_stop', '  No   energy <b>drinks</b>  ');
    d.querySelector('[data-habitown="stop"]').click();
    const own = G.currentHabit('stop');
    t('24 · writing one starts it as the habit to stop', !!own && G.habitOf(own.id).tag === 'own');
    t('24 · spaces are tidied', G.habitOf(own.id).t === 'No energy <b>drinks</b>', G.habitOf(own.id).t);
    t('24 · the sheet closes and says so', !d.getElementById('altSheet').classList.contains('on') && /No energy <b>drinks<\/b>\. One day at a time/.test(txt(d.getElementById('toast'))));
    G.go('today'); G.renderAll();
    const today = d.getElementById('todayView').innerHTML;
    t('24 · Today shows it exactly as written, as text', /Stop: No energy &lt;b&gt;drinks&lt;\/b&gt;/.test(today) && !/<b>drinks<\/b>/.test(today));
    G.go('progress'); G.renderAll();
    const row = d.querySelector('[data-setting="habits"]').innerHTML;
    t('24 · the settings row shows it safely too', /No energy &lt;b&gt;drinks&lt;\/b&gt;/.test(row) && !/<b>drinks<\/b>/.test(row));
    t('24 · and it reaches the brief', /Habit to stop: No energy <b>drinks<\/b>/.test(G.coachBrief()));
    G.toggleHabitDay(G.todayKey(), 'stop');
    t('24 · it ticks and counts like any other', G.habitStreak('stop') === 1);

    G.openHabitSheet();
    t('24 · it is listed under Your own for next time', [...d.querySelectorAll('[data-habitchoose]')].some(b => b.dataset.habitchoose === own.id));
    t('24 · and escaped there as well', !/<div class="t"><b>drinks/.test(d.getElementById('altBody').innerHTML));
    type('own_start', 'Walk the dog before work');
    d.querySelector('[data-habitown="start"]').click();
    t('24 · one of your own to start sits alongside the one to stop', G.habitOf(G.currentHabit('start').id).t === 'Walk the dog before work' && G.currentHabit('stop').id === own.id);
    t('24 · writing the same one twice reuses it', G.addOwnHabit('start', 'walk the dog before work').habit.id === G.currentHabit('start').id
      && G.ownHabits().filter(h => h.kind === 'start').length === 1);
    for (let i = 0; i < 25; i++) G.addOwnHabit('start', 'Habit number ' + i);
    t('24 · only the twenty most recent are kept', G.ownHabits().length === 20);
    t('24 · the habits being tracked are never the ones dropped',
      !!G.currentHabit('stop') && G.currentHabit('stop').id === own.id
      && !!G.currentHabit('start') && G.habitOf(G.currentHabit('start').id).t === 'Walk the dog before work');
    t('24 · and the oldest unused ones go first', !G.ownHabits().some(h => h.t === 'Habit number 0')
      && G.ownHabits().some(h => h.t === 'Habit number 24'));

    /* survives a reload */
    G.save();
    const again = await boot({ before: w2 => { for (const k of Object.keys(w.localStorage)) w2.localStorage.setItem(k, w.localStorage.getItem(k)); } });
    allErrs.push(...again.errs);
    t('24 · after reopening the app, your own habits are still there', again.G.ownHabits().length === 20 && !!again.G.currentHabit('start'));
    G.closeSheets();
  }

  const r = s.report(allErrs);
  if (require.main === module) process.exit(r.fail ? 1 : 0);
})();
