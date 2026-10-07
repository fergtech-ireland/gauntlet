/* ===================== today ===================== */
function dayDone(i){ return (S.week[i]&&S.week[i].done.length>0); }
function walkDone(){ const st=stepsToday(); return st!==null && st>=stepTarget(); }
const checkinDone=()=>!!S.checkins.find(c=>c.weekOf===mondayKey());
const checkinDayName=()=>DAYS[S.profile.checkinDay===undefined?6:S.profile.checkinDay];
function checkinRow(){
  const due=dowIdx()===(S.profile.checkinDay===undefined?6:S.profile.checkinDay);
  const done=checkinDone();
  if(done) return `<div class="todo done"><span class="ic" style="background:var(--amber-tint);color:var(--amber-text)">↻</span>
    <span class="t"><b>Checked in</b><span>next one ${checkinDayName()}. Nothing to do until then.</span></span>
    <span class="tick">✓</span></div>`;
  if(!due) return `<div class="todo"><span class="ic" style="background:var(--amber-tint);color:var(--amber-text)">↻</span>
    <span class="t"><b>Check in is ${checkinDayName()}</b><span>once a week, and the week is built from it</span></span>
    <span class="chev">›</span></div>`;
  return `<button class="todo" id="todoCheck"><span class="ic" style="background:var(--amber-tint);color:var(--amber-text)">↻</span>
    <span class="t"><b>Check in, it is ${checkinDayName()}</b><span>mostly filled in already. Two minutes.</span></span>
    <span class="chev">›</span></button>`;
}
/* The destination, if there is one, and how far off it is. */
function targetLine(){
  const t=S.target;
  if(!t) return `<button class="skipbtn" id="setTarget">Set a goal</button>`;
  const pr=targetProgress();
  const k=TARGET_KINDS[t.kind];
  if(t.hit) return `<div class="why"><b>Target met.</b> ${t.value}${k.unit==='a week'?' sessions a week':' '+k.unit}, on ${prettyDate(t.hit)}. <button class="inlinebtn" id="setTarget">Set the next one</button></div>`;
  if(!pr) return `<button class="skipbtn" id="setTarget">${t.value}${k.unit==='a week'?' a week':' '+k.unit} by ${prettyDate(t.by)} · nothing logged against it yet</button>`;
  const late=pr.daysLeft!==null&&pr.daysLeft<0;
  return `<div class="targetline ${late?'late':''}">
    <div class="tl-h"><b>${t.value}${k.unit==='a week'?' sessions a week':' '+k.unit}</b>
      <span>${pr.daysLeft===null? '' : (late? Math.abs(pr.daysLeft)+' days past' : pr.daysLeft+' days left')}</span></div>
    <div class="bar"><i style="width:${pr.pct}%;background:${late?'var(--amber-text)':'var(--cta)'}"></i></div>
    <div class="tl-s">${pr.now}${k.unit==='a week'?'':' '+k.unit} now · ${Math.abs(pr.remaining)}${k.unit==='a week'?'':' '+k.unit} to go
      <button class="inlinebtn" id="setTarget">change</button></div></div>`;
}

/* One row per habit, seven dots, and an honest line under each. */
function habitRowFor(slot){
  const h=currentHabit(slot); if(!h) return '';
  const meta=habitOf(h.id), week=habitWeek(slot), streak=habitStreak(slot), rate=habitRate(slot);
  const today=week[week.length-1], stop=slot==='stop';
  const unit=n=> stop? (n===1? '1 day without' : n+' days without') : (n===1? '1 day so far' : n+' days running');
  let line;
  if(today.off) line='not one of its days'+(streak? ' · '+unit(streak) : '');
  else if(streak>0) line=unit(streak);
  else if(h.started===todayKey()) line='starts today';
  else line= stop? 'today is day one again, which is fine' : 'missed yesterday, which is what today is for';
  if(rate!==null&&rate<0.5&&Object.keys(h.days||{}).length>=4) line+=' · about '+Math.round(rate*100)+'% of days so far';
  const label= today.off? 'Not one of its days' : (today.done? 'Undo today' : (stop? 'Mark today: went without' : 'Mark today done'));
  return `<div class="todo habit ${stop?'stop':''} ${today.done?'done':''}">
    <span class="ic" style="background:${stop?'var(--coral-tint)':'var(--green-tint)'};color:${stop?'var(--coral-text)':'var(--green-text)'}">${stop?'×':(streak||'1')}</span>
    <button class="t habitopen" data-habitopen="${slot}" aria-label="${escHabit(meta.t)}: see it, untick it or remove it"><b>${stop?'Stop: ':''}${escHabit(meta.t)}</b><span>${line}</span>
      <span class="habitdots">${week.map(d=>`<i class="${d.done?'on':''} ${d.before?'pre':''} ${d.today?'now':''} ${d.off?'off':''}"></i>`).join('')}</span></button>
    <button class="tick habittick" data-habittoggle="${slot}" aria-label="${label}"${today.off?' disabled':''}>${today.done?'✓':''}</button>
  </div>`;
}
function habitRow(){
  let out='';
  if(!currentHabit('start')){
    const s=suggestHabit();
    if(s) out+=`<button class="todo" data-habitpick="${s.id}">
      <span class="ic" style="background:var(--green-tint);color:var(--green-text)">1</span>
      <span class="t"><b>Pick a habit</b><span>${s.t.toLowerCase()}, or choose another. Up to three at once, though one or two is easier to keep</span></span>
      <span class="chev">›</span></button>`;
  } else out+=habitRowFor('start');
  return out+habitRowFor('stop');
}
/* ---------- what the home screen is for ----------
   The research on this is not kind: health and fitness apps lose about seven in
   ten users inside a hundred days, steepest in the first fortnight, and the
   average fitness app keeps 3 to 4 in a hundred at day thirty. What separates
   the ones that last is not gamification: it is self-monitoring, self-
   regulation and seeing your own history (Fitbit review analysis, 2023; app
   loyalty study, 2025), and the single biggest reason people quit is the
   tedium of logging.
   So the home screen answers three questions in order, and nothing else:
     1. What am I doing today, and can I start it from here?
     2. Where am I against today's numbers, and can I log in one tap?
     3. Is any of this working?
   No invented streaks to break, no pressure to come back for its own sake. The
   only nudges are the ones that make the advice better: a weigh in, what you
   ate, how the day went. */

/* ---------- how much each piece of advice has to go on (Review P1-12) ----------
   The forecast already says when it is estimating and when it knows. Every
   other kind of advice now does the same, in the same words: nothing yet,
   building a baseline, or based on so many days of the last week or two. */
function daysWith(n,test){
  let c=0; for(let i=0;i<n;i++){ const r=S.days[addDays(todayKey(),-i)]; if(r&&test(r)) c++; } return c;
}
function realSleep(r){
  if(!r) return null;
  if(r.auto&&!r.auto.sim&&typeof r.auto.sleep==='number') return r.auto.sleep;
  return typeof r.sleep==='number'? r.sleep : null;
}
function confidence(domain){
  const n= domain==='sleep'? daysWith(14,r=>realSleep(r)!==null)
    : domain==='food'? daysWith(14,r=>Array.isArray(r.food)&&r.food.length>0)
    : domain==='mood'? daysWith(14,r=>typeof r.stress==='number'||typeof r.wb==='number')
    : 0;
  const of=14, need=domain==='sleep'? 5 : 4;
  const level= n===0? 'none' : (n<need? 'building' : (n<10? 'fair' : 'good'));
  const text= n===0? 'nothing logged yet'
    : n<need? `building your baseline, ${n} of the ${need} ${domain==='sleep'?'nights':'days'} it needs`
    : `based on ${n} of the last ${of} ${domain==='sleep'?'nights':'days'}`;
  return {domain,n,of,need,level,text};
}
const confChip=c=>`<span class="conf conf-${c.level}">${c.text}</span>`;

/* ---------- sleep (Review P1-01) ----------
   Adults: 7 hours or more, regularly (American Academy of Sleep Medicine and
   Sleep Research Society, 2015), with individual need varying. Teenagers: 8 to
   10. How regular sleep is may matter as much as how long (Windred and
   colleagues, 2024), but that needs bed and wake times, which only a tracker
   supplies here, so the view measures what it honestly can: duration, how
   much it swings night to night, and the shortfall against the target. */
