/* =====================================================================
   Trends, forecasts and cycle.
   Design follows what the research on health dashboards actually says:
   a plain summary first, the trend as a shape rather than a table, and
   the detail only if you go looking. Every projection says what it is
   based on and how sure it is, because a number with no provenance is
   the thing people stop trusting first.
   ===================================================================== */
const WEEK_MS=7*864e5;
/* weekOfDate, addDays and prettyDate now live beside dateOf and keyOf in the
   first script: the startup render uses them before this script has loaded. */
const mean=a=>a.length? a.reduce((x,y)=>x+y,0)/a.length : null;

/* ---------- weekly history, built from what is already logged ---------- */
function weeklyHistory(n){
  const out=[];
  for(let w=0;w<(n||8);w++){
    const start=addDays(mondayKey(),-7*w), end=addDays(start,6);
    const inWeek=k=>k>=start&&k<=end;
    const rows=Object.keys(S.days).filter(inWeek).map(k=>Object.assign({d:k},S.days[k]));
    const val=(r,key)=>(r.auto&&!r.auto.sim&&typeof r.auto[key]==='number')? r.auto[key] : r[key];
    const weights=S.weights.filter(x=>inWeek(x.d));
    const sessions=S.mine.filter(m=>m.d&&inWeek(m.d)).length;
    const workouts=(S.workouts||[]).filter(x=>inWeek(x.d));
    out.push({weekOf:start,
      sessions, volume:workouts.reduce((a,x)=>a+x.volume,0),
      steps:mean(rows.map(r=>val(r,'steps')).filter(v=>typeof v==='number')),
      sleep:mean(rows.map(r=>val(r,'sleep')).filter(v=>typeof v==='number')),
      protein:mean(rows.map(r=>r.protein).filter(v=>typeof v==='number')),
      kcal:mean(rows.map(r=>r.kcal).filter(v=>typeof v==='number')),
      weightEnd: weights.length? weights[weights.length-1].kg : null,
      weighIns: weights.length});
  }
  return out;
}
function weeklyWeightDeltas(hist){
  const pts=hist.slice().reverse().filter(w=>w.weightEnd!==null);
  const d=[];
  for(let i=1;i<pts.length;i++) d.push(+(pts[i].weightEnd-pts[i-1].weightEnd).toFixed(2));
  return d;
}

/* ---------- cycle ---------- */
/* The one study that measured this properly (Kanellakis and colleagues, 2023,
   42 women) found an average rise of about 0.5 kg across the cycle, mostly
   extracellular fluid around menstruation. Bigger swings get quoted widely
   online but are not what the measurement found, so the app does not repeat
   them. Whether training should change by phase is not established, so nothing
   here tells anyone to train less. */
const PHASES={
  menstrual:{n:'Period',c:'#a8552a',
    note:'This is where the measured rise shows up: about half a kilo on average, and it is fluid rather than fat. Some people see more, some see none at all.'},
  follicular:{n:'Follicular',c:'#1b4a3c',
    note:'Many people report feeling better through this stretch. The performance research disagrees with itself, so treat that as your own experience rather than a rule.'},
  ovulation:{n:'Ovulation',c:'#dfa33c',
    note:'Some feel strongest here. The trials are mixed and the samples small, so go by how you feel rather than the calendar.'},
  luteal:{n:'Luteal',c:'#1e3a6e',
    note:'Progesterone peaks around now and promotes fluid retention. If the scale drifts up, that is the likely reason.'},
  lateLuteal:{n:'Late luteal',c:'#6e1f2e',
    note:'Fluid retention is usually highest from here into the first days of bleeding. Read the trend line rather than the morning.'}
};
function cycleDay(dateKey){
  const c=S.cycle;
  if(!c||!c.tracking||!c.lastPeriod) return null;
  const ms=dateOf(dateKey)-dateOf(c.lastPeriod);
  if(isNaN(ms)) return null;
  const days=Math.floor(ms/864e5);
  const len=c.length||28;
  return ((days%len)+len)%len+1;
}
function phaseOn(dateKey){
  const d=cycleDay(dateKey); if(!d) return null;
  const c=S.cycle, len=c.length||28, per=c.periodLen||5, ov=len-14;
  let key='luteal';
  if(d<=per) key='menstrual';
  else if(d<ov-1) key='follicular';
  else if(d<=ov+1) key='ovulation';
  else if(d>len-5) key='lateLuteal';
  return Object.assign({key,day:d,len},PHASES[key]);
}
const waterWindow=k=>{ const p=phaseOn(k); return !!p&&(p.key==='lateLuteal'||p.key==='menstrual'); };

