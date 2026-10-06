/* ===================== helpers ===================== */
const $=id=>document.getElementById(id);
const initials=p=>p.full.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
const av=(p,cls)=>`<div class="${cls||'av-sm'}" style="background:${p.c}">${initials(p)}</div>`;
const fmt=n=>Number.isInteger(n)?String(n):n.toFixed(1);
/* a missing number shows as 0 rather than crashing whatever screen it is on */
const num=n=>(Number.isFinite(+n)? +n : 0).toLocaleString('en-IE');
const pct=g=>Math.max(0,Math.min(100,Math.round(g.now/g.target*100)));
const allPosts=()=>S.mine.slice();
const postById=id=>allPosts().find(p=>p.id===id)||SEED_POSTS.find(p=>p.id===id);
const triesOf=p=>(p.baseTries||0)+(S.tryCounts[p.id]||0);
/* Dates are local, never UTC. toISOString() filed anything logged before 1am on
   Irish summer time to the previous day, and rendered a day early anywhere west
   of Greenwich, which moved week boundaries, rest-day pushes and the forecast
   with it. Everything that makes or reads a day key goes through these two. */
function dateOf(k){ if(k instanceof Date) return new Date(k.getTime());
  const p=String(k).split('-');
  return p.length===3? new Date(+p[0],+p[1]-1,+p[2]) : new Date(k); }
function keyOf(d){ const x=(d instanceof Date)? d : dateOf(d);
  return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); }
const todayKey=()=>keyOf(new Date());
/* The everyday date helpers. They used to be defined in a later script, so
   anything drawn during startup that used them threw before that script
   loaded: the habit row, and the next-easy-week line on Plan, which broke
   startup for nearly everyone who had onboarded. They live here now, first. */
function weekOfDate(d){ const x=dateOf(d); const i=(x.getDay()===0?6:x.getDay()-1); x.setDate(x.getDate()-i); return keyOf(x); }
function addDays(k,n){ const d=dateOf(k); d.setDate(d.getDate()+n); return keyOf(d); }
function prettyDate(k){ const d=dateOf(k); return d.getDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]; }

const dowIdx=()=>{const d=new Date().getDay();return d===0?6:d-1;};
const todayIdx=dowIdx;
function mondayKey(){ const d=new Date(); d.setDate(d.getDate()-dowIdx()); return keyOf(d); }
function ago(ms){
  const m=Math.floor((Date.now()-ms)/60000);
  if(m<1) return 'just now';
  if(m<60) return m+'m ago';
  const h=Math.floor(m/60); if(h<24) return h+'h ago';
  return Math.floor(h/24)+'d ago';
}
/* opts.real drops stand-in tracker rows. Anything that changes the plan or
   feeds the forecast asks for real only: the demo connection generates a
   plausible week so the behaviour can be seen, and it has no business steering
   training or being used to explain a missed forecast. Display still shows it,
   labelled. */
function avg7(key,opts){
  const real=!!(opts&&opts.real), out=[];
  for(let i=0;i<7;i++){ const d=new Date(); d.setDate(d.getDate()-i);
    const k=keyOf(d), r=S.days[k];
    if(!r) continue;
    const auto=(r.auto&&!(real&&r.auto.sim))? r.auto : null;
    const v = (auto&&typeof auto[key]==='number')? auto[key] : r[key];
    if(typeof v==='number') out.push(v); }
  return out.length? out.reduce((a,b)=>a+b,0)/out.length : null;
}
const simulatedHealth=()=>!!(S.health&&S.health.connected&&S.health.simulated);
/* Mifflin St Jeor (1990). The sex term is +5 for men and -161 for women.
   "Rather not say" used to fall through to the women's constant while the
   screen promised the average, which quietly under-counted anyone who picked
   it by 166 kcal if they were male. It uses the midpoint now, -78, as the
   screen says. */
const SEX_TERM={m:5,f:-161};
const sexTerm=s=>SEX_TERM[s]!==undefined? SEX_TERM[s] : -78;
const bmrOf=p=>10*(+p.weight)+6.25*(+p.height)-5*(+p.age)+sexTerm(p.sex);
const tdeeOf=p=>Math.round(bmrOf(p)*actOf(p.activity).mult);
/* Onboarding re-renders while somebody is still typing. Without this, a
   height of "18" on the way to "180" produced a maintenance figure of about
   1,300 kcal and showed it as an answer. Nothing is shown until every number
   is one a real adult could have. */