function sleepTarget(){ return isTeen()? {lo:8,hi:10,t:'8 to 10 hours'} : {lo:7,hi:9,t:'7 hours or more'}; }
function sleepNights(n){
  const out=[];
  for(let i=n-1;i>=0;i--){ const k=addDays(todayKey(),-i); out.push({d:k,h:realSleep(S.days[k])}); }
  return out;
}
function sleepStats(){
  const nights=sleepNights(14), known=nights.filter(x=>x.h!==null), tg=sleepTarget();
  const last7=nights.slice(-7).filter(x=>x.h!==null);
  const avg=last7.length? last7.reduce((a,x)=>a+x.h,0)/last7.length : null;
  const sd=last7.length>=3? Math.sqrt(last7.reduce((a,x)=>a+(x.h-avg)*(x.h-avg),0)/last7.length) : null;
  const short=last7.reduce((a,x)=>a+Math.max(0,tg.lo-x.h),0);
  const lastNight=nights[nights.length-1].h;
  return {nights,known:known.length,last7:last7.length,avg,sd,short,lastNight,target:tg};
}
function lightsOut(){
  const p=S.profile||{}, wake=hhmmToMin(p.wakeTime||EAT_CLOCK.wake), need=sleepTarget().lo+0.5;
  return minToHhmm(((wake-need*60-15)%1440+1440)%1440);
}
function openSleep(){
  const st=sleepStats(), c=confidence('sleep'), tg=st.target;
  const max=11, H=110, W=320, bw=W/14-4;
  const bars=st.nights.map((x,i)=>{ const h=x.h===null? 0 : x.h;
    const y=H-(h/max)*H, cls=x.h===null? 'none' : (h<tg.lo? 'low' : 'ok');
    return `<rect class="sb ${cls}" x="${(i*(W/14)+2).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(x.h===null?2:0,H-y).toFixed(1)}" rx="3"/>`; }).join('');
  const ty=(H-(tg.lo/max)*H).toFixed(1);
  const lines=[];
  if(st.last7>=3){
    lines.push(`<div class="sstat"><b>${st.avg.toFixed(1)}h</b><span>average, last 7 nights</span></div>`);
    lines.push(`<div class="sstat"><b>${st.short.toFixed(1)}h</b><span>short of ${tg.lo} hours, over the week</span></div>`);
    lines.push(`<div class="sstat"><b>${st.sd<0.5?'Steady':(st.sd<1?'Some swing':'Up and down')}</b><span>night to night, ± ${st.sd.toFixed(1)}h</span></div>`);
  }
  document.getElementById('altTitle').textContent='Sleep';
  document.getElementById('altSub').innerHTML=`Aim: ${tg.t} a night. ${confChip(c)}`;
  document.getElementById('altBody').innerHTML=`<div style="padding:0 14px 10px">
    <svg viewBox="0 0 ${W} ${H+18}" class="sleepchart" role="img" aria-label="Sleep, last 14 nights">
      <line x1="0" x2="${W}" y1="${ty}" y2="${ty}" class="stg"/><text x="${W-2}" y="${(+ty-4).toFixed(1)}" text-anchor="end" class="slab2">${tg.lo}h</text>
      ${bars}
      <text x="2" y="${H+14}" class="slab2">2 weeks ago</text><text x="${W-2}" y="${H+14}" text-anchor="end" class="slab2">last night</text>
    </svg>
    ${lines.length? `<div class="sstats">${lines.join('')}</div>` : `<div class="note">A few more nights and this shows your average, how short you are against ${tg.lo} hours, and how steady it is.</div>`}
    <div class="method" style="margin-top:10px"><b>Tonight</b><span>To get ${sleepTarget().lo+0.5} hours before your usual ${(S.profile&&S.profile.wakeTime)||EAT_CLOCK.wake} start, lights out around <strong class="inl">${lightsOut()}</strong>. Keep the last coffee well before that, and a similar time each night helps as much as the hours.</span></div>
    <div class="note">How regular your sleep is, going to bed and getting up at similar times, may matter as much as how long it is. Measuring that needs bed and wake times, which a connected tracker provides; the hours here are what you logged.</div>
    <button class="sheetcta" data-glance="checkin" style="width:100%">Log last night's sleep</button>
  </div>`;
  openSheet('altSheet');
}

/* ---------- readiness (Review P1-02) ----------
   A systematic review of 56 studies (Saw and colleagues, 2016) found that
   how people say they are, sleep, stress, mood, tracks their response to
   training more sensitively and consistently than objective markers such as
   heart rate or blood tests. Those studies were in athletes. So readiness here
   is built from what is logged, and only against the person's own last four
   weeks: never a universal score, and never a single number pretending to be
   more precise than it is. Better, about usual, or lower, with what is driving
   it. */
function readiness(at){
  /* at: a day key, for the history on You (build 58); none means today. The
     baseline is always the 28 days before that day, so a past day is judged
     against its own usual at the time, not today's. */
  const k=at||todayKey(), y=addDays(k,-1);
  const hist=(get,skip)=>{ const out=[]; for(let i=1;i<=28;i++){ const kk=addDays(k,-i); if(skip&&skip===kk) continue;
    const v=get(S.days[kk]); if(typeof v==='number') out.push(v); } return out; };
  const stat=a=>{ const m=a.reduce((x,v)=>x+v,0)/a.length; return {m,sd:Math.sqrt(a.reduce((x,v)=>x+(v-m)*(v-m),0)/a.length)}; };
  const inputs=[];
  const sl=realSleep(S.days[k]);
  if(sl!==null){ const b=hist(realSleep); if(b.length>=5){ const s=stat(b); inputs.push({name:'sleep',v:sl,m:s.m,z:(sl-s.m)/Math.max(0.5,s.sd),good:1,unit:'h'}); } }
  const src=(S.days[k]&&typeof S.days[k].stress==='number')? k : y;
  const today=S.days[src]||{};
  if(typeof today.stress==='number'){ const b=hist(r=>r&&r.stress,src); if(b.length>=5){ const s=stat(b); inputs.push({name:'stress',v:today.stress,m:s.m,z:(today.stress-s.m)/Math.max(1,s.sd),good:-1,unit:'/10'}); } }
  if(typeof today.wb==='number'){ const b=hist(r=>r&&r.wb,src); if(b.length>=5){ const s=stat(b); inputs.push({name:'day rating',v:today.wb,m:s.m,z:(today.wb-s.m)/Math.max(1,s.sd),good:1,unit:'/10'}); } }
  const baseDays=daysWith(28,r=>realSleep(r)!==null||typeof r.stress==='number'||typeof r.wb==='number');
  if(inputs.length<2){
    return {level:'building',drivers:[],baseDays,text: baseDays<7? 'Building your baseline: it needs about a week of sleep and how your days went.' : 'Log last night\'s sleep and how yesterday went to see today against your usual.'};
  }
  const score=inputs.reduce((a,x)=>a+x.z*x.good,0)/inputs.length;
  const level= score<=-0.6? 'lower' : (score>=0.6? 'better' : 'usual');
  const drivers=inputs.filter(x=>Math.abs(x.z)>=0.75).map(x=>{
    const diff=x.v-x.m, word= x.name==='sleep'? (diff<0? 'less sleep' : 'more sleep') : (x.name==='stress'? (diff>0? 'more stress' : 'less stress') : (diff<0? 'a worse day' : 'a better day'));
    return `${word} than usual (${x.name==='sleep'? x.v+'h against '+x.m.toFixed(1)+'h' : x.v+x.unit+' against '+x.m.toFixed(1)})`; });
  return {level,drivers,baseDays,score,
    text: level==='lower'? 'Lower than your usual' : (level==='better'? 'Better than your usual' : 'About your usual')};
}
function readinessPanel(){
  const r=readiness();
  return `<div class="panel"><div class="ph"><h3>Readiness</h3></div>
    <div class="bigrow"><div class="n" style="font-size:22px">${r.level==='building'? 'Building your baseline' : r.text}</div></div>
    <div class="note" style="margin:0">${r.level==='building'? r.text : (r.drivers.length? 'Driven by '+r.drivers.join('; ')+'.' : 'Nothing well away from your usual.')} ${confChip({level: r.baseDays>=14?'good':(r.baseDays>=7?'fair':'building'), text: r.baseDays? 'based on '+r.baseDays+' of the last 28 days' : 'nothing logged yet'})}</div></div>`;
}

/* ---------- what matters today (Review P1-04) ----------
   Not a dashboard: at most three things worth doing, each saying what changed
   and why, ranked. Today's session is already the card above, so it is not
   repeated. Advice built on thin data says so, and some advice waits until
   there is enough to go on. */
