/* ---------- goals on Today, one card each (build 78) ----------
   Feargal, 18 Oct: "I do not understand what we are trying to show the user on
   the bar and progress bar for building muscle." He was right. Build 77's bar
   was a rate of weight gain squeezed onto a 0 to 0.75% scale with nothing
   marking the target, so a falling weight drew an empty bar, under a heading
   that said "Building muscle" while the number said he was losing weight. It
   also showed one aim only, and a person can want two things.

   What the leading apps do (read for this build, not remembered):
   - Strava draws what you did against the pace your goal asks for by now, and
     users keep asking for exactly "ahead or behind", for weekly and longer
     goals, and for more than one.
   - MacroFactor puts the rate of change against a chosen rate and reviews it
     weekly, rather than judging a single day.
   - Whoop has a weekly plan, says missing a goal is normal, and shows the week
     rather than a streak. Apple's rings are criticised for daily targets that
     feel punishing and for covering only three things; the asks are weekly
     consistency, more kinds of goal, and goals you choose.
   - Hevy shows each lift's own estimated one-rep max and records, not one
     blended number. A study of 1.4 million MyFitnessPal goals found most were
     not met and that early consistency predicts success, so the card says
     where you are and what to do, kindly.
   So every card here answers the same four questions, in the same order: what
   is this goal, where am I, where should I be, and what do I do about it.
     1  the goal's name, and one status word
     2  the number that matters, in words (a rate says it is the weight trend)
     3  a picture that can be read without a legend:
          a target zone (shaded, outlined) with a marker, for things that
            should sit in a range, so under or over is plainly left or right;
          a bar with a tick for where the plan has you by today, for a total
            that builds up over a week or to a date;
          dots, one per lift, day or week, for things counted in ones;
     4  one line saying what it means and what to do.
   Tapping a card says it all again in full, with where the target comes from.
   Goals: the main aim (which builds the week), the goal set with Set a goal if
   it is a different thing, and up to two more aims chosen on the aim sheet
   (Also track). Three at most, so Today stays short: with more than one they
   share a tighter card. Under 18s keep the plain rule.
   Honest by design: nothing is pre-filled to make a bar look further along
   (a known motivation trick) and nothing is red for a week still in progress. */
const GOAL_MAX=3;
const GOAL_WHY={};
const GST={green:'On track',amber:'Close',red:'Off track',none:'Not enough yet'};
function goalAim(){ return (S.profile&&S.profile.aim)||'lose'; }
function goalTargetSeparate(){
  const t=S.target; if(!t||!t.kind) return false;
  const a=goalAim();
  return !(t.kind==='weight'&&(a==='lose'||a==='hold'));
}
function goalExtraMax(){ return GOAL_MAX-1-(goalTargetSeparate()?1:0); }
function goalExtras(){
  const main=goalAim(), raw=(S.profile&&Array.isArray(S.profile.alsoAims))? S.profile.alsoAims : [];
  return raw.filter((id,i)=>id!==main&&raw.indexOf(id)===i&&AIMS.some(a=>a.id===id));
}
function toggleAlsoAim(id){
  if(id===goalAim()||!AIMS.some(a=>a.id===id)) return false;
  const cur=goalExtras(), on=cur.indexOf(id)>=0;
  if(!on&&cur.length>=goalExtraMax()) return false;
  S.profile.alsoAims= on? cur.filter(x=>x!==id) : cur.concat([id]);
  save(); renderAll();
  if(typeof drawAimSheet==='function') drawAimSheet();
  return true;
}

/* ----- the pictures ----- */
const gpc=(v,min,max)=>Math.max(0,Math.min(100,(v-min)/(max-min)*100));
/* A track with a shaded, outlined zone and a marker. */
function zoneGauge(min,max,lo,hi,val,label){
  const L=gpc(lo,min,max), R=gpc(hi,min,max), V=gpc(val,min,max), edge=val<min||val>max;
  return `<span class="zg" role="img" aria-label="${escHabit(label)}"><i class="zg-band" style="left:${L}%;width:${Math.max(2,R-L)}%"></i><i class="zg-mark${edge?' edge':''}" style="left:${V}%"></i></span>`;
}
/* A bar with a tick where you would be by now. */
function paceBar(pct,pace,label){
  const p=Math.max(0,Math.min(100,Math.round(pct)));
  return `<span class="pb" role="img" aria-label="${escHabit(label)}"><i class="pb-fill" style="width:${p}%"></i>${pace===null||pace===undefined? '' : `<i class="pb-pace" style="left:${Math.max(0,Math.min(100,pace))}%"></i>`}</span>`;
}
/* One dot per lift, day or week: on, missed, or nothing to judge. */
function pips(states){ return `<span class="pips" aria-hidden="true">${states.map(s=>`<i class="${s}"></i>`).join('')}</span>`; }
const zoneCap=txt=>`<i class="sw"></i>${txt}`;

