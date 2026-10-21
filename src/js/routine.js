/* ===================== build 69: your routine =====================
   Feargal: the bottom of Today (the week strip, a week line, the habit rows,
   the check in row) was not useful, and the habits had been left behind. He
   wants people to "become one with their routines and habits".

   What the research says people want, and what the apps get wrong:
     - Reminders get the habit done but get in the way of it becoming
       automatic; tying it to something already in the day (an event cue) is
       what made it automatic (Stawarz, Cox and Blandford 2015: 115 apps
       reviewed, almost all tracking plus reminders, then a 4 week study).
       Flossing after brushing stuck better than before it (Judah and
       colleagues 2013). So every habit here hangs off a moment in the
       person's own day (waking, a meal, training, bed) with that moment's
       time, and the habits are laid out in the order the day runs: a routine.
     - Streaks are loved and then they break: after a broken streak people
       tend to drop off, and messages pointing at the failure do not bring
       them back (Silverman and Barasch 2023). A hard goal with a couple of
       emergency skips beat both an easy goal and a strict one, and people
       came back after a miss more often (Sharif and Shu 2021: in the step
       study, a week of seven with two skips rebounded after a miss 55% of the
       time against 37% for seven with none). So each habit gets rest days a
       week that are used up by a miss on their own, and nothing ever says
       "streak lost".
     - Habit is about automaticity, not a count: a median of 66 days, 18 to
       254 (Lally and colleagues 2010), 59 to 66 days in a 2024 review of about
       2,600 people (Singh and colleagues), and a missed day did not undo it.
       So the number shown is strength, a curve that rises with each repeat
       and dips a little for a miss, never back to zero.
     - No app asks the question that defines a habit. The four automaticity
       statements (the SRBAI, Gardner and colleagues 2012) are asked once a
       week from day 14, and when the answers say it happens without thinking,
       the habit graduates to second nature: it stays in the routine, and its
       slot is free for the next one. That is "becoming one with it".
     - Logging taking longer than the habit is a top reason people quit. Habits
       the food log can see (protein at breakfast, protein first at lunch, a
       protein snack) tick themselves.
     - The two minute version (Fogg's Tiny Habits; Clear): on a lower
       readiness day, or the day after a miss, the tiny version is offered and
       counts as a repeat, a little less than the full one.
     - The person's own numbers: for each habit, the days it was kept against
       the days it was not, on the thing it should move (that night's sleep,
       the day's protein, steps, stress, how the day went). Labelled as their
       own association, not proof.
   Numbers that are the app's own rule of thumb are labelled as such in the
   method sheet: the strength curve's rate (95% at day 66 if kept daily), the
   cost of a miss, the tiny version's weight, the rest days per week and the
   graduation line. */

const RT_K=1-Math.pow(0.05,1/66);   /* a repeat closes this share of the gap to 100% */
const RT_MISS=RT_K;                   /* a miss costs about what a repeat gives (rule of thumb) */
const RT_TINY=0.6;                    /* the tiny version counts as 60% of a repeat (rule of thumb) */
const RT_CHECK_FROM=14, RT_CHECK_EVERY=7, RT_SN_EVERY=28;
const RT_GRAD_SCORE=5.5, RT_GRAD_DAYS=21, RT_LAPSE=4;

/* the moments a habit can hang off, each with its time in this person's day */
const CUES={
  wake:     {t:'When you get up',        short:'On waking'},
  breakfast:{t:'At breakfast',           short:'Breakfast'},
  lunch:    {t:'At lunch',               short:'Lunch'},
  train:    {t:'After training, or at that time', short:'After training'},
  dinner:   {t:'After dinner',           short:'After dinner'},
  evening:  {t:'In the evening',         short:'Evening'},
  bed:      {t:'Getting ready for bed',  short:'Before bed'},
  any:      {t:'Any time in the day',    short:'Any time'}
};
const CUE_ORDER=['wake','breakfast','lunch','train','dinner','evening','bed','any'];
const HABIT_CUE={protein_am:'breakfast',protein_lunch:'lunch',protein_snack:'any',veg_lunch:'lunch',water_am:'wake',
  lunch_prep:'dinner',walk_after:'dinner',stairs:'any',stretch:'train',phone_out:'bed',lights_out:'bed',no_screen:'bed',
  daylight:'wake',breathe:'bed',no_sugary_drinks:'any',no_takeaway_wk:'dinner',no_alcohol_wk:'evening',
  no_caffeine_pm:'lunch',no_snooze:'wake',no_phone_am:'wake',no_screens_meals:'any',no_smoking:'any'};
const HABIT_TINY={protein_am:'A yoghurt or two eggs',protein_lunch:'Start with the protein, whatever the amount',
  protein_snack:'A glass of milk',veg_lunch:'One forkful of anything green',water_am:'A glass, not a pint',
  lunch_prep:'Put the box out and one thing in it',walk_after:'To the end of the road and back',stairs:'One flight',
  stretch:'One stretch, thirty seconds',phone_out:'Phone face down across the room',lights_out:'In bed within the hour',
  no_screen:'The last ten minutes',daylight:'Two minutes at the door',breathe:'Three slow breaths'};
/* what each habit should move, to hold the kept days against the others */
const HABIT_OUT={protein_am:'protein',protein_lunch:'protein',protein_snack:'protein',veg_lunch:'fibre',
  water_am:'kcal',lunch_prep:'kcal',no_sugary_drinks:'kcal',no_takeaway_wk:'kcal',walk_after:'steps',stairs:'steps',
  stretch:'wb',phone_out:'sleep',lights_out:'sleep',no_screen:'sleep',daylight:'sleep',no_caffeine_pm:'sleep',
  no_alcohol_wk:'sleep',breathe:'stress',no_smoking:'stress',no_snooze:'wb',no_phone_am:'wb',no_screens_meals:'wb'};