/* Adults only. The resting burn equation was derived in adults aged 19 to 78,
   and calorie targets, weight goals and deficits are adult advice. A younger
   person needs a different pathway with clinical and guardian safeguards,
   which this app does not pretend to be. (Review P0 02.) */
const ADULT_AGE=18;
const isMinorAge=a=>a!==undefined&&a!==null&&a!==''&&+a>0&&+a<ADULT_AGE;
/* ---------- teenagers ----------
   13 to 17 year olds are welcome, and get a version built for them rather than
   the adult one with the numbers switched off. The American Academy of
   Pediatrics (Golden and colleagues, 2016, reaffirmed 2022) is clear on what
   helps a teenager and what harms: dieting, meaning eating less to lose
   weight, is a risk factor for both obesity and eating disorders, and so are
   talk about weight and meal skipping. What helps is regular meals, being
   active, sleep and a positive body image. So for a teenager Gauntlet:
     sets no calorie target, no deficit, no weight goal, and never asks for a
       weigh in; weight is optional at sign up and never shown back
     plans around moving, getting stronger with good technique, sleep, food
       habits and how they feel
     uses youth guidance: about an hour of activity a day with muscle and bone
       strengthening three days a week (WHO, 2020), 8 to 10 hours of sleep
       (American Academy of Sleep Medicine, 2016), and resistance training
       that puts technique first, which is safe and useful when supervised
       (Lloyd and colleagues, 2014)
     keeps someone to talk to one tap away
   Under 16, an account needs a parent or guardian's consent in Ireland, so
   everything stays on the phone. Under 13 is not supported. */
const TEEN_MIN=13, ACCOUNT_MIN=16;
const ageOf=p=>+((p||S.profile||{}).age)||0;
const isTeen=p=>{ const a=ageOf(p); return a>=TEEN_MIN&&a<ADULT_AGE; };
const tooYoung=a=>a!==undefined&&a!==null&&a!==''&&+a>0&&+a<TEEN_MIN;
const canHaveAccount=p=>{ const a=ageOf(p); return !a||a>=ACCOUNT_MIN; };
const SUPPORT_TEEN=[
  ['Childline','Free, 24 hours, for anyone up to 18. Call 1800 66 66 66 or text 50101.','https://www.childline.ie'],
  ['Text About It','Free, 24 hours. Text HELLO to 50808.','https://www.textaboutit.ie'],
  ['Jigsaw','Free mental health support for 12 to 25 year olds, online and in person.','https://jigsaw.ie'],
  ['Bodywhys','Support with eating, food and body image.','https://www.bodywhys.ie']];
function supportCard(){
  return `<div class="panel supportcard"><div class="ph"><h3>Someone to talk to</h3></div>
    <div class="note" style="margin:0 0 8px">Whatever it is, it is worth saying out loud. These are free and confidential.</div>
    ${SUPPORT_TEEN.map(([n,s,u])=>`<a class="logrow" href="${u}" target="_blank" rel="noopener"><div class="txt"><div class="t">${n}</div><div class="s">${s}</div></div></a>`).join('')}
  </div>`;
}
const plausibleBody=p=>!!p&&(isTeen(p)? true : (+p.age>=ADULT_AGE&&+p.age<=100&&+p.height>=120&&+p.height<=230&&+p.weight>=30&&+p.weight<=350));

/* ---------- steps, and what they are worth ----------
   The step target now drives the estimate. It replaces the activity
   multiplier rather than sitting on top of it: the multiplier already
   included walking and training, so adding steps to it would count the same
   activity twice.
   The build, which is the same arithmetic the forecast already used for
   tracked steps, now applied to the target as well:
     resting burn x 1.2   the sedentary baseline, a day with next to no
                          deliberate movement
     + walking            steps above 2,500 a day, at 3 METs for every 100
                          steps a minute, net of rest. The first 2,500 are
                          left out because the sedentary baseline already
                          contains them: under 2,500 a day is what
                          Tudor-Locke and colleagues (2009) class as basal
                          activity. Using that threshold as the baseline is a
                          judgement, and the method sheet says so.
     + lifting            the sessions in the plan, at 4 METs net of rest,
                          for as long as the templates say they take
   Running is counted within steps, which slightly under-counts it. Physical
   work a step count cannot see is missed too. Both are exactly what three
   weeks of logged food and weigh ins corrects, and that figure replaces this
   one as soon as it exists. */