/* ----- the card ----- */
function gcard(o,compact){
  const rows=(o.rows||[]).filter(Boolean);
  return `<button class="wline gline gc st-${o.st}${compact?' compact':''}" data-goalwhy="${escHabit(o.key)}" aria-label="${escHabit(o.aria)} Tap for what it means.">
    <span class="gc-h"><span class="gc-k">${o.kicker}</span> <span class="gc-s">${o.status}</span></span>
    ${o.num!=null? `<span class="gc-m"><b class="gc-n">${o.num}</b>${o.unit? ` <span class="gc-u">${o.unit}</span>` : ''}${o.ctx? ` <span class="gc-c">${o.ctx}</span>` : ''}</span>` : ''}
    ${o.vis||''}
    ${o.cap? `<span class="gc-cap">${o.cap}</span>` : ''}
    ${compact? (rows.length? `<span class="gc-line">${rows.map(r=>r.t).join(' · ')}</span>` : '')
      : rows.map(r=>`<span class="gc-row"><span class="gc-rl">${r.label}</span> <span class="gc-rv">${r.value}</span> ${r.vis||''}</span>`).join('')}
    ${o.verdict? `<span class="gc-v">${o.verdict}</span>` : ''}</button>`;
}

/* ----- the numbers ----- */
/* % of bodyweight a week from the chart's own trend rate */
function ratePct(){ const r=trendRate(), now=weightNow(); return r&&now? {kg:r.perWeek, pct:r.perWeek/now*100, days:r.days} : null; }
const rateSpan=r=>r.days>=14? Math.round(r.days/7)+' weeks' : r.days+' days';
function liftsTrend(){
  const today=todayKey(), a=addDays(today,-28), b=addDays(today,-56), out=[];
  Object.keys(S.lifts||{}).forEach(id=>{
    const h=exHistory(id).filter(e=>e.d>b); if(h.length<2) return;
    const best=list=>Math.max(0,...list.map(e=>Math.max(0,...(e.sets||[]).map(x=>e1RM(+x.kg||0,+x.reps||0)))));
    const now=best(h.filter(e=>e.d>a)), was=best(h.filter(e=>e.d<=a));
    out.push({id, n:exOf(id).n, now, was, count:h.length});
  });
  return out.filter(x=>x.now>0).sort((x,y)=>y.count-x.count);
}
function runMinutesWeek(mon){
  const end=addDays(mon,6); let m=0;
  (S.mine||[]).forEach(p=>{ if(!p||p.kind!=='run'||p.d<mon||p.d>end) return;
    const r=p.session&&p.session.runId&&runPlan(p.session.runId); m+=r&&r.mins? +r.mins : 30; });
  (S.workouts||[]).forEach(w=>{ if(w&&w.d>=mon&&w.d<=end&&w.runMin) m+=w.runMin; });
  return Math.round(m);
}
const planRunMins=d=>d&&d.runId? (+d.mins||(runPlan(d.runId)||{}).mins||0) : 0;
function weekRunPlan(){
  const days=(S.plan&&S.plan.days)||[], i=dowIdx();
  return {total:days.reduce((a,d)=>a+planRunMins(d),0), sofar:days.slice(0,i+1).reduce((a,d)=>a+planRunMins(d),0)};
}
/* Weeks (oldest first, this week last) in which the number of sessions reached a target. */
function weekHits(target){
  const mon=mondayKey(), out=[];
  for(let j=7;j>=0;j--){
    const a=addDays(mon,-7*j), b=addDays(a,6);
    const c=(S.mine||[]).filter(p=>p&&p.d>=a&&p.d<=b&&p.kind!=='meal').length;
    out.push(c>=target? 'on' : (j===0? 'none' : 'off'));
  }
  return out;
}

/* ----- the aims, one card each ----- */
const MOVE_SRC='Rules of thumb for most people, not a promise for you. Your own weigh ins and lifts decide.';