const OUTCOME={
  sleep: {t:'Sleep that night', unit:'h', dp:1, up:true, get:k=>realSleep(S.days[habitDay(k,1)]), noun:'nights'},
  protein:{t:'Protein that day',unit:'g', dp:0, up:true, get:k=>{ const f=dayFood(k); return f.length? foodTotals(k).protein : null; }, noun:'days'},
  fibre: {t:'Fibre that day',   unit:'g', dp:0, up:true, get:k=>{ const f=dayFood(k); return f.length? foodTotals(k).fibre : null; }, noun:'days'},
  kcal:  {t:'Calories that day',unit:' kcal',dp:0,up:false,get:k=>{ const f=dayFood(k); return f.length? foodTotals(k).kcal : null; }, noun:'days'},
  steps: {t:'Steps that day',   unit:'',  dp:0, up:true, get:k=>{ const r=S.days[k]; if(!r) return null; const a=r.auto&&!r.auto.sim&&typeof r.auto.steps==='number'? r.auto.steps : r.steps; return typeof a==='number'? a : null; }, noun:'days'},
  stress:{t:'Stress that day',  unit:'/10',dp:1,up:false,get:k=>{ const r=S.days[k]; return r&&typeof r.stress==='number'? r.stress : null; }, noun:'days'},
  wb:    {t:'How the day went', unit:'/10',dp:1,up:true, get:k=>{ const r=S.days[k]; return r&&typeof r.wb==='number'? r.wb : null; }, noun:'days'}
};
/* The four automaticity statements (SRBAI). "It" is the habit. */
const SRBAI=['I do it automatically','I do it without having to consciously remember','I do it without thinking','I start doing it before I realise I am doing it'];

const cueOf=(h,meta)=> (h&&h.cue&&CUES[h.cue])? h.cue : (meta&&HABIT_CUE[meta.id])||'any';
const tinyOf=(h,meta)=> (h&&typeof h.tiny==='string'&&h.tiny.trim())? h.tiny : (meta&&meta.kind==='start'? (HABIT_TINY[meta.id]||'') : '');
const secondNature=()=>{ if(!Array.isArray(S.secondNature)) S.secondNature=[]; return S.secondNature; };
const snOf=id=>secondNature().find(x=>x.id===id)||null;
const mondayOf=k=>{ const d=dateOf(k); return habitDay(k,-((d.getDay()+6)%7)); };

