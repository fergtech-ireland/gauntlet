/* =====================================================================
   Week in review (build 68)

   Feargal: after the weekly check-in, show the person what their week did,
   from their own logs, and what happens if it carries on, good and bad, for
   every number they log. Make it something people have not seen before.

   What other apps do, and what this does differently:
     MyFitnessPal  "Complete diary": one number, the weight in five weeks if
                   every day were like today. Calories only, one day, one future.
     MacroFactor   a weekly check-in that moves the calorie target. Adherence
                   neutral, no picture of what the habits are doing to the body.
     WHOOP         weekly and monthly reports of strain, recovery and sleep, and
                   how logged behaviours went with recovery. Looks back only.
   Gauntlet's review does three things none of them do:
     1. The fork. Two futures twelve weeks out, both built from this week's
        own logs: the week as it was, and the week rebuilt from the person's
        own better days (the best three days for each number, so it is a week
        they have already half lived, not an ideal from a textbook).
     2. Fat and muscle, not just weight. Each future is split into fat lost
        and muscle lost, moved by protein, lifting, sleep and the speed of
        the loss, so missing protein shows up as muscle given away.
     3. Their own evidence. Patterns from their own logs held up against the
        published effect ("after short nights you ate 310 kcal more; the
        research average is about 385").
   Plus what each number is worth on its own (the one lever that moves the
   most), what happens if it is overdone, a protein ladder for weeks of
   missing it, and one thing for next week as an if-then plan.

   The evidence (also in How the numbers are worked out):
     Energy      Hall and colleagues, Lancet 2011: the body slows as it gets
                 lighter, about 22 kcal a day per kg (10 kcal a day per lb), so
                 each week is worked out from the new weight, not a straight
                 line at 7,700 kcal a kg.
     Lean share  Heymsfield and colleagues 2014: about a quarter of weight lost
                 is fat-free mass as a rough rule, varying widely.
     Lifting     Sardeli and colleagues 2018 (6 RCTs): resistance training cut
                 the lean mass lost while dieting by about 93%.
     Protein     Wycherley and colleagues 2012 (24 trials, 1,063 people): more
                 protein while dieting kept 0.43 kg more fat-free mass and lost
                 0.87 kg more fat. Longland and colleagues 2016: 2.4 vs 1.2 g/kg
                 in a hard deficit, +1.2 vs +0.1 kg lean, -4.8 vs -3.5 kg fat.
                 Morton and colleagues 2018 (49 trials): no further gain in
                 fat-free mass above about 1.6 g/kg a day.
     Sleep       Nedeltcheva and colleagues 2010 (10 people, crossover): 5.5 vs
                 8.5 hours in bed on the same diet, 55% less of the loss was fat
                 and 60% more fat-free mass was lost. Al Khatib and colleagues
                 2017 (11 studies): about 385 kcal a day more eaten after short
                 sleep, with no change in energy used.
     Speed       Garthe and colleagues 2011: losing 0.7% of bodyweight a week
                 kept and built more lean mass than 1.4% a week.
     Steps       Ding and colleagues, Lancet Public Health 2025 (57 studies):
                 7,000 a day against 2,000, 47% lower risk of death.
                 Observational.
     Feedback    Harkin and colleagues 2016 (138 studies): monitoring progress
                 helps people reach goals, more so when it is recorded. Kluger
                 and DeNisi 1996: feedback about the task helps, feedback
                 about the person often hurts, so this talks about the week,
                 never about the person.
     Framing     Gallagher and Updegraff 2012 (94 studies): gain framed
                 messages did better for prevention behaviours, so each lever
                 leads with what it keeps or gains.
     Future      Rösch and colleagues 2022 (48 articles): imagining a specific,
                 personal future lowers how much people discount it, more so
                 when it is vivid and tied to their own goals; hence their own
                 numbers, their own goal date.
   The multipliers that turn those studies into one model are this app's rule
   of thumb and labelled so on the screen.
   ===================================================================== */

const REVIEW_WEEKS=12;
/* rules of thumb, each from the study named above */
const LEAN={base:0.25, lift:0.4, proteinLow:1.3, proteinSlope:0.6, sleepShort:1.6, sleepSome:1.25, fast:1.3,
  gainBase:0.3, gainLift:1.6, min:0.03, max:0.6};
const ADAPT_KCAL_PER_KG=22;
const PROTEIN_CEILING_GKG=2.2;

function revDays(end){ const e=end||todayKey(), out=[]; for(let i=6;i>=0;i--) out.push(addDays(e,-i)); return out; }
function stepsOnDay(k){
  const r=S.days[k]; if(!r) return null;
  const a=(typeof realAuto==='function')? realAuto(k) : null;
  if(a&&typeof a.steps==='number') return a.steps;
  return typeof r.steps==='number'&&r.steps>0? r.steps : null;
}
function liftOnDay(k){ return (S.workouts||[]).some(w=>w.d===k&&(w.volume||0)>0); }
const meanOf=a=>a.length? a.reduce((x,y)=>x+y,0)/a.length : null;
const topN=(a,n,key)=>a.slice().sort((x,y)=>key(y)-key(x)).slice(0,n);
const r5=v=>Math.round(v/5)*5;

/* Everything the week did, from the logs. Nothing here is asked. */
function weekLedger(end){
  const keys=revDays(end), t=S.targets||{};
  const days=keys.map(k=>{
    const r=S.days[k]||{}, food=dayFood(k);
    const tot=food.length? foodTotals(k) : null;
    return {k, food:food.length>0, kcal:tot? Math.round(tot.kcal) : null, protein:tot? Math.round(tot.protein) : null,
      fibre:tot? Math.round(tot.fibre) : null, steps:stepsOnDay(k), sleep:realSleep(S.days[k]||null),
      trained:typeof trainedOn==='function'? trainedOn(k) : false, lifted:liftOnDay(k)};
  });
  const fed=days.filter(d=>d.food), slept=days.filter(d=>d.sleep!==null), walked=days.filter(d=>d.steps!==null);
  const st=(typeof weekStats==='function')? weekStats() : {done:0,planned:0};
  const L={keys, days, logged:fed.length, t};
  L.protein={avg:meanOf(fed.map(d=>d.protein)), target:+t.protein||null,
    hit:fed.filter(d=>t.protein&&d.protein>=t.protein*0.9).length};
  L.kcal={avg:meanOf(fed.map(d=>d.kcal)), target:+t.kcal||null, maint:+t.maintenance||null,
    on:fed.filter(d=>t.kcal&&Math.abs(d.kcal-t.kcal)<=t.kcal*0.1).length,
    over:fed.filter(d=>t.maintenance&&d.kcal>t.maintenance).length};
  L.steps={avg:meanOf(walked.map(d=>d.steps)), target:+t.steps||null, n:walked.length,
    hit:walked.filter(d=>t.steps&&d.steps>=t.steps).length};
  L.sleep={avg:meanOf(slept.map(d=>d.sleep)), n:slept.length, short:slept.filter(d=>d.sleep<7).length,
    hit:slept.filter(d=>d.sleep>=7).length};
  L.train={done:st.done||0, planned:st.planned||0, lifts:days.filter(d=>d.lifted).length};
  /* the steps the maintenance figure already counts (build 77) */
  const deal=(typeof stepsDeal==='function')? stepsDeal(end) : null;
  L.stepsDeal=deal; L.stepsBase= deal&&deal.inKcal!==null&&deal.inKcal!==undefined&&L.steps.avg!==null? deal.inKcal : null;
  /* days the calories ran out before the protein did (build 77) */
  L.kcalFirst= t.protein&&t.kcal? fed.filter(d=>d.kcal>=t.kcal*0.95&&d.protein<t.protein*0.85).length : 0;
  L.fibre={avg:meanOf(fed.map(d=>d.fibre).filter(v=>v!==null)), target:+t.fibre||30};
  /* the better days: the best three of the week for each number, so the
     second future is built from days this person has already had */
  const kcalBest=t.kcal? topN(fed,3,d=>-Math.abs(d.kcal-t.kcal)) : [];
  L.best={
    protein: fed.length>=3? meanOf(topN(fed,3,d=>d.protein).map(d=>d.protein)) : null,
    kcal: kcalBest.length>=3? meanOf(kcalBest.map(d=>d.kcal)) : null,
    steps: walked.length>=3? meanOf(topN(walked,3,d=>d.steps).map(d=>d.steps)) : null,
    sleep: slept.length>=3? Math.min(9,meanOf(topN(slept,3,d=>d.sleep).map(d=>d.sleep))) : null,
    lifts: Math.max(L.train.lifts, (S.plan? S.plan.days.filter(d=>d.templateId).length : 0))
  };
  return L;
}