function cardLose(imp){
  const n=v=>showW(v,imp).split(' ')[0], unit=showW(0,imp).split(' ')[1]||'kg', kicker=aimOf('lose').t;
  const r=ratePct();
  if(!r){
    if(!(S.weights||[]).length) return null;
    return {key:'aim:lose',st:'none',kicker,status:GST.none,verdict:'Three weigh ins over a week give your rate of loss',
      aria:kicker+': three weigh ins over a week give your rate.',
      why:{title:kicker,sub:'Your rate of loss',now:'There are not enough weigh ins yet to see which way your weight is going. Three weigh ins at least a week apart give a direction.',
        target:'Losing 0.5 to 1% of your bodyweight a week.',moves:['Weigh in a few mornings a week, in the same conditions.'],source:'Helms, Aragon and Fitschen 2014 (contest prep, natural athletes). '+MOVE_SRC}};
  }
  const p=-r.pct, abs=Math.abs(r.pct);
  const st= p>=0.5&&p<=1? 'green' : (p>0.1? 'amber' : 'red');
  const word= p>=0.5&&p<=1? GST.green : (p>1? 'Too fast' : (p>0.1? 'Slow' : 'Not losing'));
  const verdict= p>1? 'Faster than 1% a week tends to cost muscle' : (p>=0.5? 'In the range that keeps muscle' : (p>0.1? 'Slower than 0.5% a week. The Week in review shows why' : 'Not losing yet. The Week in review shows what to change'));
  const dir= p>0.005? 'down' : (p<-0.005? 'up' : 'flat');
  return {key:'aim:lose',st,kicker,status:word,
    num:(p>0.005? '−' : (p<-0.005? '+' : ''))+n(Math.abs(r.kg)), unit:unit+' a week', ctx:'weight trend · '+abs.toFixed(2)+'% of bodyweight',
    vis:zoneGauge(-0.5,1.5,0.5,1,p,'Weight trend '+(p>=0?'down ':'up ')+abs.toFixed(2)+'% a week. Target zone is losing 0.5 to 1% a week.'),
    cap:zoneCap('Target zone: lose 0.5 to 1% a week'), verdict,
    aria:kicker+': weight trend '+dir+' '+abs.toFixed(2)+'% of bodyweight a week, target 0.5 to 1%. '+verdict+'.',
    why:{title:kicker,sub:'Your rate of loss',
      now:'Your weight trend is '+dir+' '+showW(Math.abs(r.kg),imp)+' a week, which is '+abs.toFixed(2)+'% of your bodyweight. It is worked out from your weigh ins over the last '+rateSpan(r)+', the same line as the weight chart.',
      target:'Losing 0.5 to 1% of your bodyweight a week is the shaded zone. Slower works but takes longer; faster tends to take muscle with it.',
      moves:['Weigh in a few mornings a week so the trend is true.','The Week in review sets next week\'s calories from this.','Keep lifting: it tells your body to keep muscle.'],
      source:'Helms, Aragon and Fitschen 2014 (0.5 to 1% a week, natural athletes cutting). '+MOVE_SRC}};
}