/* each cue's clock time today, in minutes, from this person's own day */
function cueTimes(){
  const out={wake:clockOf('wake'), bed:clockOf('bed'), train:clockOf('train')};
  let slots=[]; try{ slots=mealSlots(todayKey()).slots; }catch(e){}
  const role=r=>{ const s=slots.find(x=>x.role===r); return s? s.min : null; };
  out.breakfast=role('b'); out.lunch=role('l'); out.dinner=role('d');
  /* with a chosen eating pattern the cues follow the window: a 16:8 day has
     no breakfast, so the breakfast cue is the first meal */
  const pat=(typeof eatPat==='function')? eatPat() : null;
  const fm=pat&&typeof firstMealMin==='function'? firstMealMin() : null;
  if(out.breakfast===null) out.breakfast= fm!==null? fm : (out.wake+60)%1440;
  if(out.lunch===null) out.lunch= pat? (pat.s+Math.round(pat.lenMin/2))%1440 : (out.wake+330)%1440;
  if(out.dinner===null) out.dinner= pat? (pat.e-60+1440)%1440 : (out.bed-240+1440)%1440;
  out.train=(out.train+60)%1440;
  out.dinner=(out.dinner+30)%1440;
  out.evening=(out.bed-180+1440)%1440;
  out.bed=(out.bed-30+1440)%1440;
  out.any=null;
  return out;
}
const rtClock=m=>{ m=((Math.round(m)%1440)+1440)%1440; return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'); };
/* morning, day or evening, by the time since this person woke */
function partOf(min){
  if(min===null) return 'any';
  const w=clockOf('wake'), rel=((min-w)%1440+1440)%1440, bed=((clockOf('bed')-w)%1440+1440)%1440||960;
  if(rel<300) return 'am';
  if(rel<Math.max(540,bed-330)) return 'day';
  return 'pm';
}
const PARTS={am:'Morning',day:'Day',pm:'Evening',any:'Any time today'};

/* ---------- habits the food log can tick ----------
   Only ones it can actually see. A mark the person took off by hand (0) is
   never put back. */
function autoMet(id,k){
  const per=(typeof perMealProtein==='function'? perMealProtein() : null);
  const pIn=m=>dayFood(k).filter(f=>(f.meal||'s')===m).reduce((a,f)=>a+(+f.p||0)*(+f.q||1),0);
  if(id==='protein_am'){ const g=pIn((typeof firstMealRole==='function'&&firstMealRole())||'b'); return g>=Math.min(30,per||30)? Math.round(g) : null; }
  if(id==='protein_lunch'){ const g=pIn('l'); return g>=(per||25)? Math.round(g) : null; }
  if(id==='protein_snack'){ const g=pIn('s'); return g>=20? Math.round(g) : null; }
  return null;
}
const AUTO_IDS=['protein_am','protein_lunch','protein_snack'];
function syncAutoTicks(){
  let changed=false;
  const sweep=h=>{ if(!h||AUTO_IDS.indexOf(h.id)<0) return; h.days=h.days||{};
    for(let i=0;i<2;i++){ const k=habitDay(todayKey(),-i); if(k<h.started) continue;
      const v=h.days[k], met=autoMet(h.id,k)!==null;
      if(v===undefined&&met){ h.days[k]='auto'; changed=true; }
      else if(v==='auto'&&!met){ delete h.days[k]; changed=true; } } };
  activeHabits().forEach(x=>sweep(habitSlots()[x.slot]));
  secondNature().forEach(sweep);
  if(changed) save();
}

/* ---------- the ledger ----------
   Every day from the start: kept, tiny, auto, rest (a miss covered by the
   week's rest days), miss, off (not one of its days), open (today, not yet).
   Strength runs along it. */
function restDaysFor(meta){
  const n=meta&&meta.days? meta.days.length : 7;
  return n>=6? 2 : (n>=3? 1 : 0);
}
function habitLedger(h,meta){
  const today=todayKey(), out=[], allow=restDaysFor(meta), used={};
  let s=0, k=h.started||today, guard=0;
  if(habitDay(today,-400)>k) k=habitDay(today,-400);
  for(;k<=today&&guard<420;guard++,k=habitDay(k,1)){
    if(!habitApplies(meta,k)){ out.push({k,st:'off',s}); continue; }
    const v=h.days&&h.days[k];
    let st= v===true? 'kept' : (v==='auto'? 'auto' : (v==='tiny'? 'tiny' : null));
    if(!st){
      if(k===today) st='open';
      else { const wk=mondayOf(k); used[wk]=used[wk]||0;
        if(used[wk]<allow){ used[wk]++; st='rest'; } else st='miss'; }
    }
    if(st==='kept'||st==='auto') s+=RT_K*(1-s);
    else if(st==='tiny') s+=RT_TINY*RT_K*(1-s);
    else if(st==='miss') s-=RT_MISS*s;
    out.push({k,st,s});
  }
  /* the run: days kept back from today (or yesterday), rest days carry it */
  let run=0;
  for(let i=out.length-1;i>=0;i--){ const d=out[i];
    if(d.st==='open'||d.st==='off') continue;
    if(d.st==='rest') continue;
    if(d.st==='miss') break;
    run++; }
  const wk=mondayOf(today), restUsed=used[wk]||0;
  const recent=out.filter(d=>d.st!=='off'&&d.st!=='open').slice(-14);
  const keepRate=recent.length? recent.reduce((a,d)=>a+(d.st==='kept'||d.st==='auto'? 1 : (d.st==='tiny'? RT_TINY : 0)),0)/recent.length : null;
  const missRate=recent.length? recent.filter(d=>d.st==='miss').length/recent.length : 0;
  const last=out.filter(d=>d.st!=='off'&&d.st!=='open').slice(-1)[0]||null;
  const age=Math.round((dateOf(today)-dateOf(h.started||today))/864e5)+1;
  return {days:out,strength:s,run,restLeft:Math.max(0,allow-restUsed),allow,keepRate,missRate,last,age,
    kept:out.filter(d=>d.st==='kept'||d.st==='auto'||d.st==='tiny').length};
}
/* where strength levels out at this rate, and when it gets to 95% */
function habitOutlook(L){
  if(L.keepRate===null||L.age<5) return {text:'A week of it and this shows where it is heading.'};
  if(L.strength>=0.95) return {text:'At full strength. Keeping it there is the easy part.'};
  const p=L.keepRate, q=L.missRate;
  const level=(p+q)>0? p/(p+q) : 0;
  if(level<0.95) return {level,text:'At this rate it levels out around '+Math.round(level*100)+'%. Fewer misses than rest days lift that ceiling.'};
  let s=L.strength, n=0; while(s<0.95&&n<500){ s+=p*RT_K*(1-s)-q*RT_MISS*s; n++; }
  const weeks=Math.max(1,Math.round(n/7));
  return {days:n,text:n<=7? 'About a week from full strength at this rate.' : 'About '+weeks+' weeks from full strength at this rate.'};
}

/* ---------- the person's own numbers ---------- */
function habitEffect(h,meta){
  const oid=HABIT_OUT[meta.id]||'wb', O=OUTCOME[oid];
  const L=habitLedger(h,meta), on=[], offd=[];
  L.days.forEach(d=>{ if(d.st==='off'||d.st==='open') return;
    const v=O.get(d.k); if(typeof v!=='number') return;
    (d.st==='kept'||d.st==='auto'||d.st==='tiny'? on : offd).push(v); });
  const mean=a=>a.reduce((x,v)=>x+v,0)/a.length;
  const fmt=v=>(oid==='steps'? num(Math.round(v)) : v.toFixed(O.dp))+O.unit;
  const res={id:oid,label:O.t,nOn:on.length,nOff:offd.length};
  if(on.length>=4&&offd.length>=3){
    const a=mean(on), b=mean(offd), diff=a-b, better= O.up? diff>0 : diff<0;
    const small= oid==='steps'? Math.abs(diff)<300 : Math.abs(diff)<(O.unit==='h'? 0.15 : (O.unit==='g'? 3 : (O.unit===' kcal'? 50 : 0.3)));
    Object.assign(res,{ready:true,a,b,better,small,
      text:`${O.t}: ${fmt(a)} on the ${on.length} ${O.noun} you kept it, ${fmt(b)} on the other ${offd.length}.`,
      verdict: small? 'About the same either way so far.' : (better? 'Better on the days you keep it.' : 'Not better on the days you keep it, so far.')});
  } else if(offd.length<3&&on.length>=6){
    Object.assign(res,{text:`Kept nearly every day, so there are not enough other ${O.noun} to compare against. A good problem.`});
  } else {
    Object.assign(res,{text:`${O.t} on the days you keep it against the days you do not. It needs 4 kept and 3 others with ${O.t.toLowerCase().replace(/ that (night|day)$/,'')} logged: ${on.length} and ${offd.length} so far.`});
  }
  return res;
}

/* ---------- automaticity checks and graduating ---------- */
const lastCheck=h=>{ const c=Array.isArray(h.checks)? h.checks : []; return c.length? c[c.length-1] : null; };
function checkDue(h,sn){
  const age=Math.round((dateOf(todayKey())-dateOf(sn? h.grad : h.started))/864e5);
  /* second nature counts its four weeks from graduating: checks from its training do not count */
  const c= sn? (Array.isArray(h.checks)? h.checks.filter(x=>x.d>=h.grad).slice(-1)[0] : null) : lastCheck(h);
  if(sn) return age>=RT_SN_EVERY&&(!c||Math.round((dateOf(todayKey())-dateOf(c.d))/864e5)>=RT_SN_EVERY);
  if(age<RT_CHECK_FROM) return false;
  return !c||Math.round((dateOf(todayKey())-dateOf(c.d))/864e5)>=RT_CHECK_EVERY;
}
function canGraduate(h,L){
  const c=(Array.isArray(h.checks)? h.checks : []).slice(-2);
  if((L? L.age : 0)<RT_GRAD_DAYS) return false;
  if(c.length===2&&c[0].score>=RT_GRAD_SCORE&&c[1].score>=RT_GRAD_SCORE&&Math.round((dateOf(c[1].d)-dateOf(c[0].d))/864e5)>=6) return true;
  return !!(L&&L.strength>=0.95&&c.length&&c[c.length-1].score>=RT_GRAD_SCORE);
}
function recordCheck(target,answers){
  const a=answers.map(x=>Math.max(1,Math.min(7,+x||0)));
  const score=+(a.reduce((x,v)=>x+v,0)/a.length).toFixed(2);
  target.checks=(Array.isArray(target.checks)? target.checks : []).filter(c=>c.d!==todayKey()).concat([{d:todayKey(),a,score}]).slice(-20);
  save(); return score;
}
function graduateHabit(slot){
  const h=habitSlots()[slot]; if(!h||!h.id) return null;
  const meta=habitOf(h.id); if(!meta) return null;
  const sn=JSON.parse(JSON.stringify(h)); sn.grad=todayKey(); sn.cue=cueOf(h,meta); delete sn.retired;
  S.secondNature=secondNature().filter(x=>x.id!==h.id).concat([sn]);
  delete habitSlots()[slot];
  save(); return sn;
}
function backToTraining(id){
  const sn=snOf(id); if(!sn) return null;
  const meta=habitOf(id); if(!meta) return null;
  const slot=slotForNew(meta.kind);
  const back=JSON.parse(JSON.stringify(sn)); delete back.grad; back.retired=false; back.kind=meta.kind;
  habitSlots()[slot]=back;
  S.secondNature=secondNature().filter(x=>x.id!==id);
  save(); return slot;
}

/* ---------- what is on the routine today ---------- */
function routineItems(){
  const times=cueTimes(), k=todayKey(), rd=(typeof readiness==='function')? readiness() : null;
  const items=[];
  activeHabits().forEach(x=>{
    const h=habitSlots()[x.slot], meta=habitOf(h.id);
    const L=habitLedger(h,meta), cue=cueOf(h,meta), at=times[cue];
    const today=L.days[L.days.length-1]||{st:'open'};
    const yest=L.days.filter(d=>d.k<k&&d.st!=='off').slice(-1)[0];
    const tiny=tinyOf(h,meta);
    const offerTiny= !!tiny&&today.st==='open'&&((rd&&rd.level==='lower')||(yest&&(yest.st==='miss'||yest.st==='rest')));
    items.push({slot:x.slot,h,meta,L,cue,at,part:partOf(at),st:today.st,tiny,offerTiny,
      lowDay:!!(rd&&rd.level==='lower'),afterMiss:!!(yest&&(yest.st==='miss'||yest.st==='rest')),auto:today.st==='auto'? autoMet(h.id,k) : null});
  });
  secondNature().forEach(h=>{ const meta=habitOf(h.id); if(!meta) return;
    const cue=cueOf(h,meta), at=times[cue], v=h.days&&h.days[k];
    items.push({sn:true,id:h.id,h,meta,cue,at,part:partOf(at),
      st: !habitApplies(meta,k)? 'off' : (v===true||v==='auto'? 'kept' : (v==='tiny'? 'tiny' : 'open'))}); });
  const rank=it=>it.at===null? 99999 : ((it.at-clockOf('wake'))%1440+1440)%1440;
  return items.sort((a,b)=>rank(a)-rank(b)||(a.sn?1:0)-(b.sn?1:0));
}

/* the strength ring around the tick */
function strengthRing(pct,done,stop,sn){
  const r=17, c=2*Math.PI*r, f=Math.max(0,Math.min(1,pct));
  const col= sn? 'var(--cyan)' : (stop? 'var(--coral)' : 'var(--green)');
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="${r}" fill="none" stroke="var(--track)" stroke-width="3"/>
    <circle cx="20" cy="20" r="${r}" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round"
      stroke-dasharray="${(c*f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 20 20)"/>
    ${done? `<circle cx="20" cy="20" r="12.5" fill="${col}"/><path d="M14.5 20.5l3.6 3.6 7.4-8" fill="none" stroke="var(--on-ink)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>` : ''}</svg>`;
}
function itemStatus(it){
  if(it.sn) return it.st==='off'? 'Not one of its days' : 'Second nature since '+prettyDate(it.h.grad);
  const L=it.L, pct=Math.round(L.strength*100), bits=[];
  if(it.st==='off') return 'Not one of its days · strength '+pct+'%';
  if(it.st==='auto') bits.push('Ticked from your food log'+(it.auto? ' · '+it.auto+' g' : ''));
  else if(it.st==='tiny') bits.push('Tiny version done');
  bits.push('Strength '+pct+'%');
  if(L.run>=2) bits.push(L.run+(it.meta.kind==='stop'? ' days without' : '-day run'));
  if(L.allow) bits.push(L.restLeft===L.allow? L.allow+' rest day'+(L.allow===1?'':'s')+' this week' : (L.restLeft? L.restLeft+' rest day left' : 'rest days used'));
  return bits.join(' · ');
}
function routineRow(it){
  const done=it.st==='kept'||it.st==='auto'||it.st==='tiny', stop=it.meta.kind==='stop';
  const name=(stop?'Stop: ':'')+escHabit(it.meta.t);
  const dueD=(!it.sn&&typeof habitDue==='function')? habitDue(it.h,it.meta) : null;
  const dueState=dueD&&it.st==='open'? (dueDelta(dueD)<=0? ' due' : (dueDelta(dueD)<=SOON_MIN? ' soon' : '')) : '';
  const cueLine=CUES[it.cue].short+(it.at!==null? ' · '+rtClock(it.at) : '')+(dueD&&dueD.set? ' · '+(dueD.eod? 'end of day ' : 'by ')+dueD.t : (dueD&&dueD.eod? ' · end of day '+dueD.t : ''));
  const pct= it.sn? 1 : it.L.strength;
  const tog= it.sn? `data-sntoggle="${it.id}"` : `data-habittoggle="${it.slot}"`;
  const open= it.sn? `data-snopen="${it.id}"` : `data-habitopen="${it.slot}"`;
  const label= it.st==='off'? 'Not one of its days' : (done? 'Undo today for '+escHabit(it.meta.t) : (stop? 'Mark today: went without '+escHabit(it.meta.t).toLowerCase() : 'Mark '+escHabit(it.meta.t)+' done'));
  const nudge= !it.sn&&it.offerTiny? `<div class="rt-tinyrow"><span>${it.lowDay? 'Lower day: the tiny version counts' : 'Back on it: even the tiny version counts'}</span>
      <button class="rt-tiny" data-habittiny="${it.slot}">${escHabit(it.tiny)}</button></div>` : '';
  return `<div class="rt-item ${done?'done':''} ${stop?'stop':''} ${it.sn?'sn':''} ${it.st==='off'?'off':''}">
    <button class="rt-tick" ${tog} aria-label="${label}" aria-pressed="${done}"${it.st==='off'?' disabled':''}>${strengthRing(pct,done,stop,it.sn)}</button>
    <button class="rt-txt" ${open} aria-label="${name}: open it"><b>${name}</b><span class="rt-cue${dueState}">${cueLine}</span><span class="rt-st">${itemStatus(it)}</span></button>
    ${nudge}</div>`;
}
/* the one automaticity check due now, if any (oldest habit first) */
let rtCheck=null;
function checkCard(){
  const due=[];
  activeHabits().forEach(x=>{ const h=habitSlots()[x.slot]; if(checkDue(h,false)) due.push({slot:x.slot,h}); });
  secondNature().forEach(h=>{ if(habitOf(h.id)&&checkDue(h,true)) due.push({sn:h.id,h}); });
  if(!due.length){ rtCheck=null; return ''; }
  due.sort((a,b)=>(a.h.started<b.h.started? -1 : 1));
  const c=due[0], key=c.sn? 'sn:'+c.sn : c.slot;
  if(!rtCheck||rtCheck.key!==key) rtCheck={key,a:[0,0,0,0],open:false};
  const meta=habitOf(c.h.id), first=!lastCheck(c.h);
  const head=`<div class="rt-ch"><b>Is it automatic yet?</b><span>${escHabit(meta.t)} · ${c.sn? 'four-weekly check' : (first? 'first check' : 'weekly check')} · 4 taps</span></div>`;
  /* folded until asked for, so it never pushes the routine off the screen */
  if(!rtCheck.open) return `<div class="rt-check folded" id="rtCheck">${head}<button class="mini go" data-autoopen="1">Answer</button></div>`;
  return `<div class="rt-check" id="rtCheck">
    ${head}
    ${SRBAI.map((q,i)=>`<div class="rt-q"><div class="rt-qt">${q}</div>
      <div class="rt-scale" role="group" aria-label="${q}">${[1,2,3,4,5,6,7].map(n=>`<button class="${rtCheck.a[i]===n?'on':''}" data-autoq="${i}:${n}" aria-label="${n} of 7">${n}</button>`).join('')}</div></div>`).join('')}
    <div class="rt-scalekey"><span>Disagree</span><span>Agree</span></div>
    <button class="cta rt-save" data-autosave="${key}"${rtCheck.a.every(x=>x)?'':' disabled'}>Save</button>
  </div>`;
}
function gradCard(){
  for(const x of activeHabits()){ const h=habitSlots()[x.slot], meta=habitOf(h.id), L=habitLedger(h,meta);
    if(canGraduate(h,L)) return `<div class="rt-grad"><b>${escHabit(meta.t)} is second nature</b>
      <span>Your answers say it happens without thinking, at ${Math.round(L.strength*100)}% strength after ${L.age} days. It stays in your routine, and its place is free for the next habit.</span>
      <div class="rt-gradact"><button class="cta" data-habitgrad="${x.slot}">Make it second nature</button><button class="mini" data-habitopen="${x.slot}">Not yet</button></div></div>`; }
  return '';
}
const ROUTINE_SUGGEST_FALLBACK=['water_am','veg_lunch','phone_out'];
function suggestRoutine(){
  const picks=[], add=id=>{ if(picks.indexOf(id)<0&&habitOf(id)) picks.push(id); };
  const c=S.checkins[0];
  if((c&&typeof c.proteinHit==='number'&&c.proteinHit<=4)||(typeof proteinRun==='function'&&(proteinRun().weeks||0)>=1)) add('protein_am');
  const sleep=avg7('sleep',{real:true}); if(sleep!==null&&sleep<7) add(sleep<6.5? 'phone_out' : 'lights_out');
  const steps=avg7('steps',{real:true}); if(steps!==null&&steps<7000) add('walk_after');
  ROUTINE_SUGGEST_FALLBACK.forEach(add);
  /* one for each part of the day where it can, so it reads as a routine */
  const byPart={}; const times=cueTimes();
  picks.forEach(id=>{ const p=partOf(times[HABIT_CUE[id]||'any']); if(!byPart[p]) byPart[p]=id; });
  const out=Object.values(byPart); picks.forEach(id=>{ if(out.length<3&&out.indexOf(id)<0) out.push(id); });
  const rank=id=>{ const m=times[HABIT_CUE[id]||'any']; return m===null? 99999 : ((m-clockOf('wake'))%1440+1440)%1440; };
  return out.slice(0,3).sort((a,b)=>rank(a)-rank(b));
}
function routineBlock(){
  syncAutoTicks();
  const items=routineItems();
  const building=items.filter(i=>!i.sn), sn=items.filter(i=>i.sn);
  if(!items.length){
    const times=cueTimes();
    return `<div class="sechead"><h2>Your routine</h2><button data-habitadd="1">All habits</button></div>
    <div class="routine rt-empty">
      <div class="rt-pitch"><b>Build a routine that runs itself</b><span>One habit at a time, each tied to a moment already in your day. It is checked for when it becomes automatic, then it graduates and the next one starts.</span></div>
      ${suggestRoutine().map(id=>{ const m=habitOf(id), cue=HABIT_CUE[id]||'any';
        return `<button class="rt-sug" data-habitchoose="${id}"><span class="rt-sugc">${CUES[cue].short}${times[cue]!==null? ' · '+rtClock(times[cue]) : ''}</span><b>${escHabit(m.t)}</b><span>${escHabit(m.s)}</span><i>Start</i></button>`; }).join('')}
    </div>`;
  }
  const due=items.filter(i=>i.st!=='off'), doneN=due.filter(i=>i.st==='kept'||i.st==='auto'||i.st==='tiny').length;
  const nowPart=partOf(nowMins());
  const parts=['am','day','pm','any'].map(p=>{ const list=items.filter(i=>i.part===p); if(!list.length) return '';
    const left=list.filter(i=>i.st==='open').length;
    return `<div class="rt-part rt-${p} ${p===nowPart?'now':''} ${!left?'clear':''}">
      <div class="rt-ph"><span>${PARTS[p]}</span>${!left? '<em>Done</em>' : (p===nowPart? '<em class="nowtag">Now</em>' : '')}</div>
      ${list.map(routineRow).join('')}</div>`; }).join('');
  const summary= building.length? `${building.length} building${sn.length? ' · '+sn.length+' second nature' : ''}` : sn.length+' second nature';
  return `<div class="sechead"><h2>Your routine</h2><button data-habitadd="1">${habitRoom()? 'Add a habit' : 'All habits'}</button></div>
  <div class="routine">
    <div class="rt-top"><b>${doneN} of ${due.length} today</b><span>${summary}</span>
      <div class="bar"><i style="width:${due.length? Math.round(doneN/due.length*100) : 0}%"></i></div></div>
    ${parts}
    ${gradCard()||checkCard()}
  </div>`;
}

/* ---------- the habit, opened ---------- */
function strengthChart(L){
  const W=320, H=120, pad=22, span=Math.max(70,L.days.length+10);
  const x=i=>pad+(W-pad*2)*i/span, y=v=>H-18-(H-34)*v;
  let ideal='', s=0; for(let i=0;i<=span;i++){ ideal+=(i?'L':'M')+x(i).toFixed(1)+' '+y(s).toFixed(1); s+=RT_K*(1-s); }
  const mine=L.days.map((d,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(d.s).toFixed(1)).join('');
  return `<svg class="rt-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Strength ${Math.round(L.strength*100)}% after ${L.age} days, against the curve for a habit kept every day">
    <line x1="${pad}" x2="${W-pad}" y1="${y(0.95)}" y2="${y(0.95)}" stroke="var(--line)" stroke-dasharray="3 3"/>
    <text x="${W-pad}" y="${y(0.95)-4}" text-anchor="end" font-size="10" fill="var(--mute)">95%</text>
    <path d="${ideal}" fill="none" stroke="var(--mute)" stroke-width="1.5" stroke-dasharray="4 4"/>
    <path d="${mine}" fill="none" stroke="var(--green)" stroke-width="2.5" stroke-linejoin="round"/>
    <line x1="${x(66)}" x2="${x(66)}" y1="${y(0)}" y2="${y(1)}" stroke="var(--line)"/>
    <text x="${x(66)+3}" y="${y(0)-4}" font-size="10" fill="var(--mute)">day 66</text>
    <text x="${pad}" y="${H-4}" font-size="10" fill="var(--mute)">start</text>
  </svg>`;
}
function habitGrid(L){
  const byK={}; L.days.forEach(d=>{ byK[d.k]=d.st; });
  const end=todayKey(), startMon=habitDay(mondayOf(end),-49), rows=[];
  for(let w=0;w<8;w++){ const cells=[];
    for(let d=0;d<7;d++){ const k=habitDay(startMon,w*7+d); const st=k>end? 'future' : (byK[k]||'pre'); cells.push(`<i class="g-${st}" title="${prettyDate(k)}"></i>`); }
    rows.push(`<div class="rt-gw">${cells.join('')}</div>`); }
  return `<div class="rt-grid" aria-label="The last eight weeks">${rows.join('')}</div>
    <div class="rt-gkey"><span><i class="g-kept"></i>kept</span><span><i class="g-tiny"></i>tiny</span><span><i class="g-rest"></i>rest day</span><span><i class="g-miss"></i>missed</span></div>`;
}
function openHabitOne(slot){
  const h=currentHabit(slot); if(!h) return;
  const meta=habitOf(h.id), L=habitLedger(h,meta), stop=meta.kind==='stop', today=L.days[L.days.length-1]||{st:'open'};
  const cue=cueOf(h,meta), times=cueTimes(), tiny=tinyOf(h,meta), eff=habitEffect(h,meta), out=habitOutlook(L);
  const checks=(Array.isArray(h.checks)? h.checks : []);
  const done=today.st==='kept'||today.st==='auto'||today.st==='tiny';
  document.getElementById('altTitle').textContent=(stop?'Stop: ':'')+meta.t;
  document.getElementById('altSub').textContent='Day '+L.age+', since '+prettyDate(h.started)+'. '+L.kept+' repeat'+(L.kept===1?'':'s')+' so far.';
  document.getElementById('altBody').innerHTML=`<div class="rt-sheet">
    <div class="rt-big"><b>${Math.round(L.strength*100)}%</b><span>strength${L.run>=2? ' · '+L.run+(stop?' days without':'-day run') : ''}${L.allow? ' · '+L.restLeft+' of '+L.allow+' rest days left this week' : ''}</span></div>
    ${strengthChart(L)}
    <div class="note">${out.text} The dashed line is a habit kept every day; the typical one reaches its peak around day 66 (Lally and colleagues 2010).</div>
    ${today.st==='off'? `<div class="note">Today is not one of its days.</div>`
      : `<button class="sheetcta" data-habittoggle="${slot}" style="margin:10px 0;width:100%">${done? 'Untick today' : (stop? 'Mark today: went without' : 'Mark today done')}</button>`}
    <div class="slab">The last eight weeks</div>${habitGrid(L)}
    <div class="slab">Do it by</div>
    ${(()=>{ const d=habitDue(h,meta); return `<div class="note">${d.set||d.eod? (d.eod? 'End of day, '+d.t : 'By '+d.t) : 'Not set. It is asked about at '+d.t+'.'}</div>
      <button class="sheetcta" data-dueedit="${slot}" style="margin:6px 0 10px;width:100%">${d.set||d.eod? 'Change the time or reminder' : 'Set a time and a reminder'}</button>`; })()}
    <div class="slab">When it happens</div>
    <div class="rt-cues">${CUE_ORDER.map(c=>`<button class="rt-cuechip ${c===cue?'on':''}" data-habitcue="${slot}:${c}">${CUES[c].short}${times[c]!==null? ' '+rtClock(times[c]) : ''}</button>`).join('')}</div>
    <div class="note">${CUES[cue].t}. Hanging a habit off something you already do is what makes it automatic; a reminder alone gets it done without making it a habit (Stawarz and colleagues 2015).</div>
    ${stop? '' : `<div class="slab">The tiny version</div>
    <div class="ownrow"><input id="tiny_${slot}" type="text" maxlength="${OWN_MAX}" value="${escHabit(tiny)}" placeholder="The two minute version" aria-label="The tiny version of this habit">
      <button class="mini go" data-habittinysave="${slot}">Save</button></div>
    <div class="note">Offered on a lower readiness day or after a miss. It counts as a repeat, a bit less than the full thing.</div>`}
    <div class="slab">Your numbers</div>
    <div class="method rt-eff ${eff.ready? (eff.small? '' : (eff.better? 'good' : 'warn')) : ''}"><b>${eff.ready? eff.verdict : eff.label}</b><span>${eff.text}${eff.ready? ' Your own days, not proof: other things change too.' : ''}</span></div>
    <div class="slab">Is it automatic yet?</div>
    <div class="note">${checks.length? checks.slice(-6).map(c=>prettyDate(c.d)+': '+c.score.toFixed(1)+' of 7').join(' · ') : 'Asked once a week from day '+RT_CHECK_FROM+'. Four statements, from the Self-Report Behavioural Automaticity Index (Gardner and colleagues 2012).'}</div>
    ${canGraduate(h,L)? `<button class="sheetcta" data-habitgrad="${slot}" style="margin:10px 0;width:100%">Make it second nature</button>`
      : `<div class="note">It graduates to second nature when two weekly checks in a row average ${RT_GRAD_SCORE} of 7 or more, from day ${RT_GRAD_DAYS}.</div>`}
    <button class="sheetcta" data-habitretire="${slot}" style="margin:12px 0 10px;width:100%;background:var(--coral-text)">Remove this habit</button>
    <div class="note">Removing it keeps nothing hidden: the days you kept stay in your history, and Undo brings it straight back.</div>
  </div>`;
  openSheet('altSheet');
}
function openSecondNature(id){
  const h=snOf(id), meta=h&&habitOf(id); if(!meta) return;
  const L=habitLedger(h,meta), checks=Array.isArray(h.checks)? h.checks : [];
  document.getElementById('altTitle').textContent=meta.t;
  document.getElementById('altSub').textContent='Second nature since '+prettyDate(h.grad)+'. Started '+prettyDate(h.started)+'.';
  document.getElementById('altBody').innerHTML=`<div class="rt-sheet">
    <div class="method"><b>Part of your routine</b><span>${CUES[cueOf(h,meta)].t}. Ticking it is optional now. Once every four weeks the app asks the same four questions, and if it has slipped it offers to bring it back into training.</span></div>
    <div class="slab">The last eight weeks</div>${habitGrid(L)}
    <div class="note">${checks.length? 'Checks: '+checks.slice(-4).map(c=>prettyDate(c.d)+' '+c.score.toFixed(1)).join(' · ') : ''}</div>
    <button class="sheetcta" data-snback="${id}" style="margin:12px 0 10px;width:100%">Bring it back into training</button>
    <button class="sheetcta" data-snremove="${id}" style="margin:0 0 10px;width:100%;background:var(--coral-text)">Take it out of the routine</button>
  </div>`;
  openSheet('altSheet');
}

/* ---------- taps ---------- */
document.addEventListener('click',e=>{
  const q=e.target.closest('[data-autoq]');
  if(q&&rtCheck){ const [i,n]=q.dataset.autoq.split(':').map(Number); rtCheck.a[i]=n;
    const card=document.getElementById('rtCheck');
    if(card){ card.querySelectorAll(`[data-autoq^="${i}:"]`).forEach(b=>b.classList.toggle('on',b===q));
      const sv=card.querySelector('[data-autosave]'); if(sv) sv.disabled=!rtCheck.a.every(x=>x); }
    return; }
  if(e.target.closest('[data-autoopen]')&&rtCheck){ rtCheck.open=true; renderAll();
    const c=document.getElementById('rtCheck'); if(c&&c.scrollIntoView) c.scrollIntoView({block:'nearest'}); return; }
  const sv=e.target.closest('[data-autosave]');
  if(sv&&rtCheck&&rtCheck.a.every(x=>x)){
    const key=sv.dataset.autosave, sn=key.indexOf('sn:')===0;
    const target= sn? snOf(key.slice(3)) : habitSlots()[key]; if(!target) return;
    const meta=habitOf(target.id), score=recordCheck(target,rtCheck.a); rtCheck=null;
    if(sn&&score<RT_LAPSE){ renderAll(); openSecondNature(target.id);
      toast(meta.t+' has slipped a bit. Bring it back into training if you want it back on autopilot.'); return; }
    renderAll();
    const L=sn? null : habitLedger(target,meta);
    toast(sn? meta.t+' is still second nature.' : (canGraduate(target,L)? 'That one is automatic. It can graduate.' : (score>=RT_GRAD_SCORE? 'Nearly automatic. One more week like this.' : 'Saved. It gets easier with every repeat.')));
    return; }
  const tn=e.target.closest('[data-habittiny]');
  if(tn){ const slot=tn.dataset.habittiny, h=currentHabit(slot); if(!h) return;
    h.days=h.days||{}; h.days[todayKey()]='tiny'; save(); renderAll();
    toast('Tiny version done. It counts.','Undo',()=>{ delete h.days[todayKey()]; save(); renderAll(); }); return; }
  const tsave=e.target.closest('[data-habittinysave]');
  if(tsave){ const slot=tsave.dataset.habittinysave, h=currentHabit(slot), box=document.getElementById('tiny_'+slot); if(!h||!box) return;
    h.tiny=String(box.value||'').replace(/\s+/g,' ').trim().slice(0,OWN_MAX); save(); renderAll(); toast(h.tiny? 'Tiny version saved' : 'Back to the suggested tiny version'); return; }
  const cu=e.target.closest('[data-habitcue]');
  if(cu){ const [slot,cue]=cu.dataset.habitcue.split(':'); const h=currentHabit(slot); if(!h||!CUES[cue]) return;
    h.cue=cue; save(); renderAll(); openHabitOne(slot); toast(habitOf(h.id).t+': '+CUES[cue].t.toLowerCase()); return; }
  const gr=e.target.closest('[data-habitgrad]');
  if(gr){ const slot=gr.dataset.habitgrad, before=JSON.parse(JSON.stringify({h:habitSlots(),sn:secondNature()}));
    const sn=graduateHabit(slot); if(!sn) return; closeSheets(); renderAll();
    toast(habitOf(sn.id).t+' is second nature. There is room for the next one.','Undo',()=>{ S.habits=before.h; S.secondNature=before.sn; save(); renderAll(); }); return; }
  const st=e.target.closest('[data-sntoggle]');
  if(st){ const h=snOf(st.dataset.sntoggle); if(!h) return; h.days=h.days||{}; const k=todayKey();
    if(h.days[k]==='auto') h.days[k]=0; else if(h.days[k]) delete h.days[k]; else h.days[k]=true;
    save(); renderAll(); return; }
  const so=e.target.closest('[data-snopen]');
  if(so){ openSecondNature(so.dataset.snopen); return; }
  const sb=e.target.closest('[data-snback]');
  if(sb){ if(habitRoom()<=0){ toast('Three habits are already building. Remove or graduate one first.'); return; }
    const before=JSON.parse(JSON.stringify({h:habitSlots(),sn:secondNature()}));
    const slot=backToTraining(sb.dataset.snback); closeSheets(); renderAll();
    if(slot) toast('Back in training','Undo',()=>{ S.habits=before.h; S.secondNature=before.sn; save(); renderAll(); }); return; }
  const sr=e.target.closest('[data-snremove]');
  if(sr){ const before=JSON.parse(JSON.stringify(secondNature())), meta=habitOf(sr.dataset.snremove);
    S.secondNature=secondNature().filter(x=>x.id!==sr.dataset.snremove); save(); closeSheets(); renderAll();
    toast((meta? meta.t : 'Habit')+' taken out of the routine','Undo',()=>{ S.secondNature=before; save(); renderAll(); }); return; }
});

Object.assign(window.__G,{CUES,HABIT_CUE,HABIT_TINY,HABIT_OUT,SRBAI,RT_K,RT_MISS,RT_TINY,RT_GRAD_SCORE,RT_GRAD_DAYS,RT_CHECK_FROM,
  cueOf,tinyOf,cueTimes,partOf,autoMet,syncAutoTicks,restDaysFor,habitLedger,habitOutlook,habitEffect,checkDue,canGraduate,
  recordCheck,graduateHabit,backToTraining,secondNature,routineItems,routineBlock,suggestRoutine,openSecondNature,openHabitOne});
Object.defineProperty(window.__G,'rtCheck',{get:()=>rtCheck,set:v=>{rtCheck=v},configurable:true});
