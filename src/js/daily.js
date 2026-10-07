
/* =====================================================================
   Tracking layer. Modelled on a real 12 week coaching check in sheet:
   daily numbers, a weekly check in with the context a coach actually
   reads, and a lift log with tempo and prescribed sets. This is the
   substrate an AI coach needs. Numbers alone are what the research says
   makes people quit; numbers plus context are what let something steer.
   ===================================================================== */

const TRAIN_DAYS=[['push','Push'],['pull','Pull'],['lower','Lower'],['cardio','Cardio'],['rest','Rest']];
/* ---------- what you did today ----------
   Two changes, both because the old version got in the way:
   1. It always opened on Rest, so anyone who trained had to tell the app
      something it already knew. It now opens on what today's plan asked for,
      or on what was actually logged if a session has been finished.
   2. It was one choice. Plenty of people lift and then run, or take a class
      after a session, so it takes as many as apply. Rest is the exception: it
      means none of the others, so choosing it clears them and choosing
      anything else clears Rest.
   Days recorded before this change hold a single value, so everything reads
   through trainingList(), which accepts either. */
const trainingList=v=>{
  if(Array.isArray(v)) return v.filter(x=>x&&x!=='rest');
  if(!v||v==='rest') return [];
  return [v];
};
const trainingText=v=>{
  const l=trainingList(v);
  if(!l.length) return 'rest';
  const label=k=>{ const f=TRAIN_DAYS.find(t=>t[0]===k); return f? f[1].toLowerCase() : k; };
  return l.map(label).join(' and ');
};
/* What today's plan asked for, as check in options. */
function plannedTraining(){
  const d=(typeof todayPlan==='function')? todayPlan() : null;
  if(!d||!d.type||d.slot==='walk') return [];
  if(d.runId) return ['cardio'];
  if(d.circuitId) return ['cardio'];
  if(d.templateId){
    const t=(S.templates||[]).find(x=>x.id===d.templateId);
    if(isHifb(t)) return [t.focus||'push','cardio'];
    const name=((t&&t.name)||d.label||'').toLowerCase();
    if(/push/.test(name)) return ['push'];
    if(/pull/.test(name)) return ['pull'];
    if(/lower|leg/.test(name)) return ['lower'];
    return ['push'];
  }
  return [];
}
/* What actually happened today, if anything has been finished. */
function loggedTraining(){
  const k=todayKey(), out=[];
  (S.workouts||[]).filter(w=>w.d===k).forEach(w=>{
    const name=(w.name||'').toLowerCase();
    if(w.kind==='circuit') { if(out.indexOf('cardio')<0) out.push('cardio'); return; }
    if(w.kind==='hifb'){ [w.focus||'push','cardio'].forEach(k=>{ if(out.indexOf(k)<0) out.push(k); }); return; }
    const key=/push/.test(name)?'push':(/pull/.test(name)?'pull':(/lower|leg/.test(name)?'lower':'push'));
    if(out.indexOf(key)<0) out.push(key);
  });
  (S.mine||[]).filter(m=>m.d===k&&(m.kind==='run'||m.kind==='walk')).forEach(()=>{
    if(out.indexOf('cardio')<0) out.push('cardio');
  });
  return out;
}
/* These were a real coaching sheet's numbers, which is exactly why they are not
   used for anybody else. Targets come from your own details once you have given
   them, and until then the app shows no calorie or protein target at all. */
const DEFAULT_TARGETS={kcal:null,protein:null,carbs:null,fat:null,fibre:30,steps:8000,sleep:7};
function ownTargets(){
  const p=S.profile;
  /* a profile from before the age limit, under 18: no calorie or protein
     target, rather than generic adult numbers */
  if(p&&isMinorAge(p.age)) return Object.assign({},DEFAULT_TARGETS,{kcal:null,protein:null,maintenance:null,steps:stepTarget(p),minor:true,teen:isTeen(p),sleep:[8,10]});
  if(!p||!p.detailsSet||!plausibleBody(p)) return Object.assign({},DEFAULT_TARGETS,{steps:stepTarget(p)});
  const ct=calorieTarget();
  const kcal=ct? ct.kcal : plannedTdee(p).kcal, protein=proteinOf(p);
  const fat=Math.round(kcal*0.28/9);
  return Object.assign({},DEFAULT_TARGETS,{kcal,protein,fat,
    carbs:Math.max(0,Math.round((kcal-protein*4-fat*9)/4)),
    steps: stepTarget(p),
    maintenance: ct? ct.maintenance : kcal, kcalSource: ct? ct.source : 'planned',
    rateKg: ct? ct.rateKg : 0, dir: ct? ct.dir : 'hold'});
}

/* ---------- schema repair, so old saves keep working ---------- */
S.targets=ownTargets();
S.days=S.days&&typeof S.days==='object'? S.days : {};
S.checkins=Array.isArray(S.checkins)? S.checkins : [];
S.lifts=S.lifts&&typeof S.lifts==='object'? S.lifts : {};
const _fresh=freshState;
freshState=function(){
  const f=_fresh();
  f.targets=Object.assign({},DEFAULT_TARGETS);
  f.days={}; f.checkins=[]; f.lifts={};
  return f;
};