function priorities(){
  const out=[], k=todayKey(), day=S.days[k]||{}, hour=new Date().getHours(), teen=isTeen();
  const add=(score,id,t,why,action,conf)=>out.push({score,id,t,why,action,conf});
  /* the weekly check in, on its day */
  const ciDay=(S.profile&&S.profile.checkinDay!==undefined)? +S.profile.checkinDay : 6;
  if(dowIdx()===ciDay&&!checkinDone())
    add(90,'checkin','Do the weekly check in','Next week is built from it. Two minutes.','<button class="mini go" data-log="week">Check in</button>');
  /* sleep, when there is enough to say something */
  const ss=sleepStats(), sc=confidence('sleep');
  if(ss.last7>=3&&ss.avg<ss.target.lo-0.3)
    add(80,'sleep','Protect sleep tonight',`You have averaged ${ss.avg.toFixed(1)} hours over the last ${ss.last7} nights you logged, under the ${ss.target.lo} hour aim. Lights out around ${lightsOut()}.`,'<button class="mini" data-opensleep="1">See sleep</button>',sc);
  else if(ss.lastNight!==null&&ss.lastNight<ss.target.lo-1&&ss.last7<3)
    add(55,'sleep','A short night',`${ss.lastNight} hours last night. One night is not a pattern, but an earlier night tonight is worth it.`,'<button class="mini" data-opensleep="1">See sleep</button>',sc);
  /* readiness, on a training day, when it is lower than usual */
  const rd=readiness(), tp=(typeof todayPlan==='function')? todayPlan() : null;
  if(rd.level==='lower'&&tp&&tp.type&&tp.slot!=='walk'&&!dayDone(dowIdx()))
    add(75,'readiness','Readiness is lower than your usual',`Driven by ${rd.drivers.join('; ')||'several things a little off'}. The session can still go ahead: keep the weights where they are, or stop a set early. How you feel once warmed up is the better guide.`,'',
      {level:rd.baseDays>=14?'good':'fair',text:'based on '+rd.baseDays+' of the last 28 days'});
  /* a pain check the morning after */
  painMorningDue().slice(0,1).forEach(p=>{
    const pat=painPattern(p.exId);
    add(85,'pain','How is it this morning?',`${exOf(p.exId).n} was ${p.during} out of 10 yesterday. The guide is that it should have settled by now.${pat.unsettled>=1? ' It did not settle last time either.' : ''}`,
      `<button class="mini" data-painmorning="${p.idx}:settled">Settled</button><button class="mini" data-painmorning="${p.idx}:still">Still there</button><button class="mini" data-painmorning="${p.idx}:worse">Worse</button>`);
  });
  /* stress yesterday */
  const y=S.days[addDays(k,-1)]||{};
  if(typeof y.stress==='number'&&y.stress>=7)
    add(70,'stress','Something that lowers stress today',`You rated yesterday ${y.stress} out of 10 for stress. A walk outside, a call with someone, or ten quiet minutes all count.`+(teen?' If it is more than a bad day, Childline is there: 1800 66 66 66.':''),'',confidence('mood'));
  /* food: protein on track, or not, for adults who log */
  const t=S.targets||{};
  if(!teen&&t.protein){
    const fc=confidence('food'), pr=Math.round(foodTotals(k).protein||0);
    const expected=Math.round(t.protein*Math.min(1,Math.max(0,(hour-7)/13)));
    if(dayFood(k).length===0&&hour>=13&&fc.n>=3&&!((S.days[k]||{}).skipped||[]).length)
      add(60,'food','Log what you have eaten so far','Nothing logged yet today, and the rest of the week relies on it. Same as yesterday is one tap.','<button class="mini go" data-glance="food">Log food</button>');
    else if(dayFood(k).length&&pr<expected-25)
      add(50,'protein',...proteinPaceText(pr,expected,t.protein),'<button class="mini" data-glance="food">Log food</button>');
    else if(dayFood(k).length&&pr>=expected)
      add(10,'proteinok','Protein is on track','Nothing to fix here today, so put the effort elsewhere.','');
  }
  /* weigh in, adults with a weight goal, only if it has been a while */
  if(!teen&&S.target&&S.target.kind==='weight'){
    const last=S.weights.length? S.weights[S.weights.length-1].d : null;
    const gap=last? Math.round((dateOf(k)-dateOf(last))/864e5) : 99;
    if(gap>=7) add(40,'weigh','Weigh in this morning',`${last? 'Last one was '+gap+' days ago' : 'No weigh ins yet'}. The trend and your forecast need one a week at least.`,'<button class="mini" data-glance="weigh">Weigh in</button>');
  }
  /* steps, late in the day and well behind */
  const stp=(typeof stepsToday==='function')? stepsToday() : null;
  if(stp!==null&&hour>=17&&stp<stepTarget()*0.6)
    add(30,'steps','A walk this evening',`${num(stp)} steps so far against ${num(stepTarget())}. Twenty minutes gets you most of the way.`,'');
  return out.sort((a,b)=>b.score-a.score).slice(0,3);
}
/* Late in the day "on pace" becomes the whole target, which read as
   "around 171g would be on pace for 171g". Then it simply says how far short,
   and that one day matters less than the week. */
function proteinPaceText(pr,expected,target){
  if(expected>=target*0.95) return ['Protein is short today',`${pr}g of ${target}g so far. A protein-rich last meal or snack closes some of the gap, and the week matters more than one day.`];
  return ['Get protein into the next meal',`${pr}g so far; around ${expected}g would be on pace for ${target}g today.`];
}
/* Each kind of prompt keeps one colour, so the eye learns them: sleep cyan,
   readiness and stress amber, food and pain coral, check-ins green. */
const PRIO_TONE={sleep:'cyan',readiness:'amber',stress:'amber',protein:'coral',food:'coral',pain:'coral',
  checkin:'green',proteinok:'green',weigh:'green',steps:'amber'};
function prioritiesRow(list){
  list=list||priorities();
  if(!list.length) return '';
  return `<div class="sechead"><h2>What matters today</h2></div>
    <div class="prios">${list.map((x,i)=>{ const tone=PRIO_TONE[x.id]||'green';
      return `<div class="prio p-${x.id}">
      <div class="pn" style="background:var(--${tone}-tint);color:var(--${tone}-text)">${i+1}</div>
      <div class="pt"><b>${x.t}</b><span>${x.why}</span>${x.conf? confChip(x.conf) : ''}${x.action? `<div class="pa">${x.action}</div>` : ''}</div></div>`; }).join('')}</div>`;
}
/* How the week is actually going, in one honest sentence. */
function weekLine(){
  const plan=ensurePlan(), i=dowIdx();
  const planned=plan.days.filter(d=>d.type&&d.slot!=='walk').length;
  let done=0; for(let n=0;n<=i;n++) if(dayDone(n)) done++;
  const days=lastNDays(7).length;
  const bits=[];
  bits.push(done+' of '+planned+' sessions done');
  if(days) bits.push(days+' of the last 7 days logged');
  const tr=(typeof weightTrend==='function'&&typeof weightSeries==='function')? weightTrend(weightSeries()) : null;
  if(tr&&tr.perWeek!==null&&Math.abs(tr.perWeek)>=0.05)
    bits.push((tr.perWeek<0?'down ':'up ')+Math.abs(tr.perWeek).toFixed(2)+' kg a week');
  return bits.join(' · ');
}
/* ---------- eating around your day ----------
   What the evidence actually supports, and what it does not:
     - Total protein across the day beats when you eat it. The ISSN's 2017
       position stand puts 20 to 40 g every three to four hours ahead of
       post-workout timing, and the pooled analyses found the timing effect
       disappears once daily protein is accounted for (Schoenfeld, Aragon and
       Krieger, 2013).
     - Eating within a couple of hours before training makes the post-workout
       rush largely redundant, because that meal is still being digested.
     - Post-exercise protein within about two hours does raise muscle protein
       synthesis, so it is worth doing, not worth panicking about.
     - The last big meal is better finished two to three hours before bed:
       later meals raise core temperature when it needs to fall, and the
       observational evidence on late eating and sleep quality points one way.
     - 20 to 40 g of slow protein before sleep raises overnight muscle protein
       synthesis. Small and easy to digest, not a second dinner.
     - Caffeine fragments sleep when taken within about eight hours of bed at
       a coffee-sized dose; a small one four hours out is usually fine.
   What this is not: a claim that timing will make you lose weight. Calories
   decide that. Timing is for training quality, recovery and sleep, and the
   app says so rather than implying otherwise. */
const EAT_CLOCK={bed:'23:00', train:'18:00', wake:'07:00'};
const hhmmToMin=t=>{ const m=/^(\d{1,2}):(\d{2})$/.exec(String(t||'')); return m? (+m[1])*60+(+m[2]) : null; };
const minToHhmm=v=>{ const x=((Math.round(v)%1440)+1440)%1440;
  return String(Math.floor(x/60)).padStart(2,'0')+':'+String(x%60).padStart(2,'0'); };