const BASAL_STEPS=2500;
const DEFAULT_STEPS=8000;
const STEP_BANDS=[
  {n:5000,  t:'Low active',      s:'5,000 to 7,499 a day'},
  {n:7500,  t:'Somewhat active', s:'7,500 to 9,999'},
  {n:10000, t:'Active',          s:'10,000 to 12,499'},
  {n:12500, t:'Highly active',   s:'12,500 and over'}];
const validSteps=v=>+v>=1000&&+v<=40000;
function stepTarget(p){
  const v=+((p||S.profile||{}).stepTarget);
  return validSteps(v)? Math.round(v) : DEFAULT_STEPS;
}
/* kcal a day from walking, net of rest and of the basal steps */
function stepKcal(steps,kg){
  if(!steps||!kg) return 0;
  const net=Math.max(0,+steps-BASAL_STEPS);
  return (3.0-1)*3.5*(+kg)/200*(net/100);
}
/* kcal a day from lifting, net of rest */
function liftNetKcal(minPerDay,kg){ return (4.0-1)*3.5*(+kg)/200*(+minPerDay||0); }
/* How long a template actually takes: every set, its rest, and about forty
   seconds of work, plus five minutes to get going. */
function sessionMinutes(tpl){
  if(!tpl||!tpl.ex||!tpl.ex.length) return 0;
  return Math.round(5+tpl.ex.reduce((a,r)=>a+(+r.sets||3)*((+r.rest||90)+40),0)/60);
}
/* Planned cardio that a step count cannot see: a bike, a rower, a pool, a
   class. Running and walking are left out on purpose, because those steps are
   already counted and adding them again would pay twice for the same work.
   Compendium METs, net of resting, spread across the week. */
function plannedCardioKcalPerDay(p){
  const days=(S.plan&&S.plan.days)||[];
  const kg=+((p||S.profile||{}).weight)||0;
  if(!kg||!days.length) return 0;
  let kcal=0;
  days.forEach(d=>{
    if(!d.runId||typeof runPlan!=='function') return;
    const r=runPlan(d.runId);
    if(!r||cardioMakesSteps(r)) return;
    const met=+r.met||6, mins=+r.mins||0;
    kcal+=(met-1)*3.5*kg/200*mins;
  });
  return kcal/7;
}
/* Planned lifting, spread across the week. From the built plan when there is
   one, otherwise from the number of lifting days asked for. */
function plannedLiftMinPerDay(p){
  const tpls=S.templates||[];
  const byId=id=>tpls.find(t=>t.id===id);
  if(S.plan&&S.plan.days&&S.plan.days.some(d=>d.templateId)&&!(p&&p.__preview)){
    return S.plan.days.filter(d=>d.templateId).reduce((a,d)=>a+sessionMinutes(byId(d.templateId)),0)/7;
  }
  const days=+((p||S.profile||{}).liftDays)||0;
  /* the sessions of the split they chose, so onboarding promises the same
     maintenance the app then uses; a new person who has not touched it gets
     "let Gauntlet choose", exactly as finishing onboarding will save */
  const chosen= p&&p.__preview? (p.split||'auto') : ((S.profile&&S.profile.split)||null);
  const sp= chosen==='auto'? autoSplit(days) : chosen;
  const ids= sp&&SPLITS[sp]&&SPLITS[sp].order? SPLITS[sp].order : ['t_push','t_pull','t_lower'];
  const core=ids.map(byId).filter(Boolean);
  const avg=core.length? core.reduce((a,t)=>a+sessionMinutes(t),0)/core.length : 50;
  return days*avg/7;
}
/* The planned figure, and its parts, for anyone asking where it came from. */
function plannedTdee(p,kgOverride){
  const kg=+(kgOverride||p.weight);
  const rmr=bmrOf(Object.assign({},p,{weight:kg}));
  const steps=stepTarget(p);
  const base=rmr*1.2, walk=stepKcal(steps,kg), lift=liftNetKcal(plannedLiftMinPerDay(p),kg);
  const cardio=plannedCardioKcalPerDay(p);
  return {kcal:Math.round(base+walk+lift+cardio), rmr:Math.round(rmr), base:Math.round(base),
    walk:Math.round(walk), lift:Math.round(lift), cardio:Math.round(cardio), steps,
    per1000:Math.round(stepKcal(BASAL_STEPS+1000,kg))};
}

