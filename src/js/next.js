/* ===================== build 59: what is next, and what to watch =====================
   From a week of Feargal using the app: the daily check-in kept being
   forgotten, because nothing on Today asked for it at the time it made sense,
   and the line under the rings always showed sleep whatever the data said.

   So Today now leads with one thing, the most useful next step for this time
   of day, straight under the rings, with the action on the card:
     morning      last night's sleep (one tap), a pain check, a weigh in
     around meals the meal that is due
     before and   the session, an hour or two either side of the usual time,
     after work   or Resume when one is already going
     evening      today's check-in, twenty seconds, three sliders
     late         lights out
   The weekly check in, on its day, outranks all of these but a live session.
   The time of day is taken from the person's own wake, train and bed times,
   so a night shift gets its own morning.

   Underneath, the pills no longer always say sleep. Each candidate (sleep,
   protein, calories, steps, stress, the week's sessions, a weigh in) is scored
   by how far it is from where it should be for this time of day, and the two
   furthest off are shown. When nothing is off it says so. */
const nowMins=()=>{ const n=new Date(); return n.getHours()*60+n.getMinutes(); };
/* a tracker's own reading, never the demo stand-in */
const realAuto=k=>{ const a=(typeof autoOf==='function')? autoOf(k) : null; return a&&!a.sim? a : null; };
const sleepLoggedFor=k=>realSleep(S.days[k])!==null;
function fmtIn(m){ m=Math.max(0,Math.round(m)); if(m<60) return m+' min'; const h=Math.floor(m/60), r=m%60; return h+(r>=30? '½' : '')+' hour'+(h===1&&r<30?'':'s'); }
function dayClock(at){
  const wake=clockOf('wake'), bed=clockOf('bed'), train=clockOf('train');
  const rel=m=>((m-wake)%1440+1440)%1440;
  const now=typeof at==='number'? at : nowMins();
  return {now, n:rel(now), bed:rel(bed)||960, train:rel(train), rel, wake, bedAbs:bed, trainAbs:train};
}
/* The hours offered as one-tap buttons: around this person's own week. */
function sleepChoices(){
  const st=sleepStats();
  const mid=st.avg!==null? Math.round(st.avg*2)/2 : (isTeen()? 8.5 : 7.5);
  const out=[]; for(let h=mid-1;h<=mid+1.01;h+=0.5) if(h>=3&&h<=12) out.push(+h.toFixed(1));
  return out;
}
function nextCandidates(at){
  const c=dayClock(at), out=[], add=(score,o)=>out.push(Object.assign({score},o));
  const k=todayKey(), day=S.days[k]||{}, teen=isTeen(), i=dowIdx(), d=(typeof todayPlan==='function')? todayPlan() : null;

  /* a session already going: nothing beats getting back to it */
  if(typeof liveSession==='function'&&liveSession())
    add(100,{id:'live',tone:'green',kick:'In progress',title:'Back to '+escHabit(GYM.name),why:liveSummary(),
      act:`<button class="cta" data-liveresume="1">Resume</button>`});

  /* the weekly check in, on its day */
  const ciDay=(S.profile&&S.profile.checkinDay!==undefined)? +S.profile.checkinDay : 6;
  if(i===ciDay&&!checkinDone())
    add(c.n>=c.bed-300? 94 : 82,{id:'checkin',tone:'amber',kick:'Weekly check in',title:'Check in for the week',
      why:'Next week is built from it. Mostly filled in already, about two minutes.',act:`<button class="cta" data-log="week">Check in</button>`});

  /* a pain check the morning after */
  const pm=(typeof painMorningDue==='function')? painMorningDue()[0] : null;
  if(pm&&c.n<6*60)
    add(90,{id:'pain',tone:'coral',kick:'This morning',title:'How is it this morning?',
      why:`${escHabit(exOf(pm.exId).n)} was ${pm.during} out of 10 yesterday. It should have settled by now.`,
      act:`<button class="mini" data-painmorning="${pm.idx}:settled">Settled</button><button class="mini" data-painmorning="${pm.idx}:still">Still there</button><button class="mini" data-painmorning="${pm.idx}:worse">Worse</button>`});

  /* last night's sleep, in the first part of the day, unless a tracker has it */
  if(!sleepLoggedFor(k)&&!realAuto(k)&&c.n<6*60)
    add(c.n<4*60? 89 : 72,{id:'sleep',tone:'cyan',kick:'This morning',title:'How long did you sleep?',
      why:'Readiness is built from it. Tap the nearest, or put in the times.',
      act:`<div class="sleepq" role="group" aria-label="Hours slept last night">${sleepChoices().map(h=>`<button class="mini" data-sleepquick="${h}">${String(h).replace('.5','½')}h</button>`).join('')}<button class="mini" data-sleeplog="${k}">Other</button></div>`});

  /* today's session, either side of the usual time */
  const trains=d&&d.type&&d.slot!=='walk'&&d.slot!=='rest';
  if(trains&&!dayDone(i)&&!(typeof liveSession==='function'&&liveSession())){
    const until=c.train-c.n;
    const what=dayLabel(d);
    if(until<=150&&until>=-120)
      add(until<=45? 91 : 80,{id:'session',tone:'cyan',kick:until>0? 'In about '+fmtIn(until) : 'Now',title:escHabit(what),
        why: until>0? 'Planned for '+minToHhmm(c.trainAbs)+'. '+(daySub(d)||'') : 'Planned for '+minToHhmm(c.trainAbs)+'. Still time today.',
        act:`<button class="cta" data-nextstart="1">Start session</button>`});
    else if(until<-120&&c.n<c.bed-90)
      add(52,{id:'session',tone:'cyan',kick:'Not done yet',title:escHabit(what),why:'Planned for earlier. There is still time, or move it.',
        act:`<button class="cta" data-nextstart="1">Start session</button><button class="mini" data-restday="${i}">Not today</button>`});
  }

  /* the meal that is due now */
  if(typeof mealSlots==='function'&&typeof dayFood==='function'){
    let slots=[]; try{ slots=mealSlots(k).slots; }catch(e){}
    const food=dayFood(k), skipped=day.skipped||[];
    const NAMES={b:'Breakfast',l:'Lunch',d:'Dinner'};
    const due=slots.filter(x=>x.role&&NAMES[x.role]&&!x.skipped&&skipped.indexOf(x.role)<0&&!food.some(f=>(f.meal||'s')===x.role))
      .map(x=>({x,off:c.rel(x.min)-c.n})).filter(y=>y.off<=45&&y.off>=-90).sort((a,b)=>Math.abs(a.off)-Math.abs(b.off))[0];
    if(due){
      const name=NAMES[due.x.role];
      add(due.off<=0? 76 : 68,{id:'meal',tone:'coral',kick:due.off>0? 'Around '+due.x.time : 'Due '+due.x.time,title:'Log '+name.toLowerCase(),
        why: teen? 'Regular meals keep you going through the day.' : (perMealProtein()? 'About '+perMealProtein()+'g of protein makes it count.' : 'Tap it from a list, one tap each.'),
        act:`<button class="cta" data-nextfood="${due.x.role}">Log ${name.toLowerCase()}</button><button class="mini" data-nextskip="${due.x.role}">I skipped it</button>`});
    }
  }

  /* today's check-in, in the evening: the one that kept being forgotten */
  if(!day.checkedIn){
    const evening= c.n>=c.bed-210 || (dayDone(i)&&c.n>=c.bed-330);
    if(evening) add(93,{id:'daycheck',tone:'green',kick:'This evening',title:"Today's check-in",
      why:'How today went and how stressed you were. Tomorrow\'s readiness is built from it. Twenty seconds.',
      act:`<button class="cta" data-checkinnow="1">Check in</button>`});
    else if(c.n>=c.bed-420) add(30,{id:'daycheck',tone:'green',kick:'Later',title:"Today's check-in",
      why:'Best done this evening, once the day is mostly over.',act:`<button class="mini" data-checkinnow="1">Do it now</button>`});
  }

  /* a weigh in, in the morning, when a weight goal needs one */
  if(!teen&&S.target&&S.target.kind==='weight'&&c.n<4*60){
    const last=S.weights.length? S.weights[S.weights.length-1].d : null;
    const gap=last? Math.round((dateOf(k)-dateOf(last))/864e5) : 99;
    if(gap>=7) add(64,{id:'weigh',tone:'green',kick:'This morning',title:'Weigh in',
      why:(last? 'Last one was '+gap+' days ago. ' : 'None yet. ')+'Before breakfast, after the bathroom, is the steadiest reading.',
      act:`<button class="cta" data-glance="weigh">Weigh in</button>`});
  }

  /* late: wind down */
  if(c.n>=c.bed-90){
    const ss=sleepStats();
    add(day.checkedIn? 45 : 25,{id:'bed',tone:'cyan',kick:'Tonight',title:'Lights out around '+lightsOut(),
      why: ss.last7>=3&&ss.avg<ss.target.lo? `You have averaged ${ss.avg.toFixed(1)} hours this week, under the ${ss.target.lo} hour aim.` : 'A similar time each night helps as much as the hours.',
      act:`<button class="mini" data-opensleep="1">See sleep</button>`});
  }
  return out.sort((a,b)=>b.score-a.score);
}
/* What comes after the card, in a few words, so the day has a shape. */
function thenLine(list,top){
  const rest=list.filter(x=>x!==top&&x.id!==top.id&&x.score>=40);
  if(rest.length) return rest[0].title.replace(/<[^>]+>/g,'');
  return '';
}
function nextUp(at){
  const list=nextCandidates(at);
  if(list.length) return {top:list[0],then:thenLine(list,list[0]),list};
  /* nothing due: say what is coming, so the card is never empty */
  const c=dayClock(at), d=(typeof todayPlan==='function')? todayPlan() : null, i=dowIdx();
  let why='Nothing to do right now.';
  if(d&&d.type&&d.slot!=='walk'&&d.slot!=='rest'&&!dayDone(i)&&c.train>c.n) why='Next: '+dayLabel(d)+' at '+minToHhmm(c.trainAbs)+'.';
  else if(typeof nextEating==='function'){ try{ const ne=nextEating().next; if(ne) why='Next: '+ne.what.toLowerCase().replace(/,.*$/,'')+' around '+ne.time+'.'; }catch(e){} }
  return {top:{id:'clear',tone:'green',kick:'All caught up',title:'Nothing due right now',why,act:''},then:'',list};
}
function nextCard(nx){
  nx=nx||nextUp();
  const x=nx.top;
  return `<section class="nextcard t-${x.tone}" data-next="${x.id}" aria-label="Up next: ${x.title.replace(/<[^>]+>/g,'')}">
    <div class="nk"><span class="ndot" aria-hidden="true"></span>Up next<span class="nkw"> · ${x.kick}</span></div>
    <div class="nt">${x.title}</div>
    <div class="nw">${x.why}</div>
    ${x.act? `<div class="na">${x.act}</div>` : ''}
    ${nx.then? `<div class="nthen">Then: ${escHabit(nx.then)}</div>` : ''}
  </section>`;
}
/* ---------- what to watch today ----------
   Each candidate scores how far off it is, 0 to 1, for this time of day. */