/* ---------- helpers ---------- */
const dayOf=k=>S.days[k]||null;
const today=()=>dayOf(todayKey());
function lastNDays(n){
  const out=[];
  for(let i=0;i<n;i++){
    const d=new Date(); d.setDate(d.getDate()-i);
    const k=keyOf(d);
    if(S.days[k]) out.push(Object.assign({d:k},S.days[k]));
  }
  return out;
}
function avg(rows,key){
  const v=rows.map(r=>r[key]).filter(x=>typeof x==='number'&&!isNaN(x));
  return v.length? v.reduce((a,b)=>a+b,0)/v.length : null;
}
const round=(v,dp)=>v===null?null:+v.toFixed(dp||0);
const lastCheckin=()=>S.checkins[0]||null;

/* ---------- the steer: rules now, a model later ---------- */
function steers(){
  const out=[], rows=lastNDays(7), c=lastCheckin(), t=S.targets;
  const n=rows.length;
  if(n<3){
    out.push({tone:'flat',t:`<b>${n} of the last 7 days logged.</b> Three days is enough to start seeing anything. Nothing useful can be said before that.`});
    return out;
  }
  const pro=avg(rows,'protein'), kcal=avg(rows,'kcal'), steps=avg(rows,'steps'), sleep=avg(rows,'sleep'), wb=avg(rows,'wb');
  if(pro!==null && t.protein && pro < t.protein*0.85)
    out.push({tone:'warn',t:`<b>Protein is averaging ${round(pro)}g against ${t.protein}.</b> Eating more of it while losing weight helps hold onto muscle, which is one of the better supported things in this app.`});
  else if(pro!==null)
    out.push({tone:'good',t:`<b>Protein is holding at ${round(pro)}g.</b> Leave it alone and change something else.`});
  const stress=avg(rows,'stress');
  if(stress!==null && stress>=7)
    out.push({tone:'warn',t:`<b>Stress is averaging ${round(stress,1)} out of 10.</b> It is the same recovery budget as training, spent elsewhere. A week to hold volume rather than add to it.`});
  if(sleep!==null && sleep<6.5)
    out.push({tone:'warn',t:`<b>Sleep is averaging ${round(sleep,1)} hours.</b> Short sleep is associated with worse recovery and performance, so this is a poor week to add volume to.`});
  if(steps!==null && steps < t.steps*0.7)
    out.push({tone:'warn',t:`<b>Steps are averaging ${round(steps)} against your ${t.steps} target.</b> Walking is the easiest energy to add back, and 8,000 is a common target rather than a magic number.`});
  const wRows=rows.filter(r=>typeof r.w==='number').sort((a,b)=>a.d<b.d?-1:1);
  if(wRows.length>=2){
    const change=+(wRows[wRows.length-1].w-wRows[0].w).toFixed(1);
    if(Math.abs(change)<0.3 && kcal!==null)
      out.push({tone:'flat',t:`<b>Weight is flat across the week at ${wRows[wRows.length-1].w}kg.</b> A week is noise. Two or three flat weeks is a signal worth acting on.`});
    else
      out.push({tone:'flat',t:`<b>Weight moved ${change>0?'+':''}${change}kg over ${wRows.length} weigh ins.</b> Trend beats any single morning.`});
  }
  if(c){
    if(c.recovery<=5 && typeof c.sessionsHit==='number' && c.sessionsHit>=7)
      out.push({tone:'warn',t:`<b>You trained hard and recovery came in at ${c.recovery}.</b> Your logs suggest more fatigue than usual. How do you actually feel? If it matches, an easier week is a sensible choice. Pain that lasts or keeps coming back is one for a GP or physio.`});
    if(c.pain && c.pain.length)
      out.push({tone:'warn',t:`<b>${c.pain.join(', ')} flagged as painful.</b> Those stay out until they are not. If it persists, that is a physio question, not an app question.`});
    if(typeof c.proteinHit==='number'&&c.proteinHit<=4)
      out.push({tone:'flat',t:`<b>You hit about ${c.proteinHit*10}% of your protein target last week.</b> Pick one habit for next week, not five. One that survives a bad day.`});
    if(wb!==null && wb>=7 && typeof c.sessionsHit==='number' && c.sessionsHit>=7)
      out.push({tone:'good',t:`<b>Good week.</b> You did ${c.sessionsHit*10}% of the sessions you planned and wellbeing averaged ${round(wb,1)}. This is the week to repeat, not to escalate.`});
  }
  return out.slice(0,4);
}