const clockOf=k=>{ const p=S.profile||{}; return hhmmToMin(p[k==='bed'?'bedtime':(k==='train'?'trainTime':'wakeTime')])??hhmmToMin(EAT_CLOCK[k]); };
/* Does today involve training, and what kind. */
function todayTrains(){
  const d=(typeof todayPlan==='function')? todayPlan() : null;
  if(!d||!d.type||d.slot==='walk') return null;
  return d.templateId? 'lifting' : (d.runId||d.circuitId? 'cardio' : null);
}
function eatingPlan(){
  /* Everything is planned in minutes since waking and only turned back into
     clock times at the end. Working in raw clock minutes broke for anyone
     whose day crosses midnight: a night shift came out with "04:00 last meal"
     listed before "15:30 breakfast", and every "is this close to that" check
     compared the wrong numbers. */
  const bedA=clockOf('bed'), wakeA=clockOf('wake'), trainA=clockOf('train');
  const rel=t=>(((t-wakeA)%1440)+1440)%1440;
  const abs=r=>(((wakeA+r)%1440)+1440)%1440;
  const bed=rel(bedA)||960, train=rel(trainA);
  const t=S.targets||{}, protein=+t.protein||0;
  const kind=todayTrains();
  const trains=!!kind && train<bed;
  const meals=Math.max(3,Math.min(5,Math.round((bed/60)/3.5)));
  const per=protein? Math.round(protein/meals) : null;
  const P=per? per+'g' : '20 to 40g';
  const items=[];
  const add=(tag,time,what,why)=>items.push({tag,time,what,why:why||''});

  /* The meals it tells you to eat are the meals it schedules: the stated
     number, spaced evenly from breakfast to the last big meal. The first
     version said "5 meals of 33g" and then showed three, with a nine hour gap
     in the afternoon, which contradicted its own advice. */
  const firstAt=30, lastAt=Math.max(firstAt+240, bed-180);
  /* to the quarter hour: 16:53 reads like a machine made it */
  const slot=k=>Math.round((firstAt+k*(lastAt-firstAt)/(meals-1))/15)*15;
  const lunchK=(()=>{ let best=1,d=1e9; for(let k=1;k<meals-1;k++){ const g=Math.abs(slot(k)-330); if(g<d){d=g;best=k;} } return best; })();
  for(let k=0;k<meals;k++){
    const at=slot(k);
    if(k===0) add('breakfast',at,'Breakfast'+(per?`, about ${per}g protein`:''),
      `Protein lands better spread out: ${meals} meals of ${P} across the day beats saving it all for after training.`);
    else if(k===meals-1) add('last',at,'Last big meal'+(per?`, about ${per}g protein`:''),
      'Two to three hours before bed. Later than that and digestion is still going while your body is trying to cool down for sleep.');
    else if(k===lunchK) add('lunch',at,'Lunch'+(per?`, about ${per}g protein`:''),
      trains? 'Keeps the protein spread across the day, which matters more than exactly when you eat around the session.'
            : 'A rest day changes nothing about the protein. It is the total across the day that counts.');
    else add('meal'+k,at,'A meal or a proper snack'+(per?`, about ${per}g protein`:''),
      'Spreading protein this way beats one or two big hits. Anything with real protein in it counts.');
  }

  if(trains){
    const preAt=train-150;
    const pre = preAt<20
      ? {tag:'pre',time:10,small:true,what:'Something small first, or train as you are',
         why:'Training this early leaves no room for a proper meal beforehand. A banana or a slice of toast is plenty, and training fasted is fine too, as long as you eat properly afterwards.'}
      : {tag:'pre',time:preAt,what:'Eat properly, two to three hours before training',
         why:'Carbohydrate and protein here fuels the session and keeps working through it. Eat this and the rush to eat straight afterwards stops mattering.'};
    const post={tag:'post',time:Math.min(train+60,Math.max(train+30,bed-30)),
      what:'Eat again within about two hours'+(per?`, at least ${per}g protein`:''),
      why:'Protein after training does raise muscle protein synthesis. Two hours is plenty: the window is not the fifteen minutes it was once sold as.'};
    /* a meal around training replaces the regular meal it lands on, and
       takes over its role if that meal was breakfast or the last one */
    /* the meal after training claims its slot first; a small snack before an
       early session is not a meal and replaces nothing */
    [post,pre].forEach(tm=>{
      if(tm.small){ items.push(tm); return; }
      const hit=items.filter(i=>!['train','coffee','pre','post'].includes(i.tag)&&Math.abs(i.time-tm.time)<=90)
        .sort((x,y)=>Math.abs(x.time-tm.time)-Math.abs(y.time-tm.time))[0];
      if(hit){
        if(hit.tag==='breakfast'&&tm.tag==='post'){
          tm.what='Breakfast, within about two hours of finishing'+(per?`, at least ${per}g protein`:'');
          tm.why='Training this early means breakfast is the meal after it. Protein then raises muscle protein synthesis, and two hours is plenty of room.';
        }
        if(hit.tag==='last'){
          tm.tookLast=true;
          tm.what= tm.tag==='post'? 'Eat after training, and make it the last big one' : 'Eat properly before training, and make it the last big one';
          if(tm.tag==='post') tm.why='Training runs close to bed today, so this is one meal rather than two. Two to three hours before bed is still the aim, and the protein matters more than the hour.';
        }
        items.splice(items.indexOf(hit),1);
      }
      items.push(tm);
    });
    add('train',train,kind==='lifting'? 'Train':'Cardio','');
    add('presleep',bed-45,'Something small and protein rich, if you are hungry',
      '20 to 40g of slow protein before sleep raises overnight muscle protein synthesis. Yoghurt or a shake, not a second dinner.');
  }
  add('coffee',Math.max(60,bed-480),'Last coffee',
    'A full coffee within about eight hours of bed fragments sleep even when it does not feel like it. A small one four hours out is usually fine.');

  /* And if the meal after training already lands near bed, it does the job of
     the small one before sleep: one entry, not two a quarter of an hour apart. */
  const post2=items.find(i=>i.tag==='post'), sleepy=items.find(i=>i.tag==='presleep');
  if(post2&&sleepy&&Math.abs(post2.time-sleepy.time)<=90){
    /* if it has already become the last big meal, that wording stands */
    if(!post2.tookLast){
      post2.what='Eat after training, keep it light and protein first'+(per?`, at least ${per}g`:'');
      post2.why='This close to bed, one smallish meal with plenty of protein does both jobs: it feeds the session and it covers you overnight.';
    }
    items.splice(items.indexOf(sleepy),1);
  }

  const out=items.slice().sort((x,y)=>x.time-y.time)
    .map(i=>Object.assign({},i,{time:minToHhmm(abs(i.time))}));
  return {items:out, bed:minToHhmm(bedA), train:minToHhmm(trainA), wake:minToHhmm(wakeA), kind, meals, per};
}
/* The next thing due, for the home screen. */
function nextEating(){
  const plan=eatingPlan(), now=new Date().getHours()*60+new Date().getMinutes();
  const next=plan.items.find(i=>hhmmToMin(i.time)>=now);
  return {plan,next};
}
/* ---------- meals, where they are logged ----------
   The evidence ranks this clearly, and the screen should too. What matters
   most is total protein for the day. After that, spreading it helps: about
   0.4 g per kg of bodyweight a meal, across at least four meals (Schoenfeld and
   Aragon, 2018), with modest differences once the total is matched. Timing
   does not change energy balance, so it never touches the calorie maths.
   So this is not a card to read. It is the day's meals as a row you log into:
   each one shows its time, what you have eaten against the per-meal mark, and
   one tap opens the food list for that meal. Nothing extra is asked of anyone:
   every food entry already records when it was logged, and that is all this
   needs. */
function perMealProtein(){
  const p=S.profile||{};
  if(!p.weight) return null;
  return Math.round(0.4*proteinBasis(p).kg);
}
const MEAL_NAMES={breakfast:'Breakfast',lunch:'Lunch',last:'Dinner',pre:'Before training',post:'After training',presleep:'Before bed'};
const mealName=tag=>MEAL_NAMES[tag]||'Snack';
const mealLetter=tag=>tag==='breakfast'?'b':(tag==='lunch'?'l':(tag==='last'?'d':'s'));
/* the strip opens the food list on the meal that slot is today, so tapping the
   meal after training on a day it is dinner opens Dinner */
const slotLetter=s=>s.role||mealLetter(s.tag);
/* The day's planned meals, with what was actually eaten placed against the
   nearest one by the time it was logged. */
function mealSlots(k){
  k=k||todayKey();
  const plan=eatingPlan();
  const slots=plan.items.filter(i=>!['train','coffee'].includes(i.tag))
    .map(i=>({tag:i.tag,time:i.time,min:hhmmToMin(i.time),p:0,kcal:0,n:0,optional:i.tag==='presleep',
      /* which of your breakfast, lunch and dinner this planned meal is today.
         On a training day dinner can become the meal after training, and then
         food logged as dinner belongs there, not wherever the clock puts it. */
      role: (i.tag==='breakfast'||/^Breakfast/.test(i.what||''))? 'b'
        : (i.tag==='lunch'? 'l' : ((i.tag==='last'||i.tookLast||/last big one/.test(i.what||''))? 'd' : null))}));
  const mainSlots=slots.filter(x=>!x.optional);
  const wakeM=hhmmToMin((S.profile&&S.profile.wakeTime)||EAT_CLOCK.wake);
  const sinceWake=x=>((x.min-wakeM)%1440+1440)%1440;
  if(mainSlots.length&&!slots.some(x=>x.role==='b')){ const f=mainSlots.slice().sort((a,b)=>sinceWake(a)-sinceWake(b))[0]; if(!f.role) f.role='b'; }
  if(mainSlots.length&&!slots.some(x=>x.role==='d')){ const f=mainSlots.slice().sort((a,b)=>sinceWake(b)-sinceWake(a)).find(x=>!x.role); if(f) f.role='d'; }
  if(mainSlots.length&&!slots.some(x=>x.role==='l')){ const f=mainSlots.filter(x=>!x.role).sort((a,b)=>Math.abs(sinceWake(a)-330)-Math.abs(sinceWake(b)-330))[0]; if(f) f.role='l'; }
  const skipped=((S.days[k]||{}).skipped)||[];
  slots.forEach(x=>{ x.skipped=!!(x.role&&skipped.indexOf(x.role)>=0); });
  if(!slots.length) return {slots,per:perMealProtein()};
  dayFood(k).forEach(f=>{
    /* The meal they chose wins: lunch logged at four o'clock is still lunch.
       Only snacks are placed by the time they were logged. */
    const want=(f.meal==='b'||f.meal==='l'||f.meal==='d')? f.meal : null;
    let best=want&&slots.find(x=>x.role===want);
    if(!best){
      /* no slot of that name today (a training meal took its place): fall back to the clock */
      let t;
      if(f.at){ const d=new Date(f.at); t=d.getHours()*60+d.getMinutes(); }
      else t=slots[0].min;
      /* a snack never counts towards breakfast, lunch or dinner, whatever they
         are called today: on a training day the meal after training is dinner
         without being named that, and snacks were landing on it by the clock */
      const snackSlots=slots.filter(x=>!x.role);
      const pool=want? slots : (snackSlots.length? snackSlots : slots);
      let gap=1e9; best=pool[0];
      pool.forEach(x=>{ const g=Math.min(Math.abs(x.min-t),1440-Math.abs(x.min-t)); if(g<gap){gap=g;best=x;} });
    }
    best.p+=(+f.p||0)*(+f.q||1); best.kcal+=(+f.kcal||0)*(+f.q||1); best.n++;
  });
  return {slots,per:perMealProtein()};
}
/* The week, for the check in and the coach: how many meals reached the mark,
   and how long before bed the last food came. */