function focusSignals(at){
  const c=dayClock(at), k=todayKey(), teen=isTeen(), out=[];
  const add=(id,sev,html)=>out.push({id,sev,html});
  const tg=sleepTarget(), ss=sleepStats(), sl=realSleep(S.days[k]), r=readiness();
  /* sleep */
  const sleepDriver=r.level!=='building'&&r.drivers.some(x=>/sleep/.test(x));
  if(sl!==null){
    const short=Math.max(0,tg.lo-sl), avgShort=ss.last7>=3? Math.max(0,tg.lo-ss.avg) : 0;
    const sev=Math.min(1,short/2+avgShort/2+(sleepDriver? 0.3 : 0));
    add('sleep',sev,`<button class="pill ${short>0?'off':''}" data-glance="sleep">Slept ${sl}h · aim ${isTeen()? tg.t : tg.lo+'h or more'}</button>`);
  } else if(c.n<9*60&&!realAuto(k)){
    add('sleep',0.45,`<button class="pill" data-sleeplog="${k}">Sleep: log last night</button>`);
  } else if(ss.last7>=3&&ss.avg<tg.lo-0.3){
    add('sleep',Math.min(1,(tg.lo-ss.avg)/1.5),`<button class="pill off" data-glance="sleep">Sleep ${ss.avg.toFixed(1)}h a night this week</button>`);
  }
  /* protein, against where it should be by now */
  const t=S.targets||{};
  if(!teen&&t.protein&&typeof foodTotals==='function'){
    const food=dayFood(k).length, pr=Math.round(foodTotals(k).protein||0);
    const frac=Math.min(1,Math.max(0,(c.n-60)/Math.max(60,c.bed-180-60)));
    const expected=Math.round(t.protein*frac);
    if(food&&pr<expected-15) add('protein',Math.min(1,(expected-pr)/t.protein*1.6),`<button class="pill off" data-go="eat">Protein ${pr}/${t.protein}g · behind for now</button>`);
    else if(!food&&c.n>=6*60) add('protein',0.5,`<button class="pill off" data-go="eat">Nothing logged to eat yet</button>`);
    else if(food&&pr>=expected) add('protein',0,`<button class="pill ok" data-go="eat">Protein on pace</button>`);
  }
  /* calories over */
  if(!teen&&t.kcal&&typeof foodTotals==='function'){
    const kc=Math.round(foodTotals(k).kcal||0);
    if(kc>t.kcal) add('kcal',Math.min(1,0.3+(kc-t.kcal)/600),`<button class="pill off" data-go="eat">${num(kc-t.kcal)} kcal over today</button>`);
  }
  /* steps, against the pace for the time of day */
  const st=(typeof stepsToday==='function'&&stepsToday()!==null)? stepsToday() : (typeof (S.days[k]||{}).steps==='number'? S.days[k].steps : null);
  if(st!==null){
    const frac=Math.min(1,Math.max(0,(c.n-60)/Math.max(60,c.bed-120)));
    const want=stepTarget()*frac;
    if(c.n>=6*60&&st<want*0.7) add('steps',Math.min(1,(want-st)/stepTarget()),`<button class="pill off" data-glance="steps">${num(st)} of ${num(stepTarget())} steps</button>`);
    else add('steps',0,`<button class="pill ok" data-glance="steps">${num(st)} steps</button>`);
  }
  /* stress yesterday or today */
  const ds=S.days[k]||{}, y=S.days[addDays(k,-1)]||{};
  const stressV=typeof ds.stress==='number'? ds.stress : (typeof y.stress==='number'? y.stress : null);
  if(stressV!==null&&stressV>=7) add('stress',0.35+(stressV-7)*0.15,`<button class="pill off" data-checkinnow="1">Stress ${stressV}/10 ${typeof ds.stress==='number'?'today':'yesterday'}</button>`);
  /* sessions already missed this week, counting only days the app was in use */
  const wc=weekCounts(), i=dowIdx();
  if(wc.planned&&S.plan&&S.plan.days){
    const keys=Object.keys(S.days||{}).concat((S.weights||[]).map(x=>x.d),(S.workouts||[]).map(x=>x.d)).filter(Boolean).sort();
    const since=keys[0]||k;
    let missed=0;
    for(let n=0;n<i;n++){ const x=S.plan.days[n]; if(!x||!x.type||x.slot==='walk'||x.slot==='rest'||dayDone(n)) continue;
      if(addDays(k,n-i)>=since) missed++; }
    if(missed) add('train',Math.min(1,0.2+0.2*missed),`<button class="pill off" data-go="plan">${missed} ${missed===1?'session':'sessions'} missed this week</button>`);
  }
  /* a weigh in that has gone stale */
  if(!teen&&S.target&&S.target.kind==='weight'){
    const last=S.weights.length? S.weights[S.weights.length-1].d : null;
    const gap=last? Math.round((dateOf(k)-dateOf(last))/864e5) : 99;
    if(gap>=8) add('weigh',Math.min(0.6,0.2+gap/60),`<button class="pill off" data-glance="weigh">${last? 'Weighed '+gap+' days ago' : 'No weigh in yet'}</button>`);
  }
  return out;
}
const NEXT_SAME={sleep:'sleep',meal:'protein',daycheck:'stress',weigh:'weigh',session:'train'};
function focusPills(excludeId,at){
  const sig=focusSignals(at).filter(x=>x.id!==NEXT_SAME[excludeId]);
  const off=sig.filter(x=>x.sev>=0.15).sort((a,b)=>b.sev-a.sev).slice(0,2);
  if(off.length) return off.map(x=>x.html).join('');
  const ok=sig.filter(x=>x.sev<0.15&&/pill ok|pill"/.test(x.html)).slice(0,1);
  return ok.length? ok[0].html : `<span class="pill ok calm">Nothing off today</span>`;
}

/* ---------- logging sleep on its own ----------
   Sleep could only be put in through the day's check-in, and with the demo
   tracker on it could not be put in at all, because the check-in showed the
   stand-in figure instead of the slider. Now it has its own sheet, for last
   night or any of the six before it, as hours or as the times you went to bed
   and got up. It is stored on the day you woke up, as before, so readiness,
   the sleep view and the coach all read it without change. It never counts as
   checking in. */
let sleepDraft=null;
function sleepNightLabel(k){
  if(k===todayKey()) return 'Last night';
  const night=dateOf(addDays(k,-1));
  return night.toLocaleDateString('en-IE',{weekday:'long'})+' night';
}
function openSleepLog(k){
  k=(k&&k<=todayKey())? k : todayKey();
  const cur=S.days[k]||{};
  const st=sleepStats();
  sleepDraft={k,h: typeof cur.sleep==='number'? cur.sleep : (st.avg!==null? Math.round(st.avg*4)/4 : (isTeen()? 8.5 : 7.5)),
    bed:cur.sleepBed||'', wake:cur.sleepWake||'', had:typeof cur.sleep==='number'};
  drawSleepLog();
  openSheet('altSheet');
}
function drawSleepLog(){
  const D=sleepDraft; if(!D) return;
  const nights=[]; for(let n=0;n<7;n++) nights.push(addDays(todayKey(),-n));
  const tracked=realAuto(D.k);
  document.getElementById('altTitle').textContent='Log sleep';
  document.getElementById('altSub').textContent='Hours slept, counted on the morning you woke up. It never counts as your check-in.';
  document.getElementById('altBody').innerHTML=`<div class="sleeplog" style="padding:0 14px 10px">
    <div class="pickchips sleepnights" role="tablist" aria-label="Which night">${nights.map(x=>{ const v=(S.days[x]||{}).sleep;
      return `<button role="tab" aria-selected="${x===D.k}" class="${x===D.k?'on':''}" data-sleepnight="${x}">${sleepNightLabel(x)}${typeof v==='number'? ' · '+v+'h' : ''}</button>`; }).join('')}</div>
    <div class="slhours">
      <button class="qstep" data-sleepstep="-0.25" aria-label="A quarter of an hour less">−</button>
      <div class="slnum"><input id="sleepHours" type="number" inputmode="decimal" step="0.25" min="0" max="16" value="${D.h}" aria-label="Hours slept"><span>hours</span></div>
      <button class="qstep" data-sleepstep="0.25" aria-label="A quarter of an hour more">+</button>
    </div>
    <div class="sltimes">
      <div class="nf"><label for="sleepBed">Went to sleep</label><input id="sleepBed" type="time" value="${D.bed}" data-sleeptime="bed"></div>
      <div class="nf"><label for="sleepWake">Woke up</label><input id="sleepWake" type="time" value="${D.wake}" data-sleeptime="wake"></div>
    </div>
    <div class="note" id="sleepNote">${sleepNote()}</div>
    ${tracked? `<div class="note">${sourceName()} recorded ${tracked.sleep}h for this night. What you save here is used instead.</div>` : ''}
    <button class="sheetcta" id="sleepSave" style="width:100%;margin:8px 0 4px">Save ${sleepNightLabel(D.k).toLowerCase()}</button>
    ${D.had? `<button class="skipbtn" id="sleepClear">Clear this night</button>` : ''}
  </div>`;
}
function sleepNote(){
  const D=sleepDraft, tg=sleepTarget(); if(!D) return '';
  const h=+D.h;
  if(!(h>0)) return 'Put in the hours, or the times either side.';
  return h<tg.lo? `Under the ${tg.t} aim.` : (h>tg.hi+1.5? 'A long one. Fine now and then.' : `Inside the ${tg.t} aim.`);
}
/* bed and wake times give the hours, across midnight */
function hoursBetween(bed,wake){
  const a=hhmmToMin(bed), b=hhmmToMin(wake); if(a===null||b===null) return null;
  return Math.round(((b-a+1440)%1440)/15)/4;
}
function saveSleep(k,h,extra){
  h=+h; if(!(h>0&&h<=16)) return false;
  const before=S.days[k]? JSON.parse(JSON.stringify(S.days[k])) : null;
  S.days[k]=Object.assign({},S.days[k],{sleep:Math.round(h*4)/4,sleepManual:true},extra||{});
  save(); renderAll();
  return before;
}
function undoSleep(k,before){ if(before===null) delete S.days[k]; else S.days[k]=before; save(); renderAll(); }
document.addEventListener('click',e=>{
  const sl=e.target.closest('[data-sleeplog]');
  if(sl){ closeSheets(); openSleepLog(sl.dataset.sleeplog||todayKey()); return; }
  const sq=e.target.closest('[data-sleepquick]');
  if(sq){ const k=todayKey(), h=+sq.dataset.sleepquick, before=saveSleep(k,h);
    if(before!==false) toast('Slept '+h+'h, saved','Undo',()=>undoSleep(k,before)); return; }
  const sn=e.target.closest('[data-sleepnight]');
  if(sn&&sleepDraft){ const k=sn.dataset.sleepnight, cur=S.days[k]||{};
    Object.assign(sleepDraft,{k,had:typeof cur.sleep==='number',bed:cur.sleepBed||'',wake:cur.sleepWake||'',
      h:typeof cur.sleep==='number'? cur.sleep : sleepDraft.h}); drawSleepLog(); return; }
  const ss=e.target.closest('[data-sleepstep]');
  if(ss&&sleepDraft){ sleepDraft.h=Math.max(0,Math.min(16,+((+sleepDraft.h||0)+ +ss.dataset.sleepstep).toFixed(2)));
    const el=$('sleepHours'); if(el) el.value=sleepDraft.h; const n=$('sleepNote'); if(n) n.textContent=sleepNote(); return; }
  if(e.target.closest('#sleepSave')&&sleepDraft){
    const D=sleepDraft, extra={};
    if(D.bed) extra.sleepBed=D.bed; if(D.wake) extra.sleepWake=D.wake;
    const before=saveSleep(D.k,D.h,extra);
    if(before===false){ toast('Put the hours in first'); return; }
    const label=sleepNightLabel(D.k), k=D.k, h=Math.round(D.h*4)/4;
    sleepDraft=null; closeSheets();
    toast(label+': '+h+'h saved','Undo',()=>undoSleep(k,before)); return; }
  if(e.target.closest('#sleepClear')&&sleepDraft){
    const k=sleepDraft.k, before=JSON.parse(JSON.stringify(S.days[k]||{}));
    const d=Object.assign({},S.days[k]); delete d.sleep; delete d.sleepManual; delete d.sleepBed; delete d.sleepWake;
    S.days[k]=d; save(); sleepDraft=null; closeSheets(); renderAll();
    toast('Sleep cleared','Undo',()=>undoSleep(k,before)); return; }
  /* the Up next card's own buttons */
  if(e.target.closest('[data-checkinnow]')){ openCheckin(); return; }
  if(e.target.closest('[data-nextstart]')){ startPlanDay(todayPlan()); return; }
  const nf=e.target.closest('[data-nextfood]');
  if(nf){ openFood(false,{slot:nf.dataset.nextfood}); return; }
  const nsk=e.target.closest('[data-nextskip]');
  if(nsk){ const k=todayKey(), m=nsk.dataset.nextskip, day=S.days[k]=Object.assign({},S.days[k]);
    day.skipped=(day.skipped||[]).filter(x=>x!==m).concat([m]); save(); renderAll();
    toast({b:'Breakfast',l:'Lunch',d:'Dinner'}[m]+' skipped','Undo',()=>{ const d2=S.days[k]; d2.skipped=(d2.skipped||[]).filter(x=>x!==m); save(); renderAll(); }); return; }
});
document.addEventListener('input',e=>{
  if(e.target.id==='sleepHours'&&sleepDraft){ sleepDraft.h=e.target.value===''? '' : +e.target.value; const n=$('sleepNote'); if(n) n.textContent=sleepNote(); }
  const tt=e.target.closest&&e.target.closest('[data-sleeptime]');
  if(tt&&sleepDraft){ sleepDraft[tt.dataset.sleeptime]=e.target.value;
    const h=hoursBetween(sleepDraft.bed,sleepDraft.wake);
    if(h!==null&&h>0){ sleepDraft.h=h; const el=$('sleepHours'); if(el) el.value=h; }
    const n=$('sleepNote'); if(n) n.textContent=sleepNote(); }
});
/* Today's check-in on its own, from the Up next card: the same three sliders
   as + Log, saved the same way. */
function openCheckin(){
  document.querySelectorAll('#ciCard').forEach(n=>n.remove());
  document.getElementById('altTitle').textContent="Today's check-in";
  document.getElementById('altSub').textContent='Twenty seconds. Only what you move is saved.';
  document.getElementById('altBody').innerHTML=`<div style="padding:0 14px 10px">${inlineCheckinHtml()}</div>`;
  ciTeenNote();
  openSheet('altSheet');
}