/* What share of a change in weight is lean tissue, given the habits. */
function leanShare(h){
  if(h.dir>0){
    let s=LEAN.gainBase*(h.lifts>=2? LEAN.gainLift : 1)*(h.proteinRatio<0.8? 0.75 : 1);
    return Math.max(LEAN.min,Math.min(LEAN.max,s));
  }
  let s=LEAN.base;
  if(h.lifts>=2) s*=LEAN.lift; else if(h.lifts===1) s*=(1+LEAN.lift)/2;
  s*=LEAN.proteinLow-LEAN.proteinSlope*Math.max(0,Math.min(1,h.proteinRatio));
  if(h.sleep!==null&&h.sleep!==undefined){
    if(h.sleep<6.5) s*=LEAN.sleepShort; else if(h.sleep<7) s*=LEAN.sleepSome;
  }
  if(h.ratePct>1) s*=LEAN.fast;
  return Math.max(LEAN.min,Math.min(LEAN.max,s));
}

/* Twelve weeks of one way of living, week by week from the new weight. */
function projectWeeks(h,weeks){
  const kg0=weightNow(), m0=h.maint;
  if(!kg0||!m0||h.kcal===null) return null;
  let kg=kg0, fat=0, lean=0, goalWeek=null;
  const goal=S.target&&S.target.kind==='weight'&&!S.target.hit? +S.target.value : null;
  const line=[kg0];
  for(let w=1;w<=(weeks||REVIEW_WEEKS);w++){
    const maint=m0+(kg-kg0)*ADAPT_KCAL_PER_KG+(h.stepsExtra||0);
    const d=(h.kcal-maint)*7/SCI.kcalPerKg;
    const share=leanShare(Object.assign({},h,{dir:d>0?1:-1,ratePct:Math.abs(d)/kg*100}));
    lean+=d*share; fat+=d*(1-share); kg+=d; line.push(+kg.toFixed(2));
    if(goal!==null&&goalWeek===null&&((goal<kg0&&kg<=goal)||(goal>kg0&&kg>=goal))) goalWeek=w;
  }
  return {kg:+kg.toFixed(1), change:+(kg-kg0).toFixed(1), fat:+fat.toFixed(1), lean:+lean.toFixed(1), line,
    perWeek:+((kg-kg0)/(weeks||REVIEW_WEEKS)).toFixed(2), goalWeek, goal};
}

/* The habits of each future, from the ledger. */
function forkHabits(L,which,only){
  const t=L.t, kg=weightNow();
  const now={kcal:L.kcal.avg, proteinRatio:L.protein.avg!==null&&t.protein? L.protein.avg/t.protein : 0,
    lifts:L.train.lifts, sleep:L.sleep.avg, steps:L.steps.avg};
  const better={kcal:L.best.kcal!==null? L.best.kcal : now.kcal,
    proteinRatio:L.best.protein!==null&&t.protein? L.best.protein/t.protein : now.proteinRatio,
    lifts:L.best.lifts, sleep:L.best.sleep!==null? L.best.sleep : now.sleep,
    steps:L.best.steps!==null? L.best.steps : now.steps};
  const h=Object.assign({},which==='better'? better : now);
  if(only){ Object.keys(now).forEach(k=>{ h[k]=now[k]; }); h[only]=better[only]; }
  h.maint=L.kcal.maint;
  /* steps above this week's own average burn a little more; the maintenance
     figure already contains the usual steps */
  /* build 77: while maintenance is the planned figure it already counts the
     step target, so a week walking less than that loses less than the target
     says; the forecast now shows it */
  const base=L.stepsBase!==undefined&&L.stepsBase!==null? L.stepsBase : now.steps;
  h.stepsExtra= h.steps!==null&&base!==null&&kg? stepKcal(h.steps,kg)-stepKcal(base,kg) : 0;
  return h;
}
const LEVERS=[
  {id:'protein', key:'proteinRatio', name:'Protein'},
  {id:'kcal', key:'kcal', name:'Calories'},
  {id:'lift', key:'lifts', name:'Lifting'},
  {id:'sleep', key:'sleep', name:'Sleep'},
  {id:'steps', key:'steps', name:'Steps'}];

/* What changes, twelve weeks out, if only this one thing were like the
   better days. Good is more fat lost and more muscle kept (or gained). */
function leverWorth(L,base){
  return LEVERS.map(l=>{
    const p=projectWeeks(forkHabits(L,'better',l.key));
    if(!p||!base) return {id:l.id, name:l.name, fat:0, lean:0, score:0, weeks:null};
    const fat=+(base.fat-p.fat).toFixed(1), lean=+(p.lean-base.lean).toFixed(1);
    const weeks=(base.goalWeek&&p.goalWeek)? base.goalWeek-p.goalWeek : (p.goalWeek&&!base.goalWeek? 'new' : null);
    return {id:l.id, name:l.name, fat, lean, score:fat+lean*1.5, weeks};
  }).sort((a,b)=>b.score-a.score);
}

/* Weeks in a row with protein under 85% of target, counting back from this
   one. A week with fewer than three days of food logged says nothing. */
function proteinWeekAvg(end){
  const fed=revDays(end).filter(k=>dayFood(k).length);
  if(fed.length<3) return null;
  return meanOf(fed.map(k=>foodTotals(k).protein));
}
function proteinRun(end){
  const tg=S.targets&&S.targets.protein; if(!tg) return {under:0, hit:0};
  let under=0, hit=0, k=end||todayKey(), stillUnder=true, stillHit=true;
  for(let w=0;w<12;w++){
    const a=proteinWeekAvg(addDays(k,-7*w));
    if(a===null) break;
    if(stillUnder&&a<tg*0.85) under++; else stillUnder=false;
    if(stillHit&&a>=tg*0.9) hit++; else stillHit=false;
    if(!stillUnder&&!stillHit) break;
  }
  return {under, hit};
}
/* Where the protein goes missing: each meal's average against the per-meal
   mark, and the best day of the week with what was in it. */
function proteinGaps(L){
  const per=(typeof perMealProtein==='function')? perMealProtein() : null;
  const fed=L.days.filter(d=>d.food);
  const NAMES={b:'Breakfast',l:'Lunch',d:'Dinner',s:'Snacks'};
  const meals=['b','l','d','s'].map(m=>{
    const vals=fed.map(d=>dayFood(d.k).filter(x=>(x.meal||'s')===m).reduce((a,x)=>a+(+x.p||0)*(+x.q||1),0));
    return {m, name:NAMES[m], avg:Math.round(meanOf(vals)||0)};
  });
  const mains=meals.filter(x=>x.m!=='s');
  const weakest=per? mains.slice().sort((a,b)=>(a.avg-per)-(b.avg-per))[0] : null;
  const bestDay=fed.length? topN(fed,1,d=>d.protein)[0] : null;
  const bestFoods=bestDay? dayFood(bestDay.k).map(x=>({n:x.n, p:Math.round((+x.p||0)*(+x.q||1))})).sort((a,b)=>b.p-a.p).slice(0,3) : [];
  /* foods already eaten this fortnight with the most protein per calorie */
  const seen={};
  for(let i=0;i<14;i++) dayFood(addDays(todayKey(),-i)).forEach(x=>{ if(x.kcal>20&&x.p>=8&&!seen[x.id]) seen[x.id]={n:x.n, p:Math.round(x.p), kcal:Math.round(x.kcal), per:x.p/x.kcal}; });
  const dense=Object.values(seen).sort((a,b)=>b.per-a.per).slice(0,3);
  return {per, meals, weakest, bestDay, bestFoods, dense};
}
/* The protein step: a reachable aim between where the week was and the
   target, for weeks of missing it. Graded tasks are a named behaviour change
   technique (Michie and colleagues 2013, 8.7); the halfway rule is this app's. */