/* What a model would be handed. Kept as text so it can be pasted anywhere. */
function coachBrief(){
  const rows=lastNDays(7), c=lastCheckin(), t=S.targets, a=(k,dp)=>round(avg(rows,k),dp);
  /* Nothing logged is said as nothing logged. A fresh install used to print
     "null kcal (target null), protein nullg" to whoever was reading. */
  const has=x=>x!==null&&x!==undefined&&x!==''&&!Number.isNaN(+x);
  const v=(k,dp,unit)=>{ const x=a(k,dp); return has(x)? num(x)+unit : 'not logged'; };
  const tg=(x,unit)=>has(x)? num(x)+unit : 'not set';
  const L=[];
  L.push(`Handle: @${S.profile.handle||'unknown'}`);
  L.push(`Aim: ${S.profile.aim}. Weekly goal: ${S.goal.label}, at ${fmt(S.goal.now)} of ${S.goal.target}.`);
  L.push(`Days logged in the last 7: ${rows.length}`);
  if(!rows.length){
    L.push(`Nothing logged in the last 7 days. Targets: ${tg(t.kcal,' kcal')}, ${tg(t.protein,'g protein')}, ${tg(t.steps,' steps')}.`);
  } else {
    L.push(`Averages: ${v('kcal',0,' kcal')} (target ${tg(t.kcal,' kcal')}), protein ${v('protein',0,'g')} (target ${tg(t.protein,'g')}), carbs ${v('carbs',0,'g')}, fat ${v('fat',0,'g')}, fibre ${v('fibre',0,'g')}`);
    const ts=timingStats(7);
    if(ts&&ts.per) L.push(`Meals: about ${ts.mealsPerDay} a day across ${ts.days} logged days; ${ts.hits} of ${ts.meals} reached ${ts.per}g protein`
      +(ts.lastBeforeBedH!==null? `; last food on average ${ts.lastBeforeBedH}h before bed` : '')+(ts.skipDays? `; a meal skipped on ${ts.skipDays} of the last 7 days.` : '.'));
    L.push(`Steps ${v('steps',0,'')} (target ${tg(t.steps,'')}), sleep ${v('sleep',1,'h')}, wellbeing ${v('wb',1,'/10')}, stress ${v('stress',1,'/10')}`);
  }
  if(typeof calorieTarget==='function'){
    const ct=calorieTarget();
    if(ct) L.push(`Calories: maintenance ${ct.maintenance} (${ct.source}, ${ct.sourceLabel}). Target ${ct.kcal}`
      +(ct.dir==='hold'? ', holding steady.' : ` to ${ct.dir} ${(+ct.rateKg).toFixed(2)} kg a week (${(+ct.ratePct).toFixed(2)}%), set by the ${ct.limit} limit${ct.bf?', body fat '+ct.bf.pct+'% '+ct.bf.source:''}.`));
  }
  if(typeof deloadDue==='function'){
    const nx=nextDeload();
    L.push(deloadDue()? `This is a planned easy week (${deloadTier().t.toLowerCase()}). Working weights resume next week.`
      : (S.profile.deload===false? 'Easy weeks: only when they add one.' : `Easy week every ${+S.profile.deloadEvery||DELOAD_EVERY} weeks${nx?', next on '+nx:''}.`));
  }
  if(S.target){
    const pr=targetProgress(), k=TARGET_KINDS[S.target.kind];
    L.push(`Target: ${S.target.value} ${k.unit} by ${S.target.by}.`
      +(S.target.hit? ` Met on ${S.target.hit}.`
        : pr? ` Currently ${pr.now}, ${Math.abs(pr.remaining)} to go, ${pr.daysLeft} days left.` : ' Nothing logged against it yet.'));
  }
  if(typeof activeHabits==='function'){
    /* every habit they are keeping, not just the first two slots */
    activeHabits().forEach(h=>{
      const meta=habitOf(h.id), stop=meta.kind==='stop', kept=Object.keys(h.days||{}).length;
      L.push(stop
        ? `Habit to stop: ${meta.t}, since ${h.started}. ${habitStreak(h.slot)} days without in a row, ${kept} days without so far.`
        : `Habit: ${meta.t}, since ${h.started}. ${habitStreak(h.slot)} day streak, kept on ${kept} days so far.`);
    });
  }
  /* Their own words, which is the richest thing in here and the one part no
     number can stand in for. */
  const notes=rows.filter(r=>r.note).slice(0,5).map(r=>`  ${r.d}: ${r.note}`);
  if(notes.length) L.push('What they said about the days:\n'+notes.join('\n'));
  const w=rows.filter(r=>typeof r.w==='number');
  if(w.length) L.push(`Bodyweight: ${w.map(r=>r.w).join(', ')} kg`);
  const sessions=rows.filter(r=>trainingList(r.training).length).map(r=>trainingText(r.training));
  L.push(`Training days: ${sessions.length? sessions.join('; ') : 'none logged'}`);
  if(c){
    /* Split, so whoever reads this knows which numbers came out of the logs and
       which the person actually answered. Nothing is printed that was not one or
       the other. */
    const derived=[['sessions hit',c.sessionsHit],['protein hit',c.proteinHit],['energy',c.energy]]
      .filter(x=>typeof x[1]==='number').map(x=>`${x[0]} ${x[1]}/10`);
    const asked=[['recovery',c.recovery],['motivation',c.motivation]]
      .filter(x=>typeof x[1]==='number').map(x=>`${x[0]} ${x[1]}/10`);
    if(derived.length) L.push(`Check in, derived from the logs: ${derived.join(', ')}`);
    if(asked.length) L.push(`Check in, reported by them: ${asked.join(', ')}`);
    if(c.pain&&c.pain.length) L.push(`Painful or avoided: ${c.pain.join(', ')}`);
    if(c.wins) L.push(`Wins: ${c.wins}`);
    if(c.better) L.push(`Could do better: ${c.better}`);
    if(c.help) L.push(`Wants help with: ${c.help}`);
  } else L.push('No weekly check in yet.');
  const lifted=Object.keys(S.lifts);
  if(lifted.length){
    L.push('Recent lifts:');
    lifted.forEach(id=>{
      const e=S.lifts[id][0];
      L.push(`  ${id}: ${e.sets.map(x=>x.kg+'kg × '+x.reps).join(', ')} (${e.d}${e.deload?', easy week':''})`);
    });
  }
  return L.join('\n');
}