/* ---------- one maintenance figure, used everywhere ----------
   There were two. Onboarding, the You sheet and the calorie target used
   Mifflin St Jeor times the activity multiplier the person chose. The forecast
   used Mifflin times 1.2, the "mostly sitting" figure, plus whatever steps and
   lifting it could measure. With no step tracker it measured nothing, so an
   active 95 kg man was told 2,930 kcal at onboarding and 2,268 by the forecast,
   660 apart, with nothing on screen saying why.
   Now there is one answer, from the best evidence available, in this order:
     1. Observed: what they actually ate, minus what the scale says they
        stored, over three weeks. The intake balance method; validates against
        doubly labelled water to within about 200 kcal a day at group level.
     2. Measured: resting burn times 1.2, plus walking from real tracker steps
        and lifting from logged sessions. Activity counted, not guessed.
     3. Estimated: resting burn times the multiplier they chose. The multiplier
        already includes exercise, so nothing is added on top.
   The label always says which one it is. */
function maintenance(){
  const p=S.profile;
  if(!p||!p.detailsSet||!plausibleBody(p)) return null;
  if(typeof tdeeObserved==='function'){
    const obs=tdeeObserved(21);
    if(obs) return {kcal:obs.tdee, source:'observed',
      label:'from what you ate and what the scale did over '+obs.days+' days'};
  }
  if(typeof weeklyHistory==='function'){
    const recent=weeklyHistory(3).map(w=>w.steps).filter(v=>typeof v==='number'&&v>0);
    if(recent.length){
      const steps=recent.reduce((a,b)=>a+b,0)/recent.length;
      const kg=+p.weight;
      const w21=(S.workouts||[]).filter(x=>x.d>=(typeof addDays==='function'? addDays(todayKey(),-21) : '0'));
      /* an HIFB session's running is in the step count already, so only its lifting minutes are added */
      const liftMin=w21.length? w21.reduce((a,x)=>a+Math.max(0,(x.minutes||0)-(x.runMin||0)),0)/21 : plannedLiftMinPerDay(p);
      const kcal=Math.round(bmrOf(p)*1.2+stepKcal(steps,kg)+liftNetKcal(liftMin,kg)+plannedCardioKcalPerDay(p));
      return {kcal, source:'measured', steps:Math.round(steps),
        label:'resting burn plus the '+num(Math.round(steps))+' steps a day your tracker counted and your sessions'};
    }
  }
  const pt=plannedTdee(p);
  return Object.assign({source:'planned',
    label:'resting burn plus your '+num(pt.steps)+' step target and the sessions in your plan'},pt);
}

/* ---------- the calorie target, from where they are going ----------
   The target used to BE maintenance, for everyone, including people whose aim
   was to lose fat. Nothing in the app set a deficit at all.
   Now the target comes from a rate, and the rate comes from their goal:
     losing     0.5 to 1% of bodyweight a week, the range for keeping muscle
                while dieting (Helms, Aragon and Fitschen, 2014). A goal date
                that needs more than 1% a week is capped at 1% and the app
                says when they will actually get there. With no date, 0.75%.
     gaining    0.25 to 0.5% a week, about 10 to 20% above maintenance
                (Iraki, Fitschen, Espinar and Helms, 2019). Capped at 0.5%
                and at 20% over maintenance. With no date, 0.375%.
   Energy per kilo is the same 7,700 kcal the forecast uses, with the same
   caveat: early weeks are partly water, so week one runs ahead of it.
   Floors: never below 1,500 kcal for men or 1,200 for women, the low end of
   what the 2013 AHA/ACC/TOS obesity guideline prescribes for supervised
   weight loss; 1,350 for anyone who has not said. If the floor binds, the rate
   is slower than asked and the app says so. */