function proteinStepFor(avg,target){
  if(!avg||!target||avg>=target*0.9) return null;
  return Math.min(target,Math.max(r5(avg)+10,r5(avg+(target-avg)/2)));
}
function proteinAim(){
  const t=S.targets&&S.targets.protein, st=S.proteinStep;
  if(!t) return null;
  if(st&&st.g&&st.g<t) return st.g;
  return t;
}
/* After each check-in: a step that was reached moves halfway again, and two
   weeks at the full target ends it. */
function reviewProteinStep(L){
  const st=S.proteinStep, t=L.t.protein, a=L.protein.avg;
  if(!st||!t||a===null) return null;
  if(proteinRun().hit>=2||st.g>=t){ S.proteinStep=null; return 'done'; }
  if(a>=st.g*0.95){ const next=proteinStepFor(a,t); S.proteinStep= next&&next>st.g? {g:next,set:todayKey()} : {g:t,set:todayKey()}; return 'up'; }
  return 'same';
}

/* Patterns in this person's own logs, against the published effect. */
function ownEvidence(){
  const out=[], per=(typeof perMealProtein==='function')? perMealProtein() : null;
  const keys=[]; for(let i=1;i<=56;i++) keys.push(addDays(todayKey(),-i));
  /* short nights and the next day's food (sleep is saved on the morning it ends) */
  const shortK=[], longK=[];
  keys.forEach(k=>{ const r=S.days[k], s=realSleep(r||null); if(s===null||!dayFood(k).length) return;
    const kc=foodTotals(k).kcal; if(s<6.5) shortK.push(kc); else if(s>=7) longK.push(kc); });
  if(shortK.length>=3&&longK.length>=3){
    const diff=Math.round(meanOf(shortK)-meanOf(longK));
    out.push({id:'sleepfood', ready:true, diff,
      t:diff>40? `After short nights you ate about <b>${num(diff)} kcal more</b> than after a full one`
        : (diff<-40? `After short nights you ate about <b>${num(-diff)} kcal less</b> than after a full one` : `Short nights have not changed how much you eat`),
      s:`${shortK.length} days after a night under 6½ hours, ${longK.length} after 7 or more. The research average is about 385 kcal more (Al Khatib and colleagues, 2017).`});
  } else out.push({id:'sleepfood', ready:false, t:'Short nights and what you eat the next day',
    s:`Needs three days of food logged after a night under 6½ hours and three after 7 or more. So far: ${shortK.length} and ${longK.length}.`});
  /* breakfast protein and the day's total */
  if(per){
    const hitB=[], missB=[];
    keys.forEach(k=>{ const f=dayFood(k); if(!f.length) return;
      const b=f.filter(x=>x.meal==='b').reduce((a,x)=>a+(+x.p||0)*(+x.q||1),0), tot=foodTotals(k).protein;
      (b>=per? hitB : missB).push(tot); });
    if(hitB.length>=3&&missB.length>=3){
      const a=Math.round(meanOf(hitB)), b=Math.round(meanOf(missB));
      out.push({id:'breakfast', ready:true, diff:a-b,
        t:a>b+5? `Days that started with ${per}g of protein at breakfast ended at <b>${a}g</b>; the rest ended at <b>${b}g</b>`
          : `A protein breakfast has not changed your day's total (${a}g against ${b}g)`,
        s:`${hitB.length} days with it, ${missB.length} without. A pattern in your own logs, not a cause.`});
    } else out.push({id:'breakfast', ready:false, t:'Breakfast protein and your day',
      s:`Needs three days with ${per}g or more at breakfast and three without. So far: ${hitB.length} and ${missB.length}.`});
  }
  /* sleep and the next lifting session's work */
  const sess=(S.workouts||[]).filter(w=>(w.volume||0)>0&&w.templateId);
  const byT={}; sess.forEach(w=>{ (byT[w.templateId]=byT[w.templateId]||[]).push(w); });
  const rel=[];
  Object.values(byT).forEach(list=>{ if(list.length<3) return; const m=meanOf(list.map(w=>w.volume));
    list.forEach(w=>{ const s=realSleep(S.days[w.d]||null); if(s!==null&&m) rel.push({s, r:w.volume/m}); }); });
  const sh=rel.filter(x=>x.s<6.5), ok=rel.filter(x=>x.s>=7);
  if(sh.length>=2&&ok.length>=3){
    const d=Math.round((meanOf(sh.map(x=>x.r))-meanOf(ok.map(x=>x.r)))*100);
    out.push({id:'sleeplift', ready:true, diff:d,
      t:d<-3? `Sessions after a short night moved about <b>${-d}% less</b> weight than your usual for that session`
        : `Short nights have not cut what you lift`,
      s:`${sh.length} sessions after a night under 6½ hours, ${ok.length} after 7 or more, each against that session's own average.`});
  } else out.push({id:'sleeplift', ready:false, t:'Sleep and what you lift',
    s:`Needs two sessions after a night under 6½ hours and three after 7 or more, with sleep logged. So far: ${sh.length} and ${ok.length}.`});
  return out;
}

/* What happens if each one carries on, good and bad, with the overdoing case
   where there is one. Every line names its source. */