function timingStats(days){
  days=days||7;
  const per=perMealProtein(), bed=hhmmToMin((S.profile&&S.profile.bedtime)||EAT_CLOCK.bed);
  let meals=0, hits=0, gaps=[], logged=0, skipDays=0;
  /* finished days only: today is not over, so its last food so far is not
     the last food of the day, and counting it said "7.5 hours before bed" at
     three in the afternoon */
  for(let i=1;i<=days;i++){
    const k=addDays(todayKey(),-i), food=dayFood(k).filter(f=>f.at);
    if(((S.days[k]||{}).skipped||[]).length) skipDays++;
    if(!food.length) continue;
    logged++;
    /* group entries logged within 45 minutes of each other into one meal */
    const times=food.map(f=>({t:f.at,p:(+f.p||0)*(+f.q||1)})).sort((a,b)=>a.t-b.t);
    const groups=[];
    times.forEach(x=>{ const g=groups[groups.length-1];
      if(g&&x.t-g.end<=45*60e3){ g.p+=x.p; g.end=x.t; } else groups.push({start:x.t,end:x.t,p:x.p}); });
    meals+=groups.length; hits+=groups.filter(g=>per&&g.p>=per).length;
    const last=new Date(groups[groups.length-1].end), lm=last.getHours()*60+last.getMinutes();
    gaps.push(((bed-lm)+1440)%1440);
  }
  if(!logged) return null;
  return {days:logged, meals, hits, per, skipDays,
    mealsPerDay:+(meals/logged).toFixed(1),
    lastBeforeBedH: gaps.length? +(gaps.reduce((a,b)=>a+b,0)/gaps.length/60).toFixed(1) : null};
}
function openEating(){
  const plan=eatingPlan();
  document.getElementById('altTitle').textContent='Eating around today';
  document.getElementById('altSub').textContent= plan.kind
    ? 'Built around training at '+plan.train+' and bed at '+plan.bed+'.'
    : 'A day with no session in it, built around bed at '+plan.bed+'.';
  document.getElementById('altBody').innerHTML=`
    <div style="padding:0 14px 6px">
      ${plan.items.map(i=>`<div class="eatitem">
        <div class="et">${i.time}</div>
        <div class="ew"><b>${i.what}</b>${i.why?`<span>${i.why}</span>`:''}</div></div>`).join('')}
      <div class="method"><b>What this will and will not do</b><span>This is for training quality, recovery and sleep. It is not a weight loss trick: what you eat in total decides that, and moving the same food around the clock does not change it. If a time does not suit your life, ignore it. The one worth keeping is the spread of protein.</span></div>
      <div class="method"><b>Where it comes from</b><span>The International Society of Sports Nutrition's 2017 position stand on nutrient timing, which puts 20 to 40g of protein every three to four hours ahead of post-workout timing; Schoenfeld, Aragon and Krieger's pooled analysis, where the timing effect disappeared once daily protein was accounted for; the sleep work on finishing large meals two to three hours before bed; pre-sleep protein trials at 20 to 40g; and a randomised crossover on caffeine, where a coffee-sized dose inside eight hours of bed fragmented sleep.</span></div>
      <button class="mini" id="eatTimes">Change your times</button>
    </div>`;
  openSheet('altSheet');
}
function openEatTimes(){
  const p=S.profile||{};
  document.getElementById('altTitle').textContent='Your times';
  document.getElementById('altSub').textContent='Only used to lay the day out. Nothing is counted from them.';
  const row=(k,label,val)=>`<div class="nf" style="margin-bottom:10px"><label for="time_${k}">${label}</label>
    <input id="time_${k}" type="time" value="${val}" data-timeset="${k}"></div>`;
  document.getElementById('altBody').innerHTML=`<div style="padding:0 14px 6px">
    ${row('wakeTime','Usually up at',p.wakeTime||EAT_CLOCK.wake)}
    ${row('trainTime','Usually train at',p.trainTime||EAT_CLOCK.train)}
    ${row('bedtime','Usually in bed by',p.bedtime||EAT_CLOCK.bed)}
    <button class="sheetcta" id="eatBack">Done</button></div>`;
  openSheet('altSheet');
}
document.addEventListener('click',e=>{
  if(e.target.closest('#eatBtn')) openEating();
  const wy=e.target.closest('[data-whytoday]');
  if(wy){ const box=document.getElementById('whyToday'); if(box){ const open=box.hidden; box.hidden=!open; wy.setAttribute('aria-expanded',String(open)); } return; }
  if(e.target.closest('[data-opensleep]')){ openSleep(); return; }
  const ms=e.target.closest('[data-mealslot]');
  /* build 57: a meal row opens that meal in Eat, where Add is one more tap */
  if(ms){ goEatMeal(ms.dataset.mealslot); return; }
  if(e.target.closest('#eatTimes')) openEatTimes();
  if(e.target.closest('#eatBack')) openEating();
});
document.addEventListener('change',e=>{
  const ts=e.target.closest('[data-timeset]');
  if(ts&&hhmmToMin(e.target.value)!==null){ S.profile[ts.dataset.timeset]=e.target.value; save(); }
});
/* the first seven days after sign up */
/* firstWeek is the Monday of the week they joined, so fourteen days from it
   gives everyone at least a full week however late in the week they joined */
function inFirstWeek(){
  const f=S.profile&&S.profile.firstWeek; if(!f) return true;
  return gapDays(f)<14;
}
/* ---------- Today, build 56 (DESIGN-REDESIGN.md) ----------
   Three rings (Ready, Food, Train), a line on what is moving readiness, the
   priorities, the session as a dark card, the day's meals as a list, and two
   quick tiles. Every number and prompt from build 55 is still here: the rings
   replace the three glance tiles, protein and fibre sit in the Meals header,
   sleep or steps sit in the driver line, and Log food is the Food ring, the
   Meals Add and the first thing in + Log. */
const RING_C=2*Math.PI*44;
function ringHtml(id,frac,tone,value,label,caption,aria,extra,cls){
  const len=Math.max(0,Math.min(1,frac||0))*RING_C;
  const vs=String(value), word=/^[A-Za-z]+$/.test(vs), fs=word? (vs.length>=7? 19 : 22) : (vs.length>=7? 18 : (vs.length>=6? 21 : (vs.length>=5? 24 : 28)));
  return `<button class="ring ${cls||''}" data-ring="${id}" ${extra||''} aria-label="${aria}" style="--tone:var(--${tone})">
    <span class="rwrap"><svg viewBox="0 0 104 104" aria-hidden="true"><circle class="rt" cx="52" cy="52" r="44"/>
      ${len>0? `<circle class="ra" cx="52" cy="52" r="44" stroke-dasharray="${len.toFixed(1)} ${RING_C.toFixed(1)}" transform="rotate(-90 52 52)"/>` : ''}</svg>
      <span class="rv" style="font-size:${fs}px">${value}</span></span>
    <span class="rk" style="color:var(--${tone}-text)">${label}</span><span class="rs">${caption}</span></button>`;
}
/* Readiness is a word against the person's own usual, never a number; the
   ring's fill is only a picture of that word. */
const READY_RING={better:{f:0.9,tone:'green',v:'Better',c:'than your usual'},usual:{f:0.58,tone:'green',v:'Usual',c:'about your usual'},
  lower:{f:0.28,tone:'amber',v:'Lower',c:'than your usual'},building:{f:0,tone:'green',v:'Building',c:'your baseline'}};