/* ---------- the forecast =====================================
   Every number below comes from a published method. Nothing here is a
   fudge factor, and where the method has known error, the app says so.

   RMR            Mifflin St Jeor (1990), already used for maintenance.
   Activity       ACSM metabolic equation, kcal/min = MET x 3.5 x kg / 200.
                  Walking METs from cadence: 100 steps/min is the
                  established heuristic for 3 METs (CADENCE-Adults).
                  Resistance training taken at 4 METs (Compendium of
                  Physical Activities). Both used net of rest (MET - 1)
                  so resting burn is not counted twice.
   Expenditure    Intake balance method where there is enough data:
                  TDEE = mean intake - (change in energy stores / days),
                  which validates against doubly labelled water to within
                  roughly 200 kcal/day at group level.
   Energy density 7700 kcal/kg (Wishnofsky). A long run approximation:
                  early weight change is largely water and carries less
                  energy than this, which is why week one is flagged.
   Projection     Recomputed week by week with the new body weight rather
                  than extrapolated in a straight line. Hall and Chow show
                  the static rule overestimates precisely because it holds
                  expenditure constant while the body gets lighter.
   Uncertainty    Interval from the spread of this app's own past errors
                  once there are three of them. The NIH Body Weight
                  Planner, the best validated tool of this kind, still
                  spans about -6% to +4% at the individual level, so a
                  point estimate on its own would be dishonest.
   ============================================================ */
const SCI={kcalPerKg:7700, walkMET:3.0, walkCadence:100, liftMET:4.0, sedentaryPAL:1.2,
  maxLossFraction:0.01, defaultBand:0.45, ewmaAlpha:0.25};

const bodyAt=kg=>Object.assign({},S.profile,{weight:kg});
/* Same allowance as the maintenance figure: the first 2,500 steps are already
   inside the sedentary baseline, so only the steps above them are added. */
function walkKcal(steps,kg){ return stepKcal(steps,kg); }
function liftKcal(minutes,kg){ if(!minutes||!kg) return 0;
  return (SCI.liftMET-1)*3.5*kg/200*minutes; }
