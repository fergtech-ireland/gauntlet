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

const habitKindOf = (G, id) => (G.habitOf(id)||{}).kind;

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
    t('6 · picking another adds it, now that three are allowed',
      G.activeHabits().some(h => h.id === 'phone_out') && G.activeHabits().some(h => h.id === 'walk_after'));
    t('6 · every habit being kept reaches the coach brief', (() => {
      const live = G.activeHabits().map(h => G.habitOf(h.id).t);
      const brief = G.coachBrief();
      return live.length >= 1 && live.every(name => brief.indexOf(name) >= 0); })(),
      G.activeHabits().map(h => G.habitOf(h.id).t).join(', '));
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
    t('19 · your plan is one tap away, under its own tab',
      !!d.getElementById('ytab-plan') && d.getElementById('ypanel-plan').contains(top));
    t('19 · progress is what you land on', d.getElementById('ytab-progress').getAttribute('aria-selected') === 'true'
      && !d.getElementById('ypanel-progress').hidden && d.getElementById('ypanel-plan').hidden);
    t('19 · the plan group has its seven rows', ['aim','goal','body','steps','habits','deload','kit'].every(k => top.contains(row(k))));
    t('19 · records sit with the sessions', ['records','coach'].every(k => more.contains(row(k))));
    t('19 · and app settings live behind the gear', (() => { G.openAppSettings();
      const app = d.getElementById('appSettings');
      return ['theme','tempo','nudge','account','data','how'].every(k => !!app.querySelector('[data-setting="' + k + '"]')); })());
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
    const grid = [...body.querySelectorAll('.sgrid > div')].map(x => x.querySelector('b').textContent.trim() + ' ' + x.querySelector('span').textContent.trim());
    t('21 · it shows minutes, sets and kilos lifted',
      grid[0] === w0.minutes + (w0.minutes === 1 ? ' minute' : ' minutes') && grid[1].indexOf(w0.sets + ' working sets') === 0
      && grid[3] === w0.volume.toLocaleString('en-GB') + ' kg lifted', JSON.stringify(grid));
    t('21 · every movement is listed', w0.ex.filter(e => e.sets.length).every(e => body.textContent.indexOf(G.exOf(e.exId).n) > -1));
    t('21 · every set, with its weight and reps', /60kg × 8/.test(body.textContent) && /62\.5kg × 8/.test(body.textContent), body.textContent.slice(0, 200));
    t('21 · warm ups are marked as warm ups', [...body.querySelectorAll('.srow.warm')].some(r => /^W\s*40kg × 8/.test(r.textContent.trim())));
    t('21 · the heaviest working set stands out', /62\.5kg × 8/.test((body.querySelector('.srow.best') || {}).textContent || '')
      && !!body.querySelector('.srow.best .stag'));
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
    t('22 · choosing another to start adds it and leaves the stop alone',
      G.activeHabits().some(h => h.id === 'stairs') && G.currentHabit('stop').id === 'no_sugary_drinks');

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
    t('22 · putting down the stop habit keeps the ones to start',
      !G.currentHabit('stop') && G.activeHabits().some(h => habitKindOf(G, h.id) === 'start'));
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
    t('24 · the footer shows the build number', foot().indexOf('build ' + G.APP_VERSION + '.') > -1, foot());
    t('24 · signed out, it says the week stays on this device', /on this device and nowhere else/.test(foot()));
    t('24 · every screen has exactly one footer', ['today', 'plan', 'progress', 'feed'].every(s => d.querySelectorAll('#s-' + s + ' .colophon').length === 1));
    const signed = await boot({ before: w2 => w2.localStorage.setItem('gauntlet.cloud', JSON.stringify({
      url: 'https://fake.supabase.co', key: 'anon', auto: false, session: { access_token: 'tok', user_id: 'u1', email: 'x@y.z' } })) });
    allErrs.push(...signed.errs); onboard(signed.G); signed.G.renderAll();
    const sfoot = txt(signed.d.querySelector('#s-today .colophon .sub'));
    t('24 · signed in, it no longer claims the week is only on this device', !/nowhere else/.test(sfoot) && /copy in your account/.test(sfoot), sfoot);
    t('24 · the export carries the build number', G.exportPayload().version === G.APP_VERSION);
    t('24 · the footer, the export and the app agree on the build number',
      G.exportPayload().version === G.APP_VERSION
      && new RegExp('build ' + G.APP_VERSION + '\\.').test(d.querySelector('#s-progress .colophon .sub').textContent));

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
    t('24 · Today shows it exactly as written, as text, and never as markup',
      /Stop: No energy &lt;b&gt;drinks&lt;\/b&gt;/.test(today)
      && ![...d.querySelectorAll('#todayView b')].some(el => el.textContent === 'drinks'));
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

  /* ---------------------------------------------------------- 25 */
  journey(25, 'Exact weigh ins, one place for each day, full session detail, an editor you can use');
  {
    const { w, d, G, errs, source } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S;
    const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const fire = (el, type) => el.dispatchEvent(new w.Event(type, { bubbles: true }));
    const type = (el, v) => { el.value = v; fire(el, 'input'); };

    /* ================= weigh in ================= */
    S.weights = [{ d: G.addDays(G.todayKey(), -3), kg: 91.4 }]; G.save();
    G.openWeigh();
    const body = d.getElementById('weighBody'), inp = () => d.getElementById('weighInput');
    const minus = () => d.querySelector('[data-wstep="weigh:-1"]'), plus = () => d.querySelector('[data-wstep="weigh:1"]');
    const save = () => d.getElementById('saveWeight');
    t('25 · the weigh in has no slider', !body.querySelector('input[type="range"]'));
    t('25 · it has a number to type, a minus, a plus and four quick jumps', !!inp() && !!minus() && !!plus() && body.querySelectorAll('[data-wjump]').length === 4);
    t('25 · the minus and plus are big enough for a thumb', /\.wbtn\{width:60px;height:60px/.test(source) && /\.wjumps button\{flex:1;min-height:44px/.test(source));
    t('25 · the number box brings up a number keypad', inp().getAttribute('inputmode') === 'decimal');
    t('25 · it opens at the last weigh in', inp().value === '91.4');
    t('25 · and says when that was', /Last time 91\.4 kg, 3 days ago/.test(txt(d.getElementById('weighHint'))), txt(d.getElementById('weighHint')));
    minus().click(); minus().click();
    t('25 · each tap of minus is 0.1 kg', inp().value === '91.2', inp().value);
    t('25 · and the change since last time is shown', /Down 0\.2 kg/.test(txt(d.getElementById('weighHint'))));
    plus().click();
    t('25 · plus goes the other way', inp().value === '91.3');
    /* a real tap: finger down, finger up, then the browser's click */
    fire(minus(), 'pointerdown'); fire(minus(), 'pointerup'); minus().click();
    t('25 · a finger tap steps once, not twice', inp().value === '91.2', inp().value);
    d.querySelector('[data-wjump="weigh:-1"]').click();
    t('25 · the quick jumps move a whole kilo', inp().value === '90.2');
    d.querySelector('[data-wjump="weigh:0.5"]').click();
    t('25 · or half a kilo', inp().value === '90.7');
    fire(plus(), 'pointerdown'); await sleep(900); fire(plus(), 'pointerup');
    const held = +inp().value;
    t('25 · holding plus keeps going', held >= 91.0, String(held));
    await sleep(300);
    t('25 · and letting go stops it', +inp().value === held);
    /* a long press that ends without a click, as a cancelled press does on a phone */
    fire(plus(), 'pointerdown'); fire(plus(), 'pointercancel');
    const afterCancel = +inp().value;
    plus().click();
    t('25 · a cancelled press never swallows the next tap', Math.round((+inp().value - afterCancel) * 10) === 1, afterCancel + ' -> ' + inp().value);
    minus().click();
    type(inp(), '88.8');
    t('25 · an exact weight can be typed', save().disabled === false);
    type(inp(), '88,8');
    t('25 · a comma works as the decimal point', save().disabled === false);
    type(inp(), '9');
    t('25 · a mistyped weight blocks saving', save().disabled === true && /between 30 and 350 kg/.test(txt(d.getElementById('weighMsg'))));
    type(inp(), 'abc');
    t('25 · so does something that is not a number', save().disabled === true);
    type(inp(), '90.25'); fire(inp(), 'focusout');
    t('25 · leaving the box shows exactly what will be saved', inp().value === '90.3', inp().value);
    save().click();
    t('25 · it saves that weight', S.weights[S.weights.length - 1].kg === 90.3 && S.weights[S.weights.length - 1].d === G.todayKey());
    G.openWeigh();
    t('25 · weighing in again the same day says it will replace it', /Saving replaces it/.test(txt(d.getElementById('weighBody'))));
    type(inp(), '90.1'); save().click();
    t('25 · and it does, with no duplicate', S.weights.filter(x => x.d === G.todayKey()).length === 1 && S.weights[S.weights.length - 1].kg === 90.1);
    G.openWeigh();
    for (let k = 0; k < 4000; k++) G.nudgeW('weigh', -0.1);
    t('25 · it cannot go below 30 kg', inp().value === '30.0', inp().value);
    G.closeSheets();
    /* pounds */
    S.profile.units = 'imperial'; G.save();
    G.openWeigh();
    t('25 · in pounds it opens in pounds, to one decimal', inp().value === (Math.round(90.1 * 2.20462 * 10) / 10).toFixed(1) && /lb/.test(txt(body)));
    plus().click();
    t('25 · a tap in pounds is 0.2 lb', inp().value === (Math.round(90.1 * 2.20462 * 10) / 10 + 0.2).toFixed(1));
    type(inp(), '200'); save().click();
    const lbKg = S.weights[S.weights.length - 1].kg;
    t('25 · 200 lb is stored in kilos, precisely', lbKg === 90.72, String(lbKg));
    t('25 · and shows back as exactly 200 lb', G.toShown(lbKg, true) === 200);
    t('25 · pounds are shown to a tenth, not rounded to the whole pound',
      G.showW(90.18, true) === '198.8 lb' && G.showW(90.1, true) === '198.6 lb' && G.showW(90.1, false) === '90.1 kg',
      G.showW(90.18, true) + ' / ' + G.showW(90.1, true));
    t('25 · and the confirmation says what was saved', /Logged at 200 lb/.test(txt(d.getElementById('toast'))), txt(d.getElementById('toast')));
    S.profile.units = 'metric'; G.save();
    /* the details editor uses the same control */
    G.openDetails();
    const db = d.getElementById('detailsBody');
    t('25 · the details editor has no weight slider either', !db.querySelector('[data-range="weight"]') && !!d.getElementById('detInput'));
    const before = txt(d.getElementById('stepsWorth'));
    d.querySelector('[data-wjump="det:-1"]').click();
    t('25 · changing weight there updates the calories at once', txt(d.getElementById('stepsWorth')) !== before);
    type(d.getElementById('detInput'), '400');
    t('25 · and a mistyped weight blocks saving there too', d.getElementById('saveDetails').disabled === true);
    type(d.getElementById('detInput'), '88');
    d.getElementById('saveDetails').click();
    t('25 · saving the details keeps the typed weight', S.profile.weight === 88);
    G.closeSheets();

    /* ================= this week ================= */
    G.go('plan');
    const pv = () => d.getElementById('planView');
    t('25 · the reasons and the days are one section, called This week',
      /<h2>This week<\/h2>/.test(pv().innerHTML) && !/Why this week looks like this/.test(pv().innerHTML));
    const cards = () => [...pv().querySelectorAll('.daycard')];
    t('25 · every day is a card', cards().length === 7);
    const ti = G.dowIdx();
    t('25 · today\'s card is open by itself, and only today\'s', cards()[ti].classList.contains('open') && cards().filter(c => c.classList.contains('open')).length === 1);
    t('25 · closed cards carry no buttons of their own', cards().filter(c => !c.classList.contains('open')).every(c => c.querySelectorAll('button').length === 1));
    t('25 · open and closed are announced', cards()[ti].querySelector('.dch').getAttribute('aria-expanded') === 'true');
    const push = S.plan.days.findIndex(x => x.templateId === 't_push');
    pv().querySelector('[data-planopen="' + push + '"]').click();
    const open = () => pv().querySelector('.daycard.open');
    t('25 · tapping another day opens it and closes today', cards()[push].classList.contains('open') && cards().filter(c => c.classList.contains('open')).length === 1);
    const tpl = S.templates.find(x => x.id === 't_push');
    t('25 · the open day shows the whole workout', tpl.ex.every(r => txt(open()).indexOf(G.exOf(r.exId).n) > -1)
      && open().querySelectorAll('[data-showmove]').length === tpl.ex.length);
    t('25 · with sets and reps for each movement', /4 × 5 to 8/.test(txt(open())));
    const acts = [...open().querySelectorAll('button')].map(b => txt(b));
    t('25 · and every action in one place', ['Edit workout', 'Change day', 'Cannot do it'].every(a => acts.includes(a)) && acts.some(a => /^Start/.test(a)), acts.join(' | '));
    pv().querySelector('[data-planopen="' + push + '"]').click();
    t('25 · tapping an open day closes it', !pv().querySelector('.daycard.open'));
    pv().querySelector('[data-planopen="' + push + '"]').click();
    /* editing carries forward */
    const past = JSON.parse(JSON.stringify(S.workouts));
    open().querySelector('[data-tpledit="t_push"]').click();
    t('25 · Edit workout opens that workout', d.getElementById('tplEdit').classList.contains('on') && d.getElementById('tplName').value === 'Push');
    t('25 · and says the change carries to every future day', /every Push day from now on/.test(txt(d.getElementById('tplEditBody'))) && /already done stay exactly as they were/.test(txt(d.getElementById('tplEditBody'))));
    type(d.querySelector('[data-tpl="0:sets"]'), '5');
    type(d.querySelector('[data-tpl="0:rest"]'), '200');
    d.getElementById('tplSave').click();
    t('25 · saving says so', /Push saved, for every Push day from now on/.test(txt(d.getElementById('toast'))), txt(d.getElementById('toast')));
    t('25 · the day card shows the change', /5 × 5 to 8/.test(txt(pv().querySelector('.daycard.open'))));
    G.startPlanDay(S.plan.days[push]);
    const benchRow = G.GYM.ex.find(e => e.exId === tpl.ex[0].exId);
    t('25 · and the next session is built from it', G.GYM.name === 'Push' && benchRow.sets.length === 5 && benchRow.rest === 200, benchRow.sets.length + ' sets, ' + benchRow.rest + 's');
    G.GYM = null; d.getElementById('gym').classList.remove('on');
    t('25 · sessions already done are untouched', JSON.stringify(S.workouts) === JSON.stringify(past));
    /* start from the card */
    G.go('plan'); pv().querySelector('[data-planopen="' + push + '"]').click();
    if (!pv().querySelector('.daycard.open')) pv().querySelector('[data-planopen="' + push + '"]').click();
    pv().querySelector('.daycard.open [data-startday]').click();
    t('25 · Start on the card starts that day', !!G.GYM && G.GYM.name === 'Push');
    G.GYM = null; d.getElementById('gym').classList.remove('on');
    /* other kinds of day */
    G.go('plan');
    const rest = S.plan.days.findIndex(x => x.slot === 'rest');
    pv().querySelector('[data-planopen="' + rest + '"]').click();
    t('25 · a rest day offers only Change day', !pv().querySelector('.daycard.open [data-startday]') && !pv().querySelector('.daycard.open [data-restday]') && !!pv().querySelector('.daycard.open [data-swap]'));
    const run = S.plan.days.findIndex(x => x.runId);
    if (run > -1) { pv().querySelector('[data-planopen="' + run + '"]').click();
      t('25 · a run day shows its steps and Change run', !!pv().querySelector('.daycard.open [data-runswap]') && pv().querySelectorAll('.daycard.open .dmove').length > 0); }
    const c0 = S.circuits[0];
    S.plan.days[rest] = Object.assign({}, S.plan.days[rest], { slot: c0.id, circuitId: c0.id, templateId: null, runId: null, type: 'workout', label: c0.name });
    G.renderPlan(); pv().querySelector('[data-planopen="' + rest + '"]').click();
    if (!pv().querySelector('.daycard.open [data-circedit]')) pv().querySelector('[data-planopen="' + rest + '"]').click();
    t('25 · a circuit day lists its stations and Edit circuit', !!pv().querySelector('.daycard.open [data-circedit]')
      && pv().querySelectorAll('.daycard.open .dmove').length === (c0.items || []).length && /run/.test(txt(pv().querySelector('.daycard.open .dmoves'))));
    /* from Today */
    S.plan.days[ti] = Object.assign({}, S.plan.days[push], { dow: ti });
    G.go('today'); G.renderAll();
    t('25 · Today has View or edit beside Start', !!d.getElementById('todayViewEdit') && !!d.getElementById('startToday'));
    d.getElementById('todayViewEdit').click();
    t('25 · which opens today\'s card on the plan', d.getElementById('s-plan').classList.contains('on') && cards()[ti].classList.contains('open'));
    G.go('today');
    d.querySelector('.weekstrip [data-planday="' + ti + '"]').click();
    t('25 · the day sheet from the week strip has Edit this workout too', !!d.querySelector('#dayDetail [data-tpledit]'));
    G.closeSheets();

    /* ================= a finished session in full ================= */
    const runPush = (top, rest, reps, warm) => {
      G.startWorkout('t_push');
      G.GYM.ex.forEach((e, i) => { if (warm && i === 0) e.sets.unshift({ kg: 40, reps: 8, warm: true, done: false });
        let n = 0; e.sets.forEach(s => { if (s.warm) { s.done = true; return; } s.kg = n === 0 ? top : rest; s.reps = reps; s.done = true; n++; }); });
      G.GYM.started = w.Date.now() - 52 * 60000;   /* the app's clock, not the test's */
      G.finishWorkout(); d.getElementById('gym').classList.remove('on'); G.closeSheets();
    };
    runPush(60, 57.5, 6, false);
    const lastWeek = G.addDays(G.todayKey(), -7);
    S.workouts[0].d = lastWeek; S.mine.forEach(m => { if (m.d === G.todayKey()) m.d = lastWeek; });
    Object.values(S.lifts).forEach(h => h.forEach(e => { if (e.d === G.todayKey()) e.d = lastWeek; }));
    runPush(62.5, 60, 8, true);
    const wk = S.workouts[0];
    G.go('progress'); G.renderAll();
    d.querySelector('#grid [data-sess]').click();
    const sb = d.getElementById('sessBody'), sub = txt(d.getElementById('sessSub'));
    t('25 · the session says when it started and finished', /\d\d:\d\d to \d\d:\d\d$/.test(sub), sub);
    const g = [...sb.querySelectorAll('.sgrid > div')].map(x => txt(x.querySelector('b')) + ' ' + txt(x.querySelector('span')));
    const workSets = wk.ex.reduce((a, e) => a + e.sets.filter(s => !s.warm).length, 0);
    const reps = wk.ex.reduce((a, e) => a + e.sets.filter(s => !s.warm).reduce((b, s) => b + s.reps, 0), 0);
    t('25 · minutes, working sets and warm ups, reps and kilos, all from what was logged',
      g[0] === '52 minutes' && g[1] === workSets + ' working sets + 1 warm up' && g[2] === reps + ' reps' && g[3] === wk.volume.toLocaleString('en-GB') + ' kg lifted', JSON.stringify(g));
    const prevVol = S.workouts[1].volume, pct = Math.round((wk.volume - prevVol) / prevVol * 100);
    t('25 · compared with the last Push, to the percent', txt(sb).indexOf(Math.abs(pct) + '% ' + (pct > 0 ? 'more' : 'less') + ' in total than your last Push') > -1, String(pct));
    const mg = [...sb.querySelectorAll('.mgrid span')].map(txt);
    t('25 · what it worked, by working sets, adding up to the total', mg.length >= 2 && mg.reduce((a, s) => a + +(s.match(/(\d+) sets?$/) || [0, 0])[1], 0) === workSets, JSON.stringify(mg));
    const first = sb.querySelector('.sessex'), ex0 = wk.ex[0], xn = G.exOf(ex0.exId).n;
    const rows = [...first.querySelectorAll('.srow')].map(txt);
    t('25 · sets are numbered, with the warm up marked W', /^W\s*40kg × 8/.test(rows[0]) && /^1\s*62\.5kg × 8/.test(rows[1]) && /^2\s*60kg × 8/.test(rows[2]), JSON.stringify(rows.slice(0, 3)));
    t('25 · the best set is tagged', /best$/.test(rows[1]));
    const e1 = Math.round(62.5 * (1 + 8 / 30));
    t('25 · with an estimated one-rep max by the Epley formula, labelled as an estimate', txt(first).indexOf('About ' + e1 + ' kg estimated one-rep max (Epley formula') > -1, String(e1));
    t('25 · it says whether the planned range was hit', /Planned \d+ × 5 to 8 reps.*Top of the range on every set/.test(txt(first)), txt(first).slice(0, 300));
    t('25 · and exactly what changed since last time', txt(first).indexOf('Against ' + G.prettyDate(lastWeek) + ': +2.5 kg on the top set, +10 reps') > -1, txt(first));
    t('25 · every movement is there', wk.ex.every(e => txt(sb).indexOf(G.exOf(e.exId).n) > -1));
    G.closeSheets();
    /* an older session without the new detail still opens */
    delete wk.started; delete wk.finished; wk.ex.forEach(e => delete e.plan);
    d.querySelector('#grid [data-sess]').click();
    t('25 · an older session without the new detail still opens', d.getElementById('sessSheet').classList.contains('on')
      && !/Planned/.test(txt(d.getElementById('sessBody')))
      && /^\d+$/.test(txt(d.querySelector('#sessBody .sgrid > div:nth-child(2) b')))
      && /^working sets/.test(txt(d.querySelector('#sessBody .sgrid > div:nth-child(2) span'))));
    G.closeSheets();
    t('25 · a bodyweight movement gets reps, not a made-up one-rep max', (() => {
      const e = { exId: 'plank', sets: [{ kg: 0, reps: 45, warm: false }] };
      const X = G.exerciseDetail(e, wk); return X.e1 === null && !X.weighted; })());

    /* ================= the editor ================= */
    G.openTplEdit('t_pull');
    const eb = () => d.getElementById('tplEditBody');
    const pull = S.templates.find(x => x.id === 't_pull');
    t('25 · every movement is its own card', eb().querySelectorAll('.tcard').length === pull.ex.length);
    t('25 · with four labelled boxes, rest included', [...eb().querySelectorAll('.tcard')].every(c => c.querySelectorAll('.tf').length === 4)
      && /Rest, s/.test(txt(eb().querySelector('.tcard'))) && eb().querySelectorAll('[data-tpl$=":rest"]').length === pull.ex.length);
    t('25 · the old cramped row and its tiny symbols are gone', !eb().querySelector('.tedit') && !/\.tedit/.test(source) && !/22px 22px 22px/.test(source));
    const firstActs = [...eb().querySelector('.tcard').querySelectorAll('.tact')];
    t('25 · actions say what they do', ['How to', 'Swap', 'Remove'].every(a => firstActs.some(b => txt(b) === a)));
    t('25 · the arrows are labelled for screen readers', firstActs.filter(b => b.classList.contains('icon')).every(b => /Move .+ (up|down)/.test(b.getAttribute('aria-label'))));
    t('25 · every action is at least 44px tall', /\.tact\{min-height:44px/.test(source) && /\.tact\.icon\{min-width:44px/.test(source) && /\.tf input\{min-height:44px/.test(source));
    t('25 · the first cannot move up and the last cannot move down', eb().querySelector('[data-tplmove="0:-1"]').disabled && eb().querySelector('[data-tplmove="' + (pull.ex.length - 1) + ':1"]').disabled);
    const n0 = G.exOf(pull.ex[0].exId).n, n1 = G.exOf(pull.ex[1].exId).n;
    eb().querySelector('[data-tplmove="0:1"]').click();
    t('25 · moving down swaps it with the next one', txt(eb().querySelectorAll('.tcard')[0].querySelector('.tt b')) === n1 && txt(eb().querySelectorAll('.tcard')[1].querySelector('.tt b')) === n0);
    t('25 · and focus follows the card that moved', d.activeElement && d.activeElement.closest('.tcard') === eb().querySelectorAll('.tcard')[1]);
    const cases = [['0:sets', '', 'Sets should be'], ['0:sets', '0', 'Sets should be'], ['0:sets', '11', 'Sets should be'],
      ['0:repMin', String(pull.ex[0].reps + 1), 'cannot be below the bottom'], ['0:rest', '700', 'Rest should be']];
    let allCaught = true, why = '';
    cases.forEach(([f, v, msg]) => {
      G.openTplEdit('t_pull');
      type(d.querySelector('[data-tpl="' + f + '"]'), v);
      d.getElementById('tplSave').click();
      const shown = txt(eb().querySelector('.warn'));
      if (!d.getElementById('tplEdit').classList.contains('on') || shown.indexOf(msg) < 0) { allCaught = false; why = f + '=' + v + ' → ' + shown; }
    });
    t('25 · blank, zero, too many sets, an upside down range and too much rest are all refused', allCaught, why);
    t('25 · nothing was saved by any of them', S.templates.find(x => x.id === 't_pull').ex[0].sets === pull.ex[0].sets);
    t('25 · the bad box is marked', !!eb().querySelector('.tf.bad'));
    type(d.querySelector('[data-tpl="0:rest"]'), '90');
    t('25 · and unmarks as soon as it is fixed', !eb().querySelector('.tf.bad'));
    type(d.getElementById('tplName'), '   ');
    d.getElementById('tplSave').click();
    t('25 · a blank name is refused', /Give it a name/.test(txt(eb().querySelector('.warn'))));
    type(d.getElementById('tplName'), 'Pull');
    const count = S.templates.find(x => x.id === 't_pull').ex.length;
    eb().querySelector('[data-tpldel="0"]').click();
    t('25 · Remove takes it out, with Undo', eb().querySelectorAll('.tcard').length === count - 1 && /Undo/.test(txt(d.getElementById('toast'))));
    d.getElementById('toastAct').click();
    t('25 · and Undo puts it back', eb().querySelectorAll('.tcard').length === count);
    G.closeSheets();
  }

  /* ---------------------------------------------------------- 26 */
  journey(26, 'Planned means what was planned, even when the session changes');
  {
    const { d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S;
    const row = S.templates.find(x => x.id === 't_push').ex[0];
    row.sets = 5; G.save();
    const run = mutate => {
      G.startWorkout('t_push');
      const e = G.GYM.ex[0];
      mutate(e);
      G.GYM.ex.forEach(x => x.sets.forEach(st => { if (st.kg === '') st.kg = 50; st.reps = 8; st.done = true; }));
      G.finishWorkout(); d.getElementById('gym').classList.remove('on'); G.closeSheets();
      G.go('progress'); G.renderAll();
      d.querySelector('#grid [data-sess]').click();
      const body = d.getElementById('sessBody').textContent.replace(/\s+/g, ' ');
      G.closeSheets();
      return { rec: S.workouts[0].ex[0], body };
    };
    const a = run(e => { e.sets[0].warm = true; });
    t('26 · a set marked as a warm up does not change what was planned', a.rec.plan.sets === 5, String(a.rec.plan.sets));
    t('26 · and the difference is said plainly', /Planned 5 × 5 to 8 reps\. You did 4 working sets, 1 fewer than planned\./.test(a.body), (a.body.match(/Planned[^.]*\.[^.]*\./) || [''])[0]);
    const b = run(e => { e.sets.push({ kg: 50, reps: 8, warm: false, done: true }); });
    t('26 · an extra set does not change what was planned either', b.rec.plan.sets === 5 && /You did 6 working sets, 1 more than planned\./.test(b.body), (b.body.match(/Planned[^.]*\.[^.]*\./) || [''])[0]);
    const c = run(() => {});
    t('26 · when it went to plan, there is nothing extra to say', /Planned 5 × 5 to 8 reps( at [\d.,]+ kg)?\. Top of the range/.test(c.body) && !/than planned/.test(c.body), (c.body.match(/Planned[^.]*\.[^.]*\./) || [''])[0]);
    const dl = (() => { G.startWorkout('t_push', { deload: 'moderate' }); const n = G.GYM.ex[0].dp.sets; G.GYM = null; return n; })();
    t('26 · an easy week still plans its own lighter sets', dl < 5, String(dl));
  }

  /* ---------------------------------------------------------- 27 */
  journey(27, 'One clear route to today, a finish screen that shows everything, a circuit editor fingers can use');
  {
    const { w, d, G, errs, source } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S, i = G.dowIdx();
    const lift = S.plan.days.find(x => x.templateId);
    S.plan.days[i] = Object.assign({}, lift, { dow: i }); G.save(); G.go('today'); G.renderAll();
    const hero = d.querySelector('#todayView .hero');
    const labels = [...hero.querySelectorAll('button')].map(b => b.textContent.trim());
    t('27 · today has one button to see or edit the workout', labels.filter(l => /See or edit/.test(l)).length === 1, labels.join(' | '));
    t('27 · and no second, overlapping one', !labels.some(l => /See what is in it|View or edit/.test(l)), labels.join(' | '));
    d.getElementById('todayViewEdit').click();
    const card = d.querySelectorAll('.daycards > *')[i];
    t('27 · it opens today in Plan, with the workout listed', d.getElementById('s-plan').classList.contains('on') && /open/.test(card.className)
      && card.querySelectorAll('[data-showmove]').length >= 3);
    t('27 · with Start and Edit side by side', !!card.querySelector('[data-startday]') && !!card.querySelector('[data-tpledit]'));
    card.querySelector('[data-tpledit]').click();
    t('27 · the editor says changes carry to every future day', /Changes apply to every .* day from now on/.test(d.getElementById('tplEditBody').textContent));
    const before = S.templates.find(x => x.id === lift.templateId).ex.length;
    d.querySelector('[data-tpldel]').click();
    d.getElementById('tplSave').click();
    t('27 · saving changes the workout itself', S.templates.find(x => x.id === lift.templateId).ex.length === before - 1);
    G.startWorkout(lift.templateId);
    t('27 · and the next session is built from the edited version', G.GYM.ex.length === before - 1);
    G.GYM.ex.forEach(e => e.sets.forEach(st => { if (st.kg === '') st.kg = 40; st.reps = 8; st.done = true; }));
    G.finishWorkout();
    const see = d.getElementById('seeSession');
    t('27 · the finish screen offers everything that was done', !!see && /See everything you did/.test(see.textContent));
    see.click();
    t('27 · and opens the full session viewer', d.getElementById('sessSheet').classList.contains('on') && !d.getElementById('gym').classList.contains('on'));
    const body = d.getElementById('sessBody').textContent;
    t('27 · with every set and the detail', /kg lifted/.test(body) && /working sets/.test(body) && /What it worked/.test(body), body.slice(0, 120));
    t('27 · no stand-in card is left behind in the feed', !S.mine.some(m => m.__temp));
    G.closeSheets();

    /* the circuit editor */
    const cid = S.circuits[0].id;
    G.openCircEdit(cid);
    const cb = () => d.getElementById('circEditBody');
    t('27 · no tiny symbol buttons remain', !cb().querySelector('.x'));
    t('27 · every control is a proper tap target',
      /\.cekind button\{min-height:44px/.test(source) && /\.ceinput\{[^}]*min-height:44px/.test(source) && /\.tact\{min-height:44px/.test(source));
    t('27 · run or station is two labelled buttons, not "stn"', /Station/.test(cb().textContent) && !/\bstn\b/.test(cb().textContent));
    const n0 = G.circDraft.items.length, first = G.circDraft.items[0].label;
    t('27 · the first part cannot move up, the last cannot move down',
      cb().querySelector('[data-cimove="0:-1"]').disabled && cb().querySelector('[data-cimove="' + (n0 - 1) + ':1"]').disabled);
    cb().querySelector('[data-cimove="0:1"]').click();
    t('27 · moving down works', G.circDraft.items[1].label === first);
    cb().querySelector('[data-cimove="1:-1"]').click();
    t('27 · and moving back up', G.circDraft.items[0].label === first);
    const kindBefore = G.circDraft.items[0].t;
    cb().querySelector('[data-citype="0:' + (kindBefore === 'run' ? 'station' : 'run') + '"]').click();
    t('27 · switching kind is explicit', G.circDraft.items[0].t !== kindBefore);
    cb().querySelector('[data-cidel="0"]').click();
    t('27 · removing a part says so, with Undo', G.circDraft.items.length === n0 - 1 && /removed/.test(d.getElementById('toast').textContent) && /Undo/.test(d.getElementById('toast').textContent));
    d.getElementById('toastAct').click();
    t('27 · and Undo puts it back in place', G.circDraft.items.length === n0 && G.circDraft.items[0].label === first);
    G.circDraft.items.splice(1);
    G.circDraft.name = 'He said "go"';
    G.drawCircEdit();
    const del = () => cb().querySelector('[data-cidel="0"]');
    t('27 · the last part cannot be removed', del().disabled && G.circDraft.items.length === 1);
    t('27 · a name with quote marks does not break its own field', d.getElementById('circName').value === 'He said "go"', d.getElementById('circName').value);
    G.closeSheets();
  }

  /* ---------------------------------------------------------- 28 */
  journey(28, 'Tiles to log with, food first; You in three tabs with settings behind a gear; a weight chart that tells the truth');
  {
    const { w, d, G, errs, source } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S, txt = el => el.textContent.replace(/\s+/g, ' ').trim();

    /* ---- the + ---- */
    G.openLog();
    const body = d.getElementById('logBody');
    t('28 · the list is gone, tiles instead', body.querySelectorAll('.logtile').length >= 6 && !body.querySelector('.logrow'));
    const first = body.querySelector('.logtile');
    t('28 · food comes first and takes the full width', first.dataset.log === 'food' && first.classList.contains('wide'));
    t('28 · it shows what to aim at before anything is logged', /kcal and \d+g protein to aim at today/.test(txt(first)), txt(first));
    G.addFood('chicken', 1, 'l'); G.addFood('rice', 1, 'l'); G.openLog();
    const f2 = d.querySelector('.logtile.wide');
    t('28 · and what is left once food is in', /kcal so far/.test(txt(f2)) && /left today/.test(txt(f2)), txt(f2));
    t('28 · with a progress bar', !!f2.querySelector('.bar i'));
    t('28 · every tile is a big target', /\.logtile\{[^}]*min-height:104px/.test(source) && /\.logtiles\{[^}]*grid-template-columns:1fr 1fr/.test(source));
    t('28 · things already done are marked', (() => {
      S.weights.push({ d: G.todayKey(), kg: 90 }); G.openLog();
      const weigh = d.querySelector('[data-log="weigh"]');
      return weigh.classList.contains('done') && /90 kg today/.test(txt(weigh)); })());
    d.querySelector('[data-log="food"]').click();
    t('28 · tapping food opens the food sheet', d.getElementById('foodSheet').classList.contains('on'));
    G.closeSheets();

    /* ---- You, in tabs ---- */
    G.go('progress'); G.renderAll();
    const tabs = [...d.querySelectorAll('.ytabs [data-ytab]')];
    t('28 · three tabs, short labels', tabs.length === 3 && tabs.map(x => txt(x)).join(',') === 'Progress,Sessions,Your plan');
    t('28 · they are a real tablist', d.querySelector('.ytabs').getAttribute('role') === 'tablist'
      && tabs.every(x => x.getAttribute('role') === 'tab' && x.getAttribute('aria-controls')));
    t('28 · you land on Progress', tabs[0].getAttribute('aria-selected') === 'true' && !d.getElementById('ypanel-progress').hidden);
    t('28 · the selected tab is obvious, not just a colour shift', tabs[0].classList.contains('on')
      && /\.ytabs button\.on\{background:var\(--ink\);color:var\(--on-ink\)\}/.test(source));
    tabs[2].click();
    t('28 · tapping a tab shows only that panel',
      !d.getElementById('ypanel-plan').hidden && d.getElementById('ypanel-progress').hidden && d.getElementById('ypanel-sessions').hidden);
    t('28 · and marks it selected', tabs[2].getAttribute('aria-selected') === 'true' && tabs[0].getAttribute('aria-selected') === 'false');
    tabs[2].dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    t('28 · arrow keys move between tabs', d.getElementById('ytab-sessions').getAttribute('aria-selected') === 'true');
    t('28 · your plan rows live in the plan tab',
      ['aim', 'goal', 'body', 'steps', 'habits', 'deload', 'kit'].every(k => d.getElementById('ypanel-plan').querySelector('[data-setting="' + k + '"]')));
    t('28 · sessions and records live in the sessions tab',
      d.getElementById('ypanel-sessions').contains(d.getElementById('grid'))
      && !!d.getElementById('ypanel-sessions').querySelector('[data-setting="records"]'));

    /* ---- settings behind the gear ---- */
    const gear = d.getElementById('settingsBtn');
    t('28 · there is a gear, labelled for screen readers', !!gear && gear.getAttribute('aria-label') === 'Settings' && !!gear.querySelector('svg'));
    t('28 · and it is a full size target', /\.phead \.gear\{[^}]*width:44px;height:44px/.test(source));
    gear.click();
    t('28 · it opens settings', d.getElementById('settingsSheet').classList.contains('on'));
    t('28 · holding the app settings, not the plan',
      ['theme', 'tempo', 'nudge', 'account', 'data', 'how'].every(k => d.getElementById('appSettings').querySelector('[data-setting="' + k + '"]'))
      && !d.getElementById('appSettings').querySelector('[data-setting="goal"]'));
    G.closeSheets();

    /* ---- the chart ---- */
    S.weights = [];
    t('28 · with no weigh ins the chart says what it needs instead of drawing nothing',
      /No weigh ins yet/.test(G.weightChart()) && /weigh in/.test(G.forecastReadiness().line));
    /* daily weigh ins, losing 0.1 kg a day = 0.7 a week */
    for (let i = 20; i >= 0; i--) S.weights.push({ d: G.addDays(G.todayKey(), -i), kg: +(92 - (20 - i) * 0.1).toFixed(1) });
    const tr = G.weightTrend(G.weightSeries());
    t('28 · the trend is per day, not per weigh in', Math.abs(tr.perWeek + 0.7) < 0.02, tr.perWeek.toFixed(3) + ' kg a week');
    t('28 · the sentence says a week and means it', /0\.70 kg a week/.test(G.projectionLine()), G.projectionLine());
    /* the same loss, but weighed weekly: the rate must come out the same */
    S.weights = [];
    for (let i = 3; i >= 0; i--) S.weights.push({ d: G.addDays(G.todayKey(), -i * 7), kg: +(92 - (3 - i) * 0.7).toFixed(1) });
    const tr2 = G.weightTrend(G.weightSeries());
    t('28 · weighing weekly gives the same weekly rate as weighing daily', Math.abs(tr2.perWeek + 0.7) < 0.02, tr2.perWeek.toFixed(3));
    /* uneven gaps: a three week gap must not be drawn as one step */
    S.weights = [{ d: G.addDays(G.todayKey(), -21), kg: 92 }, { d: G.addDays(G.todayKey(), -1), kg: 90 }, { d: G.todayKey(), kg: 89.9 }];
    const svg = G.weightChart();
    const xs = [...svg.matchAll(/<circle class="raw" cx="([\d.]+)"/g)].map(m => +m[1]).slice(0, 3);
    t('28 · points are placed by date, so a long gap looks long',
      (xs[1] - xs[0]) > (xs[2] - xs[1]) * 5, xs.join(', '));
    t('28 · the chart is not stretched out of shape', !/preserveAspectRatio="none"/.test(svg));
    t('28 · it describes itself for anyone who cannot see it', /role="img"/.test(svg) && /aria-label="Weighed 3 times over 21 days/.test(svg), (svg.match(/aria-label="[^"]{0,80}/) || [''])[0]);
    t('28 · the timeline is labelled at the start and at today', (() => {
      const labels = [...svg.matchAll(/<text[^>]*class="wlab[^"]*"[^>]*>([^<]+)<\/text>/g)].map(m => m[1]);
      return labels.includes('Today') && labels.some(l => /^\d{1,2} [A-Z][a-z]{2}$/.test(l)); })());
    G.setTarget('weight', 70, G.addDays(G.todayKey(), 300)); S.target.from = 92;
    const svg2 = G.weightChart();
    t('28 · a goal far below is named rather than squashing the chart',
      /Goal 70 kg, [\d.]+ kg below this/.test(svg2) && !/class="wgoal"/.test(svg2), (svg2.match(/Goal[^<]{0,40}/) || [''])[0]);
    t('28 · and the weigh ins still use the full height', (() => {
      const ys = [...svg2.matchAll(/<circle cy?="[\d.]+" cy="([\d.]+)"/g)].map(m => +m[1]);
      const all = [...svg2.matchAll(/<circle[^>]*cy="([\d.]+)"/g)].map(m => +m[1]);
      return Math.max(...all) - Math.min(...all) > 40; })(),
      [...svg2.matchAll(/<circle[^>]*cy="([\d.]+)"/g)].map(m => m[1]).join(','));
    G.setTarget('weight', 92, G.addDays(G.todayKey(), 90)); S.target.from = 94;
    const svg3 = G.weightChart();
    t('28 · a goal within reach is drawn as a line on the chart',
      /class="wgoal"/.test(svg3) && /Goal 92 kg/.test(svg3));
  }

  /* ---------------------------------------------------------- 29 */
  journey(29, 'A food list with Irish food in it, and movements you can recognise');
  {
    const { w, d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S;

    /* ---- the food list ---- */
    t('29 · there is a lot more food than before', G.FOODS.length >= 130, String(G.FOODS.length));
    t('29 · every entry has a portion, calories and macros', G.FOODS.every(f =>
      f.id && f.n && f.u && typeof f.kcal === 'number' && typeof f.p === 'number' && typeof f.c === 'number' && typeof f.f === 'number'));
    t('29 · no two foods share an id', new Set(G.FOODS.map(f => f.id)).size === G.FOODS.length);
    t('29 · calories agree with the macros, allowing for alcohol', (() => {
      const off = G.FOODS.filter(f => {
        const calc = f.p * 4 + f.c * 4 + f.f * 9 + (f.alc || 0) * 7;
        return Math.abs(calc - f.kcal) > Math.max(25, f.kcal * 0.18); });
      return off.length === 0; })(),
      G.FOODS.filter(f => Math.abs(f.p*4+f.c*4+f.f*9+(f.alc||0)*7 - f.kcal) > Math.max(25, f.kcal*0.18)).map(f=>f.n).join(', '));
    t('29 · drinks with alcohol in them say so', G.foodOf('pint_stout').alc > 0 && G.foodOf('water').alc === undefined);
    t('29 · the Irish staples are there', ['brownbread','rasher','blackpud','chickenroll','breakfastroll','chowder','stew','baconcabbage','pint_stout','chips_bag']
      .every(id => !!G.foodOf(id)), ['brownbread','rasher','blackpud','chickenroll','breakfastroll','chowder','stew','baconcabbage','pint_stout','chips_bag'].filter(id => !G.foodOf(id)).join(', '));
    t('29 · the names are plain, not slang', (() => {
      const slang = /\b(spud|spuds|chipper|brekkie|cuppa|sambo|veg|butty|chippie)\b/i;
      const off = G.FOODS.filter(f => slang.test(f.n)).concat(G.FOOD_CATS.filter(c => slang.test(c[1])).map(c => ({n:c[1]})));
      return off.length === 0; })(),
      G.FOODS.filter(f => /\b(spud|spuds|chipper|veg)\b/i.test(f.n)).map(f => f.n).join(', '));
    t('29 · every food sits in a category that exists', (() => {
      const cats = new Set(G.FOOD_CATS.map(c => c[0]));
      return G.FOODS.every(f => cats.has(f.cat)); })());
    t('29 · nothing is in a category on its own', (() => {
      const n = {}; G.FOODS.forEach(f => n[f.cat] = (n[f.cat] || 0) + 1);
      return Object.values(n).every(v => v >= 8); })(), JSON.stringify((() => { const n={}; G.FOODS.forEach(f=>n[f.cat]=(n[f.cat]||0)+1); return n; })()));

    G.openFood(false);
    t('29 · the sheet offers categories to browse', d.querySelectorAll('[data-foodcat]').length >= 8);
    t('29 · it opens on the usual suspects, not all 138', d.querySelectorAll('#foodList [data-foodadd]').length <= 24 * 3 + 3);
    d.querySelector('[data-foodcat="meals"]').click();
    const meals = d.getElementById('foodList').textContent;
    t('29 · a category shows only that category', /Irish stew|chowder|fillet roll/i.test(meals) && !/Porridge oats/.test(meals));
    const box = d.getElementById('foodSearch');
    box.value = 'pud'; box.dispatchEvent(new w.Event('input', { bubbles: true }));
    t('29 · search still looks across everything', /pudding/i.test(d.getElementById('foodList').textContent));
    box.value = ''; box.dispatchEvent(new w.Event('input', { bubbles: true }));
    G.addFood('chickenroll', 1, 'l');
    t('29 · one of them logs and counts properly', G.foodTotals(G.todayKey()).kcal === 700);
    G.closeSheets();
    t('29 · the method sheet says where the figures come from', (() => { G.openHow();
      const h = d.getElementById('howBody') ? d.getElementById('howBody').textContent : d.body.textContent;
      return /Food Safety Authority of Ireland/.test(h) && /7 kcal a gram/.test(h); })());
    G.closeSheets();

    /* ---- the drawings ---- */
    t('29 · a bench press, a squat and a curl are three different pictures', (() => {
      const set = new Set(['bench', 'squat', 'curl'].map(id => G.figureSVG(id)));
      return set.size === 3; })());
    t('29 · a press up is drawn on the floor, not on a bench',
      !/class="bench"/.test(G.figureSVG('pushup')) && /class="bench"/.test(G.figureSVG('bench')));
    t('29 · a chin up hangs from a bar', /class="bench"/.test(G.figureSVG('chin')));
    t('29 · a cable movement draws the stack', /rect/.test(G.figureSVG('pulldown')));
    t('29 · a dumbbell is drawn as a dumbbell, not a barbell plate',
      /rect/.test(G.figureSVG('lateral')) && /circle/.test(G.figureSVG('squat')));
    t('29 · the figure has a body, not just sticks', (() => {
      const svg = G.figureSVG('squat');
      return /class="trunk"/.test(svg) && /class="skull"/.test(svg) && /class="far"/.test(svg); })());
    t('29 · every one of the movements has a drawing', G.LIBRARY.every(x => !!G.figureSVG(x.id)));
    G.openMove('bench');
    t('29 · the move sheet shows one, with the caveat', /class="fig"/.test(d.getElementById('altBody').innerHTML)
      && /not a form check/.test(d.getElementById('altBody').textContent));
    G.closeSheets();
  }

  /* ---------------------------------------------------------- 30 */
  journey(30, 'Cardio that is not running, counted properly');
  {
    const { w, d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S;
    const plans = S.runPlans;
    t('30 · there is cardio beyond running', plans.length >= 18, String(plans.length));
    t('30 · the common kinds are all there', ['run','bike','row','swim','machine','skip','walk','sport']
      .every(k => plans.some(r => (r.kind || 'run') === k)),
      [...new Set(plans.map(r => r.kind || 'run'))].join(', '));
    t('30 · every session has minutes, a cost and steps to follow', plans.every(r =>
      r.mins > 0 && r.met > 0 && Array.isArray(r.steps) && r.steps.length >= 1));
    t('30 · the costs are in a sane range for cardio', plans.every(r => r.met >= 3 && r.met <= 14),
      plans.filter(r => r.met < 3 || r.met > 14).map(r => r.name + ' ' + r.met).join(', '));
    t('30 · running and walking are marked as making steps, the rest are not',
      plans.filter(r => ['run','walk'].includes(r.kind || 'run')).every(G.cardioMakesSteps)
      && plans.filter(r => !['run','walk'].includes(r.kind || 'run')).every(r => !G.cardioMakesSteps(r)));

    const i = S.plan.days.findIndex(x => x.runId);
    t('30 · the week has a cardio day to change', i >= 0);
    const put = id => { S.plan.days[i] = Object.assign({}, S.plan.days[i], { runId: id }); return G.maintenance(); };
    const run = put('r_easy');
    t('30 · a run adds nothing on top, because its steps already count', run.cardio === 0);
    const walk = put('c_walk_brisk');
    t('30 · nor does a walk', walk.cardio === 0 && walk.kcal === run.kcal);
    const bike = put('c_bike_intervals');
    const expect = Math.round((8.5 - 1) * 3.5 * S.profile.weight / 200 * 40 / 7);
    t('30 · a bike session does, at the published cost', bike.cardio === expect, bike.cardio + ' vs ' + expect);
    t('30 · and it raises what you can eat', G.calorieTarget({ m: bike }).kcal > G.calorieTarget({ m: run }).kcal);
    const swim = put('c_swim_intervals');
    t('30 · harder swimming is worth more than a steady row', swim.cardio > put('c_row_steady').cardio);
    put('r_easy');

    G.openRunSwap(i, 'r_easy');
    const slabs = [...d.querySelectorAll('#altBody .slab')].map(x => x.textContent);
    t('30 · choosing one is grouped by kind, not one long list',
      ['Bike','Rowing','Swimming','Machines','Walking','Sport'].every(k => slabs.includes(k)), slabs.join(', '));
    const pick = d.querySelector('[data-runpick="' + i + ':c_row_steady"]');
    t('30 · every session can be picked for a day', !!pick);
    pick.click();
    t('30 · picking one puts it on the day', S.plan.days[i].runId === 'c_row_steady');
    G.closeSheets();
    G.go('today'); G.renderAll();
    G.go('plan'); G.renderPlan();
    t('30 · and it shows up in the week by name', /Steady row/.test(d.getElementById('s-plan').innerHTML));
    t('30 · the method sheet says where the costs come from', (() => { G.openHow();
      const h = d.body.textContent; return /Compendium of Physical Activities/.test(h) && /already counted/.test(h); })());
    G.closeSheets();
  }

  /* ---------------------------------------------------------- 31 */
  journey(31, 'A home screen that answers what now, where am I, and is it working');
  {
    const { w, d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S;
    const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    G.go('today'); G.renderAll();
    const home = () => d.getElementById('todayView');

    t('31 · the first thing is today, with something to press', !!home().querySelector('.hero') &&
      !!home().querySelector('#startToday, [data-go="plan"], #todayViewEdit'));
    t('31 · today\'s numbers are right there', d.querySelectorAll('.glances .glance').length === 3);
    t('31 · calories come first, because that is what people stop logging',
      d.querySelector('.glances .glance').dataset.glance === 'food');
    t('31 · and they show what is left, not just what is eaten', /kcal left/.test(txt(d.querySelector('.glances'))));
    t('31 · each one can be logged in one tap', ['food','protein','steps'].every(k => !!d.querySelector('[data-glance="' + k + '"]')));
    t('31 · with a row for the two things worth logging', d.querySelectorAll('.quicks .quick').length === 2);

    /* the week, once, not twice */
    t('31 · the week appears once, as a strip', d.querySelectorAll('.weekstrip').length === 1 && !home().querySelector('.ribbon'));
    t('31 · the strip is seven days and each one opens', d.querySelectorAll('.weekstrip button[data-planday]').length === 7);
    t('31 · the old row of day cards is gone', !/Quick bits/.test(txt(home())));
    t('31 · next up is two days, not a repeat of the whole week',
      home().innerHTML.match(/class="pday"/g) === null || home().innerHTML.match(/class="pday"/g).length <= 2);

    /* it tells you whether it is working */
    t('31 · the week line counts sessions done', /of \d+ sessions done/.test(txt(home())), txt(home()).slice(0, 200));
    for (let i = 0; i < 6; i++) { const k = G.addDays(G.todayKey(), -i); S.days[k] = { wb: 7, kcal: 2100 }; }
    S.weights = [{ d: G.addDays(G.todayKey(), -14), kg: 95 }, { d: G.todayKey(), kg: 93.6 }];
    G.renderAll();
    const line = txt(home());
    t('31 · and days logged, which is the habit that matters', /of the last 7 days logged/.test(line));
    t('31 · and the weight trend once there is one', /kg a week/.test(line), line.slice(0, 220));

    /* logging from the home screen */
    const tap = id => { G.go('today'); G.renderAll(); const b = d.querySelector('[data-glance="' + id + '"]'); if (b) b.click(); return !!b; };
    t('31 · tapping calories opens the food sheet', tap('food') && d.getElementById('foodSheet').classList.contains('on'));
    G.closeSheets();
    t('31 · tapping weigh in opens the weigh in', tap('weigh') && d.getElementById('weighSheet').classList.contains('on'));
    G.closeSheets();
    t('31 · the rating widget has been removed from Home, by request', !tap('day'));
    G.closeSheets(); G.go('today'); G.renderAll();
    G.addFood('chicken', 1, 'l'); G.renderAll();
    t('31 · logging updates the numbers straight away', /1 in/.test(txt(d.querySelector('.quicks'))));
    t('31 · and what is left comes down', (() => {
      const before = +txt(d.querySelector('.glances .glance .gv')).replace(/,/g, '');
      G.addFood('rice', 1, 'l'); G.renderAll();
      const after = +txt(d.querySelector('.glances .glance .gv')).replace(/,/g, '');
      return after < before; })());

    /* nothing invented to keep people coming back */
    t('31 · no invented streak to break', !/streak|don't break|keep it alive/i.test(txt(home())), txt(home()).slice(0, 160));
    t('31 · a brand new user is not shown numbers that do not exist yet', (() => {
      const fresh = G.weightTrend([]);
      return fresh.perWeek === null; })());
  }

  /* ---------------------------------------------------------- 32 */
  journey(32, 'Bodyweight counts, tiles log one thing, sauces exist, the keyboard keeps out of the way');
  {
    const { w, d, G, errs, source } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S;
    const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';

    /* ---- bodyweight ---- */
    S.weights.push({ d: G.todayKey(), kg: 92 });
    t('32 · a chin up counts your bodyweight, a press up does not',
      G.isBwFull('chin') && G.isBodyweight('pushup') && !G.isBwFull('pushup'));
    t('32 · ten chin ups at 92 kg is 920 kg of work',
      G.setVolume({ kg: '', reps: 10 }, 'chin') === 920, String(G.setVolume({ kg: '', reps: 10 }, 'chin')));
    t('32 · a belt adds to it, it does not replace it',
      G.setVolume({ kg: 10, reps: 8 }, 'chin') === 8 * 102);
    t('32 · a press up counts only what you strap on', G.setVolume({ kg: '', reps: 20 }, 'pushup') === 0
      && G.setVolume({ kg: 10, reps: 20 }, 'pushup') === 200);
    t('32 · a barbell movement is unchanged', G.setVolume({ kg: 60, reps: 5 }, 'bench') === 300);
    t('32 · the movements people start unloaded take no weight at all',
      ['bss','lunge','stepup','goblet','crunch','plank','pushup'].every(id => G.isBodyweight(id)),
      ['bss','lunge','stepup','goblet','crunch','plank','pushup'].filter(id => !G.isBodyweight(id)).join(', '));
    t('32 · but the ones you cannot do with nothing still ask for a weight',
      ['bench','legpress','hack','pulldown','rdl','dbrow'].every(id => !G.isBodyweight(id)),
      ['bench','legpress','hack','pulldown','rdl','dbrow'].filter(id => G.isBodyweight(id)).join(', '));
    t('32 · with no weight on it, reps are what progress', (() => {
      S.lifts.bss = [{ d: G.addDays(G.todayKey(), -7), sets: [{ kg: 0, reps: 8 }, { kg: 0, reps: 8 }] }];
      const row = S.templates.flatMap(x => x.ex).find(r => r.exId === 'bss') || { exId: 'bss', sets: 3, reps: 12, repMin: 8 };
      const n = G.nextPrescription('bss', row);
      return n.kg === null && n.reps > 8 && /Bodyweight last time/.test(n.why); })(),
      JSON.stringify(G.nextPrescription('bss', { exId: 'bss', sets: 3, reps: 12, repMin: 8 })));
    t('32 · and once the range is full it offers weight', (() => {
      const row = { exId: 'bss', sets: 3, reps: 12, repMin: 8 };
      S.lifts.bss = [{ d: G.addDays(G.todayKey(), -7), sets: [{ kg: 0, reps: 12 }, { kg: 0, reps: 12 }] }];
      const n = G.nextPrescription('bss', row);
      return /start adding weight/.test(n.why); })());
    t('32 · a bodyweight set is not treated as an empty set', (() => {
      const row = { exId: 'bss', sets: 3, reps: 12, repMin: 8 };
      S.lifts.bss = [{ d: G.addDays(G.todayKey(), -7), sets: [{ kg: '', reps: 10 }] }];
      return G.nextPrescription('bss', row).kind !== 'first'; })());
    t('32 · bodyweight comes from the scale, not the profile alone', G.bodyweightNow() === 92);
    G.startWorkout('t_pull');
    const gymHTML = d.getElementById('gymBody').innerHTML;
    t('32 · the weight column says + kg on a bodyweight movement', /\+kg/.test(gymHTML), (gymHTML.match(/<div>[+]?kg<\/div>/g) || []).join(' '));
    const chin = G.GYM.ex.find(e => e.exId === 'chin');
    chin.sets[0].reps = 10; chin.sets[0].kg = ''; chin.sets[0].done = true;
    t('32 · logging one with no weight still counts', G.gymVolume() === 920, String(G.gymVolume()));
    G.GYM = null; d.getElementById('gym').classList.remove('on');

    /* ---- the gym footer ---- */
    t('32 · the footer has its own background, so nothing shows through it',
      /\.gymfoot\{[^}]*background:var\(--paper\)/.test(source));
    t('32 · and it wraps instead of letting text land on text',
      /\.gymfoot\{[^}]*flex-wrap:wrap/.test(source));
    t('32 · the hint steps aside on a narrow phone', /@media \(max-width:380px\)\{ \.gymfoot \.hint\{display:none\} \}/.test(source));

    /* ---- tiles log one thing ---- */
    G.go('today'); G.renderAll();
    t('32 · there is no rating widget on Home any more, by request', !d.querySelector('[data-glance="day"]'));
    G.go('today'); G.renderAll();
    d.querySelector('[data-glance="steps"]').click();
    t('32 · the steps tile does the same', /Steps today/.test(txt(d.getElementById('quickTitle'))));
    d.querySelector('[data-quickstep="1000"]').click();
    t('32 · the buttons move it', +d.getElementById('quickValue').value === 1000);
    d.getElementById('quickSave').click();
    t('32 · steps are saved for today', S.days[G.todayKey()].steps === 1000);
    G.go('today'); G.renderAll();
    d.querySelector('[data-glance="protein"]').click();
    t('32 · protein too, with the full log still one tap away', /Protein today/.test(txt(d.getElementById('quickTitle')))
      && !!d.getElementById('quickFull'));
    G.closeSheets();
    G.go('today'); G.renderAll();
    d.querySelector('[data-glance="food"]').click();
    t('32 · the food tile still opens the food list, which is the right place for it',
      d.getElementById('foodSheet').classList.contains('on'));
    G.closeSheets();

    /* ---- sauces ---- */
    t('32 · sauces and condiments are their own category',
      G.FOOD_CATS.some(c => c[0] === 'sauces') && G.FOODS.filter(f => f.cat === 'sauces').length >= 18,
      String(G.FOODS.filter(f => f.cat === 'sauces').length));
    t('32 · the ones people actually use are there',
      ['ketchup','mayo','brownsauce','mustard','bbqsauce','sweetchilli','soysauce','garlicsauce','currysauce','gravy','pesto','oliveoil','honey','jam']
        .every(id => !!G.foodOf(id)));
    t('32 · their calories add up like everything else', G.FOODS.filter(f => f.cat === 'sauces').every(f => {
      const calc = f.p * 4 + f.c * 4 + f.f * 9;
      return Math.abs(calc - f.kcal) <= Math.max(25, f.kcal * 0.18); }));
    t('32 · and they log', (() => { G.addFood('mayo', 2, 'd'); return G.foodTotals(G.todayKey()).kcal >= 190; })());

    /* ---- the keyboard ---- */
    t('32 · the app measures what the keyboard covers', /visualViewport/.test(source) && typeof G.fitToKeyboard === 'function');
    t('32 · sheets give up that space rather than hiding their own input',
      /max-height:calc\(88vh - var\(--keyboard, 0px\)\)/.test(source) && /keyboard-open \.sheet\{max-height/.test(source));
    t('32 · and the food search sticks to the top while typing',
      /\.foodsearch\{position:sticky;top:0/.test(source));
    G.openFood(false);
    t('32 · the search box is inside that sticky wrapper', !!d.querySelector('.foodsearch #foodSearch'));
    G.closeSheets();
  }

  /* ---------------------------------------------------------- 33 */
  journey(33, 'The daily check in starts from the plan, and takes more than one thing');
  {
    const { w, d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S, i = G.dowIdx();
    const chips = () => [...d.querySelectorAll('[data-train]')];
    const on = () => chips().filter(b => b.classList.contains('on')).map(b => b.dataset.train);
    const lift = S.plan.days.find(x => x.templateId);
    const run = S.plan.days.find(x => x.runId);

    /* it knows what it asked you to do */
    S.plan.days[i] = Object.assign({}, lift, { dow: i }); G.save();
    G.openDay();
    t('33 · on a lifting day it opens on that session, not on Rest', on().length === 1 && ['push','pull','lower'].includes(on()[0]), on().join(','));
    t('33 · and says so', /What the plan asked for/.test(d.getElementById('dayBody').textContent));
    G.closeSheets();
    S.plan.days[i] = Object.assign({}, run, { dow: i }); G.save();
    G.openDay();
    t('33 · on a cardio day it opens on cardio', on().join() === 'cardio');
    G.closeSheets();
    S.plan.days[i] = Object.assign({}, G.slotFor ? G.slotFor('rest') : { slot: 'rest' }, { dow: i, templateId: null, runId: null, type: null }); G.save();
    G.openDay();
    t('33 · on a rest day Rest is the one showing as chosen', on().join() === 'rest' && G.trainingList(G.dayDraft.training).length === 0);
    t('33 · and it invites more than one', /a session and a run both count/.test(d.getElementById('dayBody').textContent));
    G.closeSheets();

    /* more than one */
    S.plan.days[i] = Object.assign({}, lift, { dow: i }); G.save();
    G.openDay();
    const first = on()[0];
    d.querySelector('[data-train="cardio"]').click();
    t('33 · a session and a run can both be true', on().length === 2 && on().includes('cardio') && on().includes(first));
    d.querySelector('[data-train="cardio"]').click();
    t('33 · and tapping again takes it off', on().join() === first);
    d.querySelector('[data-train="cardio"]').click();
    d.querySelector('[data-train="rest"]').click();
    t('33 · choosing Rest clears the others and shows as chosen itself',
      on().join() === 'rest' && G.trainingList(G.dayDraft.training).length === 0);
    d.querySelector('[data-train="cardio"]').click();
    t('33 · and choosing something clears Rest', on().join() === 'cardio');
    d.querySelector('[data-train="' + first + '"]').click();
    d.getElementById('saveDay').click();
    const saved = S.days[G.todayKey()].training;
    t('33 · both are saved', Array.isArray(saved) && saved.length === 2, JSON.stringify(saved));
    t('33 · and both count toward the week', (() => {
      const day = S.week[G.dowIdx()];
      return day.done.includes('workout') && day.done.includes('run'); })());
    t('33 · the brief reads them plainly', /Training days: .*(and|;)/.test(G.coachBrief().split('\n').filter(l => /Training days/.test(l))[0] || ''),
      (G.coachBrief().split('\n').filter(l => /Training days/.test(l))[0] || ''));

    /* days written before this change */
    const old = G.addDays(G.todayKey(), -3);
    S.days[old] = { training: 'push', sleep: 7, wb: 7 };
    t('33 · a day saved the old way still reads', G.trainingList(S.days[old].training).join() === 'push'
      && G.trainingText(S.days[old].training) === 'push');
    S.days[G.addDays(G.todayKey(), -4)] = { training: 'rest' };
    t('33 · an old rest day still counts as nothing', G.trainingList('rest').length === 0 && G.trainingText('rest') === 'rest');
    t('33 · and the brief handles a mix of old and new without breaking',
      /Training days:/.test(G.coachBrief()) && !/undefined|\[object/.test(G.coachBrief()));

    /* reopening keeps what was saved */
    G.openDay();
    t('33 · reopening shows what was saved, not the plan again', on().length === 2);
    G.closeSheets();
  }

  /* ---------------------------------------------------------- 34 */
  journey(34, 'A chart you can read, and a straight answer on when forecasting starts');
  {
    const { w, d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S;
    const food = n => { for (let i = 0; i < n; i++) { const k = G.addDays(G.todayKey(), -i);
      S.days[k] = Object.assign({}, S.days[k], { kcal: 2200 }); } };

    /* it says what it needs, before it has it */
    let r = G.forecastReadiness();
    t('34 · with nothing logged it says there is no forecast yet', r.stage === 'none' && /No forecast yet/.test(r.line));
    t('34 · and names both routes to one', /weigh in/.test(r.line) && /food/.test(r.line), r.line);
    t('34 · the empty chart says the same and offers to fix it', (() => {
      const c = G.weightChart();
      return /No weigh ins yet/.test(c) && /data-glance="weigh"/.test(c); })());
    S.weights.push({ d: G.addDays(G.todayKey(), -10), kg: 92 });
    t('34 · one weigh in is acknowledged, not ignored', /One weigh in so far/.test(G.weightChart()));
    S.weights.push({ d: G.addDays(G.todayKey(), -5), kg: 91.6 });
    t('34 · two weigh ins draw a line', /<svg/.test(G.weightChart()));
    t('34 · but two is still not a forecast', G.forecastReadiness().stage === 'none');
    S.weights.push({ d: G.todayKey(), kg: 91.2 });
    r = G.forecastReadiness();
    t('34 · three weigh ins starts one', r.canForecast && r.stage === 'early');
    t('34 · and it admits the burn is an estimate', /estimate of what you burn/.test(r.line));

    food(14);
    for (let i = 0; i < 14; i++) S.weights.push({ d: G.addDays(G.todayKey(), -i), kg: +(92 - i * 0.05).toFixed(2) });
    S.weights.sort((a, b) => a.d < b.d ? -1 : 1);
    r = G.forecastReadiness();
    t('34 · with three weeks of food and weigh ins it stops estimating', r.stage === 'good' && r.observed);
    t('34 · and says the range is still a default until it has been scored', /how wrong it has actually been/.test(r.line));

    /* the chart itself */
    S.weights = [];
    for (let i = 21; i >= 0; i--) { const noise = [0.9, -0.6, 0.3, -1.1, 0.5, 0, -0.4][i % 7];
      S.weights.push({ d: G.addDays(G.todayKey(), -i), kg: +(92 - (21 - i) * (0.5 / 7) + noise).toFixed(1) }); }
    const svg = G.weightChart();
    t('34 · every weigh in is on the chart, as a dot',
      (svg.match(/class="raw"/g) || []).length >= S.weights.length, String((svg.match(/class="raw"/g) || []).length));
    t('34 · the headline number is the smoothed trend, not the jagged reading', (() => {
      G.go('progress'); G.renderAll();
      const head = d.getElementById('wHead').textContent;
      return head.indexOf(G.trendSeries().slice(-1)[0].kg.toFixed(1)) >= 0; })(),
      'trend ' + G.trendSeries().slice(-1)[0].kg.toFixed(1) + ' vs reading ' + S.weights.slice(-1)[0].kg);
    t('34 · so a noisy day does not change the headline number',
      G.trendSeries().slice(-1)[0].kg !== S.weights.slice(-1)[0].kg);
    t('34 · and one legend says which line is which', (() => { const k = d.querySelector('.wkey');
      return !!k && /Scale/.test(k.textContent) && /Trend/.test(k.textContent) && d.querySelectorAll('.wkey').length === 1; })());
    t('34 · there is one trend line, not two competing ones',
      (svg.match(/stroke="var\(--line\)" stroke-width="1.6"/g) || []).length === 0);
    t('34 · the chart has round kilos up the side', (() => {
      const ys = [...svg.matchAll(/<text class="wlab" x="32"[^>]*>([^<]+)<\/text>/g)].map(m => m[1]);
      return ys.length >= 3 && ys.every(v => Math.abs(+v * 2 - Math.round(+v * 2)) < 1e-9); })());
    t('34 · dates along the bottom, including today', /Today<\/text>/.test(svg));
    t('34 · the current trend weight is the big number above it', /kg trend/.test(d.getElementById('wHead').textContent));
    t('34 · the forecast shows a range, not a single confident line', /class="wband"/.test(svg));
    t('34 · and the projected weight and date are written on it', /[\d.]+ kg by \d{1,2} [A-Z][a-z]{2}<\/text>/.test(svg));
    t('34 · nothing is drawn outside the frame', (() => {
      const vb = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
      return [...svg.matchAll(/(?:x|y|x1|y1|x2|y2|cx|cy)="(-?[\d.]+)"/g)]
        .every(m => +m[1] >= -60 && +m[1] <= +vb[1] + 60); })());

    /* the note under it */
    G.go('progress'); G.renderAll();
    t('34 · the note appears under the chart on the You screen',
      /estimate of what you burn|how wrong it has actually been|No forecast yet/.test(d.getElementById('s-progress').textContent));
  }

  /* ---------------------------------------------------------- 35 */
  journey(35, 'Several habits, raw meat, a tighter home row, a prefilled weight, and eating around the day');
  {
    const { w, d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S;
    const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';

    /* ---- more than one habit ---- */
    t('35 · three at once is the cap', G.HABIT_MAX === 3);
    G.startHabit('walk_after');
    G.go('today'); G.renderAll();
    t('35 · with one going, the app offers another', /Add another habit/.test(txt(d.getElementById('todayView')))
      && /1 of 3/.test(txt(d.querySelector('.addhabit'))));
    G.startHabit('no_sugary_drinks');
    t('35 · a second one does not replace the first', G.habitCount() === 2
      && G.activeHabits().map(h => h.id).sort().join() === 'no_sugary_drinks,walk_after');
    G.startHabit('water_am');
    t('35 · a third goes in its own slot', G.habitCount() === 3 && G.habitRoom() === 0);
    G.go('today'); G.renderAll();
    t('35 · all three show on Today', d.querySelectorAll('#todayView .habitdots').length === 3);
    t('35 · and the invitation disappears at the cap', !/Add another habit/.test(txt(d.getElementById('todayView'))));
    t('35 · each keeps its own days', (() => {
      const slots = G.activeHabits().map(h => h.slot);
      G.toggleHabitDay(G.todayKey(), slots[0]);
      return G.habitStreak(slots[0]) === 1 && G.habitStreak(slots[1]) === 0; })());
    t('35 · a fourth replaces rather than silently failing', (() => {
      G.startHabit('stairs'); return G.habitCount() === 3 && G.activeHabits().some(h => h.id === 'stairs'); })());

    /* ---- raw meat ---- */
    t('35 · raw chicken breast is there', !!G.foodOf('chicken_raw') && /raw/i.test(G.foodOf('chicken_raw').n));
    t('35 · and raw versions of the rest of the meat and fish',
      ['chicken_raw','chickenthigh_raw','turkey_raw','mince5_raw','mince20_raw','steak_raw','pork_raw','lamb_raw','salmon_raw','cod_raw','prawns_raw']
        .every(id => !!G.foodOf(id)));
    t('35 · raw is lower per 100g than cooked, as it should be', (() => {
      const raw = G.foodOf('chicken_raw'), cooked = G.foodOf('chicken');
      const cookedPer100 = cooked.kcal / 150 * 100;
      return raw.kcal < cookedPer100; })());
    t('35 · and they add up like everything else',
      G.FOODS.filter(f => /raw/i.test(f.n)).every(f => Math.abs(f.p * 4 + f.c * 4 + f.f * 9 - f.kcal) <= Math.max(25, f.kcal * 0.18)));

    /* ---- the quick row ---- */
    S.days = {}; S.weights = []; G.go('today'); G.renderAll();
    t('35 · nothing logged says nothing, rather than "not today" three times',
      !/not today/.test(txt(d.querySelector('.quicks'))) && !/one slider/.test(txt(d.querySelector('.quicks'))));
    t('35 · both buttons are still there, food and weigh in', d.querySelectorAll('.quicks .quick').length === 2);
    S.weights.push({ d: G.todayKey(), kg: 91.4 }); G.renderAll();
    t('35 · once done, it shows what it was', /91\.4/.test(txt(d.querySelector('.quicks'))));

    /* ---- the weight carries into the check in ---- */
    G.openDay();
    const wbox = d.querySelector('[data-day="w"]');
    t('35 · the daily check in already has this morning\'s weight', wbox && +wbox.value === 91.4, wbox && wbox.value);
    t('35 · and says where it came from', /came from this morning/.test(txt(d.getElementById('dayBody'))));
    G.closeSheets();

    /* ---- eating around the day ---- */
    const i = G.dowIdx();
    const lift = S.plan.days.find(x => x.templateId);
    S.plan.days[i] = Object.assign({}, lift, { dow: i });
    S.profile.wakeTime = '07:00'; S.profile.trainTime = '18:00'; S.profile.bedtime = '23:00';
    let plan = G.eatingPlan();
    const at = tag => plan.items.find(x => x.tag === tag);
    t('35 · a training day gets a plan in order', plan.items.length >= 5
      && plan.items.every((x, n) => n === 0 || G.hhmmToMin(x.time) >= G.hhmmToMin(plan.items[n - 1].time)));
    t('35 · protein is spread, not saved for after training', /every|spread/i.test(at('breakfast').why)
      && plan.per > 0 && plan.meals >= 3);
    t('35 · it feeds you two to three hours before training', at('pre') && G.hhmmToMin(at('pre').time) === 15 * 60 + 30);
    t('35 · the last coffee is eight hours before bed', at('coffee') && at('coffee').time === '15:00');
    t('35 · it does not ask you to eat before you are awake', plan.items.every(x => G.hhmmToMin(x.time) >= G.hhmmToMin(plan.wake) - 5
      || x.tag === 'coffee'), JSON.stringify(plan.items.map(x => x.time + ' ' + x.tag)));
    t('35 · a late session gets one meal after it, not two', (() => {
      S.profile.trainTime = '20:30'; plan = G.eatingPlan();
      return !plan.items.some(x => x.tag === 'last') && /last big one/.test((plan.items.find(x => x.tag === 'post') || {}).what || ''); })());
    t('35 · an early session makes breakfast the meal after it', (() => {
      S.profile.trainTime = '06:30'; S.profile.wakeTime = '05:45'; plan = G.eatingPlan();
      const b = plan.items.find(x => x.tag === 'breakfast'), p = plan.items.find(x => x.tag === 'post');
      return !b && /Breakfast/.test(p.what) && G.hhmmToMin(p.time) > G.hhmmToMin('06:30'); })());
    t('35 · a rest day still gets a sensible day', (() => {
      S.plan.days[i] = Object.assign({}, S.plan.days[i], { templateId: null, runId: null, type: null });
      plan = G.eatingPlan();
      return !plan.kind && plan.items.some(x => x.tag === 'lunch') && plan.items.some(x => x.tag === 'last')
        && !plan.items.some(x => x.tag === 'presleep'); })());

    /* the screen */
    S.plan.days[i] = Object.assign({}, lift, { dow: i });
    S.profile.trainTime = '18:00'; S.profile.wakeTime = '07:00';
    G.go('today'); G.renderAll();
    t('35 · it sits on the home screen as the day\'s meals, with the reasoning a tap away',
      !!d.querySelector('.mealstrip .meal') && /Why these times/.test(txt(d.getElementById('eatBtn'))));
    d.getElementById('eatBtn').click();
    const body = txt(d.getElementById('altBody'));
    t('35 · the sheet lays the day out', /Last big meal|last big one/.test(body) && /Last coffee/.test(body));
    t('35 · it is honest that this is not a weight loss trick', /not a weight loss trick/.test(body));
    t('35 · and it cites where the advice comes from',
      /International Society of Sports Nutrition/.test(body) && /Schoenfeld/.test(body));
    d.getElementById('eatTimes').click();
    t('35 · the times can be changed', !!d.querySelector('[data-timeset="bedtime"]'));
    const bedInput = d.querySelector('[data-timeset="bedtime"]');
    bedInput.value = '22:00'; bedInput.dispatchEvent(new w.Event('change', { bubbles: true }));
    t('35 · and changing bedtime moves the day', S.profile.bedtime === '22:00'
      && G.eatingPlan().items.find(x => x.tag === 'coffee').time === '14:00');
    G.closeSheets();
  }

  /* ---------------------------------------------------------- 36 */
  journey(36, 'Meal timing holds up on awkward days, including night shifts');
  {
    const { G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S, i = G.dowIdx();
    const lift = S.plan.days.find(x => x.templateId), run = S.plan.days.find(x => x.runId);
    const cases = [
      ['a normal day', '07:00', '23:00', '18:00', lift],
      ['training on waking', '06:00', '22:30', '06:30', lift],
      ['training at lunch', '07:00', '23:00', '12:30', lift],
      ['training late', '07:00', '23:30', '21:00', lift],
      ['training very late', '08:00', '23:30', '22:00', run],
      ['a night shift', '15:00', '07:00', '20:00', lift],
      ['a rest day', '07:00', '23:00', '18:00', null]];
    cases.forEach(([label, wake, bed, train, day]) => {
      S.profile.wakeTime = wake; S.profile.bedtime = bed; S.profile.trainTime = train;
      S.plan.days[i] = day ? Object.assign({}, day, { dow: i })
        : Object.assign({}, S.plan.days[i], { templateId: null, runId: null, circuitId: null, type: null, slot: 'rest' });
      const p = G.eatingPlan(), m = x => G.hhmmToMin(x), w = m(p.wake);
      const since = x => ((m(x) - w) % 1440 + 1440) % 1440;
      const bedR = since(p.bed);
      t('36 · ' + label + ': in order from waking', p.items.every((x, k) => k === 0 || since(x.time) >= since(p.items[k - 1].time)),
        p.items.map(x => x.time + ' ' + x.tag).join(', '));
      t('36 · ' + label + ': nothing after bed', p.items.every(x => since(x.time) <= bedR));
      const food = p.items.filter(x => !['train', 'coffee'].includes(x.tag)).map(x => since(x.time)).sort((a, b) => a - b);
      const gap = Math.max(...food.slice(1).map((v, k) => v - food[k]));
      t('36 · ' + label + ': no gap between meals over six hours', gap <= 360, (gap / 60).toFixed(1) + 'h');
      const tags = p.items.map(x => x.tag);
      t('36 · ' + label + ': never two meals where one will do', !(tags.includes('post') && tags.includes('presleep')
        && Math.abs(since(p.items.find(x => x.tag === 'post').time) - since(p.items.find(x => x.tag === 'presleep').time)) < 90));
      t('36 · ' + label + ': times read like a person wrote them',
        p.items.filter(x => !['pre', 'train', 'post', 'presleep', 'coffee'].includes(x.tag)).every(x => m(x.time) % 15 === 0));
      if (!day) t('36 · ' + label + ': it schedules the number of meals it tells you to eat',
        p.items.filter(x => !['train', 'coffee', 'presleep'].includes(x.tag)).length === p.meals, p.meals + ' meals stated');
    });
  }

  /* ---------------------------------------------------------- 37 */
  journey(37, 'Over target shows how far over, with maintenance beside it');
  {
    const { d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S;
    const tile = () => { G.go('today'); G.renderAll(); return d.querySelector('.glances .glance'); };
    const txt = el => el.textContent.replace(/\s+/g, ' ').trim();
    const target = S.targets.kcal, maint = S.targets.maintenance;
    t('37 · there is a gap between target and maintenance to test in', maint > target, target + ' / ' + maint);
    const eat = kcal => { const k = G.todayKey(); S.days[k] = Object.assign({}, S.days[k], { food: [
      { id: 'x', n: 'Test', u: 'portion', q: 1, meal: 'l', kcal, p: 0, c: 0, f: 0 }] }); };

    eat(target - 400);
    t('37 · under target it shows what is left', /kcal left/.test(txt(tile())));
    t('37 · and the amount is right', +txt(tile().querySelector('.gv')).replace(/,/g, '') === 400);

    eat(target + 300);
    t('37 · over target it no longer says 0 left', !/kcal left/.test(txt(tile())) && /kcal over target/.test(txt(tile())));
    t('37 · it shows how far over', +txt(tile().querySelector('.gv')).replace(/,/g, '') === 300);
    t('37 · it shows maintenance', txt(tile()).indexOf('maintenance ' + maint.toLocaleString('en-GB')) >= 0, txt(tile()));
    t('37 · and that this is still under it', new RegExp('still ' + (maint - target - 300).toLocaleString('en-GB') + ' under').test(txt(tile())), txt(tile()));
    t('37 · in a caution colour, not alarm', tile().classList.contains('over') && !tile().classList.contains('past'));

    eat(maint + 150);
    t('37 · past maintenance too, it says so', /150 over/.test(txt(tile())), txt(tile()));
    t('37 · and switches to the alarm colour', tile().classList.contains('past'));
    t('37 · the overage is still the headline number', +txt(tile().querySelector('.gv')).replace(/,/g, '') === maint + 150 - target);

    eat(target);
    t('37 · exactly on target reads as nothing left, not over', /kcal left/.test(txt(tile())) && +txt(tile().querySelector('.gv')).replace(/,/g, '') === 0);
  }

  /* ---------------------------------------------------------- 38 */
  journey(38, 'Any habit can be removed, and the check-in is only done when it is done');
  {
    const { d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S;
    const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    const live = () => G.activeHabits().map(h => h.id);
    G.startHabit('walk_after'); G.startHabit('no_sugary_drinks'); G.startHabit('stairs');
    G.go('today'); G.renderAll();
    t('38 · three habits on Home', live().length === 3, live().join(','));
    t('38 · each one can be opened', d.querySelectorAll('#todayView [data-habitopen]').length === 3);
    [...d.querySelectorAll('[data-habitopen]')][2].click();
    t('38 · opening one shows that habit, not a list', /Stairs, not the lift/.test(txt(d.getElementById('altTitle'))));
    t('38 · with remove named plainly', /Remove this habit/.test(txt(d.getElementById('altBody'))));
    d.querySelector('#altBody [data-habitretire]').click();
    t('38 · the third habit, which could never be removed, now can', live().join() === 'walk_after,no_sugary_drinks', live().join(','));
    d.getElementById('toastAct').click();
    t('38 · and Undo brings it back', live().length === 3);

    G.go('today'); G.renderAll();
    [...d.querySelectorAll('[data-habitopen]')][0].click();
    d.querySelector('#altBody [data-habittoggle]').click();
    t('38 · a habit can be ticked from its sheet', G.habitWeek('start').slice(-1)[0].done);
    G.go('today'); G.renderAll();
    [...d.querySelectorAll('[data-habitopen]')][0].click();
    t('38 · and the sheet then offers to untick it', /Untick today/.test(txt(d.getElementById('altBody'))));
    d.querySelector('#altBody [data-habittoggle]').click();
    t('38 · which works', !G.habitWeek('start').slice(-1)[0].done);
    G.openHabitSheet();
    t('38 · the picker names which habit a remove button removes', !/Put this one down for now/.test(txt(d.getElementById('altBody')))
      && /Remove Ten minutes after dinner/.test(txt(d.getElementById('altBody'))));
    G.closeSheets();

    /* the check-in */
    G.go('today'); G.renderAll();
    t('38 · the rating widget is gone from Home', !d.querySelector('.quicks [data-glance="day"]') && d.querySelectorAll('.quicks .quick').length === 2);
    G.openDay();
    t("38 · the daily sheet is called Today's Check-in", /Today's Check-in/.test(d.getElementById('dayCheck').textContent));
    t('38 · and no rating is filled in for you', /not rated/.test(txt(d.getElementById('outwb'))));
    G.closeSheets();
    const tileDone = () => { G.openLog(); const b = d.querySelector('#logBody [data-log="day"]'); const r = b.classList.contains('done'); G.closeSheets(); return r; };
    G.addFood('chicken', 1, 'l'); S.weights.push({ d: G.todayKey(), kg: 91 }); G.save();
    t('38 · logging food and weighing in do not count as checking in', !tileDone());
    G.openDay(); d.getElementById('saveDay').click();
    t('38 · saving without rating stores no invented rating', S.days[G.todayKey()].wb === undefined);
    t('38 · but saving it does count', tileDone());
    G.openDay();
    d.querySelector('[data-dayrange="wb"]').value = '8';
    d.querySelector('[data-dayrange="wb"]').dispatchEvent(new (d.defaultView.Event)('input', { bubbles: true }));
    d.getElementById('saveDay').click();
    t('38 · a rating they do give is kept', S.days[G.todayKey()].wb === 8);
  }

  /* ---------------------------------------------------------- 39 */
  journey(39, 'Rep ranges follow what you are training for, from onboarding to the last set');
  {
    const bench = G2 => G2.S.templates.find(x => x.id === 't_push').ex.find(r => r.exId === 'bench');
    const lat = G2 => G2.S.templates.find(x => x.id === 't_push').ex.find(r => r.exId === 'lateral');

    /* the table itself */
    const b0 = await boot(); allErrs.push(...b0.errs);
    const L = b0.G.LIFT_FOCUS;
    t('39 · there is a focus for strength, muscle, keeping muscle while losing fat, and endurance',
      ['strength','muscle','keep','endurance'].every(k => !!L[k]));
    t('39 · strength keeps the big lifts heavy, within the 1 to 6 zone', L.strength.rx.heavy.reps <= 6 && L.strength.rx.heavy.repMin >= 1);
    t('39 · strength rests longest', L.strength.rx.heavy.rest >= Math.max(L.muscle.rx.heavy.rest, L.keep.rx.heavy.rest, L.endurance.rx.heavy.rest));
    t('39 · muscle sits in 6 to 12 on the big lifts', L.muscle.rx.heavy.repMin >= 6 && L.muscle.rx.heavy.reps <= 12);
    t('39 · losing fat keeps the weight heavy, mostly 6 to 12 or below, never the toning myth',
      L.keep.rx.heavy.reps <= 12 && L.keep.rx.compound.reps <= 12 && L.keep.rx.heavy.repMin <= L.muscle.rx.heavy.repMin);
    t('39 · endurance goes to 15 and beyond', L.endurance.rx.accessory.reps >= 15 && L.endurance.rx.isolation.reps >= 20);
    t('39 · endurance rests shortest', L.endurance.rx.compound.rest < L.muscle.rx.compound.rest);
    t('39 · every range is a real range', Object.values(L).every(f => Object.values(f.rx).every(r => r.repMin < r.reps && r.sets >= 1 && r.rest >= 0)));

    /* onboarding */
    b0.G.startOnboarding(); b0.G.onbDraft.aim = 'strong'; b0.G.step = 1; b0.G.onbRender();
    const onb = b0.d.getElementById('onbBody').textContent;
    t('39 · Get stronger is an aim you can pick', !!b0.d.querySelector('[data-onbaim="strong"]'));
    t('39 · picking an aim says what it means for your lifting', /Your lifting: strength/.test(onb) && /Big lifts 3 to 6 reps/.test(onb), onb.slice(0, 200));
    b0.d.querySelector('[data-onbaim="lose"]').click(); b0.G.onbRender();
    t('39 · and changes as you change the aim', /Your lifting: keep muscle while losing fat/.test(b0.d.getElementById('onbBody').textContent));

    for (const [aim, focus] of [['strong','strength'],['build','muscle'],['lose','keep'],['endure','endurance']]) {
      const b = await boot(); allErrs.push(...b.errs); onboard(b.G, { aim });
      const want = b.G.recommendedFor('bench', focus), got = bench(b.G);
      t('39 · onboarding for ' + aim + ' sets the templates to the ' + focus + ' ranges',
        got.repMin === want.repMin && got.reps === want.reps && got.rest === want.rest && got.sets === want.sets,
        JSON.stringify(got) + ' vs ' + JSON.stringify(want));
    }

    /* changing focus later, without losing your own changes */
    const b = await boot(); allErrs.push(...b.errs); onboard(b.G, { aim: 'build' });
    const G = b.G, d = b.d;
    lat(G).reps = 25; lat(G).repMin = 20; G.save();
    G.S.profile.liftFocus = 'strength'; G.save();
    t('39 · changing focus does not silently rewrite your templates', bench(G).reps === 10 && lat(G).reps === 25);
    G.openFocusSheet();
    t('39 · the focus sheet says how many movements differ', /movements? in your templates/.test(d.getElementById('altBody').textContent));
    d.getElementById('focusApply').click();
    t('39 · asking moves them all to the new focus', bench(G).reps === 6 && bench(G).repMin === 3 && lat(G).reps === 15);
    d.getElementById('toastAct').click();
    t('39 · and Undo puts every one back, your own changes included', bench(G).reps === 10 && lat(G).reps === 25);
    G.go('progress'); G.renderAll();
    t('39 · the You screen shows the focus as a setting', /Lifting focus/.test(d.getElementById('s-progress').textContent));
    G.openFocusSheet(); d.querySelector('[data-focus="aim"]').click();
    t('39 · and it can go back to following your aim', G.liftFocus() === 'muscle' && !G.S.profile.liftFocus);
    G.closeSheets();

    /* the template editor */
    G.openTplEdit('t_push');
    const ed = () => d.getElementById('tplEditBody').textContent;
    t('39 · the editor names the focus at the top', /Lifting focus: build muscle/.test(ed()));
    t('39 · and flags the movement you changed', /Recommended for build muscle/.test(ed()) && /set differently/.test(ed()));
    const useIt = d.querySelector('[data-tplrec]');
    useIt.click();
    t('39 · one tap sets that movement to the recommendation', G.tplDraft.ex.every(r => G.rowMatches(r)));
    t('39 · movements that match say so', /Matches your focus/.test(ed()));
    G.closeSheets();

    /* in the workout */
    G.startWorkout('t_push');
    const gym = d.getElementById('gymBody').textContent;
    t('39 · the workout opens with the focus and how hard to push', /Build muscle/.test(gym) && /one to three reps short of failure/.test(gym));
    t('39 · the prescription follows the focus', G.GYM.ex.find(e => e.exId === 'bench').reps === G.recommendedFor('bench', 'muscle').reps);
    G.GYM = null; d.getElementById('gym').classList.remove('on');

    t('39 · the method sheet cites where the numbers come from', (() => { G.openHow();
      const h = d.body.textContent; G.closeSheets();
      return /How many reps/.test(h) && /Schoenfeld/.test(h) && /Helms/.test(h); })());
  }

  /* ---------------------------------------------------------- 39 */
  journey(39, 'Meals sit where food is logged, and earn their place');
  {
    const { d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S;
    const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    G.go('today'); G.renderAll();
    const order = [...d.querySelectorAll('#todayView > *')].map(e => e.classList.contains('mealstrip') ? 'meals'
      : e.classList.contains('glances') ? 'numbers' : e.classList.contains('quicks') ? 'quick' : e.classList.contains('weekstrip') ? 'week' : '').filter(Boolean);
    t('39 · meals sit right under the numbers they feed, above the week', order.join(',') === 'numbers,quick,meals,week', order.join(','));
    t('39 · the per meal mark is 0.4 g per kg of the protein bodyweight basis',
      G.perMealProtein() === Math.round(0.4 * G.proteinBasis(S.profile).kg));
    const keepBody = { h: S.profile.height, w: S.profile.weight };
    S.profile.height = 170; S.profile.weight = 130;
    t('39 · and uses the same adjusted basis as the daily target for a higher BMI',
      G.perMealProtein() === Math.round(0.4 * G.proteinBasis(S.profile).kg) && G.proteinBasis(S.profile).adjusted);
    S.profile.height = keepBody.h; S.profile.weight = keepBody.w;

    G.addFood('oats', 1, 'b'); G.addFood('chicken', 1, 'l'); G.addFood('proteinbar', 1, 's');
    const { slots, per } = G.mealSlots();
    const by = tag => slots.find(s => s.tag === tag);
    t('39 · the meal chosen wins over the time it was logged', by('breakfast').p === G.foodOf('oats').p && by('lunch').p === G.foodOf('chicken').p);
    t('39 · snacks go to the nearest snack', slots.filter(s => !['breakfast','lunch','last','presleep'].includes(s.tag)).some(s => s.p === G.foodOf('proteinbar').p));
    G.renderAll();
    const lunch = d.querySelector('.mealstrip [data-mealslot="l"]');
    t('39 · a meal that reaches the mark is marked done', lunch.classList.contains('done'));
    t('39 · the line under it puts the total first', /of \d+g protein today, which matters most/.test(txt(d.querySelector('.mealstrip').nextElementSibling)));
    d.querySelector('.mealstrip [data-mealslot="d"]').click();
    t('39 · tapping a meal opens the food list on that meal',
      d.getElementById('foodSheet').classList.contains('on')
      && txt([...d.querySelectorAll('#foodSheet [data-foodslot]')].find(b => b.classList.contains('on')).querySelector('span')) === 'Dinner');
    G.closeSheets();

    /* the week, with no extra input asked for */
    for (let i = 1; i <= 3; i++) {
      const k = G.addDays(G.todayKey(), -i), base = G.dateOf(k).getTime();
      S.days[k] = { food: [
        { id: 'oats', n: 'Oats', u: '50g', q: 1, meal: 'b', kcal: 190, p: 40, c: 33, f: 3.5, at: base + 8 * 3600e3 },
        { id: 'chicken', n: 'Chicken', u: '150g', q: 1, meal: 'l', kcal: 250, p: 47, c: 0, f: 6, at: base + 13 * 3600e3 },
        { id: 'pizza', n: 'Pizza', u: 'half', q: 1, meal: 'd', kcal: 640, p: 28, c: 72, f: 26, at: base + 21 * 3600e3 }] };
    }
    const ts = G.timingStats(7);
    t('39 · it works the week out from log times alone', ts && ts.days >= 3 && ts.meals >= 9);
    t('39 · counting meals that reached the mark', ts.hits >= 6, JSON.stringify(ts));
    t('39 · and how long before bed the last food came', ts.lastBeforeBedH !== null && ts.lastBeforeBedH > 0 && ts.lastBeforeBedH < 6, String(ts.lastBeforeBedH));
    t('39 · the coach brief carries it', /Meals: about [\d.]+ a day/.test(G.coachBrief()) && /before bed/.test(G.coachBrief()));
    t('39 · timing never changes the calorie target', (() => { const a = S.targets.kcal; S.targets = G.ownTargets(); return S.targets.kcal === a; })());
    t('39 · and the method sheet says so, with the source', (() => { G.openHow(); const h = d.body.textContent; G.closeSheets();
      return /Schoenfeld and Aragon, 2018/.test(h) && /never touches your targets/.test(h); })());
  }

  /* ---------------------------------------------------------- 40 */
  journey(40, 'One row per food per meal, with a counter, on a screen built for adding');
  {
    const { d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S;
    const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    const today = () => G.dayFood(G.todayKey()).map(x => x.id + ':' + x.meal + ':' + x.q).join(',');

    G.openFood(false);
    const kids = [...d.getElementById('foodBody').children].map(e => (e.className || '').split(' ')[0]);
    t('40 · search comes before the day, not after it', kids.indexOf('foodsearch') < kids.indexOf('plate') && kids.indexOf('foodsearch') <= 3, kids.join(' > '));
    t('40 · meals are tabs showing their calories', d.querySelectorAll('.mealtabs [data-foodslot]').length === 4);
    t('40 · every result shows calories and protein', [...d.querySelectorAll('#foodList .frow')].every(r => /kcal/.test(txt(r)) && /protein/.test(txt(r))));

    d.querySelector('[data-foodslot="b"]').click();
    d.querySelector('#foodList [data-foodadd="egg:1"]').click();
    t('40 · one tap adds', today() === 'egg:b:1');
    t('40 · and the row becomes a counter', !!d.querySelector('#foodList [data-foodstep="egg|b|1"]'));
    d.querySelector('#foodList [data-foodstep="egg|b|1"]').click();
    d.querySelector('#foodList [data-foodstep="egg|b|1"]').click();
    t('40 · three eggs is one row that says 3', today() === 'egg:b:3', today());
    G.addFood('egg', 1, 'b');
    t('40 · adding it again from anywhere counts up, not a new row', today() === 'egg:b:4');
    G.addFood('egg', 1, 'l');
    t('40 · the same food at another meal keeps its own row', today() === 'egg:b:4,egg:l:1');
    t('40 · calories follow the count', Math.round(G.foodTotals(G.todayKey()).kcal) === G.foodOf('egg').kcal * 5);
    G.drawFood();
    t('40 · the plate shows the meal with its counters', /Breakfast/.test(txt(d.querySelector('.platehead')))
      && !!d.querySelector('.plate [data-foodstep="egg|b|-1"]') && /4/.test(txt(d.querySelector('.plate .fq'))));
    for (let i = 0; i < 4; i++) d.querySelector('.plate [data-foodstep="egg|b|-1"]').click();
    t('40 · counting down to nothing takes it off', today() === 'egg:l:1');
    t('40 · with Undo', /taken off/.test(txt(d.getElementById('toast'))) && /Undo/.test(txt(d.getElementById('toast'))));
    d.getElementById('toastAct').click();
    t('40 · which puts it back', /egg:b:1/.test(today()));

    d.querySelector('#foodList [data-foodadd="banana:0.5"]').click();
    t('40 · half a portion still works', /banana:b:0.5/.test(today()));
    G.drawFood();
    t('40 · and shows as a half', /½/.test(txt(d.querySelector('.plate'))));
    d.querySelector('.plate [data-foodstep="banana|b|1"]').click();
    t('40 · one more from a half is one whole, not one and a half', /banana:b:1(,|$)/.test(today()), today());

    /* quick add */
    d.getElementById('foodQuickBtn').click();
    d.getElementById('qaKcal').value = '650'; d.getElementById('qaP').value = '30';
    d.getElementById('qaSave').click();
    t('40 · quick add puts just the numbers in the meal', G.dayFood(G.todayKey()).some(x => x.quick && x.kcal === 650 && x.p === 30 && x.meal === 'b'));
    G.quickAddFood(400, 20, 'b');
    t('40 · each quick add is its own entry, never merged', G.dayFood(G.todayKey()).filter(x => x.quick).length === 2);
    d.getElementById('foodQuickBtn').click();
    d.getElementById('qaKcal').value = '';
    d.getElementById('qaSave').click();
    t('40 · quick add with no calories is refused', G.dayFood(G.todayKey()).filter(x => x.quick).length === 2 && /calories in first/.test(txt(d.getElementById('toast'))));
    G.closeSheets();

    /* days logged before this change */
    const y = G.addDays(G.todayKey(), -1);
    S.days[y] = { food: [
      { id: 'egg', n: 'Egg', u: 'egg', q: 1, meal: 'b', kcal: 78, p: 6.3, c: 0.6, f: 5.3, at: 1 },
      { id: 'egg', n: 'Egg', u: 'egg', q: 1, meal: 'b', kcal: 78, p: 6.3, c: 0.6, f: 5.3, at: 2 },
      { id: 'egg', n: 'Egg', u: 'egg', q: 1, meal: 'l', kcal: 78, p: 6.3, c: 0.6, f: 5.3, at: 3 }] };
    const before = G.foodTotals(y).kcal;
    t('40 · old duplicate rows fold into one counter', G.mergeDayFood(y) === 1
      && G.dayFood(y).map(x => x.meal + ':' + x.q).join(',') === 'b:2,l:1');
    t('40 · without changing the day\'s totals', G.foodTotals(y).kcal === before);
    t('40 · keeping the earliest time for the meal', G.dayFood(y)[0].at === 1);
    t('40 · the search box is a proper tap target', /\.foodsearch input\{[^}]*min-height:48px/.test(require('fs').readFileSync(require('path').join(__dirname, 'index.html'), 'utf8')));
  }

  /* ---------------------------------------------------------- 41 */
  journey(41, 'A weight panel you can read at a glance');
  {
    const { d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S;
    const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    S.weights = [];
    for (let i = 84; i >= 0; i--) { if (i % 7 === 3) continue;
      S.weights.push({ d: G.addDays(G.todayKey(), -i), kg: +(95 - (84 - i) * (0.55 / 7) + [0.9, -0.6, 0.3, -1.1, 0.5][i % 5]).toFixed(1) }); }
    G.setTarget('weight', 85, G.addDays(G.todayKey(), 120)); S.target.from = 95;
    G.go('progress'); G.renderAll();
    const panel = () => d.getElementById('dash');
    t('41 · the numbers come first, as text', !!d.getElementById('wHead') && /kg trend/.test(txt(d.getElementById('wHead')))
      && /since/.test(txt(d.getElementById('wHead'))) && /kg a week/.test(txt(d.getElementById('wHead'))));
    t('41 · there is one legend', d.querySelectorAll('.wkey').length === 1 && !/what you weighed/.test(txt(panel())));
    t('41 · and one forecast, the same in the sentence as on the chart', (() => {
      const svg = d.querySelector('svg.wchart').outerHTML;
      const onChart = (svg.match(/([\d.]+) kg by /) || [])[1];
      return onChart && txt(d.querySelector('.wsentence')).indexOf(onChart + ' kg') >= 0; })());
    t('41 · gridlines are round numbers', G.niceTicks(83.9, 96.6).ticks.every(v => Number.isInteger(v)) && G.niceTicks(83.9, 96.6).ticks.length <= 6);
    t('41 · four ranges to look at', d.querySelectorAll('[data-wrange]').length === 4
      && d.querySelector('[data-wrange="3m"]').classList.contains('on'));
    d.querySelector('[data-wrange="1m"]').click();
    t('41 · choosing one month shows only the last month', G.wSeriesFor('1m').every(p => p.d >= G.addDays(G.todayKey(), -30))
      && d.querySelector('[data-wrange="1m"]').classList.contains('on'));
    t('41 · all time shows everything', G.wSeriesFor('all').length === S.weights.length);
    d.querySelector('[data-wrange="3m"]').click();

    /* never more certain than the data */
    t('41 · three months of data projects the full four weeks', G.wHorizon(G.wSeriesFor('3m')) === 28);
    const few = [{ d: G.addDays(G.todayKey(), -9), kg: 95 }, { d: G.addDays(G.todayKey(), -4), kg: 94.3 }, { d: G.todayKey(), kg: 94.6 }];
    t('41 · nine days of data projects nine days, not four weeks', G.wHorizon(few) === 9);
    t('41 · never less than a week', G.wHorizon([{ d: G.addDays(G.todayKey(), -2), kg: 95 }, { d: G.todayKey(), kg: 94.8 }]) === 7);

    /* the goal */
    t('41 · a goal within reach is a line', /class="wgoal"/.test(G.weightChart()));
    G.setTarget('weight', 70, G.addDays(G.todayKey(), 300)); S.target.from = 95;
    const far = G.weightChart();
    t('41 · a goal far off is named at the edge, not drawn', !/class="wgoal"/.test(far) && /Goal 70 kg, [\d.]+ kg below this/.test(far));

    /* reading a day */
    G.renderAll();
    const svg = d.querySelector('svg.wchart');
    const pts = JSON.parse(svg.dataset.points);
    t('41 · every weigh in can be read back', pts.length === G.wSeriesFor('3m').length && pts.every(p => p.length === 4));
    t('41 · it describes itself for anyone who cannot see it', /Weighed \d+ times over \d+ days: trend/.test(svg.getAttribute('aria-label')));
    t('41 · it can be scrolled past on a phone without grabbing the page', /\.chart\.wchart\{[^}]*touch-action:pan-y/.test(require('fs').readFileSync(require('path').join(__dirname, 'index.html'), 'utf8')));
  }

  /* ---------------------------------------------------------- 42 */
  journey(42, 'The third-party review\'s immediate items (P0 01, 02, 04, 05, 06, 07)');
  {
    const { w, d, G, errs, source } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S;
    const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';

    /* 01 · nothing saved that was not said */
    G.openDay();
    t('P0 01 · sleep starts unanswered', /not answered/.test(txt(d.getElementById('outsleep'))));
    t('P0 01 · stress starts unanswered', /not answered/.test(txt(d.getElementById('outstress'))));
    d.getElementById('saveDay').click();
    const saved = S.days[G.todayKey()];
    t('P0 01 · saving without touching them stores no sleep, stress or rating',
      saved.sleep === undefined && saved.stress === undefined && saved.wb === undefined, JSON.stringify(saved));
    G.openDay();
    const sl = d.querySelector('[data-dayrange="sleep"]');
    sl.value = '6.5'; sl.dispatchEvent(new w.Event('input', { bubbles: true }));
    const st = d.querySelector('[data-dayrange="stress"]');
    st.dispatchEvent(new w.Event('change', { bubbles: true }));
    d.getElementById('saveDay').click();
    t('P0 01 · an answer they give is kept', S.days[G.todayKey()].sleep === 6.5);
    t('P0 01 · even one left at the starting position, once they tap it', S.days[G.todayKey()].stress === 5);

    /* 02 · adults only */
    const b2 = await boot(); allErrs.push(...b2.errs);
    const type = (id, v) => { const el = b2.d.getElementById(id); el.value = String(v); el.dispatchEvent(new b2.w.Event('input', { bubbles: true })); };
    b2.G.startOnboarding(); b2.G.onbDraft.aim = 'lose'; b2.G.step = 2; b2.G.onbRender();
    b2.d.querySelector('[data-onbsex="m"]').click();
    type('onbAge', 16); type('onbHeight', 175); type('onbWeight', 70); b2.G.onbRender();
    t('P0 02 · a 16 year old is welcomed, with the teen version explained', /works a bit differently for you/.test(txt(b2.d.getElementById('onbBody'))));
    t('P0 02 · and can carry on', !b2.d.getElementById('onbNext').disabled);
    t('P0 02 · no calorie figures are shown to them', !/kcal a day to/.test(txt(b2.d.getElementById('onbBody'))));
    type('onbAge', 12); b2.G.onbRender();
    t('P0 02 · under 13 is not supported, and says so', /for people aged 13 and over/.test(txt(b2.d.getElementById('onbBody'))) && b2.d.getElementById('onbNext').disabled);
    type('onbAge', 18); b2.G.onbRender();
    t('P0 02 · at 18 it goes ahead', !b2.d.getElementById('onbNext').disabled && /kcal a day to stay/.test(txt(b2.d.getElementById('onbBody'))));
    S.profile.age = 15; S.targets = G.ownTargets();
    t('P0 02 · an existing profile under 18 gets no calorie or protein target', S.targets.kcal === null && S.targets.protein === null && S.targets.minor);
    S.profile.age = 38; S.targets = G.ownTargets();

    /* 04 · the copy matches the app */
    t('P0 04 · no claim that food is never counted', !/does not count your food/.test(source));
    t('P0 04 · no claim that habits stop at one to start and one to stop', !/One to start and one to stop, at most/.test(source));
    G.openHabitSheet();
    t('P0 04 · the habit sheet says up to three', /Up to three at once/.test(txt(d.getElementById('altSub'))));
    G.closeSheets();

    /* 06 · whose rule it is, and a choice of pace */
    S.profile.aim = 'lose'; S.target = { kind: 'weight', value: 85, by: null, from: S.profile.weight };
    S.targets = G.ownTargets();
    const line = G.calorieLine(G.calorieTarget());
    t('P0 06 · the calorie line says who the rate came from', /natural bodybuilders|clinical guidance for adults|common clinical minimum/.test(line), line);
    const rush = (() => { const keep = S.target; S.target = { kind: 'weight', value: S.profile.weight - 10, by: G.addDays(G.todayKey(), 28), from: S.profile.weight };
      const l = G.calorieLine(G.calorieTarget()); S.target = keep; return l; })();
    t('P0 06 · a goal date that asks too much says where the limit comes from', /natural bodybuilders|clinical guidance for adults/.test(rush), rush);
    t('P0 06 · the method sheet names every population', (() => { G.openHow(); const h = d.body.textContent; G.closeSheets();
      return /natural bodybuilders preparing for competition/.test(h) && /overweight or obesity/.test(h) && /off-season/.test(h) && /adults aged 19 to 78/.test(h); })());
    G.go('progress'); G.renderAll();
    const paceRow = d.querySelector('[data-setting="pace"]');
    t('P0 06 · there is a pace setting', !!paceRow && /Standard/.test(txt(paceRow)));
    paceRow.click();
    t('P0 06 · offering gentle, standard and faster, each explained', d.querySelectorAll('#altBody [data-pace]').length === 3
      && /natural bodybuilders/.test(txt(d.getElementById('altSub'))));
    const before = G.calorieTarget();
    d.querySelector('[data-pace="gentle"]').click();
    const after = G.calorieTarget();
    t('P0 06 · gentle slows the loss and raises the calories', after.deficit <= before.deficit && after.kcal >= before.kcal, before.kcal + ' -> ' + after.kcal);
    t('P0 06 · and the pace row shows the choice', /Gentle/.test(txt(d.querySelector('[data-setting="pace"]'))));
    S.profile.pace = 'standard'; S.targets = G.ownTargets();

    /* 07 · cautious, and asks */
    t('P0 07 · no predictive injury wording', !/before something gives/.test(source));
    t('P0 07 · the fatigue note asks how they feel and points pain to a professional',
      /Your logs suggest more fatigue than usual\. How do you actually feel\?/.test(source) && /GP or physio/.test(source));

    /* 05 · the sign-in account too */
    const ME = '11111111-1111-1111-1111-111111111111';
    const mk = rpcOk => { const calls = [];
      return { calls, fetch: (url, init) => { const u = new URL(url), method = (init && init.method) || 'GET'; calls.push(method + ' ' + u.pathname);
        if (/\/rpc\/delete_my_account$/.test(u.pathname)) return Promise.resolve({ ok: rpcOk, status: rpcOk ? 204 : 404, json: async () => ({}) });
        return Promise.resolve({ ok: true, status: method === 'GET' ? 200 : 204, json: async () => [] }); } }; };
    const signIn = w2 => w2.localStorage.setItem('gauntlet.cloud', JSON.stringify({ url: 'https://fake.supabase.co', key: 'anon', auto: false,
      session: { access_token: 'tok', user_id: ME, email: 'x@y.z' } }));
    const good = mk(true);
    const A = await boot({ fetch: good.fetch, before: signIn }); allErrs.push(...A.errs); onboard(A.G);
    const ra = await A.G.eraseEverything();
    t('P0 05 · the sign-in account is deleted as the last step', ra.ok && good.calls[good.calls.length - 1] === 'POST /rest/v1/rpc/delete_my_account');
    t('P0 05 · only after every data table is cleared', good.calls.indexOf('POST /rest/v1/rpc/delete_my_account') > good.calls.lastIndexOf('GET /rest/v1/state'));
    const bad = mk(false);
    const B = await boot({ fetch: bad.fetch, before: signIn }); allErrs.push(...B.errs); onboard(B.G);
    const rb = await B.G.eraseEverything();
    t('P0 05 · if the database cannot remove the account yet, it says so', !rb.ok && /sign-in account/.test(rb.left.join()));
    t('P0 05 · and keeps the device, so they can try again', !!B.w.localStorage.getItem('gauntlet.cloud'));
    t('P0 05 · the screen says the account is removed too', /removes your sign-in account itself/.test(source) && !/Your sign-in itself stays/.test(source));
  }

  /* ---------------------------------------------------------- 43 */
  journey(43, 'A version built for teenagers: habits, not weight');
  {
    const { w, d, G, errs, source } = await boot(); allErrs.push(...errs);
    const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    const type = (id, v) => { const el = d.getElementById(id); el.value = String(v); el.dispatchEvent(new w.Event('input', { bubbles: true })); };
    G.startOnboarding(); G.onbDraft.aim = 'lose'; G.onbDraft.liftDays = 3; G.step = 2; G.onbRender();
    type('onbAge', 15); G.onbRender();
    const ob = txt(d.getElementById('onbBody'));
    t('43 · a 15 year old is told how it works for them', /No calorie targets, no diets, no weight goals/.test(ob));
    t('43 · and that picking fat loss becomes a fitness plan', /focus on getting fitter and feeling better instead/.test(ob));
    t('43 · weight is optional', /Weight, kg \(optional\)/.test(ob));
    t('43 · no goal weight is asked for', d.getElementById('onbGoal').closest('.nf').style.display === 'none');
    t('43 · nor body fat', d.getElementById('onbBf').closest('.nf').style.display === 'none');
    t('43 · they can carry on without sex, height or weight', !d.getElementById('onbNext').disabled);
    Object.assign(G.onbDraft, { handle: 'teen', cardioDays: 2, checkinDay: 6, kit: G.ALL_KIT.slice() });
    G.step = 5; G.onbRender();
    t('43 · under 16, there is no account: everything stays on the phone', /Kept on this phone/.test(txt(d.getElementById('onbBody'))) && !d.getElementById('onbEmail'));
    G.finishOnboarding();
    const S = G.S;
    t('43 · fat loss became a fitness aim', S.profile.aim === 'hold');
    t('43 · no calorie, protein or maintenance target', S.targets.kcal === null && S.targets.protein === null && S.targets.maintenance === null && S.targets.teen);
    t('43 · no weight goal', !S.target);

    G.go('today'); G.renderAll();
    const home = txt(d.getElementById('todayView'));
    t('43 · home shows meals, sleep and steps, never calories', /meals? logged/.test(home) && /sleep/.test(home) && !/kcal/.test(home), home.slice(0, 160));
    t('43 · no weigh in on the home screen', !d.querySelector('#todayView [data-glance="weigh"]'));
    t("43 · Today's Check-in is one tap away instead", !!d.querySelector('.quicks [data-glance="checkin"]'));
    G.openLog();
    t('43 · no weigh in in the log sheet either', !d.querySelector('#logBody [data-log="weigh"]'));
    G.closeSheets();
    G.openFood(false);
    d.querySelector('#foodList [data-foodadd="egg:1"]').click();
    const food = txt(d.getElementById('foodBody'));
    t('43 · the food screen shows no calories anywhere', !/kcal/.test(food), food.slice(0, 200));
    t('43 · and no quick add of calories', !d.getElementById('foodQuickBtn'));
    t('43 · food still logs normally', G.dayFood(G.todayKey()).length === 1);
    G.closeSheets();

    G.go('progress'); G.renderAll();
    const you = txt(d.getElementById('s-progress'));
    t('43 · the You screen has no weight chart', !d.querySelector('svg.wchart') && /Weight is not tracked while you are under 18/.test(you));
    t('43 · and someone to talk to, with verified contacts', /Someone to talk to/.test(you) && /1800 66 66 66/.test(you) && /50808/.test(you));

    t('43 · lifting is technique first', G.liftFocus() === 'youth');
    G.startWorkout('t_push');
    t('43 · two sets of eight to twelve on the big lifts', G.GYM.ex[0].sets.filter(s => !s.warm).length === 2);
    t('43 · and the session says a coach checking form beats any weight', /coach or PE teacher checking your form/.test(txt(d.getElementById('gymBody'))));
    G.GYM = null; d.getElementById('gym').classList.remove('on');

    G.openDay();
    t('43 · sleep in the check-in shows the aim for their age', /8 to 10 hours at your age/.test(txt(d.getElementById('dayBody'))));
    const st = d.querySelector('[data-dayrange="stress"]');
    st.value = '8'; st.dispatchEvent(new w.Event('input', { bubbles: true }));
    G.drawDay && G.drawDay();
    G.closeSheets(); S.days[G.todayKey()] = Object.assign({}, S.days[G.todayKey()], { stress: 8 }); G.openDay();
    t('43 · a hard day brings support to the check-in', /That sounds like a hard day/.test(txt(d.getElementById('dayBody'))));
    G.closeSheets();
    t('43 · the coach is told never to suggest dieting to a teenager', /under 18, never suggest calorie targets, deficits, dieting/.test(source));
    t('43 · and the method sheet explains all of it with sources', (() => { G.openHow(); const h = d.body.textContent; G.closeSheets();
      return /If you are under 18/.test(h) && /Golden and colleagues, 2016/.test(h) && /World Health Organization/.test(h) && /8 to 10 hours/.test(h); })());

    /* the adult experience is untouched */
    S.profile.age = 38; S.profile.weight = 92; S.profile.height = 180; S.profile.sex = 'm'; S.profile.detailsSet = true;
    S.targets = G.ownTargets();
    t('43 · an adult still gets calorie targets', S.targets.kcal > 1200 && !S.targets.teen);
    t('43 · and the adult lifting focus', G.liftFocus() !== 'youth');
  }

  /* ---------------------------------------------------------- 44 */
  journey(44, 'Review quick wins: restore, sources, toasts, and rules of thumb said as such');
  {
    let reloads = 0;
    const { w, d, G, errs, source } = await boot({ before: w2 => { w2.__reload = () => { reloads++; }; } }); allErrs.push(...errs);
    onboard(G);
    const S = G.S;
    const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';

    /* P2-04 · the download really is everything, and it restores */
    G.startHabit('walk_after'); G.toggleHabitDay(G.todayKey(), 'start');
    G.setTarget('weight', 85, G.addDays(G.todayKey(), 120)); S.target.from = S.profile.weight;
    S.weights.push({ d: G.todayKey(), kg: 91.4 }); G.addFood('egg', 2, 'b'); S.profile.pace = 'gentle'; G.save();
    const x = JSON.parse(JSON.stringify(G.exportPayload()));
    t('P2-04 · the download now includes habits, the goal and every setting', !!x.state && !!x.state.habits && !!x.state.target && x.state.profile.pace === 'gentle');
    const st = G.stateFromExport(x);
    t('P2-04 · it reads back as a complete copy', JSON.stringify(st) === JSON.stringify(JSON.parse(JSON.stringify(S))));
    t('P2-04 · with a plain summary of what is in it', /1 weigh in/.test(G.restoreSummary(st, x)) && /workout/.test(G.restoreSummary(st, x)), G.restoreSummary(st, x));
    /* change this phone, then restore */
    S.weights = []; S.habits = {}; S.profile.pace = 'faster'; G.save();
    G.openData();
    t('P2-04 · the data sheet offers a restore', !!d.getElementById('restoreBtn') && !!d.getElementById('restoreFile'));
    G.closeSheets();
    t('P2-04 · restoring replaces the data and reloads', G.applyRestore(st) && reloads === 1);
    const again = await boot({ before: w2 => { for (const k of Object.keys(w.localStorage)) w2.localStorage.setItem(k, w.localStorage.getItem(k)); } });
    allErrs.push(...again.errs);
    const R = again.G.S;
    t('P2-04 · after the restore the weigh ins are back', R.weights.some(p => p.kg === 91.4));
    t('P2-04 · and the habit, with its tick', !!again.G.currentHabit('start') && again.G.habitWeek('start').slice(-1)[0].done);
    t('P2-04 · and the goal and the pace', R.target && R.target.value === 85 && R.profile.pace === 'gentle');
    t('P2-04 · and the food', again.G.dayFood(again.G.todayKey()).some(f => f.id === 'egg' && f.q === 2));
    t('P2-04 · the data it replaced was kept, so it can be undone', !!w.localStorage.getItem(G.RESTORE_BACKUP));
    again.G.openData();
    t('P2-04 · and the data sheet offers the undo', !!again.d.getElementById('restoreUndo'));
    again.G.closeSheets();
    /* an older download, before the full copy was included */
    const old = Object.assign({}, x); delete old.state;
    const oldSt = G.stateFromExport(old);
    t('P2-04 · an older download still restores its weigh ins, days and workouts',
      oldSt.weights.length === x.weights.length && Object.keys(oldSt.days).length === Object.keys(x.days).length && Array.isArray(oldSt.workouts));
    let refused = 0;
    [null, {}, { app: 'Other' }, { app: 'Gauntlet', state: { weights: [] } }, { app: 'Gauntlet', state: { profile: {}, weights: 'x' } }]
      .forEach(bad => { try { G.stateFromExport(bad); } catch (e) { refused++; } });
    t('P2-04 · files that are not a Gauntlet download, or are damaged, are refused', refused === 5, refused + ' of 5');

    /* P1-09 · where the figures come from */
    G.addCustomFood({ id: 'cf_bread', n: "Mam's brown bread", u: 'slice', mine: true, kcal: 180, p: 6, c: 30, f: 2 });
    G.addFood('cf_bread', 1, 'b');
    G.openFood(false); d.querySelector('[data-foodslot="b"]').click();
    const plate = txt(d.querySelector('.plate'));
    t('P1-09 · a built in food says typical values', /typical values/.test(plate), plate.slice(0, 160));
    t('P1-09 · your own food says it came from your label', /from your label/.test(plate));
    G.quickAddFood(500, 20, 'b'); G.drawFood();
    t('P1-09 · quick add says it is numbers you typed', /numbers you typed/.test(txt(d.querySelector('.plate'))));
    t('P1-09 · the serving basis is shown beside it', /egg ·/.test(txt(d.querySelector('.plate'))));

    /* P2-05 · toasts out of the way */
    G.toast('Test');
    t('P2-05 · with a sheet open, a message appears at the top, not over the sheet', d.getElementById('toast').classList.contains('top'));
    G.closeSheets(); G.toast('Test');
    t('P2-05 · otherwise at the bottom', !d.getElementById('toast').classList.contains('top'));
    t('P2-05 · taps go through it, except for Undo', /\.toast\.on\{[^}]*pointer-events:none/.test(source) && /\.toast\.on button\{pointer-events:auto\}/.test(source));

    /* P2-06 · the colour defined as itself */
    t('P2-06 · the completed set border has a real colour in light mode', /--good-line:#[0-9a-f]{6};/.test(source) && !/--good-line:var\(--good-line\)/.test(source));

    /* P1-14 and the evidence audit */
    t('P1-14 · cycle context says it may not apply', /It may not apply to you/.test(source) && /irregular cycles, hormonal contraception/.test(source));
    G.openHow(); const how = d.body.textContent; G.closeSheets();
    t('evidence · the protein choices are called choices', /this app's choices within that evidence/.test(how));
    t('evidence · easy weeks are a rule of thumb', /sensible rule of thumb, not a requirement/.test(how));
    t('evidence · the easing off thresholds are prompts, not predictions', /not validated predictions of injury or burnout/.test(how));
    t('evidence · step bands are descriptive, not health thresholds', /descriptive bands, not a health threshold/.test(source));
  }

  /* ---------------------------------------------------------- 45 */
  journey(45, 'Supersets and giant sets, one PR per movement, and a red cross for short sets');
  {
    const { w, d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S;
    const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    const L = () => [{ exId: 'a', rest: 60 }, { exId: 'b', rest: 90 }, { exId: 'c', rest: 120 }, { exId: 'd', rest: 60 }];

    /* the rules */
    let l = G.toggleLinkNext(L(), 0);
    let gi = G.groupInfo(l);
    t('45 · joining two makes a superset', gi[0] && gi[1] && gi[0].id === gi[1].id && gi[0].label === 'Superset' && !gi[2]);
    l = G.toggleLinkNext(l, 1); gi = G.groupInfo(l);
    t('45 · a third makes it a giant set', gi[2] && gi[2].id === gi[0].id && gi[0].label === 'Giant set' && gi[0].size === 3);
    t('45 · labelled A1, A2, A3', gi[0].letter === 'A' && gi[1].pos === 2 && gi[2].pos === 3);
    l = G.toggleLinkNext(l, 1); gi = G.groupInfo(l);
    t('45 · splitting after the second leaves a superset and a single', gi[0] && gi[1] && !gi[2] && gi[0].label === 'Superset');
    l = G.toggleLinkNext(L(), 0); l = G.toggleLinkNext(l, 2); gi = G.groupInfo(l);
    t('45 · two separate groups are A and B', gi[0].letter === 'A' && gi[2].letter === 'B' && gi[0].id !== gi[2].id);
    l = G.toggleLinkNext(L(), 0); const moved = [l[1], l[0], l[2], l[3]]; G.normaliseGroups(moved);
    t('45 · swapping within a group keeps it', G.groupInfo(moved)[0] && G.groupInfo(moved)[1]);
    const broke = [l[0], l[2], l[1], l[3]]; G.normaliseGroups(broke);
    t('45 · moving one away breaks a pair, with no orphan group left', !G.groupInfo(broke)[0] && !G.groupInfo(broke)[2] && broke.every(x => !x.group));
    t('45 · the rest after a group is the longest in it', G.groupRest(L().map((x, i) => i < 3 ? Object.assign(x, { group: 'g' }) : x), G.groupInfo(L().map((x, i) => i < 3 ? Object.assign(x, { group: 'g' }) : x))[0]) === 120);

    /* the template editor */
    const tid = S.templates[0].id;
    G.openTplEdit(tid);
    t('45 · the editor offers a superset button between movements', !!d.querySelector('[data-tpllink="0"]'));
    d.querySelector('[data-tpllink="0"]').click();
    t('45 · pressing it groups the pair and says so', /Superset A/.test(txt(d.getElementById('tplEditBody')))
      && d.querySelector('[data-tpllink="0"]').textContent.trim() === 'Split');
    d.querySelector('[data-tpllink="1"]').click();
    t('45 · pressing the next one makes a giant set', /Giant set A/.test(txt(d.getElementById('tplEditBody'))));
    d.getElementById('tplSave').click();
    const saved = S.templates.find(x => x.id === tid).ex;
    t('45 · the grouping is saved with the template', saved[0].group && saved[0].group === saved[1].group && saved[1].group === saved[2].group);
    G.openTplEdit(tid); d.querySelector('[data-tpldel="1"]').click();
    t('45 · removing a member tidies the group', G.groupInfo(G.tplDraft.ex)[0] && G.groupInfo(G.tplDraft.ex)[0].size === 2);
    d.getElementById('toastAct').click();
    t('45 · and Undo puts the giant set back', G.groupInfo(G.tplDraft.ex)[0].size === 3);
    G.closeSheets();

    /* the workout */
    G.startWorkout(tid);
    const body = () => txt(d.getElementById('gymBody'));
    t('45 · the workout shows the giant set with badges', /Giant set A/.test(body()) && /A1/.test(body()) && /A3/.test(body()));
    const tick = (i, j, kg, reps) => { const s = G.GYM.ex[i].sets[j]; s.kg = kg; s.reps = reps; d.querySelector('[data-done="' + i + ':' + j + '"]').click(); };
    tick(0, 0, 40, 8);
    t('45 · after A1 there is no rest, and it says what is next', !d.getElementById('restBar').classList.contains('on') && /Now A2/.test(txt(d.getElementById('toast'))));
    tick(1, 0, 20, 10);
    t('45 · nor after A2', !d.getElementById('restBar').classList.contains('on'));
    tick(2, 0, 30, 10);
    t('45 · after A3 the rest clock starts for the whole group', d.getElementById('restBar').classList.contains('on') && /Giant set A/.test(txt(d.getElementById('restBar'))));
    /* the menu can split and join in the workout too */
    G.openExMenu(0);
    t('45 · the exercise menu can split it', /Split from/.test(txt(d.getElementById('exMenuBody'))));
    d.querySelector('[data-exact="link:0"]').click();
    t('45 · splitting A1 off leaves a superset of the other two', !G.groupInfo(G.GYM.ex)[0] && G.groupInfo(G.GYM.ex)[1] && G.groupInfo(G.GYM.ex)[1].label === 'Superset');
    G.openExMenu(0); d.querySelector('[data-exact="link:0"]').click();
    t('45 · and joining it back makes the giant set again', G.groupInfo(G.GYM.ex)[0] && G.groupInfo(G.GYM.ex)[0].size === 3);
    t('45 · updating the template from the workout keeps the grouping', (() => { const r = G.gymToTemplateRows(); return r[0].group && r[0].group === r[2].group; })());
    G.GYM = null; d.getElementById('gym').classList.remove('on'); G.closeSheets();

    /* one PR per movement */
    const bench = S.templates.find(x => x.ex.some(r => r.exId === 'bench')) || S.templates[0];
    S.lifts.bench = [{ d: G.addDays(G.todayKey(), -7), sets: [{ kg: 60, reps: 8 }, { kg: 60, reps: 8 }] }];
    G.startWorkout(bench.id);
    const bi = G.GYM.ex.findIndex(e => e.exId === 'bench');
    const E = G.GYM.ex[bi];
    const work = E.sets.map((s, j) => j).filter(j => !E.sets[j].warm);
    const range = G.repRangeFor({ reps: E.reps, repMin: E.repMin });
    const set = (j, kg, reps) => { Object.assign(E.sets[j], { kg, reps, done: true }); };
    set(work[0], 65, range.bottom); set(work[1], 65, range.bottom); if (work[2] !== undefined) set(work[2], 65, range.bottom);
    G.drawGym();
    const golds = () => d.querySelectorAll('.exc[data-ex="' + bi + '"] .setline.ispr').length;
    t('45 · three sets at a new best weight show one gold PR, not three', golds() === 1, String(golds()));
    t('45 · on the first set that earned it', G.prIndex(E) === work[0]);
    set(work[1], 67.5, range.bottom); G.drawGym();
    t('45 · a heavier later set takes the one PR', golds() === 1 && G.prIndex(E) === work[1]);

    /* the red cross */
    set(work[0], 60, range.bottom - 2); G.drawGym();
    const firstLine = d.querySelectorAll('.exc[data-ex="' + bi + '"] .setline')[work[0]];
    t('45 · a set short of the minimum reps shows a red cross', firstLine.classList.contains('short') && /M6 6l12 12/.test(firstLine.innerHTML));
    t('45 · and says so to a screen reader', /Short of the target reps/.test(firstLine.querySelector('.tick').getAttribute('aria-label')));
    set(work[1], 80, range.bottom - 1); G.drawGym();
    t('45 · a heavy set that falls short is never the PR', G.prIndex(E) !== work[1] && d.querySelectorAll('.exc[data-ex="' + bi + '"] .setline')[work[1]].classList.contains('short'));
    set(work[1], 67.5, range.bottom); G.drawGym();
    t('45 · hitting the minimum exactly is not short', !d.querySelectorAll('.exc[data-ex="' + bi + '"] .setline')[work[1]].classList.contains('short'));
    E.sets.forEach(s => { if (s.warm) { s.done = true; s.reps = 1; } }); G.drawGym();
    t('45 · warm up sets never get a cross', !d.querySelector('.exc[data-ex="' + bi + '"] .setline.warm.short'));
    /* numbers fit their boxes (found by looking at it in a real browser: 62.5 read as "62.") */
    const css = require('fs').readFileSync(require('path').join(__dirname, 'index.html'), 'utf8');
    t('45 · the browser\'s own number arrows no longer take room from the weight',
      /\.stepper input::-webkit-inner-spin-button\{-webkit-appearance:none/.test(css) && /\.stepper input\{[^}]*appearance:textfield/.test(css));
    t('45 · each number is fitted to its box, on drawing, typing and tapping plus', typeof G.fitNumbers === 'function'
      && /fitNumbers\(\$\('gymBody'\)\)/.test(css) && /fitNumbers\(box\.closest\('\.stepper'\)\)/.test(css));
    t('45 · small phones get narrower plus and minus buttons', /@media \(max-width:340px\)\{ \.stepper\{grid-template-columns:28px/.test(css));
    G.GYM = null; d.getElementById('gym').classList.remove('on');
  }

  /* ---------------------------------------------------------- 46 */
  journey(46, 'What matters today, how much it has to go on, and a sleep view');
  {
    const { w, d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S;
    const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    const day = n => G.addDays(G.todayKey(), -n);
    const setDay = (n, o) => { S.days[day(n)] = Object.assign({}, S.days[day(n)], o); };

    /* P1-12 confidence */
    t('P1-12 · with nothing logged, it says so', G.confidence('sleep').level === 'none' && /nothing logged yet/.test(G.confidence('sleep').text));
    setDay(1, { sleep: 7 }); setDay(2, { sleep: 7.5 });
    t('P1-12 · a couple of nights is building a baseline, and says how far along', G.confidence('sleep').level === 'building' && /2 of the 5 nights/.test(G.confidence('sleep').text), G.confidence('sleep').text);
    for (let i = 3; i <= 6; i++) setDay(i, { sleep: 7 });
    t('P1-12 · enough nights says what it is based on', G.confidence('sleep').level === 'fair' && /based on 6 of the last 14 nights/.test(G.confidence('sleep').text));
    for (let i = 7; i <= 13; i++) setDay(i, { sleep: 7 });
    t('P1-12 · lots of nights is good', G.confidence('sleep').level === 'good');
    setDay(3, { auto: { sim: true, sleep: 3 }, sleep: undefined });
    t('P1-12 · demo tracker data never counts', G.realSleep(S.days[day(3)]) === null);

    /* P1-01 sleep */
    S.days = {};
    /* today's check in records last night, so the last seven nights are today and the six days before */
    for (let i = 0; i <= 6; i++) setDay(i, { sleep: [5.5, 6, 6.2, 5.8, 6.5, 6, 5.9][i] });
    const st = G.sleepStats();
    t('P1-01 · it averages the last week', st.last7 === 7 && Math.abs(st.avg - 5.99) < 0.02, st.avg.toFixed(2));
    t('P1-01 · works out the shortfall against 7 hours', Math.abs(st.short - (7 * 7 - 41.9)) < 0.05, st.short.toFixed(2));
    t('P1-01 · and how much it swings', st.sd > 0 && st.sd < 1);
    t('P1-01 · the adult aim is 7 hours or more', G.sleepTarget().lo === 7);
    t('P1-01 · lights out is worked back from wake time', (() => { S.profile.wakeTime = '07:00'; return G.lightsOut() === '23:15'; })(), G.lightsOut());
    G.openSleep();
    const sheet = txt(d.getElementById('altBody')) + ' ' + txt(d.getElementById('altSub'));
    t('P1-01 · the sleep view shows 14 nights, the average and the aim', d.querySelectorAll('#altBody .sleepchart .sb').length === 14 && /6\.0h/.test(sheet) && /7 hours or more/.test(sheet));
    t('P1-01 · says when to turn in tonight', /lights out around 23:15/.test(sheet));
    t('P1-01 · the bedtime sits inside its sentence, not on a line of its own',
      !!d.querySelector('#altBody .method strong.inl') && !d.querySelector('#altBody .method span b'));
    t('P1-01 · and is honest about regularity needing bed and wake times', /needs bed and wake times/.test(sheet));
    t('P1-01 · with its confidence label', /based on 7 of the last 14 nights/.test(sheet));
    G.closeSheets();
    G.go('progress'); G.renderAll();
    t('P1-01 · sleep sits on the You screen too', /Sleep/.test(txt(d.getElementById('s-progress'))) && !!d.querySelector('#s-progress [data-opensleep]'));

    /* P1-04 priorities */
    G.go('today'); G.renderAll();
    const prios = () => [...d.querySelectorAll('#todayView .prio')];
    t('P1-04 · a short week of sleep puts protecting it on the list', prios().some(p => p.classList.contains('p-sleep'))
      && /averaged 6\.0 hours/.test(txt(d.getElementById('todayView'))));
    t('P1-04 · every item says why', prios().every(p => txt(p.querySelector('.pt span')).length > 20));
    setDay(1, { stress: 8 }); G.renderAll();
    t('P1-04 · a stressful day yesterday is raised', prios().some(p => p.classList.contains('p-stress')));
    S.profile.checkinDay = G.dowIdx(); S.checkins = []; G.renderAll();
    t('P1-04 · the weekly check in comes first on its day', prios()[0].classList.contains('p-checkin'));
    S.target = { kind: 'weight', value: 85, by: null, from: 95 }; S.weights = [{ d: day(10), kg: 92 }]; G.renderAll();
    t('P1-04 · never more than three', prios().length === 3, String(prios().length));
    t('P1-04 · and ranked, so the weigh in waits when more matters', !prios().some(p => p.classList.contains('p-weigh')));
    t('P1-04 · numbered in order', prios().map(p => txt(p.querySelector('.pn'))).join() === '1,2,3');
    t('P1-04 · advice built on data says how much', prios().filter(p => p.classList.contains('p-sleep')).every(p => !!p.querySelector('.conf')));

    /* quiet when there is nothing to say */
    S.days = {}; S.checkins = [{ weekOf: G.mondayKey() }]; S.target = null; G.renderAll();
    t('P1-04 · with nothing worth raising, the section is not shown at all', prios().length === 0 && !/What matters today/.test(txt(d.getElementById('todayView'))));
    setDay(0, { sleep: 5 }); G.renderAll();
    t('P1-04 · one short night is mentioned gently, not treated as a pattern', /One night is not a pattern/.test(txt(d.getElementById('todayView'))));
    t('P1-04 · sleep advice waits for three nights before calling it a pattern', !/averaged/.test(txt(d.getElementById('todayView'))));
  }

  /* ---------------------------------------------------------- 47 */
  journey(47, 'Coming back after a break, pain that is handled properly, and readiness against your own usual');
  {
    const { w, d, G, errs } = await boot(); allErrs.push(...errs);
    onboard(G);
    const S = G.S;
    const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    const day = n => G.addDays(G.todayKey(), -n);

    /* P1-10 */
    t('P1-10 · under two weeks, nothing changes', G.breakCut(13) === 0);
    t('P1-10 · two weeks, 5% lighter', G.breakCut(14) === 0.05 && G.breakCut(27) === 0.05);
    t('P1-10 · four weeks, 10%', G.breakCut(28) === 0.10 && G.breakCut(55) === 0.10);
    t('P1-10 · eight weeks or more, 20%', G.breakCut(56) === 0.20 && G.breakCut(200) === 0.20);
    const row = { exId: 'bench', sets: 3, reps: 8, repMin: 5 };
    S.lifts.bench = [{ d: day(3), sets: [{ kg: 80, reps: 8 }, { kg: 80, reps: 8 }, { kg: 80, reps: 8 }] }];
    const recent = G.nextPrescription('bench', row);
    t('P1-10 · three days ago: normal progression, no welcome back', recent.kind !== 'return', recent.kind);
    S.lifts.bench[0].d = day(35);
    const base = G.nextPrescriptionBase('bench', row), back = G.nextPrescription('bench', row);
    t('P1-10 · five weeks off: 10% under what it would otherwise be, on a real plate step',
      back.kind === 'return' && back.kg < base.kg && Math.abs(back.kg - base.kg * 0.9) <= 2.5 && back.kg % 2.5 === 0, base.kg + ' -> ' + back.kg);
    t('P1-10 · and says why, plainly', /5 weeks since you last did this/.test(back.why) && /10% lighter/.test(back.why));
    S.lifts.bench = [{ d: day(35), sets: [{ kg: 0, reps: 10 }] }];
    t('P1-10 · a bodyweight movement is never given a weight', G.nextPrescription('pushup', { exId: 'pushup', sets: 3, reps: 12 }).kg === null || G.nextPrescription('pushup', { exId: 'pushup', sets: 3, reps: 12 }).kind !== 'return');
    S.lifts.bench = [{ d: day(35), sets: [{ kg: 80, reps: 8 }] }];
    S.workouts = [{ id: 'w1', d: day(35), name: 'Push', minutes: 50, volume: 4200, sets: 12, ex: [] }];
    G.startWorkout(S.templates.find(x => x.ex.some(r => r.exId === 'bench')).id);
    t('P1-10 · the session opens with a welcome back', /Welcome back\. 5 weeks since your last session/.test(txt(d.getElementById('gymBody'))));
    t('P1-10 · and the movement says welcome back too', /Welcome back/.test(txt(d.querySelector('.rxline'))));

    /* P1-11 */
    t('P1-11 · 0 to 3 is carry on', G.painAdvice(2, []).code === 'ok');
    t('P1-11 · 4 and 5 are carry on lighter, if it settles by morning', G.painAdvice(4, []).code === 'ease' && G.painAdvice(5, []).code === 'ease' && /settles by tomorrow morning/.test(G.painAdvice(5, []).s));
    t('P1-11 · 6 and above is stop for today', G.painAdvice(6, []).code === 'swap' && G.painAdvice(10, []).code === 'swap');
    t('P1-11 · any red flag means stop and get it checked, whatever the number', G.PAIN_FLAGS.every(([k]) => G.painAdvice(1, [k]).code === 'check'));
    t('P1-11 · and it names a GP or physio', /GP or physio/.test(G.painAdvice(1, ['swell']).s));
    const bi = G.GYM.ex.findIndex(e => e.exId === 'bench');
    G.openExMenu(bi);
    t('P1-11 · the exercise menu offers "This one hurts"', /This one hurts/.test(txt(d.getElementById('exMenuBody'))));
    d.querySelector('[data-exact="hurt:' + bi + '"]').click();
    t('P1-11 · it asks for a rating and warning signs, with nothing preselected', /not answered/.test(txt(d.getElementById('painOut'))) && d.querySelectorAll('[data-painflag]').length === 5 && txt(d.getElementById('painResult')) === '');
    const r = d.getElementById('painRange'); r.value = '4'; r.dispatchEvent(new w.Event('input', { bubbles: true }));
    t('P1-11 · at 4 it offers to carry on lighter, or swap', /carry on, lighter/.test(txt(d.getElementById('painResult'))) && !!d.querySelector('[data-painact="lighter"]') && !!d.querySelector('[data-painact="swap"]'));
    t('P1-11 · and is honest that a swap is not a guarantee for an injury', /not a guarantee for an injury/.test(txt(d.getElementById('painResult'))));
    const before = G.GYM.ex[bi].sets.filter(s => !s.warm && !s.done).map(s => +s.kg);
    d.querySelector('[data-painact="lighter"]').click();
    const after = G.GYM.ex[bi].sets.filter(s => !s.warm && !s.done).map(s => +s.kg);
    t('P1-11 · carrying on lighter drops every remaining set a step', after.every((v, i2) => !before[i2] || v < before[i2]), before + ' -> ' + after);
    t('P1-11 · and records it for tomorrow morning', S.painLog && S.painLog[0].exId === 'bench' && S.painLog[0].during === 4 && S.painLog[0].morning === null);
    G.openExMenu(bi); d.querySelector('[data-exact="hurt:' + bi + '"]').click();
    d.querySelector('[data-painflag="nerve"]').click();
    t('P1-11 · ticking numbness or tingling changes the call to stop and get checked', /Stop this movement today, and get it checked/.test(txt(d.getElementById('painResult')))
      && !d.querySelector('[data-painact="lighter"]') && !!d.querySelector('[data-painact="drop"]'));
    const n0 = G.GYM.ex.length;
    d.querySelector('[data-painact="drop"]').click();
    t('P1-11 · taking it out of today removes it', G.GYM.ex.length === n0 - 1);
    G.GYM = null; d.getElementById('gym').classList.remove('on'); G.closeSheets();
    /* the morning after */
    S.painLog = [{ exId: 'bench', d: day(1), during: 4, flags: [], outcome: 'lighter', morning: null }];
    G.go('today'); G.renderAll();
    t('P1-11 · the next morning it asks how it is', !!d.querySelector('.prio.p-pain') && /How is it this morning/.test(txt(d.querySelector('.prio.p-pain'))));
    d.querySelector('[data-painmorning="0:still"]').click();
    t('P1-11 · not settled once: go lighter or swap next time', /go lighter or swap it next time/.test(txt(d.getElementById('toast'))));
    S.painLog.unshift({ exId: 'bench', d: day(1), during: 5, flags: [], outcome: 'lighter', morning: null });
    G.renderAll(); d.querySelector('[data-painmorning="0:worse"]').click();
    t('P1-11 · not settled twice: it says to see a physio', /Worth seeing a physio/.test(txt(d.getElementById('toast'))));
    S.painLog.unshift({ exId: 'bench', d: day(1), during: 3, flags: ['sharp'], outcome: 'drop', morning: null });
    t('P1-11 · a red flag is not turned into a morning check, it was already a see-someone', !G.painMorningDue().some(p => p.flags.length));

    /* P1-02 */
    S.days = {}; S.painLog = [];
    const rb = G.readiness();
    t('P1-02 · with no history it builds a baseline rather than guessing', rb.level === 'building' && /Building your baseline/.test(rb.text));
    for (let i = 1; i <= 14; i++) S.days[day(i)] = { sleep: 7.5 + (i % 3) * 0.2, stress: 4 + (i % 2), wb: 7 };
    S.days[day(0)] = { sleep: 7.6 }; S.days[day(1)] = Object.assign({}, S.days[day(1)], { stress: 4, wb: 7 });
    t('P1-02 · a normal day reads as about your usual', G.readiness().level === 'usual', JSON.stringify(G.readiness()));
    S.days[day(0)] = { sleep: 5.2 }; S.days[day(1)] = Object.assign({}, S.days[day(1)], { stress: 8, wb: 4 });
    const low = G.readiness();
    t('P1-02 · short sleep, high stress and a bad day read as lower than usual', low.level === 'lower');
    t('P1-02 · and it names what is driving it, with the numbers', low.drivers.some(x => /less sleep than usual \(5\.2h/.test(x)) && low.drivers.some(x => /more stress/.test(x)), low.drivers.join(' | '));
    S.days[day(0)] = { sleep: 8.8 }; S.days[day(1)] = Object.assign({}, S.days[day(1)], { stress: 2, wb: 9 });
    t('P1-02 · and better than usual when it is', G.readiness().level === 'better');
    S.days[day(0)] = { sleep: 5.2 }; S.days[day(1)] = Object.assign({}, S.days[day(1)], { stress: 8, wb: 4 });
    const i = G.dowIdx(), lift = S.plan.days.find(x => x.templateId);
    S.plan.days[i] = Object.assign({}, lift, { dow: i }); S.week[i] = { done: [] }; S.checkins = [{ weekOf: G.mondayKey() }];
    G.go('today'); G.renderAll();
    t('P1-02 · on a training day, lower readiness joins today\'s priorities', !!d.querySelector('.prio.p-readiness'));
    t('P1-02 · suggesting a lighter session, not skipping it', /can still go ahead/.test(txt(d.querySelector('.prio.p-readiness'))));
    G.go('progress'); G.renderAll();
    t('P1-02 · readiness has its own panel on You, with what it is based on', /Readiness/.test(txt(d.getElementById('s-progress'))) && /based on \d+ of the last 28 days/.test(txt(d.getElementById('s-progress'))));
    t('robustness · a workout saved without a volume no longer crashes the You screen', (() => {
      S.workouts.unshift({ id: 'w_old', d: day(2), name: 'Old', ex: [] });
      try { G.go('progress'); G.renderAll(); return true; } catch (e) { return false; } })());
    t('P1-02 · and never shows a single made-up score', !/\d+ ?\/ ?100|readiness score/i.test(txt(d.getElementById('s-progress'))));
  }

  const r = s.report(allErrs);
  if (require.main === module) process.exit(r.fail ? 1 : 0);
})();