function leverStory(id,L,kg){
  const t=L.t, imp=S.profile&&S.profile.units==='imperial', w=v=>showW(v,imp);
  const ref=(typeof proteinBasis==='function'&&S.profile)? proteinBasis(S.profile).kg : kg;
  /* under 18: habits, never weight, calories or muscle lost */
  if(S.profile&&isMinorAge(S.profile.age)){
    if(id==='lift') return {now:`${L.train.done} of ${L.train.planned} sessions`,
      good:'Moving most days builds strength, fitness and bone while you are still growing. The guidance for 5 to 17 year olds is an average of an hour a day of moderate to hard activity, with muscle and bone strengthening three days a week (World Health Organization, 2020).',
      bad:'Weeks with less are fine now and then. What counts is the habit coming back the week after.', over:''};
    if(id==='sleep'){ const a=L.sleep.avg;
      return {now: a===null? 'Not logged' : `${a.toFixed(1)} h a night · ${L.sleep.n} nights logged`,
      good:'Eight to ten hours a night is the recommendation for 13 to 18 year olds (Paruthi and colleagues, 2016, American Academy of Sleep Medicine).',
      bad:'Short nights make training, school and mood harder the next day. A same lights out time is the simplest fix.', over:''}; }
    if(id==='steps'){ const a=L.steps.avg;
      return {now: a===null? 'No step count' : `${num(Math.round(a))} a day · ${L.steps.n} days counted`,
      good:'Walking counts towards the hour a day, and it is the easiest part of it to fit in.', bad:'Busy weeks cut it first; a walk home or a walk after dinner brings it back.', over:''}; }
    return null;
  }
  if(id==='protein'){
    const a=L.protein.avg, gkg=a&&ref? a/ref : null;
    const over=gkg!==null&&gkg>PROTEIN_CEILING_GKG;
    return {now: a===null? 'Not logged' : `${Math.round(a)}g a day against ${t.protein}g · ${L.protein.hit} of ${L.logged} days`,
      good:'At target while losing weight, more of what comes off is fat and more muscle stays: 24 trials found 0.43 kg more fat-free mass kept and 0.87 kg more fat lost (Wycherley and colleagues, 2012).',
      bad:'Under it, week after week, a bigger share of every kilo lost is muscle, and what you lift now is harder to keep. In a hard deficit, 1.2 g/kg against 2.4 g/kg was the difference between keeping and building lean mass (Longland and colleagues, 2016).',
      over: over? `You are above ${PROTEIN_CEILING_GKG} g/kg. No study has found more muscle past about 1.6 g/kg (Morton and colleagues, 2018), so the extra ${Math.round(a-ref*PROTEIN_CEILING_GKG)}g is about ${num(Math.round((a-ref*PROTEIN_CEILING_GKG)*4))} kcal a day doing nothing extra.` : ''};
  }
  if(id==='kcal'){
    const a=L.kcal.avg, m=L.kcal.maint, rate=a!==null&&m&&kg? (m-a)*7/SCI.kcalPerKg/kg*100 : null;
    return {now: a===null? 'Not logged' : `${num(Math.round(a))} kcal a day against ${num(t.kcal)} · ${L.kcal.on} of ${L.logged} days within 10%`,
      good:`Held near target, the trend follows the goal line and the body adapts slowly: about ${ADAPT_KCAL_PER_KG} kcal a day less needed for each kg lost (Hall and colleagues, 2011), which the forecast already counts.`,
      bad: m? `Every 100 kcal a day over the target is roughly ${w(100*7/SCI.kcalPerKg*REVIEW_WEEKS)} less lost over ${REVIEW_WEEKS} weeks. Days over ${num(m)} (your maintenance) undo days under it: ${L.kcal.over} this week.` : 'Over target, the trend slows; over maintenance, it turns.',
      over: rate!==null&&rate>1? `This week averaged a loss pace of about ${rate.toFixed(1)}% of bodyweight a week. Faster than about 1% tends to cost muscle: 0.7% a week kept and built more lean mass than 1.4% (Garthe and colleagues, 2011).` : ''};
  }
  if(id==='lift'){
    return {now:`${L.train.done} of ${L.train.planned} sessions · ${L.train.lifts} with weights`,
      good:'Lifting twice a week or more while losing weight protects the muscle a diet would take: in six trials it cut lean mass lost by about 93% (Sardeli and colleagues, 2018).',
      bad:'Without it, about a quarter of what comes off is typically fat-free mass, a rough rule that varies a lot (Heymsfield and colleagues, 2014). A lift not done for four weeks also starts lighter when it comes back.',
      over: L.train.done>L.train.planned&&S.checkins[0]&&S.checkins[0].recovery<=5? `More sessions than planned with recovery at ${S.checkins[0].recovery} out of 10. Work you cannot recover from is not work that counts; next week is lighter for it.` : ''};
  }
  if(id==='sleep'){
    const a=L.sleep.avg;
    return {now: a===null? 'Not logged' : `${a.toFixed(1)} h a night · ${L.sleep.short} of ${L.sleep.n} nights under 7`,
      good:'Seven hours or more a night is the adult recommendation (Watson and colleagues, 2015, for the American Academy of Sleep Medicine and Sleep Research Society), and it is the cheapest thing on this list for keeping muscle while you lose fat.',
      bad:'On the same diet, 5½ hours in bed instead of 8½ meant 55% less of the loss was fat and 60% more muscle was lost (Nedeltcheva and colleagues, 2010; a small study of 10). Short sleep also comes with about 385 kcal a day more eaten (Al Khatib and colleagues, 2017).',
      over:''};
  }
  if(id==='steps'){
    const a=L.steps.avg;
    const D=L.stepsDeal;
    const missed= D&&D.state==='adjust'? ` This week your calories counted ${num(D.inKcal)} steps a day and you walked ${num(D.avg)}, so about ${num(D.short)} kcal a day counted as burned was not. The forecast above shows it.`
      : (D&&D.state==='low'? ` Reaching ${num(D.target)} would burn about ${num(D.toTarget)} kcal more a day, about ${w(D.kg12)} over ${REVIEW_WEEKS} weeks.` : '');
    return {now: a===null? 'No step count' : `${num(Math.round(a))} a day against ${num(t.steps)} · ${L.steps.hit} of ${L.steps.n} days`,
      good:`Each extra 1,000 steps a day burns about ${num(Math.round(stepKcal(BASAL_STEPS+1000,kg)))} kcal at your weight. Across 57 studies, 7,000 a day went with 47% lower risk of death than 2,000 (Ding and colleagues, 2025; observational).`,
      bad:'Walking is the easiest energy to add back and the first to go in a busy week.'+missed,
      over:'', base:(typeof stepsBaselineText==='function'? stepsBaselineText(kg) : '')};
  }
  return null;
}

/* Words for one lever's worth, used on the lever rows and the verdict. */
function worthText(x){
  if(!x) return '';
  const parts=[];
  if(x.fat>=0.1) parts.push(`${x.fat.toFixed(1)} kg more fat lost`);
  if(x.lean>=0.1) parts.push(`${x.lean.toFixed(1)} kg more muscle kept`);
  if(typeof x.weeks==='number'&&x.weeks>0) parts.push(`goal ${x.weeks} week${x.weeks===1?'':'s'} sooner`);
  if(x.weeks==='new') parts.push('goal reached inside 12 weeks');
  return parts.join(' · ');
}

/* The whole review, as data, so it can be stored and tested. */
function buildReview(end){
  const L=weekLedger(end), kg=weightNow(), minor=S.profile&&isMinorAge(S.profile.age);
  const R={weekOf:addDays(L.keys[0],0), end:L.keys[6], L, minor, kg};
  if(minor||!L.kcal.maint||!kg||L.logged<3){ R.fork=null; }
  else {
    R.now=projectWeeks(forkHabits(L,'now'));
    R.better=projectWeeks(forkHabits(L,'better'));
    R.fork=R.now&&R.better? true : null;
    R.levers=R.fork? leverWorth(L,R.now) : [];
    R.top=(R.levers||[]).find(x=>x.score>0.15)||null;
  }
  if(!minor&&L.t.protein&&L.protein.avg!==null){
    const run=proteinRun(end);
    R.protein={run, under:L.protein.avg<L.t.protein*0.85, gaps:proteinGaps(L),
      step:proteinStepFor(L.protein.avg,L.t.protein)};
    /* the same week with protein at target every day and the calories
       unchanged (swapped in, not added on) */
    if(R.fork){ const h=forkHabits(L,'now'); h.proteinRatio=1; const p=projectWeeks(h);
      if(p) R.protein.atTarget={lean:+(p.lean-R.now.lean).toFixed(1), fat:+(R.now.fat-p.fat).toFixed(1)}; }
  }
  R.evidence=minor? [] : ownEvidence();
  R.checkin=(S.checkins||[]).find(c=>c&&c.targets)||null;
  const prev=(S.checkins||[]).find(c=>c.review&&c.review.end<L.keys[6]);
  if(prev){
    const pr=prev.review, tw=typeof trendOn==='function'? [trendOn(pr.end),trendOn(L.keys[6])] : [null,null];
    R.last={pick:pr.pick||null, expected:pr.perWeek, actual: tw[0]!==null&&tw[1]!==null&&tw[0]!==tw[1]? +(tw[1]-tw[0]).toFixed(1) : null,
      kept: pr.pick&&pr.pick.habit&&typeof habitSlotOf==='function'? keptSince(pr.pick.habit,pr.end) : null};
  }
  return R;
}
function keptSince(id,from){
  const slot=habitSlotOf(id); if(!slot) return null;
  const h=currentHabit(slot); if(!h) return null;
  let n=0, of=0; for(let i=1;i<=7;i++){ const k=addDays(from,i); if(k>todayKey()) break; of++; if(h.days&&h.days[k]) n++; }
  return {n, of};
}
/* what the review keeps, so next week can say how it went */
function reviewSnapshot(R,pick){
  return {end:R.end, perWeek:R.now? R.now.perWeek : null, kg12:R.now? R.now.kg : null,
    better:R.better? R.better.kg : null, top:R.top? R.top.id : null, pick:pick||null};
}

/* ---------- the next week's one thing ----------
   One plan, written as when and what (Gollwitzer and Sheeran, 2006), from
   the lever that moves the most. The button does it there and then. */