function weekCounts(){
  const plan=ensurePlan(), i=dowIdx();
  const planned=plan.days.filter(d=>d.type&&d.slot!=='walk').length;
  let done=0; for(let n=0;n<=i;n++) if(dayDone(n)) done++;
  return {planned,done};
}
function foodRing(){
  const k=todayKey();
  if(isTeen()){
    /* no calories anywhere for under 18s: the ring counts meals, like the teen
       glance tile it replaces */
    const meals=new Set(dayFood(k).map(x=>x.meal||'s')).size;
    return ringHtml('food',Math.min(1,meals/3),'coral',String(meals),'FOOD',meals===1?'meal logged':'meals logged',
      `${meals} ${meals===1?'meal':'meals'} logged today. Tap to open Eat.`,'data-go="eat"');
  }
  const t=S.targets||{}, eaten=Math.round(foodTotals(k).kcal||0), target=+t.kcal||0, maint=+t.maintenance||0;
  if(!target) return ringHtml('food',0,'coral',num(eaten),'FOOD','kcal in, no target yet',`${num(eaten)} kcal eaten, no target yet. Tap to open Eat.`,'data-go="eat"');
  if(eaten<=target) return ringHtml('food',eaten/target,'coral',num(target-eaten),'FOOD','kcal left',
    `${num(target-eaten)} kcal left of ${num(target)}. Tap to open Eat.`,'data-go="eat"');
  /* Over target is not bang on target: it says how far over, and where that
     sits against maintenance, as the tile it replaces did. */
  /* over target but under maintenance is still a deficit, just a smaller
     one: caution amber. Past maintenance is coral. */
  const over=eaten-target, past=!maint||eaten>maint;
  const sub= maint? (eaten<=maint? 'maintenance '+num(maint)+', still '+num(maint-eaten)+' under' : 'maintenance '+num(maint)+', '+num(eaten-maint)+' over') : num(eaten)+' of '+num(target);
  return ringHtml('food',1,past?'coral':'amber',num(over),'FOOD','kcal over target · '+sub,`${num(over)} kcal over target, ${sub}. Tap to open Eat.`,
    'data-go="eat"',past? 'over past' : 'over');
}
function trainRing(){
  const d=todayPlan(), i=dowIdx(), wc=weekCounts();
  const frac=wc.planned? wc.done/wc.planned : 0;
  const cap=wc.planned? `${wc.done} of ${wc.planned} this week` : 'nothing planned';
  let v, aria;
  if(dayDone(i)&&d.type){ v='Done'; aria='Today\'s session done. '+cap+'.'; }
  else if(d.slot==='walk'){ const st=stepsToday(); v=st===null? 'Walk' : num(st); aria='A walking day. '+cap+'.'; }
  else if(!d.type||d.slot==='rest'){ v='Rest'; aria='A rest day. '+cap+'.'; }
  else { v=minToHhmm(clockOf('train')); aria=`${dayLabel(d)} today, usually around ${v}. ${cap}.`; }
  return ringHtml('train',frac,'cyan',v,'TRAIN',cap,aria+' Tap to see the day.');
}
function readyRing(){
  const r=readiness(), x=READY_RING[r.level]||READY_RING.building;
  return ringHtml('ready',x.f,x.tone,x.v,'READY',x.c,
    r.level==='building'? 'Readiness: building your baseline. Tap for what it needs.' : `Readiness: ${r.text.toLowerCase()}. Tap for why.`);
}
function ringsRow(){ return `<div class="rings">${readyRing()}${foodRing()}${trainRing()}</div>`; }
/* What is moving readiness, how much that rests on, and last night's sleep or
   today's steps, one tap from logging. */
function driverLine(){
  const r=readiness();
  const text= r.level==='building'? r.text : (r.drivers.length? 'Driven by '+r.drivers.join('; ')+'.' : 'Nothing well away from your usual.');
  const conf= r.level==='building'? '' : confChip({level: r.baseDays>=14?'good':(r.baseDays>=7?'fair':'building'), text:'based on '+r.baseDays+' of the last 28 days'});
  const st=(typeof stepsToday==='function')? stepsToday() : null, sl=realSleep(S.days[todayKey()]), tg=sleepTarget();
  const sleepPill=`<button class="pill" data-glance="sleep">${sl===null? 'Sleep: log last night' : 'Slept '+sl+'h · aim '+(isTeen()? tg.t : tg.lo+'h or more')}</button>`;
  const stepPill= st===null? '' : `<button class="pill" data-glance="steps">${num(st)} steps of ${num(stepTarget())}</button>`;
  return `<div class="driver"><p>${text} ${conf}</p><div class="pills">${sleepPill}${stepPill}</div></div>`;
}
function openReadiness(){
  const r=readiness();
  document.getElementById('altTitle').textContent='Readiness';
  document.getElementById('altSub').textContent= r.level==='building'? 'Building your baseline' : r.text;
  document.getElementById('altBody').innerHTML=`<div style="padding:0 14px 10px">
    ${readinessPanel()}
    <div class="method"><b>How it works</b><span>Last night's sleep, yesterday's stress and how your day went, each against your own last four weeks. It is a word, not a score: better, about usual or lower, with what is driving it. How you say you are tracks your response to training more closely than heart rate or blood markers in a review of 56 studies (Saw and colleagues, 2016), though those studies were in athletes.</span></div>
    <div class="method"><b>What it changes</b><span>Not the weights. They go up because of what you lifted last week. On a lower day the advice is to hold steady or stop a set early, and how you feel once warmed up is the better guide.</span></div>
    <button class="sheetcta" data-glance="checkin" style="width:100%">Log sleep and how today went</button>
  </div>`;
  openSheet('altSheet');
}
/* The progression line on the session card. Weight goes up because of last
   week's reps, never because of readiness; on a lower day the card says to
   hold steady or stop a set early instead. */
function heroProgress(d){
  if(!d||!d.templateId||typeof nextPrescription!=='function') return '';
  const tpl=(S.templates||[]).find(t=>t.id===d.templateId); if(!tpl) return '';
  let hit=null;
  for(const row of tpl.ex){ let p=null; try{ p=nextPrescription(row.exId,row); }catch(e){}
    if(p&&p.kind==='load'&&p.kg){ hit={n:exOf(row.exId).n,kg:p.kg,from:+(p.kg-p.inc).toFixed(2)}; break; } }
  if(!hit) return '';
  if(readiness().level==='lower')
    return `${hit.n} was due to go up to ${hit.kg} kg. On a lower day, keep ${hit.from} kg or stop a set early; how you feel once warmed up is the better guide.`;
  return `${hit.n} goes up to ${hit.kg} kg: you hit every rep last week.`;
}
function heroKicker(d,done){
  const style= d.templateId&&/^t_hifb/.test(d.templateId)? 'HIFB' : (d.runId? 'RUN' : (d.circuitId? 'CIRCUIT' : (d.templateId? 'STRENGTH' : (d.label||'').toUpperCase())));
  if(done) return 'DONE TODAY · '+style;
  const m=clockOf('train'), t=minToHhmm(m), when= m>=17*60? 'TONIGHT' : (m<12*60? 'THIS MORNING' : 'TODAY');
  return `${when}, ${t} · ${style}`;
}
function heroCard(plan,d,i){
  const st=stepsToday(), done=dayDone(i), isWalk=d.slot==='walk', rest=!d.type||d.slot==='rest';
  const walkPct=st!==null? Math.min(100,Math.round(st/stepTarget()*100)) : 0;
  const why=plan.why[0]? `<button class="whyline" data-whytoday="1" aria-expanded="false">Why today looks like this <span aria-hidden="true">›</span></button>
      <div class="why" id="whyToday" hidden>${plan.why[0]}</div>` : '';
  if(rest) return `<div class="hero restday">
    <div class="kicker">${DAYS[i].toUpperCase()} · REST</div>
    <h2>${dayLabel(d)||'Rest'}</h2>
    <div class="sub">Nothing owed. Rest is part of it.</div>
    ${why}
    <div class="ctarow"><button class="cta" data-swapto="${i}:walk">Walk instead</button><button class="cta ghost" data-swap="${i}">Change this day</button></div>
    <button class="skipbtn" data-go="plan">See the week</button></div>`;
  const chips=[daySub(d)];
  if(d.mins&&!isWalk) chips.push('about '+d.mins+' min');
  if(d.setDelta) chips.push('one set lighter than usual');
  if(d.deload) chips.push('easy week');
  const prog=isWalk? '' : heroProgress(d);
  return `<div class="hero">
    <div class="kicker">${isWalk? DAYS[i].toUpperCase()+' · WALK' : heroKicker(d,done)}</div>
    <h2>${dayLabel(d)}</h2>
    <div class="chips">${chips.filter(Boolean).map(c=>`<span>${c}</span>`).join('')}</div>
    ${isWalk&&st!==null
      ? `<div class="track"><div class="tnum">${num(st)}<small> of ${num(stepTarget())} steps</small></div>
          <div class="bar"><i style="width:${walkPct}%"></i></div>
          <div class="tsrc">Counted by ${sourceName()}. Nothing to log.</div></div>` : ''}
    ${prog? `<div class="prog">${prog}</div>` : ''}
    ${isWalk
      ? (walkDone()? `<div class="doneline">Done. ${num(st)} steps in.</div>` : `<div class="ctarow"><button class="cta ghost" data-swap="${i}">Change this day</button></div>`)
      : `<div class="ctarow"><button class="cta" id="startToday">${done?'Do it again':'Start session'}</button>
          ${d.templateId||d.runId||d.circuitId? `<button class="cta ghost" id="todayViewEdit">See or edit</button>`:''}</div>`}
    ${d.type&&!isWalk&&!(d.templateId||d.runId||d.circuitId)? `<button class="viewbtn" data-view="${i}">See what is in it</button>`:''}
    ${why}
    <div class="herofoot">
      ${d.type&&!isWalk&&!done? `<button class="skipbtn" data-restday="${i}">Not today</button>`:''}
      ${isWalk? '' : `<button class="skipbtn" data-swap="${i}">Change this day</button>`}
    </div>
    ${d.exclude&&d.exclude.length?`<div class="note">Leaving out ${d.exclude.join(', ')} while it settles.</div>`:''}
  </div>`;
}
/* ---------- the day's meals, as a list ----------
   Breakfast, lunch, snacks and dinner, with a tick, what went in and the
   calories; tapping any row opens that meal in Eat (build 57). Built from the
   same day's food as everything else, and from mealSlots() for the planned
   time and for when dinner is the meal after training. Under 18s see ticks,
   never calories. */