function cardBuild(imp){
  const n=v=>showW(v,imp).split(' ')[0], unit=showW(0,imp).split(' ')[1]||'kg', kicker=aimOf('build').t;
  const r=ratePct(), lt=liftsTrend(), withPrev=lt.filter(x=>x.was), up=withPrev.filter(x=>x.now>x.was).length;
  const liftsTxt= withPrev.length? up+' of '+withPrev.length+' lifts up in 4 weeks' : 'Lifts compare after two sessions each';
  const liftRow={label:'Lifts', value:withPrev.length? up+' of '+withPrev.length+' up in 4 weeks' : 'Compare after two sessions each',
    vis:withPrev.length? pips(withPrev.slice(0,6).map(x=>x.now>x.was? 'on' : 'off')) : '', t:liftsTxt};
  const liftsUp= withPrev.length>=1&&up/withPrev.length>=0.5, liftsFlat= withPrev.length>=1&&up===0;
  const whyBase={title:kicker,sub:'Weight and lifts, together',
    target:'Two things say you are building: your weight rising slowly (0.25 to 0.5% of bodyweight a week is the shaded zone, enough to feed muscle with little fat) and your lifts going up (more load or reps over time).',
    source:'Iraki and colleagues 2019 (rate of gain for natural lifters); Barakat and colleagues 2020 (recomposition review: possible for beginners, returners and people carrying fat). '+MOVE_SRC};
  if(!r){
    return {key:'aim:build',st:'none',kicker,status:GST.none,rows:[liftRow],verdict:'Three weigh ins over a week give your rate of gain',
      aria:kicker+'. Three weigh ins over a week give your rate of gain. '+liftsTxt+'.',
      why:Object.assign({},whyBase,{now:'Not enough weigh ins yet to see which way your weight is going. '+liftsTxt+'.',moves:['Weigh in a few mornings a week.','Keep adding a rep or a little weight to your lifts.']})};
  }
  const p=r.pct, abs=Math.abs(p);
  const inZ=p>=0.25&&p<=0.5, fast=p>0.5, slow=p>=0.1&&p<0.25;
  let st,word,verdict;
  if(inZ){ if(liftsFlat){ st='amber'; word='Check lifts'; verdict='Weight is rising but your lifts are not. Check reps, load and sleep'; }
    else { st='green'; word=GST.green; verdict= liftsUp? 'Gaining at a lean rate and your lifts are rising' : 'Gaining at a lean rate'; } }
  else if(fast){ st='amber'; word='Too fast'; verdict='Faster than 0.5% a week is mostly fat. A little less food'; }
  else if(slow){ st='amber'; word='A bit slow'; verdict='Just under the range: a little more food'; }
  else if(liftsUp){ st='amber'; word='Weight not rising'; verdict='Lifts are going up while weight is '+(p<0?'falling':'flat')+'. That works for a while. For more size, eat more'; }
  else { st='red'; word= p<0? 'Losing weight' : 'Not gaining'; verdict= p<0? 'Weight is falling. To build, eat a little more' : 'Weight is flat. To build, eat a little more'; }
  const dir= p>0.005? 'up' : (p<-0.005? 'down' : 'flat');
  return {key:'aim:build',st,kicker,status:word,
    num:(p>0.005? '+' : (p<-0.005? '−' : ''))+n(Math.abs(r.kg)), unit:unit+' a week', ctx:'weight trend · '+abs.toFixed(2)+'% of bodyweight',
    vis:zoneGauge(-0.5,1,0.25,0.5,p,'Weight trend '+(p>=0?'up ':'down ')+abs.toFixed(2)+'% a week. Target zone is gaining 0.25 to 0.5% a week.'),
    cap:zoneCap('Target zone: gain 0.25 to 0.5% a week'), rows:[liftRow], verdict,
    aria:kicker+': weight trend '+dir+' '+abs.toFixed(2)+'% of bodyweight a week, target gain 0.25 to 0.5%. '+liftsTxt+'. '+verdict+'.',
    why:Object.assign({},whyBase,{
      now:'Your weight trend is '+dir+' '+showW(Math.abs(r.kg),imp)+' a week ('+abs.toFixed(2)+'% of bodyweight) over the last '+rateSpan(r)+'. '+liftsTxt+'. '+verdict+'.',
      moves:[p<0.25? 'Eat a little above your maintenance: the Week in review sets next week\'s calories from your trend.' : (fast? 'Ease the calories back a little.' : 'Keep the calories where they are.'),
        'Add a rep or a little weight to your lifts each time you can.','Protein at your target, and sleep.']})};
}

function cardStrong(imp){
  const kicker=aimOf('strong').t;
  const lt=liftsTrend().filter(x=>x.was).slice(0,3);
  const whyBase={title:kicker,sub:'Estimated one-rep max, lift by lift',
    target:'Each of your three most done lifts compared with four weeks ago: the best estimated one-rep max in the last 4 weeks against the 4 before. Up 1% or more on average is the shaded zone.',
    source:'One-rep max is estimated from your best set (Epley: load times 1 plus reps over 30). It is a guide, not a test. '+MOVE_SRC};
  if(!lt.length) return {key:'aim:strong',st:'none',kicker,status:GST.none,verdict:'Each lift compares once it has sessions this month and last',
    aria:kicker+': lifts compare after a month of sessions.',
    why:Object.assign({},whyBase,{now:'No lift has sessions in both of the last two months yet, so there is nothing to compare.',moves:['Keep logging your sets. Each lift shows up here once it has two months of history.']})};
  const pcts=lt.map(x=>(x.now-x.was)/x.was*100), avgP=pcts.reduce((a,b)=>a+b,0)/pcts.length;
  const st= avgP>=1? 'green' : (avgP>-2? 'amber' : 'red');
  const word= avgP>=1? GST.green : (avgP>-2? 'Holding' : 'Down');
  const verdict= avgP>=1? 'Stronger than four weeks ago' : (avgP>-2? 'Holding. The reps come before the weight' : 'Down on four weeks ago: sleep, food and easy weeks first');
  const up=lt.filter(x=>x.now>x.was).length;
  const rows=lt.map(x=>({label:escHabit(x.n), value:x.was+' → '+x.now+' kg', vis:pips([x.now>x.was? 'on' : 'off']), t:escHabit(x.n)+' '+x.was+' → '+x.now+' kg'}));
  return {key:'aim:strong',st,kicker,status:word,
    num:(avgP>=0? '+' : '−')+Math.abs(avgP).toFixed(1)+'%', unit:'strength', ctx:'estimated max, vs 4 weeks ago',
    vis:zoneGauge(-6,8,1,8,Math.max(-6,Math.min(8,avgP)),'Strength '+(avgP>=0?'up ':'down ')+Math.abs(avgP).toFixed(1)+'% on four weeks ago. Target zone is up 1% or more.'),
    cap:zoneCap('Target zone: up 1% or more'),
    rows, verdict,
    aria:kicker+': estimated one-rep max '+(avgP>=0?'up ':'down ')+Math.abs(avgP).toFixed(1)+'% on four weeks ago, '+up+' of '+lt.length+' lifts up. '+verdict+'.',
    why:Object.assign({},whyBase,{
      now:lt.map(x=>x.n+' '+x.was+' to '+x.now+' kg').join('. ')+'. On average '+(avgP>=0?'up ':'down ')+Math.abs(avgP).toFixed(1)+'%.',
      moves:['Hit the top of the rep range on every set, then add weight.','Sleep and protein do most of the rest.','An easy week now and then lets the numbers catch up.']})};
}