function oneThing(R){
  const L=R.L, top=R.top? R.top.id : null, g=R.protein&&R.protein.gaps;
  if(R.minor){
    if(L.sleep.avg!==null&&L.sleep.avg<8) return {lever:'sleep', habit:'lights_out', t:'When it gets near lights out, phone down and start winding down', s:`You averaged ${L.sleep.avg.toFixed(1)} hours. Eight to ten is the aim at your age.`};
    if(L.train.planned&&L.train.done<L.train.planned) return {lever:'lift', habit:null, t:'When a session day comes, do the first part even if it is all you do', s:'Starting is most of it.'};
    return {lever:null, habit:null, t:'Keep the week as it was', s:'Repeat it.'};
  }
  if(top==='protein'||(R.protein&&R.protein.under&&!top)){
    const meal=g&&g.weakest? g.weakest : null, habit=meal&&meal.m==='b'? 'protein_am' : (meal&&meal.m==='l'? 'protein_lunch' : 'protein_snack');
    const step=R.protein&&R.protein.run.under>=2? R.protein.step : null;
    return {lever:'protein', habit, step,
      t: meal? `When ${meal.name.toLowerCase()} comes round, start with the protein` : 'When you plan a meal, start with the protein',
      s: (meal&&g.per? `${meal.name} averaged ${meal.avg}g this week against a ${g.per}g mark, the biggest gap of the day.` : '')
        +(step? ` Next week's step is ${step}g a day, on the way to ${L.t.protein}g.` : '')};
  }
  if(top==='sleep') return {lever:'sleep', habit:'lights_out', t:`When it gets to ${minToHhmm(((hhmmToMin((S.profile&&S.profile.bedtime)||'23:00')||1380)-30+1440)%1440)}, start winding down`, s:'Same lights out time, within half an hour.'};
  if(top==='steps') return {lever:'steps', habit:'walk_after', t:'When dinner is finished, ten minutes out the door', s:`Your better days averaged ${num(Math.round(L.best.steps||0))} steps.`};
  if(top==='lift') return {lever:'lift', habit:null, t:'When a session day comes, do the first exercise even if it is all you do', s:'Starting is most of it; the plan is already on Plan.'};
  if(top==='kcal') return {lever:'kcal', habit:'lunch_prep', t:"When dinner is done, make tomorrow's lunch", s:`Your days near target averaged ${num(Math.round(L.best.kcal||0))} kcal.`};
  return {lever:null, habit:null, t:'Keep the week as it was', s:'Nothing this week moves the future enough to change. Repeat it.'};
}

/* ---------- drawing ---------- */
function forkSvg(R){
  const a=R.now.line, b=R.better.line, all=a.concat(b), goal=R.now.goal;
  const vals=goal!==null? all.concat([goal]) : all;
  let lo=Math.min(...vals), hi=Math.max(...vals); const pad=Math.max(0.5,(hi-lo)*0.12); lo-=pad; hi+=pad;
  const W=320, H=150, x=i=>12+i*(W-24)/REVIEW_WEEKS, y=v=>10+(hi-v)/(hi-lo)*(H-30);
  const path=l=>l.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(v).toFixed(1)).join(' ');
  const imp=S.profile.units==='imperial';
  return `<svg class="rvfork" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight over ${REVIEW_WEEKS} weeks: this week repeated ends near ${showW(R.now.kg,imp)}, your better days near ${showW(R.better.kg,imp)}">
    ${goal!==null? `<line x1="12" x2="${W-12}" y1="${y(goal).toFixed(1)}" y2="${y(goal).toFixed(1)}" class="rvgoal"/><text x="${W-12}" y="${(y(goal)-4).toFixed(1)}" text-anchor="end" class="rvlbl">goal ${showW(goal,imp)}</text>` : ''}
    <path d="${path(b)}" class="rvbetter"/>
    <path d="${path(a)}" class="rvnow"/>
    <circle cx="${x(REVIEW_WEEKS)}" cy="${y(a[a.length-1]).toFixed(1)}" r="3.5" class="rvnowdot"/>
    <circle cx="${x(REVIEW_WEEKS)}" cy="${y(b[b.length-1]).toFixed(1)}" r="3.5" class="rvbetterdot"/>
    <text x="12" y="${H-4}" class="rvlbl">now</text><text x="${W-12}" y="${H-4}" text-anchor="end" class="rvlbl">${prettyDate(addDays(todayKey(),REVIEW_WEEKS*7))}</text>
  </svg>`;
}
function compBar(p,label){
  const imp=S.profile.units==='imperial';
  const loss=p.change<0, fat=Math.abs(p.fat), lean=Math.abs(p.lean), tot=fat+lean||1;
  const fw=Math.round(fat/tot*100);
  return `<div class="rvcomp">
    <div class="rvch"><b>${label}</b><span>${loss? 'down' : (p.change>0? 'up' : 'level')} ${showW(Math.abs(p.change),imp)} · ${showW(p.kg,imp)}</span></div>
    <div class="rvbar" role="img" aria-label="${loss?'Lost':'Gained'}: ${fat.toFixed(1)} kg fat, ${lean.toFixed(1)} kg muscle and other lean tissue"><i class="f" style="width:${fw}%"></i><i class="m" style="width:${100-fw}%"></i></div>
    <div class="rvkey"><span><i class="f"></i>${fat.toFixed(1)} kg fat</span><span><i class="m"></i>${lean.toFixed(1)} kg muscle${loss? ' lost' : ''}</span></div>
    ${p.goalWeek? `<div class="rvgoalwk">Goal reached around ${prettyDate(addDays(todayKey(),p.goalWeek*7))}</div>` : ''}
  </div>`;
}
const dots7=(L,ok)=>`<span class="rvdots" aria-hidden="true">${L.days.map(d=>`<i class="${ok(d)===null?'':(ok(d)?'y':'n')}"></i>`).join('')}</span>`;
function leverRow(id,R,worth){
  const L=R.L, st=leverStory(id,L,R.kg), t=L.t;
  if(!st) return '';
  const ok={protein:d=>d.food? (t.protein? d.protein>=t.protein*0.9 : null) : null,
    kcal:d=>d.food? (t.kcal? Math.abs(d.kcal-t.kcal)<=t.kcal*0.1 : null) : null,
    lift:d=>d.trained? true : null, sleep:d=>d.sleep===null? null : d.sleep>=7, steps:d=>d.steps===null? null : (t.steps? d.steps>=t.steps : null)}[id];
  const name={protein:'Protein',kcal:'Calories',lift:'Training',sleep:'Sleep',steps:'Steps'}[id];
  const w=worthText(worth);
  return `<details class="rvlever" id="rvl-${id}">
    <summary><span class="rvln"><b>${name}</b><span>${st.now}</span></span>${dots7(L,ok)}
      ${R.fork? `<span class="rvworth${w?'':' none'}">${w? 'Like your better days: '+w : 'Your better days are no different here'}</span>` : ''}</summary>
    <div class="rvstory">
      <p><b class="g">Keep it up</b> ${st.good}</p>
      <p><b class="b">If it slips</b> ${st.bad}</p>
      ${st.over? `<p><b class="o">Overdoing it</b> ${st.over}</p>` : ''}
      ${st.base? `<p class="rvfine">${st.base}</p>` : ''}
    </div></details>`;
}
function proteinCard(R){
  const P=R.protein; if(!P||!P.under) return '';
  const g=P.gaps, run=P.run.under, t=R.L.t.protein;
  const lines=[];
  lines.push(`<p class="rvp">${run>1? `<b>${run} weeks in a row</b> under 85% of your protein target.` : '<b>Under 85% of your protein target this week.</b>'} You averaged ${Math.round(R.L.protein.avg)}g of ${t}g.</p>`);
  if(P.atTarget&&(P.atTarget.lean>=0.1||P.atTarget.fat>=0.1)) lines.push(`<p class="rvp rvbig">At ${t}g every day, with the same calories (swapped in, not added on), the next ${REVIEW_WEEKS} weeks keep about <b>${P.atTarget.lean.toFixed(1)} kg more muscle</b> and lose <b>${P.atTarget.fat.toFixed(1)} kg more fat</b>. Carry on as this week and that is the muscle that goes.</p>`);
  if(g.weakest&&g.per) lines.push(`<div class="rvmeals">${g.meals.filter(m=>m.m!=='s').map(m=>`<div class="${m===g.weakest?'weak':''}"><b>${m.avg}g</b><span>${m.name}</span></div>`).join('')}<div><b>${g.per}g</b><span>a meal's mark</span></div></div>`);
  if(g.bestDay&&g.bestFoods.length) lines.push(`<p class="rvp">Your best day was ${prettyDate(g.bestDay.k)} at <b>${g.bestDay.protein}g</b>, mostly ${g.bestFoods.map(f=>escHabit(f.n)+' ('+f.p+'g)').join(', ')}. That day is the template.</p>`);
  if(R.L.kcalFirst>=2) lines.push(`<p class="rvp"><b>On ${R.L.kcalFirst} day${R.L.kcalFirst===1?'':'s'} the calories ran out before the protein did.</b> Eating more is not the fix: swap something for a leaner protein at the meal that was short.${g.dense.length? ' Ones you already eat: '+g.dense.map(f=>escHabit(f.n)+' ('+f.p+'g, '+f.kcal+' kcal)').join(', ')+'.' : ' Chicken breast, white fish, fat-free Greek yoghurt, cottage cheese or a whey shake each give 20g or more for under 150 kcal.'}</p>`);
  if(run>=3&&g.dense.length&&R.L.kcalFirst<2) lines.push(`<p class="rvp">Foods you already eat with the most protein for their calories: ${g.dense.map(f=>escHabit(f.n)+' ('+f.p+'g, '+f.kcal+' kcal)').join(', ')}.</p>`);
  if(run>=2&&P.step&&!(S.proteinStep&&S.proteinStep.g===P.step)) lines.push(`<div class="rvstep" id="rvStepBox"><div><b>A step, not the whole target</b><span>Aim for ${P.step}g a day next week. When you reach it, the next step comes; two weeks at ${t}g and the step goes. Graded steps are a recognised way to build a habit; the halfway rule is this app's.</span></div>
    <button class="mini go" data-rvstep="${P.step}">Aim for ${P.step}g</button></div>`);
  else if(S.proteinStep&&S.proteinStep.g<t) lines.push(stepSetHtml(S.proteinStep.g,t,false));
  return `<section class="rvcard" id="rvProtein"><h4>Protein, week after week</h4>${lines.join('')}</section>`;
}
/* build 77: what setting the step did, said where the button was */
function stepSetHtml(g,t,fresh){
  return `<div class="rvstep rvset" id="rvStepBox" ${fresh?'role="status"':''}><div><b>${fresh? 'Step set: ' : 'Your step: '}${g}g a day, on the way to ${t}g</b>
    <span>Your Protein ring on Today and the pace prompts now count to ${g}g. Eat still shows the full ${t}g target. Reach ${g}g and the next step comes at your check-in.</span></div>
    ${fresh? '<button class="mini" data-rvstepundo="1">Undo</button>' : ''}</div>`;
}
function evidenceCard(R){
  if(!R.evidence||!R.evidence.length) return '';
  return `<section class="rvcard" id="rvEvidence"><h4>Your own evidence</h4>
    <p class="rvsub">From your logs over the last eight weeks, held up against the research.</p>
    ${R.evidence.map(e=>`<div class="rvev ${e.ready?'':'wait'}"><b>${e.t}</b><span>${e.s}</span></div>`).join('')}</section>`;
}
function lastCard(R){
  const x=R.last; if(!x) return '';
  const imp=S.profile.units==='imperial', bits=[];
  if(x.pick&&x.pick.t) bits.push(`You picked: <b>${escHabit(x.pick.t)}</b>${x.kept? `. Kept ${x.kept.n} of ${x.kept.of} days.` : '.'}`);
  if(x.expected!==null&&x.expected!==undefined&&x.actual!==null) bits.push(`Last week's review expected about ${x.expected>0?'+':''}${showW(x.expected,imp)} a week; the trend moved ${x.actual>0?'+':''}${showW(x.actual,imp)}.`);
  return bits.length? `<section class="rvcard" id="rvLast"><h4>Last week</h4>${bits.map(b=>`<p class="rvp">${b}</p>`).join('')}</section>` : '';
}
/* ---------- what changes next week, and why (build 77) ----------
   Feargal: the review has to say plainly what changed and why: calories,
   steps, weight, workouts. Each row is the number before and after, and the
   reason in the person's own data. "Before" is the last check-in's targets
   (or, the first time, the targets just before this check-in), so the change
   covers the whole week, not only the moment of locking it in. */