const RATE={lose:{min:0.005,max:0.010,def:0.0075}, gain:{min:0.0025,max:0.005,def:0.00375}};
/* Pace is the person's choice within the evidence range, not a rule handed
   down. (Review P0 06.) */
const PACE={gentle:{lose:0.005,gain:0.0025,label:'Gentle'},standard:{lose:0.0075,gain:0.00375,label:'Standard'},
  faster:{lose:0.010,gain:0.005,label:'Faster'}};
const paceOf=()=>PACE[(S.profile&&S.profile.pace)]||PACE.standard;
const KCAL_FLOOR={m:1500,f:1200};
const kcalFloor=s=>KCAL_FLOOR[s]||1350;
const SURPLUS_CAP=0.20;
/* Three limits on a deficit, and whichever is tightest wins.
   1. RATE: 0.75% of bodyweight a week, or what a goal date asks for up to 1%
      (Helms, Aragon and Fitschen, 2014). Evidence from lean, trained people.
   2. CAP: 750 kcal a day. The 2013 AHA/ACC/TOS guideline prescribes a 500 or
      750 kcal deficit; NICE's standard is 600. A percentage of bodyweight
      keeps growing with size and these do not, so without this a 120 kg person
      was asked for nearly 1,000.
   3. FAT: about 69 kcal per kilo of body fat per day, Alpert's (2005) estimate
      of the most energy the fat store can supply (290 +/- 25 kJ/kg/day); past
      that, his model says the shortfall comes from lean tissue. It is a
      theoretical model built largely on the Minnesota semi-starvation data from
      lean young men, not a tested prescription, so it is used only as a ceiling.
      In practice it only binds for lean people asking for a fast goal date. */
const DEFICIT_CAP=750;
const FAT_KCAL_PER_KG=69.3;
/* Body fat: theirs if they gave it, otherwise Deurenberg, Weststrate and
   Seidell (1991): 1.20 x BMI + 0.23 x age - 10.8 x sex - 5.4, sex 1 for men and
   0 for women. Explains 79% of the variance with an error of about 4 points,
   and cannot tell muscle from fat, which is why a measured figure wins. Adult
   equation, so only from 16. "Rather not say" uses 0.5, the same midpoint the
   resting-burn equation uses. */