function cardEndure(){
  const kicker=aimOf('endure').t, mon=mondayKey();
  const now=runMinutesWeek(mon), last=runMinutesWeek(addDays(mon,-7)), wp=weekRunPlan(), plan=wp.total;
  const jump= last>0&&now>last*1.3;
  const behind= plan>0&&now<wp.sofar;
  const st= jump? 'amber' : (plan>0? (behind? 'amber' : 'green') : (now>0? 'green' : 'none'));
  const word= jump? 'Big jump' : (plan>0? (behind? 'Behind pace' : (now>=plan? 'Week done' : GST.green)) : (now>0? GST.green : GST.none));
  const verdict= jump? 'More than 30% up on last week: build gradually' : (plan>0&&now>=plan? 'The week\'s running is in' : (behind? 'A little behind where the plan has you by today' : ''));
  const rows=[last>0||now>0? {label:'Last week', value:last+' min', t:'Last week '+last+' min'} : null];
  return {key:'aim:endure',st,kicker,status:word,
    num:String(now), unit:'min this week', ctx:plan? 'of '+plan+' planned' : 'no runs planned',
    vis:plan? paceBar(now/plan*100,wp.sofar/plan*100,'Running '+now+' of '+plan+' minutes planned this week. The tick is where the plan has you by today, '+wp.sofar+' minutes.') : '',
    cap:plan? '<i class="tk"></i>Tick: where the plan has you by today' : '', rows, verdict,
    aria:kicker+': '+now+' running minutes this week'+(plan? ' of '+plan+' planned, '+wp.sofar+' by today' : '')+', last week '+last+'. '+verdict+'.',
    why:{title:kicker,sub:'Running minutes this week',
      now:now+' minutes run this week'+(plan? ' of '+plan+' planned. By today the plan has '+wp.sofar+'.' : '.')+' Last week was '+last+'.',
      target:plan? 'The week\'s planned running is the full bar. The tick marks where the plan has you by today, so you can see ahead or behind.' : 'No runs are planned this week, so there is no bar. Last week is the thing to build on.',
      moves:['Keep most runs easy: you should be able to talk.','Add no more than about 30% on last week.','Missing a run is normal. The week is what counts.'],
      source:'Weekly volume is the main thing to build. A jump of more than about 30% over two weeks went with more injuries in new runners (Nielsen and colleagues 2014, observational). '+MOVE_SRC}};
}

function cardHold(imp){
  const kicker=aimOf('hold').t, w=v=>showW(v,imp), n=v=>showW(v,imp).split(' ')[0], unit=showW(0,imp).split(' ')[1]||'kg';
  const now=weightNow(); if(now===null) return null;
  const t=S.target&&S.target.kind==='weight'&&(S.weights||[]).length? S.target : null;
  const ref= t? +t.value : ((typeof trendOn==='function'&&trendOn(addDays(todayKey(),-84)))||weightStart()||now);
  const lo=ref*0.97, hi=ref*1.03, inBand=now>=lo&&now<=hi, edge=Math.abs(now-ref)>ref*0.02;
  const st= !inBand? 'red' : (edge? 'amber' : 'green');
  const word= !inBand? 'Outside the band' : (edge? 'Near the edge' : 'Steady');
  const verdict= !inBand? 'Outside the band: the Week in review shows what moved it' : (edge? 'Near the edge of the band' : 'Steady');
  return {key:'aim:hold',st,kicker,status:word,
    num:n(now), unit:unit+' trend', ctx:'band '+w(lo)+' to '+w(hi),
    vis:zoneGauge(ref*0.94,ref*1.06,lo,hi,now,'Weight trend '+w(now)+'. Target band is '+w(lo)+' to '+w(hi)+'.'),
    cap:zoneCap('Target zone: within 3% of '+w(ref)), verdict,
    aria:kicker+': trend '+w(now)+', band '+w(lo)+' to '+w(hi)+' around '+w(ref)+'. '+verdict+'.',
    why:{title:kicker,sub:'Your weight against a steady band',
      now:'Your weight trend is '+w(now)+'. The band around '+w(ref)+(t? ' (your goal weight)' : ' (your trend twelve weeks ago)')+' runs from '+w(lo)+' to '+w(hi)+'.',
      target:'Staying within 3% either side is the usual meaning of keeping your weight steady.',
      moves:['Weigh in a few mornings a week.','If you drift towards an edge, the Week in review shows what moved it and what to change.'],
      source:'Stevens and colleagues 2006 (weight maintenance defined as within 3%). '+MOVE_SRC}};
}