function liftsUpNext(){
  const out=[], seen={};
  ((S.plan&&S.plan.days)||[]).forEach(d=>{
    const t=d.templateId&&(S.templates||[]).find(x=>x.id===d.templateId); if(!t||d.deload) return;
    t.ex.forEach(r=>{ if(seen[r.exId]) return; seen[r.exId]=1;
      let p=null; try{ p=nextPrescription(r.exId,r); }catch(e){}
      if(p&&p.kind==='load'&&p.kg) out.push({n:exOf(r.exId).n, kg:p.kg, inc:p.inc, why:p.why}); });
  });
  return out;
}
function changeRow(label,value,lines,tone){
  return `<div class="rvchg ${tone||''}"><div class="rvchh"><b>${label}</b><span>${value}</span></div>${lines.filter(Boolean).map(l=>`<p>${l}</p>`).join('')}</div>`;
}
function changesCard(R){
  const c=R.checkin; if(!c||!c.targets) return '';
  const b=c.before||{}, a=c.targets, imp=S.profile.units==='imperial', L=R.L, rows=[];
  const arrow=(x,y,u)=> x!==null&&x!==undefined&&y!==null&&y!==undefined&&Math.round(x)!==Math.round(y)? `${num(Math.round(x))} → <b>${num(Math.round(y))}</b>${u}` : `<b>${num(Math.round(y||0))}</b>${u} · same`;
  if(!R.minor&&a.kcal){
    const ln=[], st=c.steps;
    if(a.stepAdj<0&&st) ln.push(`<b>−${num(-a.stepAdj)} for steps.</b> You averaged ${num(st.avg)} a day against ${num(st.target)}, and your calories had counted ${num(st.inKcal||st.target)}. This week they match what you walked. Walk ${num(st.target)} a day and they come back at your next check-in.`);
    else if(a.stepAdj>0&&st) ln.push(`<b>+${num(a.stepAdj)} for steps.</b> You said you'll walk ${num(st.target)} a day, so your calories count them. If the week falls short, the next check-in takes them back off.`);
    else if(st&&st.pick==='match'&&st.source==='measured') ln.push(`Your calories already count the ${num(st.inKcal)} steps a day your tracker has seen, so they match what you walk. Walking ${num(st.target)} would burn about ${num(st.toTarget)} kcal more a day.`);
    else if(st&&st.pick==='commit') ln.push(`You said you'll walk ${num(st.target)} a day, so nothing comes off for steps. If the week falls short again, the next check-in shows what it cost.`);
    if(b.stepAdj&&!a.stepAdj) ln.push(`<b>${b.stepAdj<0?'+':'−'}${num(Math.abs(b.stepAdj))}:</b> last week's step adjustment has ended.`);
    const baseD=(a.kcalBase||a.kcal)-(b.kcalBase||b.kcal||a.kcalBase||a.kcal);
    if(Math.abs(baseD)>=10){
      let why;
      if(a.kcalSource&&b.kcalSource&&a.kcalSource!==b.kcalSource) why=`your maintenance now comes from ${a.kcalSource==='observed'? 'what you actually ate and what the scale did over three weeks' : 'the steps your tracker counted and the sessions you did'}, not the estimate`;
      else if(a.kg&&b.kg&&Math.abs(a.kg-b.kg)>=0.2) why=`your trend weight moved ${a.kg<b.kg?'down':'up'} ${showW(Math.abs(a.kg-b.kg),imp)}, and a ${a.kg<b.kg?'lighter':'heavier'} body needs ${a.kg<b.kg?'less':'more'}`;
      else why='next week has different sessions in it, and the lifting is counted in your maintenance';
      ln.push(`${baseD>0?'+':'−'}${num(Math.abs(Math.round(baseD)))} because ${why}.`);
    }
    if(!ln.length) ln.push(`Nothing in your week calls for a change. ${L.kcal.avg!==null? `You averaged ${num(Math.round(L.kcal.avg))} a day, ${L.kcal.on} of ${L.logged} days within 10%.` : ''}`);
    rows.push(changeRow('Calories',arrow(b.kcal,a.kcal,' kcal'),ln,a.kcal<(b.kcal||a.kcal)?'down':''));
  }
  if(!R.minor&&a.protein){
    const aim=(typeof proteinAim==='function'&&proteinAim())||a.protein, was=c.proteinStepWas, run=R.protein&&R.protein.run? R.protein.run.under : 0;
    const ln=[];
    if(was==='up') ln.push(`You reached last week's step, so it moves up again, halfway to ${a.protein}g.`);
    else if(was==='done') ln.push(`Step finished: back to the full ${a.protein}g.`);
    else if(aim<a.protein) ln.push(`A step on the way to ${a.protein}g${run>=2? `: ${run} weeks in a row under 85% of target` : ''}. The Protein ring counts to ${aim}g.`);
    if(L.protein.avg!==null) ln.push(`This week: ${Math.round(L.protein.avg)}g a day, ${L.protein.hit} of ${L.logged} days at 90% or more.`);
    rows.push(changeRow('Protein',aim<a.protein? `<b>${aim}g</b> step · target ${a.protein}g` : arrow(b.proteinAim||b.protein,aim,'g'),ln));
  }
  if(c.steps||a.steps){
    const st=c.steps, ln=[];
    if(st&&st.avg!==null&&st.avg!==undefined) ln.push(`You averaged ${num(st.avg)} a day over ${st.n} counted day${st.n===1?'':'s'}${st.state==='ok'? ', on target.' : '.'}`);
    else ln.push('Not enough days counted to judge the week.');
    if(st&&st.pick==='commit') ln.push(`Your choice: walk ${num(st.target)} a day.`);
    if(st&&st.pick==='match') ln.push('Your choice: calories matched to the steps walked, for one week.');
    const prevC=(S.checkins||[]).filter(x=>x&&x.targets)[1], ps=prevC&&prevC.steps;
    if(ps&&ps.pick==='commit'&&st&&st.avg!==null&&st.avg!==undefined) ln.unshift(`Last week you said you'd walk ${num(ps.target)} a day: you averaged ${num(st.avg)}${st.avg>=ps.target*0.85? ', kept.' : '.'}`);
    rows.push(changeRow('Steps',`<b>${num(a.steps||st.target)}</b> a day target`,ln));
  }
  { const ln=[], diff=c.planDiff||[], up=R.minor? [] : liftsUpNext();
    if(diff.length) diff.slice(0,4).forEach(x=>ln.push(x)); else ln.push(`Same shape as this week: ${L.train.planned} session${L.train.planned===1?'':'s'}. You did ${L.train.done}.`);
    (c.planWhy||[]).slice(0,2).forEach(x=>ln.push(x));
    if(up.length) ln.push(`<b>Weight up next time:</b> ${up.slice(0,4).map(x=>escHabit(x.n)+' to '+x.kg+'kg').join(', ')}${up.length>4? ' and '+(up.length-4)+' more' : ''}. Each one hit the top of its rep range on every set.`);
    rows.push(changeRow('Training',`<b>${S.plan? S.plan.days.filter(d=>d.type&&d.slot!=='walk').length : 0}</b> sessions next week`,ln));
  }
  if(!R.minor&&typeof trendOn==='function'){
    const t0=trendOn(addDays(L.keys[0],-1)), t1=trendOn(L.keys[6]), ln=[];
    if(t0!==null&&t1!==null){
      const d=+(t1-t0).toFixed(1);
      ln.push(`Trend ${Math.abs(d)<0.05? 'level' : (d<0?'down ':'up ')+showW(Math.abs(d),imp)} this week, now ${showW(t1,imp)}.`);
      if(S.target&&S.target.kind==='weight'&&!S.target.hit&&typeof weightOutlook==='function') ln.push(outlookLine(weightOutlook(),imp)+'.');
      if(R.last&&R.last.expected!==null&&R.last.expected!==undefined) ln.push(`Last week's forecast was ${R.last.expected>0?'+':''}${showW(R.last.expected,imp)} a week.`);
      rows.push(changeRow('Weight',`<b>${showW(t1,imp)}</b> trend`,ln));
    }
  }
  return rows.length? `<section class="rvcard" id="rvChanges"><h4>What changes next week, and why</h4>${rows.join('')}</section>` : '';
}
let reviewNow=null, reviewFrom=null, stepUndo=null;
function reviewHtml(R){
  const L=R.L, imp=S.profile.units==='imperial';
  const span=`${prettyDate(L.keys[0])} to ${prettyDate(L.keys[6])}`;
  const one=oneThing(R);
  let verdict, sub='';
  if(R.minor) verdict='Your week';
  else if(!R.fork) { verdict='Your week, so far'; sub= L.logged<3? `Log food on three days of a week and this shows where the week is heading, in fat and muscle, not just weight. ${L.logged} this week.` : 'Set up your details on You and this shows where the week is heading.'; }
  else if(R.top){ verdict=`The one that moves most: ${R.top.name.toLowerCase()}`; sub=`Done the way your better days did it, it is worth ${worthText(R.top)} over the next ${REVIEW_WEEKS} weeks.`; }
  else { verdict='A week worth repeating'; sub='Your better days and your whole week point to the same place.'; }
  const fork= R.fork? `<section class="rvcard" id="rvFork"><h4>Two futures, from this week</h4>
      <p class="rvsub">Both built from your own logs. One is this week, twelve times. The other is your better days: your best three for protein, calories, steps and sleep, and every planned session done.</p>
      ${forkSvg(R)}
      <div class="rvlegend"><span><i class="now"></i>This week, repeated</span><span><i class="better"></i>Your better days</span></div>
      ${compBar(R.now,'This week, repeated')}${compBar(R.better,'Your better days')}
      ${Math.abs(R.now.kg-R.better.kg)<0.6&&Math.abs(R.now.lean-R.better.lean)>=0.3? `<p class="rvp rvbig">Nearly the same on the scale. Not the same body: your better days keep <b>${Math.abs(R.better.lean-R.now.lean).toFixed(1)} kg more muscle</b>.</p>` : ''}
      <p class="rvfine">The weight comes from what you ate against your maintenance (${num(L.kcal.maint)} kcal), slowing as you get lighter. The fat and muscle split is this app's model built on the studies below: a direction, not a measurement, and people vary a lot.</p>
    </section>` : '';
  const ids=R.minor? ['lift','sleep','steps'] : ['protein','kcal','lift','sleep','steps'];
  const worth={}; (R.levers||[]).forEach(x=>{ worth[x.id]=x; });
  const levers=`<section class="rvcard" id="rvLevers"><h4>What each one did, and where it leads</h4>
    <p class="rvsub">Dots are this week's days, green where it was on target. Tap one for what happens if it carries on.</p>
    ${ids.map(id=>leverRow(id,R,worth[id])).join('')}</section>`;
  const oneCard=`<section class="rvcard rvone" id="rvOne"><h4>One thing for next week, if you want it</h4>
    <p class="rvif">${one.t}.</p><p class="rvsub">${one.s}</p>
    <div id="rvOneAct">${oneActions(one)}</div>
  </section>`;
  return `<div class="rv-top"><button class="legal-back" id="rvBack" aria-label="Close the review">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m15 5-7 7 7 7"/></svg> Done</button></div>
    <div class="rv-body">
      <div class="rvkick">WEEK IN REVIEW · ${span.toUpperCase()}</div>
      <h2 class="rvverdict">${verdict}.</h2>${sub? `<p class="rvlead">${sub}</p>` : ''}
      ${changesCard(R)}${lastCard(R)}${fork}${levers}${R.minor? '' : proteinCard(R)}${evidenceCard(R)}${oneCard}
      <details class="rvmethod"><summary>Where this comes from</summary>
        ${R.minor? `<p>Activity: the World Health Organization's 2020 guidelines for 5 to 17 year olds. Sleep: the American Academy of Sleep Medicine's recommendation for 13 to 18 year olds (Paruthi and colleagues, 2016).</p>` : `<p>Weight: what you ate against your maintenance, worked out week by week from the new weight, with the body needing about ${ADAPT_KCAL_PER_KG} kcal a day less for each kg lost (Hall and colleagues, 2011). Fat and muscle: about a quarter of weight lost is fat-free mass as a rough rule (Heymsfield and colleagues, 2014); lifting twice a week cut that by about 93% in six trials (Sardeli and colleagues, 2018); protein at target kept 0.43 kg more fat-free mass across 24 trials (Wycherley and colleagues, 2012); 5½ hours in bed against 8½ meant 60% more fat-free mass lost (Nedeltcheva and colleagues, 2010, a small study); losing faster than about 1% a week cost more lean mass (Garthe and colleagues, 2011). How those combine is this app's rule of thumb. Your better days are the best three days of the week for each number.</p>`}
        <p>Why it is built this way: seeing progress recorded helps people reach goals (Harkin and colleagues, 2016, 138 studies); feedback about the task works and feedback about the person often backfires (Kluger and DeNisi, 1996), so this talks about the week, not you; gain framed messages did better for prevention behaviours (Gallagher and Updegraff, 2012); and a specific, personal picture of the future makes it count for more today (Rösch and colleagues, 2022).</p>
        ${R.minor? '' : `<p>Steps: ${typeof stepsBaselineText==='function'? stepsBaselineText(R.kg) : ''} Until about three weeks of your own logs replace it, your maintenance counts your step target, which is why steps not walked can come off the next week's calories.</p>`}
      </details>
      <button class="cta rvclose" id="rvEnd">${reviewBackLabel()}</button>
    </div>`;
}
/* build 77: the one thing is an offer. Add it, or not; added, it can come
   out again. Picked or declined is kept so next week can say how it went. */
function oneActions(one){
  if(!one.lever) return '';
  const c=S.checkins[0], pk=c&&c.review&&c.review.pick, mine=pk&&pk.lever===one.lever;
  if(mine&&!pk.declined) return `<p class="rvdone" role="status">In your week${one.habit&&habitOf(one.habit)? ': '+escHabit(habitOf(one.habit).t)+', on Your routine' : ''}.</p>
    <button class="mini" id="rvUnpick">Take it out</button>`;
  if(mine&&pk.declined) return `<p class="rvdone muted" role="status">Left out this week.</p><button class="mini" id="rvPick">Add it after all</button>`;
  return `<div class="rvchoice"><button class="cta" id="rvPick">Add to my week</button><button class="cta ghost" id="rvSkip">Not this week</button></div>`;
}
function drawOne(){ const box=$('rvOneAct'); if(box&&reviewNow) box.innerHTML=oneActions(oneThing(reviewNow)); }
const SCREEN_NAME={today:'Today',plan:'Plan',eat:'Eat',progress:'You',feed:'Friends'};
function reviewBackLabel(){ return 'Done, back to '+(SCREEN_NAME[reviewFrom]||'Today'); }
function openReview(opts){
  const o=opts||{};
  if(o.from!==undefined) reviewFrom=o.from;
  else if(!reviewFrom) reviewFrom=document.body.dataset.screen||'today';
  const R=buildReview(o.end);
  if(o.store!==false&&S.checkins[0]&&!S.checkins[0].review){
    S.checkins[0].proteinStepWas=reviewProteinStep(R.L);
    S.checkins[0].review=reviewSnapshot(R,null); save();
  }
  reviewNow=R;
  let el=document.getElementById('review');
  if(!el){ el=document.createElement('div'); el.id='review'; el.className='review'; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true');
    el.setAttribute('aria-label','Week in review'); document.body.appendChild(el); }
  el.innerHTML=reviewHtml(R);
  el.classList.add('on'); el.scrollTop=0; document.body.classList.add('rv-open');
  const body=el.querySelector('.rv-body'); if(body) body.scrollTop=0;
  setTimeout(()=>{ const b=document.getElementById('rvBack'); if(b) try{ b.focus({preventScroll:true}); }catch(e){} },30);
  return R;
}
function closeReview(){
  const el=document.getElementById('review'); if(!el||!el.classList.contains('on')) return false;
  el.classList.remove('on'); reviewNow=null; document.body.classList.remove('rv-open');
  const back=reviewFrom; reviewFrom=null;
  if(back&&document.getElementById('s-'+back)) go(back);
  return true;
}
document.addEventListener('click',e=>{
  if(e.target.closest('#rvBack')||e.target.closest('#rvEnd')){ closeReview(); return; }
  const st=e.target.closest('[data-rvstep]');
  if(st){ const g=+st.dataset.rvstep, was=S.proteinStep||null, t=S.targets.protein;
    S.proteinStep={g,set:todayKey()}; save(); renderAll();
    /* build 77: the box itself says what happened; the toast sat behind the
       review before, so tapping looked like it did nothing */
    const box=st.closest('#rvStepBox'); if(box) box.outerHTML=stepSetHtml(g,t,true);
    stepUndo=was;
    return; }
  if(e.target.closest('[data-rvstepundo]')){
    S.proteinStep=stepUndo||null; save(); renderAll();
    const box=$('rvProtein'); if(box&&reviewNow) box.outerHTML=proteinCard(reviewNow);
    toast('Protein step taken off'); return; }
  if(e.target.closest('#rvPick')&&reviewNow){
    const one=oneThing(reviewNow), c=S.checkins[0];
    const added=one.habit&&habitOf(one.habit)&&!habitSlotOf(one.habit);
    if(added) startHabit(one.habit);
    const stepSet=one.step&&!(S.proteinStep&&S.proteinStep.g);
    if(stepSet) S.proteinStep={g:one.step,set:todayKey()};
    if(c){ c.review=c.review||reviewSnapshot(reviewNow,null); c.review.pick={lever:one.lever, habit:one.habit, t:one.t, added:!!added, stepSet:!!stepSet}; }
    save(); renderAll(); drawOne();
    return;
  }
  if(e.target.closest('#rvSkip')&&reviewNow){
    const one=oneThing(reviewNow), c=S.checkins[0];
    if(c){ c.review=c.review||reviewSnapshot(reviewNow,null); c.review.pick={lever:one.lever, habit:one.habit, t:one.t, declined:true}; }
    save(); drawOne(); return;
  }
  if(e.target.closest('#rvUnpick')&&reviewNow){
    const c=S.checkins[0], pk=c&&c.review&&c.review.pick;
    if(pk){ if(pk.added&&pk.habit&&habitSlotOf(pk.habit)&&typeof retireHabit==='function') retireHabit(habitSlotOf(pk.habit));
      if(pk.stepSet) S.proteinStep=null;
      c.review.pick=Object.assign({},pk,{declined:true,added:false,stepSet:false}); }
    save(); renderAll(); drawOne(); return;
  }
});
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&closeReview()){ e.preventDefault(); e.stopPropagation(); } },true);

/* After the weekly check-in, the review; Done goes to Plan, as before. */
{ const btn=$('saveWeek'); let before=-1;
  /* the count is taken before the check-in's own handler runs; a new entry
     afterwards means the check-in was sent, not just moved a step on */
  let from=null;
  btn.addEventListener('click',()=>{ before=(S.checkins||[]).length; from=document.body.dataset.screen||'today'; },true);
  btn.addEventListener('click',()=>{
    if(before>=0&&(S.checkins||[]).length>before) openReview({from});
    before=-1;
  });
}


/* On You, under the week: the review any time, not only after a check-in. */
function reviewEntry(){
  const c=(S.checkins||[]).find(x=>x.review);
  return `<button class="ycard rventry" id="yReview" data-review="1">
    <span class="rvei" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 18 L10 12 L14 15 L20 6"/><path d="M14 18 L20 14" stroke-dasharray="2 3"/></svg></span>
    <span class="rvet"><b>Week in review</b><span>${c? 'Two futures from your last 7 days, and what each habit is worth' : 'Where this week is heading, from your own logs'}</span></span>
    <span class="rvego" aria-hidden="true">›</span></button>`;
}
document.addEventListener('click',e=>{ if(e.target.closest('[data-review]')) openReview({store:false, from:document.body.dataset.screen||'progress'}); });

Object.assign(window.__G,{reviewEntry,REVIEW_WEEKS,LEAN,ADAPT_KCAL_PER_KG,PROTEIN_CEILING_GKG,weekLedger,leanShare,projectWeeks,forkHabits,leverWorth,
  proteinRun,proteinWeekAvg,proteinGaps,proteinStepFor,proteinAim,reviewProteinStep,ownEvidence,leverStory,worthText,buildReview,
  reviewSnapshot,oneThing,openReview,closeReview,reviewHtml,keptSince,stepsOnDay,changesCard,liftsUpNext,oneActions});
Object.defineProperty(window.__G,'reviewNow',{get:()=>reviewNow,configurable:true});