function tdeeEstimate(kg,stepsPerDay,liftMinPerDay){
  if(!S.profile.detailsSet) return null;
  /* No tracker means no measured activity, so fall back to the multiplier the
     person chose rather than assuming they sit all day. The multiplier already
     includes exercise, so lifting is not added on top of it. */
  if(!stepsPerDay) return plannedTdee(S.profile,kg).kcal;
  return Math.round(bmrOf(bodyAt(kg))*SCI.sedentaryPAL + walkKcal(stepsPerDay,kg) + liftKcal(liftMinPerDay,kg));
}
/* exponentially weighted trend, so one heavy morning does not become a direction */
function trendSeries(){
  const pts=S.weights.slice(); if(!pts.length) return [];
  let t=pts[0].kg; return pts.map((p,i)=>{ t = i? t+SCI.ewmaAlpha*(p.kg-t) : p.kg; return {d:p.d,kg:+t.toFixed(3),raw:p.kg}; });
}
const trendNow=()=>{ const t=trendSeries(); return t.length? t[t.length-1].kg : (S.profile.weight||null); };
function weightSlopePerDay(windowDays){
  const cut=windowDays? addDays(todayKey(),-windowDays) : null;
  const pts=S.weights.filter(p=>!cut||p.d>=cut);
  if(pts.length<3) return null;
  const t0=dateOf(pts[0].d).getTime();
  const xs=pts.map(p=>(dateOf(p.d).getTime()-t0)/864e5), ys=pts.map(p=>p.kg);
  const span=xs[xs.length-1]-xs[0];
  if(span<10) return null;
  const mx=mean(xs), my=mean(ys);
  let numr=0,den=0;
  xs.forEach((x,i)=>{ numr+=(x-mx)*(ys[i]-my); den+=(x-mx)*(x-mx); });
  if(!den) return null;
  return {slope:numr/den, days:span, n:pts.length};
}
function trendRatePerWeek(){
  const r=weightSlopePerDay(null);
  return r? +(r.slope*7).toFixed(3) : null;
}
/* intake balance: what your expenditure must have been, given what you ate and what the scale did */
function tdeeObserved(windowDays){
  const win=windowDays||21, kcals=[], today=todayKey();
  for(let i=0;i<win;i++){ const d=new Date(); d.setDate(d.getDate()-i);
    const r=S.days[keyOf(d)];
    if(r&&typeof r.kcal==='number') kcals.push(r.kcal); }
  if(kcals.length<10) return null;
  const r=weightSlopePerDay(win);
  if(!r) return null;
  const days=r.days, dKg=r.slope*days;
  const tdee=mean(kcals)-(r.slope*SCI.kcalPerKg);
  if(!isFinite(tdee)||tdee<800||tdee>6000) return null;
  return {tdee:Math.round(tdee), days:Math.round(r.days), intakeDays:kcals.length, intake:Math.round(mean(kcals))};
}
function recentIntake(days){
  const out=[];
  for(let i=0;i<(days||14);i++){ const d=new Date(); d.setDate(d.getDate()-i);
    const r=S.days[keyOf(d)];
    if(r&&typeof r.kcal==='number') out.push(r.kcal); }
  return out.length>=4? Math.round(mean(out)) : null;
}
function pastErrors(){
  const errs=[];
  Object.keys(S.forecasts).forEach(k=>{
    const f=S.forecasts[k], a=actualsFor(k);
    if(f&&a&&a.weight!==null&&f.predicted&&typeof f.predicted.weight==='number'&&f.method!=='none')
      errs.push(a.weight-f.predicted.weight);
  });
  return errs;
}
function bandFor(weekOf){
  const errs=pastErrors();
  let band=SCI.defaultBand;
  if(errs.length>=3){
    const m=mean(errs);
    band=Math.max(0.2,+Math.sqrt(mean(errs.map(e=>(e-m)*(e-m)))).toFixed(2));
  }
  if(waterWindow(addDays(weekOf,5))) band=+(band*1.6).toFixed(2);
  return +band.toFixed(2);
}
function buildForecast(weekOf){
  const hist=weeklyHistory(6).filter(w=>w.weekOf<weekOf);
  const kg=trendNow()||S.profile.weight;
  const recent=hist.slice(0,3);
  const stepsAvg=mean(recent.map(w=>w.steps).filter(v=>v!==null));
  const liftMinAvg=(()=>{ const w=(S.workouts||[]).filter(x=>x.d>=addDays(weekOf,-21));
    return w.length? w.reduce((a,x)=>a+Math.max(0,(x.minutes||0)-(x.runMin||0)),0)/21 : 0; })();
  const planned=S.plan? S.plan.days.filter(d=>d.type&&d.slot!=='walk').length : 4;
  const adherence=recent.length? Math.min(1.2,mean(recent.map(w=>w.sessions))/Math.max(1,planned)) : 0.8;

  const obs=tdeeObserved(21);
  const est=tdeeEstimate(kg,stepsAvg,liftMinAvg);
  const intake=recentIntake(14);
  const tdee = obs? obs.tdee : est;
  const rate=trendRatePerWeek();

  let weight=null, method='none', inputs=[];
  if(intake!==null && tdee){
    weight=+(((intake-tdee)*7)/SCI.kcalPerKg).toFixed(2);
    method='balance';
    inputs=[`${intake} kcal a day in`,`${tdee} kcal a day out${obs?' (from your own weight and intake)':' (estimated)'}`];
  } else if(rate!==null){
    weight=+rate.toFixed(2); method='trend';
    inputs=[`your trend line over ${trendSeries().length} weigh ins`];
  }
  if(weight!==null && kg){
    const cap=+(kg*SCI.maxLossFraction).toFixed(2);
    if(weight<-cap){ weight=-cap; inputs.push('capped at 1% of bodyweight a week'); }
  }
  const f={weekOf, at:Date.now(), method, inputs,
    predicted:{weight, sessions:Math.max(0,Math.round(planned*(adherence||0.8))), plannedSessions:planned,
      steps:stepsAvg, protein:mean(recent.map(w=>w.protein).filter(v=>v!==null)),
      intake, tdee, tdeeSource: obs?'measured':(est?'estimated':null)},
    confidence: method==='none'? 'none' : (obs&&pastErrors().length>=3? 'good' : (method==='balance'?'fair':'low')),
    band: bandFor(weekOf),
    earlyDays: S.weights.length<4,
    cycle: phaseOn(addDays(weekOf,3))
  };
  S.forecasts[weekOf]=f; save();
  return f;
}
/* four weeks out, recomputing expenditure as the body changes */
function projectWeeks(n){
  const f=S.forecasts[mondayKey()]||buildForecast(mondayKey());
  let kg=trendNow(); if(!kg||f.method==='none'||f.predicted.weight===null) return null;
  const intake=f.predicted.intake, steps=f.predicted.steps;
  const out=[];
  for(let i=1;i<=(n||4);i++){
    let delta;
    if(f.method==='balance'&&intake){
      const tdee=tdeeEstimate(kg,steps,0)||f.predicted.tdee;
      delta=((intake-tdee)*7)/SCI.kcalPerKg;
    } else delta=f.predicted.weight;
    const cap=kg*SCI.maxLossFraction;
    if(delta<-cap) delta=-cap;
    kg=+(kg+delta).toFixed(2);
    out.push({week:i,kg});
  }
  return out;
}
function ensureForecast(){
  const k=mondayKey();
  const f=S.forecasts[k];
  if(!f) return buildForecast(k);
  if(f.method==='none' && (S.weights.length>=3 || recentIntake(14)!==null)) return buildForecast(k);
  return f;
}
function actualsFor(weekOf){
  const hist=weeklyHistory(8);
  const idx=hist.findIndex(x=>x.weekOf===weekOf);
  if(idx<0) return null;
  const w=hist[idx], prev=hist[idx+1];
  const t=trendSeries();
  const at=k=>{ const rows=t.filter(x=>x.d<=k); return rows.length? rows[rows.length-1].kg : null; };
  const inWeek=t.filter(x=>x.d>=weekOf&&x.d<=addDays(weekOf,6));
  const end=at(addDays(weekOf,6));
  const before=at(addDays(weekOf,-1));
  const start = before!==null? before : (inWeek.length>1? inWeek[0].kg : null);
  const weight=(end!==null&&start!==null)? +(end-start).toFixed(2) : null;
  return {weight, sessions:w.sessions, steps:w.steps, protein:w.protein, volume:w.volume, kcal:w.kcal};
}
const off=(a,p)=>(p===null||a===null||p===0)? null : Math.round((a-p)/Math.abs(p)*100);
/* when the week misses, split the gap into kcal and name the biggest pieces */
function reviewWeek(weekOf){
  const f=S.forecasts[weekOf], a=actualsFor(weekOf);
  if(!f||!a||f.method==='none'||!f.predicted||f.predicted.weight===null) return null;
  const p=f.predicted, kg=trendNow()||S.profile.weight;
  const wVar = a.weight===null? null : +(a.weight-p.weight).toFixed(2);
  const matched = wVar===null? null : Math.abs(wVar)<=Math.max(f.band, Math.abs(p.weight)*0.10);
  const parts=[], lines=[];
  if(wVar!==null && matched===false){
    const gap=Math.round(wVar*SCI.kcalPerKg);
    lines.push(`The scale came in <b>${Math.abs(wVar).toFixed(2)} kg ${wVar>0?'above':'below'}</b> the forecast, about ${num(Math.abs(gap))} kcal over the week.`);
    if(a.kcal!==null&&p.intake) parts.push({k:'eating', kcal:Math.round((a.kcal-p.intake)*7),
      t:`ate ${num(Math.round(a.kcal))} kcal a day against the ${num(p.intake)} I assumed`});
    if(a.steps!==null&&p.steps) parts.push({k:'steps', kcal:-Math.round(walkKcal(a.steps-p.steps,kg)*7),
      t:`walked ${num(Math.round(a.steps))} steps a day against ${num(Math.round(p.steps))}`});
    if(typeof a.sessions==='number'&&p.sessions) parts.push({k:'sessions', kcal:-Math.round(liftKcal(((a.sessions-p.sessions)*45),kg)),
      t:`did ${a.sessions} of the ${p.sessions} sessions I expected`});
    if(waterWindow(addDays(weekOf,5))) parts.push({k:'cycle', kcal:0,
      t:'you were in the phase where fluid retention peaks, which averaged about half a kilo in the study that measured it, so some of this is water rather than fat'});
    parts.sort((x,y)=>Math.abs(y.kcal)-Math.abs(x.kcal));
    const explained=parts.reduce((s2,x)=>s2+x.kcal,0);
    const residual=gap-explained;
    if(Math.abs(residual)>Math.abs(gap)*0.5)
      parts.push({k:'unknown',kcal:residual,t:'the rest is not in your logs, which usually means a normal week of noise or something untracked'});
    parts.forEach(x=>{ if(x.k!=='cycle'&&x.k!=='unknown') x.t+= ` (about ${num(Math.abs(x.kcal))} kcal ${x.kcal>0?'more':'less'})`; });
  }
  return {f,a,wVar,matched,lines,misses:parts.map(x=>x.t),parts,
    sessVar:off(a.sessions,p.sessions), stepVar:off(a.steps,p.steps)};
}