function cardEat(){
  const kicker=aimOf('eat').t, t=S.targets||{}, keys=[]; for(let i=6;i>=0;i--) keys.push(addDays(todayKey(),-i));
  const fedKeys=keys.filter(k=>dayFood(k).length), tot={}; fedKeys.forEach(k=>{ tot[k]=foodTotals(k); });
  const fibreT=t.fibre||30, proteinT=t.protein||0;
  const pState=k=>!dayFood(k).length? 'none' : (tot[k].protein>=proteinT*0.9? 'on' : 'off');
  const fState=k=>!dayFood(k).length? 'none' : ((tot[k].fibre||0)>=fibreT? 'on' : 'off');
  const pDays=proteinT? keys.filter(k=>pState(k)==='on').length : 0, fDays=keys.filter(k=>fState(k)==='on').length;
  const whyBase={title:kicker,sub:'Protein and fibre, day by day',
    target:'A day counts when you reach about your protein target'+(proteinT? ' ('+proteinT+'g)' : '')+' or '+fibreT+'g of fibre. The dots are the last seven days, today last; an empty dot is a day with food logged that missed, a dashed one is a day with nothing logged.',
    source:'Fibre: 30g a day (SACN 2015). Protein: your own target. '+MOVE_SRC};
  if(!fedKeys.length) return {key:'aim:eat',st:'none',kicker,status:GST.none,verdict:'Protein and fibre days show once food is logged',
    aria:kicker+': log food to see protein and fibre days.',
    why:Object.assign({},whyBase,{now:'No food logged in the last seven days.',moves:['Log what you eat. One tap on Eat does it.']})};
  const score=(pDays+fDays)/(fedKeys.length*(proteinT? 2 : 1));
  const early=fedKeys.length<3;
  const st= early? 'none' : (score>=0.6? 'green' : (score>=0.3? 'amber' : 'red'));
  const word= early? 'Early days' : (score>=0.6? GST.green : (score>=0.3? 'Getting there' : 'Off track'));
  const rows=[proteinT? {label:'Protein', value:pDays+' of '+fedKeys.length+' logged days', vis:pips(keys.map(pState)), t:'Protein '+pDays+' of '+fedKeys.length+' days'} : null,
    {label:'Fibre', value:fDays+' of '+fedKeys.length+' logged days', vis:pips(keys.map(fState)), t:'Fibre '+fDays+' of '+fedKeys.length+' days'}];
  const verdict= early? 'A few more days logged and this means something' : (score>=0.6? 'Most days are landing' : 'Pick one: protein at breakfast is the easiest win');
  return {key:'aim:eat',st,kicker,status:word,
    num:String(fedKeys.length), unit:'of 7 days logged', ctx:'', rows, verdict,
    aria:kicker+': '+fedKeys.length+' of 7 days logged'+(proteinT? ', protein on target '+pDays : '')+', fibre '+fDays+'. '+verdict+'.',
    why:Object.assign({},whyBase,{now:fedKeys.length+' of the last 7 days have food logged. '+(proteinT? 'Protein hit '+pDays+', ' : '')+'fibre hit '+fDays+'.',
      moves:['Protein first at breakfast makes the rest of the day easier.','Beans, oats, fruit and vegetables carry the fibre.','Log every day, even a bad one. A missed day is information, not failure.']})};
}

function aimCard(id,imp){
  return id==='lose'? cardLose(imp) : id==='build'? cardBuild(imp) : id==='strong'? cardStrong(imp)
    : id==='endure'? cardEndure() : id==='hold'? cardHold(imp) : id==='eat'? cardEat() : null;
}