const validBodyFat=v=>v!==null&&v!==''&&+v>=3&&+v<=70;
function bodyFatPct(p,kg){
  if(!p) return null;
  if(validBodyFat(p.bodyFat)) return {pct:+p.bodyFat, source:'entered'};
  const h=+p.height/100, w=+(kg||p.weight), a=+p.age;
  if(!(h>0&&w>0&&a>=16)) return null;
  const sx=p.sex==='m'?1:(p.sex==='f'?0:0.5);
  const est=1.2*(w/(h*h))+0.23*a-10.8*sx-5.4;
  return {pct:Math.max(3,Math.min(70,+est.toFixed(1))), source:'estimated'};
}
function currentKg(){
  if(typeof trendNow==='function'){ const t=trendNow(); if(t) return t; }
  const w=S.weights&&S.weights.length? S.weights[S.weights.length-1].kg : null;
  return w||+S.profile.weight||null;
}
/* Which way they are going: an explicit weight target wins over the aim. */
function goalDirection(){
  const t=S.target, kg=currentKg();
  /* Reaching the goal weight ends the diet, whatever the aim still says. The
     app tells them, and they can set the next goal from there. */
  if(t&&t.kind==='weight'&&t.hit) return 'hold';
  if(t&&t.kind==='weight'&&!t.hit&&kg){
    if(t.value<kg-0.2) return 'lose';
    if(t.value>kg+0.2) return 'gain';
    return 'hold';
  }
  const aim=S.profile&&S.profile.aim;
  return aim==='lose'? 'lose' : (aim==='build'? 'gain' : 'hold');
}
function calorieTarget(over){
  /* over.m lets a preview insist on one maintenance figure, so what it shows
     is built from exactly the numbers it prints beside it */
  const m=(over&&over.m)||maintenance(); if(!m) return null;
  const kg=currentKg();
  const dir=(over&&over.dir)||goalDirection();
  const p=S.profile||{};
  const KPK=(typeof SCI!=='undefined'? SCI.kcalPerKg : 7700);
  const out={maintenance:m.kcal, source:m.source, sourceLabel:m.label, dir,
    kcal:m.kcal, rateKg:0, ratePct:0, capped:false, floored:false, eta:null, asked:null,
    limit:null, deficit:0, bf:bodyFatPct(p,kg),
    /* carried with the result so nothing downstream re-reads a different profile */
    steps:stepTarget(p), per1000:Math.round(stepKcal(BASAL_STEPS+1000,+p.weight||kg||0))};
  if(dir==='hold'||!kg) return out;
  const R=RATE[dir];
  const t=(over&&over.target)||S.target;
  let pct=paceOf()[dir]||R.def;
  /* A date the app worked out for them is a consequence of the default rate,
     not a request, so it never feeds back into the rate. Only a date the
     person chose does. Rounding the weeks up and reading the rate back used to
     make onboarding and the You sheet disagree by about 50 kcal. */
  if(t&&t.kind==='weight'&&t.by&&!t.hit&&!t.autoDated){
    /* whole days first: a summer-time change inside the window makes the raw
       gap an hour short or long, which moved the pace in Auckland and Sydney */
    const weeks=Math.max(1,Math.round((dateOf(t.by)-dateOf(todayKey()))/864e5)/7);
    const need=Math.abs(t.value-kg)/weeks/kg;
    out.asked=+(need*100).toFixed(2);
    pct=Math.min(need,R.max);
    if(need>R.max) out.capped=true;
  }
  let rateKg=kg*pct;
  let delta=rateKg*KPK/7;
  if(dir==='lose'){
    const cands=[{k:out.asked!==null?'date':'rate', v:delta},{k:'cap', v:DEFICIT_CAP}];
    if(out.bf) cands.push({k:'fat', v:FAT_KCAL_PER_KG*kg*out.bf.pct/100});
    const best=cands.reduce((a,b)=>b.v<a.v? b : a);
    let kcal=Math.round(m.kcal-best.v), limit=best.k;
    const floor=kcalFloor(p.sex);
    if(kcal<floor){ kcal=floor; limit='floor'; out.floored=true; }
    /* The floor must never turn a diet into a surplus. If maintenance is
       already under it there is simply no deficit to set. */
    if(kcal>m.kcal){ kcal=m.kcal; limit='nofloor'; }
    out.kcal=kcal; out.limit=limit;
    /* everything below is derived from the rounded figures actually shown, so
       the deficit, the rate and the split always agree to the kcal */
    out.deficit=m.kcal-kcal;
    rateKg=out.deficit*7/KPK;
    if(out.asked!==null && rateKg/kg*100 < out.asked-0.005) out.capped=true;
  } else {
    const capped=Math.min(delta,m.kcal*SURPLUS_CAP);
    if(capped<delta){ delta=capped; out.capped=true; out.limit='surplus'; }
    else out.limit= out.asked!==null? 'date' : 'rate';
    out.kcal=Math.round(m.kcal+delta);
    out.deficit=m.kcal-out.kcal;
    rateKg=(out.kcal-m.kcal)*7/KPK;
  }
  out.rateKg=+rateKg.toFixed(2);
  out.ratePct=+(rateKg/kg*100).toFixed(2);
  if(t&&t.kind==='weight'&&!t.hit&&rateKg>0){
    const weeks=Math.ceil(Math.abs(t.value-kg)/rateKg);
    out.eta=(typeof addDays==='function'? addDays(todayKey(),weeks*7) : null);
    out.etaWeeks=weeks;
  }
  return out;
}
/* One sentence for wherever the target is shown. */
function calorieLine(ct){
  if(!ct) return '';
  /* Uses the step figures carried on ct, so an onboarding preview quotes the
     steps being typed, not whatever the saved profile says. */
  const atFloor=ct.limit==='floor';
  const stepNote = ct.source!=='planned'? ''
    : ` That assumes you hit ${num(ct.steps)} steps. `
      +(atFloor? `Each 1,000 more adds about ${ct.per1000} kcal to your deficit, because your food is already at the floor.`
               : `Each 1,000 more lets you eat about ${ct.per1000} kcal more at the same rate.`);
  if(ct.dir==='hold') return `Eat around maintenance, ${num(ct.maintenance)} kcal.`+stepNote;
  const verb=ct.dir==='lose'? 'lose' : 'gain';
  if(ct.dir==='lose'&&ct.limit==='nofloor')
    return `Your maintenance is ${num(ct.maintenance)}, already under the ${num(kcalFloor(S.profile.sex))} kcal floor, so there is no deficit an app should set. That is a conversation for a GP or dietitian.`;
  let s=`${num(ct.kcal)} kcal to ${verb} about ${(+ct.rateKg).toFixed(2)} kg a week (${(+ct.ratePct).toFixed(2)}% of your weight).`;
  if(ct.dir==='lose'){
    if(ct.asked!==null&&ct.asked>1) s+=` Your goal date needs ${ct.asked}% a week.`;
    if(ct.limit==='rate') s+=` That is 0.75% of your weight a week, your ${paceOf().label.toLowerCase()} pace, inside the 0.5 to 1% range that research on natural bodybuilders preparing for competition found keeps muscle. You can change the pace.`;
    if(ct.limit==='date') s+= ct.asked>1? ` Held at 1%, the top of the range that research on natural bodybuilders preparing for competition found keeps muscle.` : ` That is the pace your goal date needs.`;
    if(ct.limit==='cap') s+=` Held at a ${DEFICIT_CAP} kcal deficit, the top of what clinical guidance for adults with overweight or obesity prescribes. A percentage of your weight would ask for more.`;
    if(ct.limit==='fat') s+=` Held back because at about ${ct.bf.pct}% body fat${ct.bf.source==='estimated'?' (estimated)':''}, a bigger deficit would start coming from muscle rather than fat.`;
    if(atFloor) s+=` This is the lowest the app will set, a common clinical minimum for adults. Going lower is a job for a clinician, not an app.`;
  }
  if(ct.capped&&ct.dir==='gain') s+=` Capped at the top of the range from bodybuilding off-season research, so most of it is muscle rather than fat.`;
  if(ct.eta) s+=` At that rate, around ${prettyDate(ct.eta)}.`;
  return s+stepNote;
}