/* ---------- charts ---------- */
/* The chart used to space weigh ins evenly whatever the gap between them, so
   a gap of three weeks looked identical to one of a day, and the trend was
   drawn through whatever shape that made. It was also stretched to fit
   (preserveAspectRatio="none"), which distorts the very slope it is showing.
   Now: a real timeline in days, least squares on days rather than on the
   order of the points, a projection that runs a fixed four weeks ahead, the
   goal drawn if there is one, and a sentence underneath for anyone who cannot
   see it. */
const CHART_DAYS_BACK=90, CHART_DAYS_FWD=28;
function weightSeries(){
  const all=(S.weights||[]).filter(p=>p&&typeof p.kg==='number'&&p.d).slice();
  all.sort((a,b)=>a.d<b.d?-1:1);
  const cut=addDays(todayKey(),-CHART_DAYS_BACK);
  const inWindow=all.filter(p=>p.d>=cut);
  return inWindow.length>=2? inWindow : all.slice(-12);
}
function weightTrend(pts){
  /* no weigh ins yet, or only one: there is no trend to report */
  if(!Array.isArray(pts)||pts.length<2) return {perWeek:null,perDay:null,points:pts||[]};
  /* least squares against days elapsed, so uneven gaps are honoured */
  const t0=dateOf(pts[0].d).getTime();
  const xs=pts.map(p=>(dateOf(p.d).getTime()-t0)/864e5), ys=pts.map(p=>p.kg);
  const sx=mean(xs), sy=mean(ys);
  let num=0,den=0; xs.forEach((xi,i)=>{num+=(xi-sx)*(ys[i]-sy);den+=(xi-sx)*(xi-sx);});
  const perDay=den? num/den : 0;
  return {xs,ys,sx,sy,perDay,perWeek:perDay*7,at:d=>sy+perDay*(d-sx),spanDays:xs[xs.length-1]};
}
/* ---------- when the forecast starts, and when it is worth trusting ----------
   Nothing in the app said this, so a new person saw an empty box and no idea
   what would fill it. These are the real thresholds, read out of the code that
   does the work rather than written separately and left to drift:
     trend line        2 weigh ins
     a direction       3 weigh ins (that is what the slope needs)
     a forecast        3 weigh ins, or 4 days of food with an estimated burn
     a good one        10 days of food inside 21 and 3 weigh ins, at which
                       point your burn is worked out from your own data
                       instead of an equation
     a tested one      3 weeks of forecasts scored against what happened,
                       after which the range comes from its own past misses */