/* ----- a goal set with Set a goal, when it is a different thing from the aim ----- */
function targetCard(t){
  const TK=TARGET_KINDS[t.kind]; if(!TK) return null;
  const daysLeft=t.by? Math.round((dateOf(t.by)-dateOf(todayKey()))/864e5) : null;
  const left= daysLeft===null? '' : (daysLeft<0? Math.abs(daysLeft)+' days past' : daysLeft+' days left');
  if(t.kind==='sessions'){
    const now=targetNow()||0, v=+t.value, expect=v*(dowIdx()+1)/7, hit=now>=v;
    const st= hit? 'green' : (now>=Math.floor(expect)? 'green' : 'amber');
    const hits=weekHits(v), weeks=hits.filter(x=>x==='on').length;
    const key='target:sessions';
    return {key,st,kicker:v+' sessions a week',status:hit? 'Week done' : (st==='green'? GST.green : 'Behind pace'),
      num:String(now), unit:'of '+v+' this week', ctx:'',
      vis:paceBar(Math.min(100,now/v*100),Math.min(100,expect/v*100),now+' of '+v+' sessions this week. The tick is where you would be on pace today.'),
      cap:'<i class="tk"></i>Tick: where you would be on pace today',
      rows:[{label:'Last 8 weeks', value:weeks+' of 8 weeks hit', vis:pips(hits), t:weeks+' of 8 weeks hit'}],
      verdict: hit? 'This week is done' : (st==='green'? 'On pace for the week' : 'A little behind. There is still time this week'),
      aria:v+' sessions a week: '+now+' this week, '+weeks+' of the last 8 weeks hit.',
      why:{title:v+' sessions a week',sub:'A weekly goal',now:now+' sessions so far this week. '+weeks+' of the last 8 weeks reached '+v+'.',
        target:'The bar is '+v+' sessions in the week. The tick is where you would be if they were spread evenly, so ahead or behind is plain. Weeks count, not streaks: a missed week does not wipe the rest.',
        moves:['Book the sessions on Plan so the week has room for them.','One short session beats none.'],target_kind:true,source:''}};
  }
  const hist= t.kind==='lift'? exHistory(t.exId).slice().sort((a,b)=>a.d<b.d? -1 : 1) : [];
  const firstBest= hist.length? Math.max(0,...(hist[0].sets||[]).map(x=>+x.kg||0)) : 0;
  const now=targetNow(), v=+t.value;
  const start= t.from!==undefined&&t.from!==null? +t.from : (t.kind==='lift'? firstBest : 0);
  const name= t.kind==='lift'? exOf(t.exId).n : 'Longest run';
  const kicker= t.kind==='lift'? escHabit(name)+' to '+v+' kg' : 'Run '+v+' km';
  const unit= TK.unit;
  if(t.hit||(now!==null&&now>=v)) return {key:'target:'+t.kind,st:'green',kicker,status:'Target met',num:String(now!==null? now : v),unit:unit+(t.kind==='lift'? ' best set' : ' longest run'),ctx:'',
    vis:paceBar(100,null,'Target met.'),verdict:'Target met. Tap to set the next one',aria:kicker+': target met.',
    why:{title:name+' to '+v+' '+unit,sub:'Target met',now:'You did it'+(t.hit? ' on '+prettyDate(t.hit) : '')+'.',target:'Set the next one from the button below.',moves:['A goal that is met is a good time to pick a slightly harder one.'],target_kind:true,source:''}};
  if(now===null) return {key:'target:'+t.kind,st:'none',kicker,status:GST.none,verdict:'Nothing logged against it yet',aria:kicker+': nothing logged against it yet.',
    why:{title:name+' to '+v+' '+unit,sub:'A goal',now:'Nothing logged against it yet.',target:v+' '+unit+(left? ', '+left : '')+'.',moves:['Log it once and the bar starts.'],target_kind:true,source:''}};
  const span=v-start, pct= span>0? Math.max(0,Math.min(100,Math.round((now-start)/span*100))) : 0;
  let pace=null;
  if(t.by&&t.set){ const total=Math.round((dateOf(t.by)-dateOf(t.set))/864e5), el=Math.round((dateOf(todayKey())-dateOf(t.set))/864e5); if(total>0) pace=Math.max(0,Math.min(100,Math.round(el/total*100))); }
  const late= daysLeft!==null&&daysLeft<0;
  const st= late? 'red' : (pace===null? (now>start? 'green' : 'none') : (pct>=pace-5? 'green' : 'amber'));
  const word= late? 'Date passed' : (pace===null? (now>start? 'Moving' : GST.none) : (pct>=pace-5? GST.green : 'Behind pace'));
  const togo=+(v-now).toFixed(1);
  return {key:'target:'+t.kind,st,kicker,status:word,
    num:String(now), unit:unit+(t.kind==='lift'? ' best set' : ' longest run'), ctx:togo+' '+unit+' to go'+(left? ' · '+left : ''),
    vis:paceBar(pct,pace,pct+'% of the way from '+start+' to '+v+' '+unit+(pace!==null? '. The tick is where a steady climb to the date would have you today.' : '.')),
    cap:pace!==null? '<i class="tk"></i>Tick: where a steady climb to the date has you today' : '',
    verdict: late? 'The date has passed. Tap to set a new one' : (pace!==null&&pct<pace-5? 'A little behind a steady climb to the date' : (pace!==null? 'On a steady climb to the date' : '')),
    aria:kicker+': '+now+' '+unit+' now, '+togo+' to go'+(left? ', '+left : '')+'.',
    why:{title:name+' to '+v+' '+unit,sub:'A goal with a number',now:'Best so far '+now+' '+unit+', started from '+start+'. '+togo+' '+unit+' to go'+(left? ', '+left : '')+'.',
      target:pace!==null? 'The bar is the distance from where you started to the goal. The tick is where a steady climb from the day you set it to the goal date would have you today.' : 'The bar is the distance from where you started to the goal. There is no date, so no tick.',
      moves:t.kind==='lift'? ['Progress this lift each time you can: a rep, then weight.','A rest day before a heavy attempt is worth it.'] : ['Build the long run a little at a time.','Keep the other runs easy.'],target_kind:true,source:''}};
}