/* ---------- daily log ---------- */
let dayDraft=null;
function openDay(){
  const prev=today()||{};
  /* Start from what is already saved, then what was actually done, then what
     the plan asked for. Only fall back to rest when none of those say anything. */
  /* If they weighed in today, the daily check in already knows the number.
     Asking for it twice is how you get two different answers. */
  const weighedToday=(S.weights||[]).filter(x=>x.d===todayKey()).slice(-1)[0];
  const already=prev&&prev.training!==undefined? trainingList(prev.training) : null;
  const start=(already&&already.length)? already
    : (loggedTraining().length? loggedTraining() : plannedTraining());
  /* No rating is filled in for them. It used to start at 6, so saving the
     check-in for any other reason stored a 6 they never gave, and the home
     screen took that as "checked in". */
  /* Sleep and stress start empty too. They used to start at 7 hours and 5 out
     of 10 and were saved even if never touched, which meant the plan could be
     adjusting to a night's sleep nobody reported. (Review P0 01.) */
  dayDraft=Object.assign({sleep:null,wb:null,stress:null,note:''},prev,{training:start});
  if(weighedToday&&(dayDraft.w===undefined||dayDraft.w===null||dayDraft.w==='')) dayDraft.w=weighedToday.kg;
  drawDay(); openSheet('dayCheck');
}
function drawDay(){
  const t=S.targets, d=dayDraft, auto=autoOf(todayKey());
  const nf=(k,label,target,step)=>`<div class="nf"><label>${label}</label>
    <input type="number" inputmode="decimal" step="${step||1}" data-day="${k}" value="${d[k]!==undefined&&d[k]!==null?d[k]:''}" placeholder="-">
    ${target?`<div class="tg">target ${target}</div>`:''}</div>`;
  $('dayBody').innerHTML=`
    <div class="field"><div class="fl"><div class="k">How did today go?</div><div class="v" id="outwb">${d.wb? d.wb+' / 10' : 'not rated'}</div></div>
      <input type="range" min="1" max="10" step="1" value="${d.wb||6}" data-dayrange="wb" aria-label="How today went"></div>
    <div class="field"><div class="fl"><div class="k">How stressed</div><div class="v" id="outstress">${d.stress? d.stress+' / 10' : 'not answered'}</div></div>
      <input type="range" min="1" max="10" step="1" value="${d.stress||5}" data-dayrange="stress" class="${d.stress?'':'unset'}" aria-label="How stressed you were"></div>
    ${isTeen()&&(d.stress>=7)? `<div class="teencard"><b>That sounds like a hard day.</b><span>Childline is free and there all day and night: 1800 66 66 66, or text 50101. Text About It: text HELLO to 50808.</span></div>`:''}
    <textarea class="ta" data-daynote="1" placeholder="A line about the day, if there is one. This is the bit a coach actually reads.">${(d.note||'').replace(/</g,'&lt;')}</textarea>
    <div class="slab">What you did</div>
    <div class="chips">${TRAIN_DAYS.map(([k,l])=>{
      const on=k==='rest'? trainingList(d.training).length===0 : trainingList(d.training).indexOf(k)>=0;
      return `<button class="${on?'on':''}" data-train="${k}" aria-pressed="${on}">${l}</button>`; }).join('')}</div>
    <div class="note" style="margin-top:6px">${(()=>{ const l=trainingList(d.training);
      const planned=plannedTraining();
      if(!l.length) return 'Nothing today. Tap as many as you did: a session and a run both count.';
      const same=planned.length&&planned.every(x=>l.indexOf(x)>=0)&&l.length===planned.length;
      return (same? 'What the plan asked for. ' : '')+'Tap another if you did more than one.'; })()}</div>
    ${auto
      ? `<div class="todo auto" style="border-radius:10px;border:1px solid var(--line);margin-bottom:16px">
          <span class="ic" style="background:var(--green-tint);color:var(--green-text)">⌚</span>
          <span class="t"><b>${num(auto.steps)} steps · ${auto.sleep}h sleep</b><span>from ${sourceName()}</span></span>
          <span class="autotag">automatic</span></div>`
      : `<div class="field"><div class="fl"><div class="k">Sleep${isTeen()?' <small>8 to 10 hours at your age</small>':''}</div><div class="v" id="outsleep">${d.sleep? d.sleep+' h' : 'not answered'}</div></div>
          <input type="range" min="3" max="11" step="0.5" value="${d.sleep||7}" data-dayrange="sleep" class="${d.sleep?'':'unset'}" aria-label="Sleep"></div>
         <div class="note" style="margin:-8px 0 16px">Connect a tracker and sleep and steps stop being your job.</div>`}
    <div class="slab">Food</div>
    <button class="logrow" id="foodBtn"><span class="ic" style="background:var(--amber-tint);color:var(--amber-text)">+</span>
      <div class="txt"><div class="t">${dayFood(todayKey()).length? 'Add more food' : 'Log what you ate'}</div>
        <div class="s">${dayFood(todayKey()).length? dayFood(todayKey()).length+(dayFood(todayKey()).length===1?' thing':' things')+' logged · '+Math.round(foodTotals(todayKey()).kcal)+' kcal' : 'Tap from a list rather than typing numbers'}</div></div>
      <span class="chev">›</span></button>
    ${t.kcal? '' : `<div class="note" style="margin:-4px 0 10px">No targets set. Work out your numbers on the Progress screen and they appear here.</div>`}
    <div class="nums">${nf('kcal','Calories',t.kcal)}${nf('protein','Protein (g)',t.protein)}${nf('carbs','Carbs (g)',t.carbs)}${nf('fat','Fat (g)',t.fat)}</div>
    <div class="nums" style="margin-top:8px">${nf('w','Weight (kg)','',0.1)}${nf('fibre','Fibre (g)',t.fibre)}</div>
    ${(S.weights||[]).some(x=>x.d===todayKey())? `<div class="note" style="margin-top:4px">Weight came from this morning's weigh in. Changing it here changes that too.</div>`:''}
    <div class="note">Blank is fine. A day with one slider on it is still a useful day.</div>`;
}
document.addEventListener('click',e=>{
  const tr=e.target.closest('[data-train]');
  if(tr&&dayDraft){
    const k=tr.dataset.train;
    if(k==='rest') dayDraft.training=[];
    else {
      const l=trainingList(dayDraft.training);
      dayDraft.training = l.indexOf(k)>=0? l.filter(x=>x!==k) : l.concat([k]);
    }
    drawDay(); }
  if(e.target.closest('#openDay')) openDay();
  if(e.target.closest('#openWeek')) openWeek();
  if(e.target.closest('#logDayBtn')) openDay();
  if(e.target.closest('#checkinBtn')) openWeek();
  if(e.target.closest('#copyBrief')) copyBrief();
});
document.addEventListener('input',e=>{
  const r=e.target.closest('[data-dayrange]');
  if(r&&dayDraft){ const k=r.dataset.dayrange; dayDraft[k]=+r.value; r.classList.remove('unset');
    const o=$('out'+k); if(o) o.textContent = k==='sleep'? dayDraft.sleep+' h' : dayDraft[k]+' / 10'; }
  const dn=e.target.closest('[data-daynote]');
  if(dn&&dayDraft) dayDraft.note=dn.value;
  const nfld=e.target.closest('[data-day]');
  if(nfld&&dayDraft){ const k=nfld.dataset.day; dayDraft[k]= nfld.value===''? undefined : +nfld.value; }
});
document.addEventListener('change',e=>{
  const r=e.target.closest&&e.target.closest('[data-dayrange]');
  if(r&&dayDraft&&(dayDraft[r.dataset.dayrange]===null||dayDraft[r.dataset.dayrange]===undefined)){
    const k=r.dataset.dayrange; dayDraft[k]=+r.value; r.classList.remove('unset');
    const o=$('out'+k); if(o) o.textContent = k==='sleep'? dayDraft.sleep+' h' : dayDraft[k]+' / 10'; }
});
/* Saving the day, shared by the full sheet and the quick check-in in + Log.
   The record used to be rebuilt from the form's fields alone, so saving the
   check-in quietly wiped anything else the day held: a skipped meal, the
   times meals were eaten, steps typed in by hand. Only the fields the form
   owns are replaced now; everything else on the day is kept. */
const DAY_FIELDS=['training','sleep','wb','stress','w','kcal','protein','carbs','fat','fibre','note'];
function saveDayRecord(draft){
  const k=todayKey(), d={};
  DAY_FIELDS.filter(f=>f!=='note').forEach(f=>{
    if(draft[f]!==undefined&&draft[f]!==null&&!Number.isNaN(draft[f])) d[f]=draft[f];
  });
  if(draft.note&&String(draft.note).trim()) d.note=String(draft.note).trim();
  /* done means they actually saved the check-in, not that some number exists */
  d.checkedIn=Date.now();
  const kept=Object.assign({},S.days[k]);
  DAY_FIELDS.forEach(f=>{ delete kept[f]; });
  S.days[k]=Object.assign(kept,d);
  if(typeof d.w==='number'){
    const last=S.weights[S.weights.length-1];
    if(last&&last.d===k) last.kg=d.w; else S.weights.push({d:k,kg:d.w});
    S.profile.weight=d.w;
  }
  const didList=trainingList(d.training);
  if(didList.length){
    const day=S.week[todayIdx()];
    didList.forEach(x=>{ const kind=x==='cardio'?'run':'workout';
      if(day&&!day.done.includes(kind)) day.done.push(kind); });
  }
  save();
  return didList;
}
$('saveDay').addEventListener('click',()=>{
  const didList=saveDayRecord(dayDraft);
  closeSheets(); renderAll();
  const planned=typeof todayPlan==='function'? todayPlan() : null;
  if(!didList.length && planned && planned.type && planned.slot!=='walk' && !dayDone(todayIdx())){
    toast('Today saved');
    setTimeout(()=>openRestChoice(dowIdx()),300);
  } else toast('Today saved');
});

/* ---------- the check-in inside + Log (build 56) ----------
   Sleep, how the day went and stress, as three sliders in the Log sheet, saved
   through saveDayRecord like the full sheet. Nothing starts filled in: a slider
   counts only once it has been moved, the same rule as the full sheet (Review
   P0 01). It never touches what was trained: the full sheet ticks the planned
   session as done, which is right when someone is looking at the chips and
   wrong in a twenty second check-in that may be done before the session. */
let ciDraft=null;
function inlineCheckinHtml(){
  const prev=today()||{}, auto=autoOf(todayKey());
  ciDraft={};
  const val=(k,v)=> v===null||v===undefined? (k==='sleep'?'not answered':'not rated') : (k==='sleep'? v+'h' : v+'/10');
  const row=(k,label,min,max,step,def)=>`<label for="ci_${k}">${label}</label>
    <input id="ci_${k}" type="range" min="${min}" max="${max}" step="${step}" value="${typeof prev[k]==='number'? prev[k] : def}" data-cirange="${k}" class="${typeof prev[k]==='number'?'':'unset'}" aria-label="${label}">
    <b id="ciout_${k}">${val(k,prev[k])}</b>`;
  const done=!!prev.checkedIn;
  return `<div class="cicard" id="ciCard">
    <div class="cih"><b>Today's check-in</b><span>${done? 'saved today, change anything' : 'twenty seconds'}</span></div>
    <div class="cigrid">
      ${auto? `<span class="cil">Sleep</span><span class="ciauto">${auto.sleep}h from ${sourceName()}</span><b></b>` : row('sleep','Sleep',3,11,0.25,7)}
      ${row('wb','How today went',1,10,1,6)}
      ${row('stress','Stress',1,10,1,5)}
    </div>
    <div id="ciTeen"></div>
    <button class="cta" id="ciSave" disabled>Save check-in</button>
    <button class="skipbtn" id="ciMore">More: notes, training, food and weight</button>
  </div>`;
}
function ciTeenNote(){
  const box=$('ciTeen'); if(!box) return;
  const st=(ciDraft&&typeof ciDraft.stress==='number')? ciDraft.stress : (today()||{}).stress;
  box.innerHTML= isTeen()&&st>=7? `<div class="teencard"><b>That sounds like a hard day.</b><span>Childline is free and there all day and night: 1800 66 66 66, or text 50101. Text About It: text HELLO to 50808.</span></div>` : '';
}
function saveInlineCheckin(){
  if(!ciDraft||!Object.keys(ciDraft).length) return;
  const prev=today()||{};
  const draft=Object.assign({sleep:null,wb:null,stress:null,note:''},prev,ciDraft);
  if(prev.training===undefined) delete draft.training;
  saveDayRecord(draft);
  ciDraft=null; closeSheets(); renderAll(); toast('Check-in saved');
}
document.addEventListener('input',e=>{
  const r=e.target.closest&&e.target.closest('[data-cirange]');
  if(!r||!ciDraft) return;
  const k=r.dataset.cirange; ciDraft[k]=+r.value; r.classList.remove('unset');
  const o=$('ciout_'+k); if(o) o.textContent= k==='sleep'? ciDraft[k]+'h' : ciDraft[k]+'/10';
  const b=$('ciSave'); if(b) b.disabled=false;
  if(k==='stress') ciTeenNote();
});
/* tapping a slider without dragging it fires change but not input */
document.addEventListener('change',e=>{
  const r=e.target.closest&&e.target.closest('[data-cirange]');
  if(r&&ciDraft&&ciDraft[r.dataset.cirange]===undefined) r.dispatchEvent(new Event('input',{bubbles:true}));
});
document.addEventListener('click',e=>{
  if(e.target.closest('#ciSave')){ saveInlineCheckin(); return; }
  if(e.target.closest('#ciMore')){ ciDraft=null; closeSheets(); openDay(); }
});

/* ---------- weekly check in: mostly already answered ---------- */
let weekDraft=null, wkStep=0, wkPreview=null;
const allMovements=()=>S.templates.flatMap(t=>t.ex.map(r=>exOf(r.exId).n)).filter((v,i,a)=>a.indexOf(v)===i);
function openWeek(){
  const st=weekStats(), prev=S.checkins[0];
  /* Two kinds of number, kept apart. Derived ones come from the logs and are
     labelled as such. Reported ones are the two the wizard actually asks. The
     four that used to sit here as constants (stress 5, hunger 5, confidence 6,
     readiness 7) were never asked and were being exported to coaches as
     reported figures, so they are gone rather than guessed. */
  weekDraft={auto:st,
    sessionsHit: st.planned? Math.max(1,Math.min(10,Math.round(st.done/st.planned*10))) : null,
    proteinHit: (st.protein!==null&&S.targets.protein)? Math.max(1,Math.min(10,Math.round(st.protein/S.targets.protein*10))) : null,
    energy: st.wb!==null? Math.round(st.wb) : null,
    recovery:7, motivation:7,
    pain: prev&&prev.pain? prev.pain.slice():[], wins:'', better:'', help:''};
  wkStep=0; drawWeekStep(); openSheet('weekCheck');
}
function drawWeekStep(){
  const d=weekDraft, st=d.auto;
  const dots=`<div class="wizdots">${[0,1,2].map(i=>`<i class="${i<=wkStep?'on':''}"></i>`).join('')}</div>`;
  const cell=(v,label,src)=>`<div><div class="n">${v}</div><div class="l">${label}</div>${src?`<div class="src">${src}</div>`:''}</div>`;
  if(wkStep===0){
    $('weekBody').innerHTML=dots+`<div class="wiz">
      <div class="wizh">Here is your week.</div>
      <p class="wizp">All of this is already in the app. Read it, then I have three questions it cannot answer.</p>
      <div class="recap">
        ${cell(st.done+'<small> of '+st.planned+'</small>','sessions done','from your logs')}
        ${cell(st.lifted? num(st.vol)+'<small> kg</small>':'-','lifted this week','from your sets')}
        ${cell(st.steps!==null? num(Math.round(st.steps)):'-','steps a day',healthOn()?'from '+sourceName()+(simulatedHealth()?', demo':''):'no tracker')}
        ${cell(st.sleep!==null? st.sleep.toFixed(1)+'<small> h</small>':'-','sleep a night',healthOn()?'from '+sourceName()+(simulatedHealth()?', demo':''):'you told me')}
        ${cell(st.wChange!==null? (st.wChange>0?'+':'')+st.wChange+'<small> kg</small>':'-','weight change','from weigh ins')}
        ${cell(st.protein!==null? Math.round(st.protein)+'<small> g</small>':'-','protein a day','if you tracked it')}
      </div>
      <div class="note" style="margin:0">Nothing to fill in on this screen.</div></div>`;
  }
  if(wkStep===1){
    $('weekBody').innerHTML=dots+`<div class="wiz">
      <div class="wizh">Three things I cannot see.</div>
      <p class="wizp">Be honest rather than generous. Next week is built from these.</p>
      <div class="field"><div class="fl"><div class="k">How recovered do you feel?</div><div class="v" id="outw_recovery">${d.recovery}</div></div>
        <input type="range" min="1" max="10" value="${d.recovery}" data-weekrange="recovery" aria-label="Recovery"></div>
      <div class="field"><div class="fl"><div class="k">Do you want to train next week?</div><div class="v" id="outw_motivation">${d.motivation}</div></div>
        <input type="range" min="1" max="10" value="${d.motivation}" data-weekrange="motivation" aria-label="Motivation"></div>
      <div class="slab">Did anything hurt?</div>
      <div class="chips">${allMovements().map(n=>`<button class="${d.pain.includes(n)?'on':''}" data-pain="${n}">${n}</button>`).join('')}</div>
      <div class="slab">Anything I should know</div>
      <textarea class="ta" data-week="help" placeholder="Holiday, a bad week, a niggle, anything">${d.help}</textarea></div>`;
  }
  if(wkStep===2){
    wkPreview=previewPlan(Object.assign({at:Date.now()},d));
    const diff=planDiff(S.plan,wkPreview);
    $('weekBody').innerHTML=dots+`<div class="wiz">
      <div class="wizh">So next week changes.</div>
      <p class="wizp">This is what I would do with what you just told me. You can change any day afterwards.</p>
      ${diff.length? diff.map(x=>`<div class="change"><div class="ar">→</div><div class="t">${x}</div></div>`).join('')
        : `<div class="change"><div class="ar">→</div><div class="t">Same shape as this week. Nothing you said calls for a change.</div></div>`}
      <div class="slab">Why</div>
      ${wkPreview.why.map(w=>`<div class="note" style="margin-top:8px">${w}</div>`).join('')}</div>`;
  }
  $('saveWeek').textContent = wkStep===2? 'Lock in next week' : 'Next';
  const back=$('wkBack'); if(back) back.remove();
  if(wkStep>0) $('weekBody').insertAdjacentHTML('afterbegin',`<button class="wizback" id="wkBack">← Back</button>`);
}
document.addEventListener('click',e=>{
  const p=e.target.closest('[data-pain]');
  if(p&&weekDraft){ const n=p.dataset.pain;
    weekDraft.pain=weekDraft.pain.includes(n)? weekDraft.pain.filter(x=>x!==n) : weekDraft.pain.concat([n]);
    p.classList.toggle('on'); }
  if(e.target.closest('#wkBack')&&weekDraft){ wkStep=Math.max(0,wkStep-1); drawWeekStep(); }
});
document.addEventListener('input',e=>{
  const r=e.target.closest('[data-weekrange]');
  if(r&&weekDraft){ const k=r.dataset.weekrange; weekDraft[k]=+r.value; const o=$('outw_'+k); if(o) o.textContent=weekDraft[k]; }
  const ta=e.target.closest('[data-week]');
  if(ta&&weekDraft) weekDraft[ta.dataset.week]=ta.value;
});
$('saveWeek').addEventListener('click',()=>{
  if(!weekDraft) return;
  if(wkStep<2){ wkStep++; drawWeekStep(); return; }
  const entry=Object.assign({at:Date.now(),weekOf:mondayKey()},weekDraft); delete entry.auto;
  S.checkins.unshift(entry);
  buildPlan(); save(); closeSheets(); renderAll(); go('plan');
  toast('Next week is set. Change any day you like.');
});

/* ---------- wire into the existing screens ---------- */
const _renderProgress=renderProgress;
renderProgress=function(){
  _renderProgress();
  const rows=lastNDays(7), t=S.targets;
  const cell=(v,label,target,dp)=>{
    const cls = v===null? '' : (target? (v>=target*0.9?'ok':'under') : '');
    return `<div><div class="n ${cls}">${v===null?'-':round(v,dp||0)}</div><div class="l">${label}</div></div>`;
  };
  const list=steers();
  $('dash').insertAdjacentHTML('beforeend',`
    <div class="coach">
      <div class="ph"><h3>Your steer</h3><button id="copyBrief">Copy brief</button></div>
      ${list.map(s=>`<div class="steer"><div class="dot" style="background:${s.tone==='warn'?'var(--amber-text)':(s.tone==='good'?'var(--green-text)':'var(--mute)')}"></div>
        <div class="t">${s.t}</div></div>`).join('')}
    </div>
    `);
};

function copyBrief(){
  const text=coachBrief();
  try{ navigator.clipboard.writeText(text); toast('Brief copied. Paste it to any coach, human or not.'); }
  catch(err){ toast('Copy failed, the brief is in the console'); console.log(text); }
}

renderProgress();
Object.assign(window.__G,{TRAIN_DAYS,DEFAULT_TARGETS,ownTargets,allMovements,drawWeekStep,
  lastNDays,avg,steers,coachBrief,slotLetter,splitFit,STYLES,styleOf,hyroxDaysOf,openStyleSheet,HYROX_ORDER,weekIndex,MOVES,moveOf,kitOK,itemText,fitItem,niceAmt,hyroxSession,hyroxWeek,crossfitSession,crossfitWeek,ensureStyleWeek,sessionsWanted,CF_BENCH,HYROX_RACE,HYROX_ORDER,weekIndex,proteinPaceText,readiness,readinessPanel,painAdvice,painMorningDue,painPattern,PAIN_FLAGS,priorities,prioritiesRow,confidence,sleepStats,sleepTarget,openSleep,lightsOut,realSleep,isTeen,tooYoung,canHaveAccount,SUPPORT_TEEN,TEEN_MIN,PACE,paceOf,openPaceSheet,isMinorAge,ADULT_AGE,eatingPlan,nextEating,openEating,openEatTimes,dayDone,mealsList,ringsRow,driverLine,quickTiles,heroProgress,openReadiness,saveDayRecord,saveInlineCheckin,perMealProtein,mealSlots,timingStats,MEAL_NAMES,proteinBasis,hhmmToMin,minToHhmm,todayTrains,activeHabits,habitCount,habitRoom,HABIT_MAX,slotForNew,habitSlotOf,trainingList,trainingText,plannedTraining,loggedTraining,TRAIN_DAYS,plannedCardioKcalPerDay,openDay,openWeek,
  HABITS,habitOf,currentHabit,startHabit,retireHabit,toggleHabitDay,habitWeek,habitStreak,habitRate,suggestHabit,openHabitSheet,habitRow,habitRowFor,habitApplies,habitSlots,addOwnHabit,ownHabits,escHabit,OWN_MAX,colophonText,
  TARGET_KINDS,setTarget,clearTarget,targetNow,targetProgress,openTargetSheet,targetLine,
  nudgeState,nextNudgeAt,scheduleNudge,enableNudges,disableNudges,fireNudge,nudgeHelp,onIOS,installed,NUDGE_KEY,

  get dayDraft(){return dayDraft}, get weekDraft(){return weekDraft}});
Object.defineProperties(window.__G,{
  dayDraft:{get:()=>dayDraft,set:v=>{dayDraft=v},configurable:true},
  weekDraft:{get:()=>weekDraft,set:v=>{weekDraft=v},configurable:true},
  wkStep:{get:()=>wkStep,set:v=>{wkStep=v},configurable:true}
});