/* ---------- what the steps are worth ----------
   Steps are part of what you burn, so they are already inside maintenance.
   This splits the deficit into the part food makes and the part the steps
   make. For a planned or tracked figure the maintenance is literally built
   from those parts, so the split is exact and the two always add up to the
   whole deficit. A figure observed from real intake and weigh ins cannot be
   taken apart, and the text says so rather than pretending. */
function recentRealSteps(days){
  const out=[];
  for(let i=0;i<days;i++){ const d=new Date(); d.setDate(d.getDate()-i);
    const r=S.days[keyOf(d)]; if(!r) continue;
    const v=(r.auto&&!r.auto.sim&&typeof r.auto.steps==='number')? r.auto.steps : r.steps;
    if(typeof v==='number'&&v>0) out.push(v); }
  return out.length? Math.round(out.reduce((a,b)=>a+b,0)/out.length) : null;
}
function stepSplit(ct,m,p){
  if(!ct||!m||!p) return null;
  const kg=+p.weight, KPK=(typeof SCI!=='undefined'? SCI.kcalPerKg : 7700);
  let steps=null, walk=null;
  if(m.source==='planned'){ steps=m.steps; walk=m.walk; }
  else if(m.source==='measured'){ steps=m.steps; walk=Math.round(stepKcal(m.steps,kg)); }
  else { steps=recentRealSteps(21); }
  const target=stepTarget(p);
  const out={source:m.source, dir:ct.dir, steps, walk, target, maintenance:ct.maintenance,
    eat:ct.kcal, deficit:ct.maintenance-ct.kcal, rateKg:+(+ct.rateKg).toFixed(2),
    per1000:Math.round(stepKcal(BASAL_STEPS+1000,kg)), belowBasal: steps!==null&&steps<=BASAL_STEPS};
  if(walk!==null){
    out.food=out.deficit-walk;
    out.withoutKg=+(Math.max(0,out.food)*7/KPK).toFixed(2);
  }
  if(m.source!=='planned'&&steps!==null){
    out.extra=Math.round(stepKcal(target,kg)-stepKcal(steps,kg));
    out.extraKg=+(Math.max(0,out.extra)*7/KPK).toFixed(2);
  }
  return out;
}
function splitText(sp){
  if(!sp) return '';
  const k=n=>num(n);
  const per=`Each 1,000 steps is about ${sp.per1000} kcal a day for you.`;
  if(sp.source==='observed'){
    let s=`Your maintenance comes from what you actually ate and what the scale did, so your steps are already inside it and cannot be split out.`;
    if(sp.steps!==null&&sp.extra>0) s+=` You have been averaging ${k(sp.steps)} steps. Reaching ${k(sp.target)} would burn about ${k(sp.extra)} kcal more a day, about ${sp.extraKg.toFixed(2)} kg a week faster at the same food.`;
    else if(sp.steps!==null&&sp.extra<=0) s+=` You are already averaging ${k(sp.steps)} steps, at or above your ${k(sp.target)} target.`;
    return s+' '+per;
  }
  const whose= sp.source==='planned'? `your ${k(sp.steps)} step target` : `the ${k(sp.steps)} steps a day your tracker counted`;
  if(sp.belowBasal) return `At ${k(sp.steps)} steps, walking adds nothing on top of a sedentary day, which already contains about 2,500. ${per}`;
  let s='';
  if(sp.dir==='lose'&&sp.deficit>0){
    s+=`You burn about ${k(sp.maintenance)} a day, ${k(sp.walk)} of it from ${whose}. You eat ${k(sp.eat)}, a ${k(sp.deficit)} kcal deficit: `;
    if(sp.food>0){
      s+=`${k(sp.food)} from eating less than you burn without walking, plus ${k(sp.walk)} burned by the steps. `
        +`Skip the steps and at the same food you would lose about ${sp.withoutKg.toFixed(2)} kg a week instead of ${sp.rateKg.toFixed(2)}.`;
    } else {
      s+=`the steps make all of it. You are eating ${k(-sp.food)} kcal ${sp.food===0?'':'more than '}${sp.food===0?'exactly':''} what you burn without walking${sp.food===0?'':','} so skip them and you would stop losing.`;
    }
  } else {
    s+=`Your steps burn about ${k(sp.walk)} a day, and that is already counted in your maintenance of ${k(sp.maintenance)}.`;
  }
  if(sp.source==='measured'){
    s+=` Your calories follow what the tracker counts, not the target.`;
    if(sp.extra>0) s+=` Reaching ${k(sp.target)} would burn about ${k(sp.extra)} kcal more a day, about ${sp.extraKg.toFixed(2)} kg a week faster at the same food.`;
    else s+=` You are already at or above your ${k(sp.target)} target.`;
  }
  return s+' '+per;
}
/* Run something against a profile that is not saved yet, and always put the
   real one back. */