/* ----- Today ----- */
function goalLine(){
  const rule='<div class="wline rule" aria-hidden="true"></div>';
  if(isTeen()) return rule;
  Object.keys(GOAL_WHY).forEach(k=>{ delete GOAL_WHY[k]; });
  const imp=S.profile.units==='imperial', aim=goalAim(), t=S.target, haveW=(S.weights||[]).length>0, items=[];
  const add=o=>{ if(o&&items.length<GOAL_MAX) items.push(o); };
  if(aim==='lose'&&t&&t.kind==='weight'&&haveW) add({raw:weightLine()});
  else add(aimCard(aim,imp));
  if(goalTargetSeparate()){
    if(t.kind==='weight'){ if(haveW) add({raw:weightLine()}); }
    else add(targetCard(t));
  }
  goalExtras().forEach(id=>add(aimCard(id,imp)));
  if(!items.length) return rule;
  items.forEach(o=>{ if(o.why) GOAL_WHY[o.key]=o.why; });
  if(items.length===1) return items[0].raw? items[0].raw : gcard(items[0],false);
  return `<div class="goalstack">${items.map(o=>o.raw? o.raw : gcard(o,true)).join('')}</div>`;
}

/* What a card says, in full, with where the target comes from. */
function openGoalWhy(key){
  const o=GOAL_WHY[key]; if(!o) return;
  $('altTitle').textContent=o.title; $('altSub').textContent=o.sub||'';
  $('altBody').innerHTML=`<div class="gwhy">
    <div class="gw"><b>Where you are</b><p>${o.now}</p></div>
    <div class="gw"><b>The target</b><p>${o.target}</p></div>
    <div class="gw"><b>What moves it</b><ul>${(o.moves||[]).map(m=>`<li>${m}</li>`).join('')}</ul></div>
    ${o.source&&!o.target_kind? `<div class="gw"><b>Where this comes from</b><p>${o.source}</p></div>` : ''}
    <div class="gwbtns">${o.target_kind? `<button class="sheetcta" data-goalsettarget>Change this goal</button>` : ''}
      <button class="${o.target_kind? 'skipbtn' : 'sheetcta'}" data-goalchange>Change or add an aim</button>
      <button class="skipbtn" data-goalyou>See it on You</button></div></div>`;
  openSheet('altSheet');
}
document.addEventListener('click',e=>{
  const gw=e.target.closest('[data-goalwhy]');
  if(gw){ openGoalWhy(gw.dataset.goalwhy); return; }
  const al=e.target.closest('[data-alsoaim]');
  if(al){ toggleAlsoAim(al.dataset.alsoaim); return; }
  if(e.target.closest('[data-goalchange]')){ closeSheets(); drawAimSheet(); openSheet('aimSheet'); return; }
  if(e.target.closest('[data-goalsettarget]')){ closeSheets(); openTargetSheet(); return; }
  if(e.target.closest('[data-goalyou]')){ closeSheets(); go('progress'); return; }
});
/* This file loads after the first draw of Today (boot.js draws it earlier), so
   on opening the app the old weight line was drawn instead of the goal cards
   until anything else redrew. Draw once more when every script is in. */
setTimeout(()=>{ try{ renderAll(); }catch(e){} },0);
Object.assign(window.__G,{goalLine,goalAim,ratePct,liftsTrend,runMinutesWeek,goalExtras,goalExtraMax,toggleAlsoAim,GOAL_WHY,openGoalWhy,weekHits,weekRunPlan});