const MEAL_ROWS=[['b','Breakfast'],['l','Lunch'],['s','Snacks'],['d','Dinner']];
function mealsList(){
  const k=todayKey(), teen=isTeen(), food=dayFood(k), skipped=((S.days[k]||{}).skipped)||[];
  let slots=[]; try{ slots=mealSlots(k).slots; }catch(e){}
  const roleSlot=r=>slots.find(x=>x.role===r);
  const now=new Date().getHours()*60+new Date().getMinutes();
  const rows=MEAL_ROWS.map(([m,label])=>{
    const items=food.filter(f=>(f.meal||'s')===m), sl=m==='s'? null : roleSlot(m);
    if(m==='d'&&sl&&sl.tag==='post') label='Dinner, after training';
    if(m==='d'&&sl&&sl.tag==='pre') label='Dinner, before training';
    if(m==='b'&&sl&&sl.tag==='post') label='Breakfast, after training';
    return {m,label,items,sl,kcal:Math.round(items.reduce((a,f)=>a+(+f.kcal||0)*(+f.q||1),0)),skipped:skipped.indexOf(m)>=0,
      p:Math.round(items.reduce((a,f)=>a+(+f.p||0)*(+f.q||1),0))};
  });
  const per=teen? null : perMealProtein();
  const next=rows.find(r=>r.m!=='s'&&!r.items.length&&!r.skipped&&(!r.sl||r.sl.min>=now-90));
  const t=S.targets||{}, tot=foodTotals(k);
  const head= teen? `<span class="mh">${new Set(food.map(x=>x.meal||'s')).size} logged today</span>`
    : (t.protein? `<button class="mh" data-glance="protein">Protein ${Math.round(tot.protein||0)}/${t.protein} g · fibre ${Math.round(tot.fibre||0)}/${t.fibre||30} g</button>`
      : `<span class="mh">${num(Math.round(tot.kcal||0))} kcal so far</span>`);
  const row=r=>{
    const what= r.skipped? 'skipped' : (r.items.length? r.items.slice(0,2).map(f=>f.n).join(', ')+(r.items.length>2? ' and '+(r.items.length-2)+' more' : '')
      : (r.sl? 'around '+r.sl.time : (r.m==='s'? 'none yet' : 'not logged yet')));
    const right= r.items.length? (teen? '' : `<b class="mk">${num(r.kcal)}</b>`) : (r.skipped? '' : `<span class="madd ${r===next?'next':''}">Add</span>`);
    /* a main meal that reached the per-meal protein mark says so */
    const hit=per&&r.m!=='s'&&r.p>=per;
    return `<button class="mrow ${r.items.length?'done':''} ${hit?'hit':''} ${r.skipped?'skipped':''}" data-mealslot="${r.m}"
      aria-label="${r.label}: ${r.skipped? 'skipped' : (r.items.length? r.items.length+(r.items.length===1?' item':' items')+(teen?'':', '+r.kcal+' kcal') : 'nothing logged')}. Tap to ${r.items.length?'see or add':'log it'}.">
      <span class="mtick" aria-hidden="true">${r.items.length? '✓' : (r.skipped? '–' : '')}</span>
      <span class="mtxt"><span class="mn">${r.label}</span> <span class="mw">${escHabit(what)}</span>${per&&r.items.length&&r.m!=='s'? `<span class="mpr">${r.p}g protein${hit?', at the mark':''}</span>` : ''}</span>${right}</button>`;
  };
  /* the spread of protein across meals, as the strip it replaces said it */
  let spread='';
  if(t.protein&&!teen){
    const ms=(()=>{ try{ return mealSlots(); }catch(e){ return {slots:[],per:null}; } })();
    const counted=ms.slots.filter(x=>!x.optional&&!x.skipped), hit=counted.filter(x=>ms.per&&x.p>=ms.per).length;
    if(ms.per&&counted.length) spread=`${hit} of ${counted.length} meals at ${ms.per}g protein so far. Spreading it helps; the day's total, above, matters most.`;
  }
  return `<div class="mealscard">
    <div class="mhead"><b>Meals</b>${head}</div>
    <div class="meals">${rows.map(row).join('')}</div>
    <div class="mfoot">${spread? `<span class="mealsnote">${spread}</span>` : '<span></span>'}<button id="eatBtn">Why these times</button></div></div>`;
}
/* Weigh in and today's check-in, each saying where it stands. Under 18s get
   Log food in place of the scales. */
function quickTiles(){
  const k=todayKey(), logged=S.days[k]||{}, done=!!logged.checkedIn;
  const btn=(id,label,state,isDone)=>`<button class="quick ${isDone?'done':''}" data-glance="${id}">
    <span class="ql">${label}</span>${state? `<span class="qs">${state}</span>`:''}</button>`;
  const ci=btn('checkin',"Today's Check-in",done?'done':'',done);
  if(isTeen()){ const meals=dayFood(k).length; return `<div class="quicks">${btn('food','Log food',meals? meals+' logged':'',meals>0)}${ci}</div>`; }
  const weighed=S.weights.length&&S.weights[S.weights.length-1].d===k;
  return `<div class="quicks">${btn('weigh','Weigh in',weighed? showW(S.weights[S.weights.length-1].kg,S.profile.units==='imperial') : '',weighed)}${ci}</div>`;
}
function todayHeadDate(){
  const n=new Date();
  return n.toLocaleDateString('en-IE',{weekday:'long',day:'numeric',month:'long'});
}
function renderToday(){
  const plan=ensurePlan(), d=todayPlan(), i=dowIdx(), logged=S.days[todayKey()];
  const st=stepsToday();
  const dl=$('todayDate'); if(dl) dl.textContent=todayHeadDate();
  const av=$('avatarLetter'); if(av){ const h=(S.profile&&(S.profile.name||S.profile.handle))||''; av.textContent=(h.replace(/^@/,'')[0]||'Y').toUpperCase(); }
  /* priorities go above the session when any of them is urgent (score 70 or
     more: a check in due, poor sleep, a pain check, lower readiness on a
     training day, a stressful yesterday) */
  const prios=priorities(), urgent=prios.some(p=>p.score>=70);
  const hero=heroCard(plan,d,i), pr=prioritiesRow(prios);
  $('todayView').innerHTML=`
  ${ringsRow()}
  ${driverLine()}
  ${urgent? pr+hero : hero+pr}
  ${mealsList()}
  ${quickTiles()}
  <div class="goalrow">${targetLine()}</div>
  <div class="sechead"><h2>Your week so far</h2><button data-go="plan">The whole week</button></div>
  <div class="weekstrip">${plan.days.map((x,n)=>`<button data-planday="${n}" class="${n===i?'today':''} ${n<i?'past':''}" aria-label="${DAYS[n]}: ${dayLabel(x)||'Rest'}${dayDone(n)?', done':''}">
      <span class="d">${DAYS[n][0]}</span>
      <span class="dot ${x.kind==='rest'||!x.type?'off':''} ${dayDone(n)?'done':''}"></span>
    </button>`).join('')}</div>
  <div class="note weekline">${weekLine()}</div>
  <div class="rowcard">
  ${healthOn()
    ? `<div class="todo auto"><span class="ic" style="background:var(--cyan-tint);color:var(--cyan-text)">⌚</span>
        <span class="t"><b>Steps and sleep</b><span>${st!==null?num(st)+' steps':'no data yet'}${logged&&logged.auto?' · '+logged.auto.sleep+'h sleep':''} · demo data, not ${sourceName()} yet</span></span>
        <span class="autotag">automatic</span></div>`
    : (inFirstWeek()? `<button class="todo" id="connectBtn"><span class="ic" style="background:var(--cyan-tint);color:var(--cyan-text)">⌚</span>
        <span class="t"><b>Connect your watch or phone</b><span>Steps and sleep fill themselves in. You never log them.</span></span>
        <span class="chev">›</span></button>` : '')}
  ${activeHabits().map(h=>habitRowFor(h.slot)).join('')||habitRow()}
  ${habitCount()&&habitRoom()? `<button class="addhabit" data-habitadd="1">Add another habit<span>${habitCount()} of ${HABIT_MAX}</span></button>`:''}
  ${checkinRow()}
  ${(typeof painToReview==='function'? painToReview() : []).map(n=>`<div class="todo">
      <span class="ic" style="background:var(--amber-tint);color:var(--amber-text)">?</span>
      <span class="t"><b>Is ${n} alright now?</b><span>out for two weeks. Nothing puts it back until you say so</span></span>
      <span style="display:flex;gap:6px">
        <button class="mini go" data-painok="${n}">Fine now</button>
        <button class="mini" data-painsore="${n}">Still sore</button></span></div>`).join('')}
  </div>
  ${(()=>{ const next=plan.days.slice(i+1,i+3);
    if(!next.length) return `<div class="note" style="margin:10px 16px">That is the week. ${checkinDone()? 'You have already checked in.' : 'Your check in is '+checkinDayName()+'.'}</div>`;
    return `<div class="sechead"><h2>Next up</h2></div><div class="rowcard">`
      +next.map((x,n)=>`<button class="pday" data-planday="${i+1+n}"><div class="dd">${DAYS[i+1+n]}</div>
      <div class="txt"><b>${dayLabel(x)}</b><span>${daySub(x)}</span></div>
      <div class="sq" style="background:${x.kind==='rest'||!x.type?'var(--line)':'var(--cyan)'}"></div></button>`).join('')+'</div>'; })()}`;
}
document.addEventListener('click',e=>{
  const rg=e.target.closest('[data-ring]');
  if(!rg||rg.dataset.glance) return;
  if(rg.dataset.ring==='ready'){ openReadiness(); return; }
  if(rg.dataset.ring==='train'){ const d=todayPlan();
    if(d&&d.type) openDayDetail(dowIdx()); else go('plan'); }
});
/* ---------- one number, one sheet ----------
   Tapping a tile on the home screen used to open the whole daily log: five
   controls when the person wanted to change one. Each tile now opens the
   single thing it shows, with the full form one tap away for anyone who wants
   the rest of it. */