function forecastReadiness(){
  const weighs=(S.weights||[]).length;
  const foodDays=(()=>{ let n=0; for(let i=0;i<21;i++){ const r=S.days[addDays(todayKey(),-i)];
    if(r&&typeof r.kcal==='number') n++; } return n; })();
  const food14=(()=>{ let n=0; for(let i=0;i<14;i++){ const r=S.days[addDays(todayKey(),-i)];
    if(r&&typeof r.kcal==='number') n++; } return n; })();
  const observed=!!tdeeObserved(21);
  const scored=(typeof pastErrors==='function'? pastErrors().length : 0);
  const canForecast=weighs>=3||food14>=4;
  let stage='none', line='';
  if(!canForecast){
    const needW=Math.max(0,3-weighs), needF=Math.max(0,4-food14);
    stage='none';
    line=`No forecast yet. It starts at ${needW? needW+' more weigh in'+(needW>1?'s':'') : 'three weigh ins'}`
      +`${needF? ', or '+needF+' more day'+(needF>1?'s':'')+' of food logged' : ''}.`;
  } else if(!observed){
    stage='early';
    const needF=Math.max(0,10-foodDays), needW=Math.max(0,3-weighs);
    line=`Working from an estimate of what you burn. It stops estimating once you have `
      +`${needF? needF+' more day'+(needF>1?'s':'')+' of food' : '10 days of food'}`
      +`${needW? ' and '+needW+' more weigh in'+(needW>1?'s':'') : ''} in a three week window.`;
  } else if(scored<3){
    stage='good';
    line=`Your burn is now worked out from your own weight and intake, not an equation. `
      +`After ${3-scored} more week${3-scored>1?'s':''} the range comes from how wrong it has actually been, rather than a default.`;
  } else {
    stage='best';
    line=`Working from your own numbers, with a range built from its own past misses over ${scored} weeks.`;
  }
  return {stage,weighs,foodDays,food14,observed,scored,canForecast,line};
}