function withProfile(p,fn,opts){
  const keep={profile:S.profile,plan:S.plan,weights:S.weights,target:S.target};
  try{
    S.profile=p;
    if(opts&&opts.fresh){ S.plan=null; S.weights=[]; S.target=opts.target||null; }
    return fn();
  } finally { S.profile=keep.profile; S.plan=keep.plan; S.weights=keep.weights; S.target=keep.target; }
}
/* 1.8 g per kilo, of a sensible reference weight rather than whatever the scale
   says. At a high body fat, total bodyweight overshoots badly: fat mass has no
   protein requirement. Above a BMI of about 30 the figure is taken from the
   weight at BMI 27.5 instead, which is the usual adjusted-bodyweight approach
   and keeps the target inside the 1.6 to 2.2 g/kg band the meta-analysis
   supports. */
function proteinBasis(p){
  const m=p.height? p.weight/Math.pow(p.height/100,2) : null;
  if(m&&m>30){ const ref=+(27.5*Math.pow(p.height/100,2)).toFixed(1);
    return {kg:ref,adjusted:true,bmi:+m.toFixed(1)}; }
  return {kg:p.weight,adjusted:false,bmi:m? +m.toFixed(1):null};
}
const proteinOf=p=>Math.round(proteinBasis(p).kg*1.8);
const showH=(cm,imp)=>{ if(!imp) return cm+' cm'; const i=Math.round(cm/2.54); return Math.floor(i/12)+"' "+(i%12)+'"'; };
/* one decimal in both units: whole pounds hid any change under a pound */
const LB_PER_KG=2.20462;
const showW=(kg,imp)=>imp? (Math.round(kg*LB_PER_KG*10)/10)+' lb' : (Math.round(kg*10)/10)+' kg';