let quickKind=null;
const QUICK={
  protein:{title:'Protein today',sub:'Grams so far. The food list keeps this for you, this is for when you want to set it yourself.',
    unit:'g',steps:[-25,-10,10,25],
    get:()=>Math.round((foodTotals(todayKey()).protein)||0),
    set:v=>{ const k=todayKey(); S.days[k]=Object.assign({},S.days[k],{protein:v}); }},
  steps:{title:'Steps today',sub:'What your phone or watch says. A tracker fills this in on its own.',
    unit:' steps',steps:[-1000,-500,500,1000],
    get:()=>{ const s=(typeof stepsToday==='function')? stepsToday() : null; return s===null? 0 : s; },
    set:v=>{ const k=todayKey(); S.days[k]=Object.assign({},S.days[k],{steps:v}); }},
  day:{title:"Today's Check-in",sub:'One number, out of ten. Everything else about the day is in the full log.',
    unit:'/10',min:1,max:10,steps:[-1,1],
    get:()=>{ const d=S.days[todayKey()]; return (d&&d.wb)||6; },
    set:v=>{ const k=todayKey(); S.days[k]=Object.assign({},S.days[k],{wb:Math.max(1,Math.min(10,v))}); }}
};
function openQuick(kind){
  const q=QUICK[kind]; if(!q) return openDay();
  quickKind=kind;
  document.getElementById('quickTitle').textContent=q.title;
  document.getElementById('quickSub').textContent=q.sub;
  document.getElementById('quickBody').innerHTML=`
    <div class="quickrow">
      ${q.steps.filter(s=>s<0).map(s=>`<button class="qstep" data-quickstep="${s}">${s}</button>`).join('')}
      <input id="quickValue" type="number" inputmode="${kind==='day'?'numeric':'decimal'}" value="${q.get()}"
        ${q.min!==undefined?`min="${q.min}" max="${q.max}"`:'min="0"'} aria-label="${q.title}">
      ${q.steps.filter(s=>s>0).map(s=>`<button class="qstep" data-quickstep="${s}">+${s}</button>`).join('')}
    </div>
    <div class="note" id="quickNote"></div>
    <button class="sheetcta" id="quickSave">Save</button>
    <button class="skipbtn" id="quickFull">Open the full log instead</button>`;
  quickPreview();
  openSheet('quickSheet');
}
function quickPreview(){
  const q=QUICK[quickKind], el=document.getElementById('quickValue'), note=document.getElementById('quickNote');
  if(!q||!el||!note) return;
  const v=+el.value||0, t=S.targets||{};
  if(quickKind==='protein') note.textContent=t.protein? (v>=t.protein? 'That is your target met.' : (t.protein-v)+'g short of '+t.protein+'g.') : '';
  else if(quickKind==='steps') note.textContent=v>=stepTarget()? 'Target hit.' : num(Math.max(0,stepTarget()-v))+' short of '+num(stepTarget())+'.';
  else note.textContent=v>=8? 'Good day.' : (v<=4? 'A hard one. That is worth knowing when the week is reviewed.' : '');
}
function saveQuick(){
  const q=QUICK[quickKind], el=document.getElementById('quickValue');
  if(!q||!el) return;
  q.set(Math.max(0,+el.value||0));
  save(); closeSheets(); renderAll();
  toast('Saved');
}
document.addEventListener('input',e=>{ if(e.target.id==='quickValue') quickPreview(); });
function openConnect(){
  $('connectBody').innerHTML=SOURCES.map(x=>`<button class="logrow" data-connect="${x.id}">
      <div class="txt"><div class="t">${x.n}</div><div class="s">Steps, sleep and resting heart rate</div></div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mute)" stroke-width="2.2" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg></button>`).join('')
    +`<div class="note" style="padding:12px 14px 4px">The connection is simulated in this build so you can see how it behaves. On a phone the same fields come from Apple Health or Health Connect, and you never type a step count again.</div>`;
  openSheet('connectSheet');
}
/* tapping a day in the ribbon shows that day, rather than dumping you on a tab */
function openDayDetail(n,opts){
  ensurePlan();
  const ro=!!(opts&&opts.readOnly);
  const d=S.plan.days[n], tpl=d.templateId? (S.templates||[]).find(t=>t.id===d.templateId):null;
  $('dayTitle').textContent=DAYS[n]+' · '+dayLabel(d);
  $('daySub').textContent=d.sub||'';
  $('dayDetail').innerHTML=`
    ${d.runId&&typeof runPlan==='function'&&runPlan(d.runId)? `<div style="padding:2px 14px 10px">
      ${runPlan(d.runId).steps.map(st=>`<div class="move" style="display:flex;gap:10px;padding:8px 0;border-top:1px solid var(--line);font-size:13.5px">
        <span style="flex:1;font-weight:600">${st.n}</span><span style="color:var(--mute);font-size:12.5px">${st.r}</span></div>`).join('')}
      <div class="note">${runPlan(d.runId).why}</div>
      <button class="mini" data-runswap="${n}">Change this run</button></div>`:''}
    ${tpl? `<div style="padding:2px 14px 10px">${tpl.ex.map(r=>`<button class="move" ${ro?'':`data-dayswap="${r.exId}"`} style="display:flex;gap:10px;padding:10px 0;border-top:1px solid var(--line);font-size:13.5px;width:100%;text-align:left">
        <span style="flex:1;font-weight:600">${exOf(r.exId).n}</span>
        <span style="color:var(--mute);font-size:12.5px">${d.deload&&typeof deloadPrescription==='function'
          ? (p=>p.sets+' × '+p.reps+(p.kg!==null?' at '+p.kg+'kg':''))(deloadPrescription(r.exId,r,DELOAD_TIERS[d.deload]))
          : (typeof repText==='function'? repText(r) : r.sets+' × '+r.reps)}</span>
        <button class="movebtn" data-showmove="${r.exId}">show me</button>
        ${ro?'':'<span style="color:var(--green-text);font-weight:700;font-size:12.5px">Change</span>'}</button>`).join('')}
      ${d.exclude&&d.exclude.length?`<div class="note">Leaving out ${d.exclude.join(', ')}.</div>`:''}
      ${d.deload?`<div class="note">Easy week: ${DELOAD_TIERS[d.deload].band} less work and about 10% lighter. Next week goes back to your working weights.</div>`
        : (d.setDelta?`<div class="note">One set lighter than the template this week.</div>`:'')}</div>`
      : `<div class="note" style="padding:0 14px 12px">${d.slot==='rest'?'Nothing owed. Rest is part of it.':(d.slot==='walk'?'Counted by your tracker. Nothing to press.':'')}</div>`}
    ${d.type&&d.slot!=='walk'? `<button class="sheetcta" data-startday="${n}">Start this ${n===dowIdx()?'now':'day'}</button>`:''}
    ${!ro&&d.templateId? `<button class="sheetcta" style="background:var(--track);color:var(--ink)" data-tpledit="${d.templateId}">Edit this workout</button>`:''}
    ${ro? '' : `<button class="sheetcta" style="background:var(--track);color:var(--ink)" data-swap="${n}">Change this day</button>
    ${d.type&&d.slot!=='walk'? `<button class="sheetcta" style="background:var(--track);color:var(--ink)" data-restday="${n}">Cannot do it, move or drop it</button>`:''}`}`;
  openSheet('daySheet');
}

