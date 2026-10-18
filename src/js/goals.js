/* ---------- your plan, under the rings (build 80) ----------
   Feargal, 18 Oct, after builds 78 and 79: "If the goal is to build muscle and
   lose weight, how can we say one is on track and one is off track?" He was
   right, and the fault was the model, not the drawing. Each goal judged the
   same body weight on its own terms: Build muscle wanted it rising, his goal
   weight wanted it falling, so one card was bound to be red.

   What the evidence and the leading apps say (read for this build):
   - Body weight has one direction at a time. MacroFactor asks one question,
     lose, maintain or gain, with one rate, and treats building muscle while
     losing fat as maintenance or a slow loss, not a second weight goal.
   - In a moderate calorie deficit, strength still goes up even when lean mass
     barely does, and on average a deficit of about 500 kcal a day neither
     added nor lost lean mass (Murphy and Koehler 2022, meta-analysis; mostly
     untrained people). So while losing, lifts going up or holding is the sign
     muscle is being kept.
   - Slower loss keeps more muscle: athletes losing 0.7% a week gained lean
     mass, at 1.4% they did not (Garthe and colleagues 2010).
   - Apple's Trends answer "is it working?" with an arrow per measure and two
     groups, Keep it going and Worth a look. No red, no gauge to decode.
   - Fitbod and Hevy show strength as each lift's estimated max over time.

   So Today shows one plan, not a card per goal:
     1  the plan's name, built from everything chosen, so the combination
        reads as one intention ("Lose fat, keep building muscle")
     2  one word and one sentence: is it working, and if not, the one thing
        to look at
     3  a row per sign (weight, lifts, a goal you set, running, protein,
        fibre): an arrow for which way it is moving, the value in words, and
        a word for how that suits the plan
   The weight direction comes from one place: the goal weight if there is one,
   otherwise the aims (Lose fat, then Hold steady, then Build muscle). Every
   sign is judged against that same direction, so two rows can never pull
   against each other. The weight line under a goal weight is the approved
   one, unchanged, and shown by itself when weight is the only thing tracked.
   Words are good (green), worth a look (amber) or not enough yet (grey):
   nothing is red, and nothing is judged before there is data. */
const GOAL_MAX=3;
const GOAL_WHY={};
const MOVE_SRC='Rules of thumb for most people, not a promise for you. Your own weigh ins and lifts decide.';
function goalAim(){ return (S.profile&&S.profile.aim)||'lose'; }
/* Lose fat and Hold steady ask opposite things of your weight, so only one. */
const CLASH={lose:'hold',hold:'lose'};
function goalExtras(){
  const main=goalAim(), raw=(S.profile&&Array.isArray(S.profile.alsoAims))? S.profile.alsoAims : [], out=[];
  raw.forEach(id=>{ if(id!==main&&out.indexOf(id)<0&&AIMS.some(a=>a.id===id)&&CLASH[id]!==main&&out.indexOf(CLASH[id])<0) out.push(id); });
  return out;
}
function planAims(){ return [goalAim()].concat(goalExtras()); }
function goalClash(id){ const c=CLASH[id]; return !!c&&planAims().indexOf(c)>=0; }
function goalTargetSeparate(){ const t=S.target; return !!(t&&t.kind&&t.kind!=='weight'); }
function goalExtraMax(){ return GOAL_MAX-1-(goalTargetSeparate()?1:0); }
function toggleAlsoAim(id){
  if(id===goalAim()||!AIMS.some(a=>a.id===id)) return false;
  const cur=goalExtras(), on=cur.indexOf(id)>=0;
  if(!on&&(cur.length>=goalExtraMax()||goalClash(id))) return false;
  S.profile.alsoAims= on? cur.filter(x=>x!==id) : cur.concat([id]);
  save(); renderAll();
  if(typeof drawAimSheet==='function') drawAimSheet();
  return true;
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

/* ----- the one direction for your weight ----- */
function planDir(){
  const t=S.target;
  if(t&&t.kind==='weight'&&(S.weights||[]).length){
    const wp=weightProgress();
    if(wp&&wp.goal!==null){ const gap=wp.goal-wp.start;
      return {dir: Math.abs(gap)<wp.start*0.01? 'hold' : (gap<0? 'down' : 'up'), from:'target', goal:wp.goal}; }
  }
  const a=planAims();
  if(a.indexOf('lose')>=0) return {dir:'down',from:'aim'};
  if(a.indexOf('hold')>=0) return {dir:'hold',from:'aim'};
  if(a.indexOf('build')>=0) return {dir:'up',from:'aim'};
  return {dir:null,from:null};
}
const keepsMuscle=()=>{ const a=planAims(); return a.indexOf('build')>=0||a.indexOf('strong')>=0; };
/* the healthy range of weekly change, % of bodyweight */
function planBand(dir){
  if(dir==='down') return keepsMuscle()? [0.25,0.75] : [0.5,1];
  if(dir==='up') return [0.25,0.5];
  return null;
}
function planName(pd){
  const a=planAims(), has=id=>a.indexOf(id)>=0, p=[];
  if(pd.dir==='down'){ p.push(has('lose')? 'Lose fat' : 'Lose weight'); if(has('build')) p.push('keep building muscle'); else if(has('strong')) p.push('keep your strength'); }
  else if(pd.dir==='up'){ p.push(has('build')? 'Build muscle' : 'Gain weight'); if(has('strong')) p.push('get stronger'); }
  else if(pd.dir==='hold'){ p.push(has('build')? 'Build muscle at a steady weight' : 'Hold steady'); if(has('strong')) p.push('get stronger'); }
  else if(has('strong')) p.push('Get stronger');
  const t=S.target;
  if(t&&t.kind==='lift'&&!has('strong')&&!has('build')) p.push(p.length? 'lift more' : 'Lift more');
  if(has('endure')||(t&&t.kind==='runkm')) p.push(p.length? 'run further' : 'Run further');
  if(t&&t.kind==='sessions') p.push(p.length? 'train '+t.value+' times a week' : 'Train '+t.value+' times a week');
  if(has('eat')) p.push(p.length? 'eat better' : 'Eat better');
  return p.length<2? (p[0]||'') : p.slice(0,-1).join(', ')+' and '+p[p.length-1];
}

/* ----- the signs: one row each, judged against the same plan ----- */
const ARROW={up:'↑',down:'↓',flat:'→'};
const cap1=s=>s? s.charAt(0).toUpperCase()+s.slice(1) : s;

function signWeight(pd,imp){
  const unit=showW(0,imp).split(' ')[1]||'kg', n=v=>showW(v,imp).split(' ')[0], w=v=>showW(v,imp);
  if(pd.from==='target'){
    const o=weightOutlook(), s=o? o.status : 'none';
    const st= s==='green'||s==='hit'? 'good' : (s==='none'? 'none' : 'look');
    return {key:'sign:weight', raw:weightLine(), st,
      say: s==='hit'? 'you reached your goal weight' : 'your weight is on course for '+w(pd.goal),
      fix: 'your weight is not on course for '+w(pd.goal)+(S.target.by? ' by '+prettyDate(S.target.by) : '')+'. The Week in review sets next week\'s calories from it',
      why:null};
  }
  const band=planBand(pd.dir), r=ratePct();
  const whyBase={title:'Weight',sub:'Which way it is going, and how fast',
    target: pd.dir==='down'? 'Your plan is to lose, at '+band[0]+' to '+band[1]+'% of your bodyweight a week'+(keepsMuscle()? '. Because you are also building, the range is slower than for fat loss alone: slower loss keeps more muscle.' : '. Slower works but takes longer; faster tends to take muscle with it.')
      : pd.dir==='up'? 'Your plan is to gain slowly, 0.25 to 0.5% of your bodyweight a week: enough to feed muscle with little fat.'
      : 'Your plan is to keep your weight steady: within 3% either way.',
    source: pd.dir==='down'? (keepsMuscle()? 'Garthe and colleagues 2010 (0.7% a week kept and added lean mass, 1.4% did not); Murphy and Koehler 2022 (strength still rises in a moderate deficit). ' : 'Helms, Aragon and Fitschen 2014 (0.5 to 1% a week, natural athletes cutting). ')+MOVE_SRC
      : pd.dir==='up'? 'Iraki and colleagues 2019 (rate of gain for natural lifters). '+MOVE_SRC : 'Stevens and colleagues 2006 (weight maintenance defined as within 3%). '+MOVE_SRC};
  if(!r){
    const any=(S.weights||[]).length;
    return {key:'sign:weight',st:'none',icon:'',label:'Weight',value: any? 'Three weigh ins over a week show the direction' : 'Weigh in to start',word:'Not enough yet',
      why:Object.assign({},whyBase,{now:'There are not enough weigh ins yet to see which way your weight is going.',moves:['Weigh in a few mornings a week, in the same conditions.']})};
  }
  const p=r.pct, abs=Math.abs(p), mv= p>0.05? 'up' : (p<-0.05? 'down' : 'flat');
  const value= mv==='flat'? 'Steady at '+w(weightNow()) : cap1(mv)+' '+n(Math.abs(r.kg))+' '+unit+' a week';
  let st='good', word, say, fix='';
  if(pd.dir==='down'){ const loss=-p;
    if(loss>=band[0]&&loss<=band[1]){ word='Good pace'; say='your weight is coming down at a good pace'; }
    else if(loss>band[1]){ st='look'; word='Too fast'; fix='weight is coming off faster than '+band[1]+'% a week, which tends to cost muscle. Eat a little more'; }
    else if(loss>=0.1){ st='look'; word='Slow'; fix='weight is coming down slowly. The Week in review trims next week\'s calories'; }
    else { st='look'; word='Not coming down'; fix='your weight is not coming down yet. The Week in review shows what to change'; }
  } else if(pd.dir==='up'){
    if(p>=band[0]&&p<=band[1]){ word='Good pace'; say='your weight is rising slowly, which feeds muscle'; }
    else if(p>band[1]){ st='look'; word='Too fast'; fix='weight is rising faster than 0.5% a week, which is mostly fat. Ease the food back a little'; }
    else if(p>=0.1){ st='look'; word='Slow'; fix='your weight is barely rising. Eat a little more'; }
    else { st='look'; word='Not rising'; fix='your weight is not rising, and building muscle needs a little more food'; }
  } else {
    const ref=(typeof trendOn==='function'&&trendOn(addDays(todayKey(),-84)))||weightStart()||weightNow(), now=weightNow();
    if(Math.abs(now-ref)<=ref*0.03){ word='Steady'; say='your weight is holding steady'; }
    else { st='look'; word= now>ref? 'Drifting up' : 'Drifting down'; fix='your weight has moved more than 3% from '+w(ref)+'. The Week in review shows what moved it'; }
  }
  return {key:'sign:weight',st,icon:ARROW[mv],label:'Weight',value,word,say,fix,
    why:Object.assign({},whyBase,{now:'Your weight trend is '+(mv==='flat'? 'steady' : mv+' '+w(Math.abs(r.kg))+' a week')+', '+abs.toFixed(2)+'% of your bodyweight, from your weigh ins over the last '+rateSpan(r)+'. It is the same line as the weight chart.',
      moves: pd.dir==='down'? ['Weigh in a few mornings a week so the trend is true.','The Week in review sets next week\'s calories from this.','Keep lifting: it tells your body to keep muscle.']
        : pd.dir==='up'? ['Eat a little above maintenance: the Week in review sets next week\'s calories from your trend.','Protein at your target, and sleep.']
        : ['Weigh in a few mornings a week.','If you drift, the Week in review shows what moved it.']})};
}

function signLifts(pd){
  const lt=liftsTrend().filter(x=>x.was).slice(0,4);
  const why={title:'Lifts',sub:'Your best lifts against last month',
    target: pd.dir==='down'? 'While you are losing weight, lifts going up or holding is the sign you are keeping muscle. Strength usually keeps rising in a moderate deficit.' : 'Lifts going up over the weeks is the sign you are building. Each lift\'s best set in the last 4 weeks is compared with the 4 before.',
    source:'One-rep max is estimated from your best set (Epley). Murphy and Koehler 2022 (strength gains hold up in a moderate deficit). '+MOVE_SRC};
  if(!lt.length) return {key:'sign:lifts',st:'none',icon:'',label:'Lifts',value:'Compares once a lift has sessions this month and last',word:'Not enough yet',
    why:Object.assign({},why,{now:'No lift has sessions in both of the last two months yet.',moves:['Keep logging your sets. Each lift counts once it has two months of history.']})};
  const pcts=lt.map(x=>(x.now-x.was)/x.was*100), avg=pcts.reduce((a,b)=>a+b,0)/pcts.length, up=lt.filter(x=>x.now>x.was).length;
  const value=up+' of '+lt.length+' lifts up on last month';
  let st='good', icon, word, say='', fix='';
  const build=planAims().indexOf('build')>=0;
  if(avg>=1){ icon=ARROW.up; word= pd.dir==='down'? (build? 'Keeping muscle' : 'Still rising') : 'Getting stronger';
    say= pd.dir==='down'? 'your lifts are still going up'+(build? ', so you are keeping muscle' : ' while you lose') : 'your lifts are going up'; }
  else if(avg>-2){ icon=ARROW.flat;
    if(pd.dir==='down'){ word='Holding'; say='your lifts are holding, the sign you are keeping muscle'; }
    else { st='look'; word='Flat'; fix='your lifts have not moved in a month. Aim for one more rep each session'; } }
  else { st='look'; icon=ARROW.down; word='Slipping'; fix= pd.dir==='down'? 'your lifts are slipping. Slow the loss a little and protect your sleep' : 'your lifts are down on last month. Sleep, food and an easy week first'; }
  return {key:'sign:lifts',st,icon,label:'Lifts',value,word,say,fix,
    why:Object.assign({},why,{now:lt.map(x=>x.n+' '+x.was+' to '+x.now+' kg').join('. ')+'. On average '+(avg>=0? 'up ' : 'down ')+Math.abs(avg).toFixed(1)+'%.',
      moves:['Hit the top of the rep range on every set, then add weight.','Protein at your target and sleep do most of the rest.']})};
}

function signTarget(t){
  const TK=TARGET_KINDS[t.kind]; if(!TK) return null;
  const daysLeft=t.by? Math.round((dateOf(t.by)-dateOf(todayKey()))/864e5) : null;
  const left= daysLeft===null? '' : (daysLeft<0? Math.abs(daysLeft)+' days past' : daysLeft+' days left');
  const target_kind=true;
  if(t.kind==='sessions'){
    const now=targetNow()||0, v=+t.value, expect=v*(dowIdx()+1)/7, hit=now>=v, behind=!hit&&now<Math.floor(expect);
    const weeks=weekHits(v).filter(x=>x==='on').length;
    return {key:'sign:target',st: behind? 'look' : 'good',icon:'',label:'Sessions this week',value:now+' of '+v,word: hit? 'Week done' : (behind? 'A bit behind' : 'On pace'),
      bar:Math.min(100,now/v*100), say: hit? 'this week\'s sessions are done' : 'your sessions are on pace this week', fix: dowIdx()===6? 'your sessions fell short this week. A new week starts tomorrow' : 'your sessions are a little behind this week. There is still time',
      why:{title:v+' sessions a week',sub:'A weekly goal',now:now+' so far this week. '+weeks+' of the last 8 weeks reached '+v+'.',
        target:'The bar is the week\'s '+v+' sessions. Weeks count, not streaks: a missed week does not wipe the rest.',moves:['Book the sessions on Plan so the week has room for them.','One short session beats none.'],target_kind,source:''}};
  }
  const hist= t.kind==='lift'? exHistory(t.exId).slice().sort((a,b)=>a.d<b.d? -1 : 1) : [];
  const firstBest= hist.length? Math.max(0,...(hist[0].sets||[]).map(x=>+x.kg||0)) : 0;
  const now=targetNow(), v=+t.value, unit=TK.unit;
  const start= t.from!==undefined&&t.from!==null? +t.from : (t.kind==='lift'? firstBest : 0);
  const name= t.kind==='lift'? exOf(t.exId).n : 'Longest run';
  const label= t.kind==='lift'? escHabit(name)+' to '+v+' kg' : 'Run '+v+' km';
  const whyT={title:name+' to '+v+' '+unit,sub:'A goal with a number',target_kind,source:'',
    moves:t.kind==='lift'? ['Progress this lift each time you can: a rep, then weight.','A rest day before a heavy attempt is worth it.'] : ['Build the long run a little at a time.','Keep the other runs easy.']};
  if(t.hit||(now!==null&&now>=v)) return {key:'sign:target',st:'good',icon:'',label,value:'Done',word:'Goal met',bar:100,say:'you met your '+label+' goal',
    why:Object.assign({},whyT,{now:'You did it'+(t.hit? ' on '+prettyDate(t.hit) : '')+'.',target:'Set the next one from the button below.'})};
  if(now===null) return {key:'sign:target',st:'none',icon:'',label,value:'Nothing logged against it yet',word:'Not enough yet',
    why:Object.assign({},whyT,{now:'Nothing logged against it yet.',target:v+' '+unit+(left? ', '+left : '')+'.'})};
  const span=v-start, pct= span>0? Math.max(0,Math.min(100,Math.round((now-start)/span*100))) : 0;
  let pace=null;
  if(t.by&&t.set){ const total=Math.round((dateOf(t.by)-dateOf(t.set))/864e5), el=Math.round((dateOf(todayKey())-dateOf(t.set))/864e5); if(total>0) pace=Math.max(0,Math.min(100,Math.round(el/total*100))); }
  const late=daysLeft!==null&&daysLeft<0, behind=late||(pace!==null&&pct<pace-5), togo=+(v-now).toFixed(1);
  return {key:'sign:target',st: behind? 'look' : 'good',icon:'',label,value:now+' '+unit+' now, '+togo+' to go'+(left? ' · '+left : ''),
    word: late? 'Date passed' : (behind? 'Behind pace' : (pace===null? 'Moving' : 'On pace')), bar:pct,
    say:label+' is on pace', fix: late? 'the date for '+label+' has passed. Set a new one' : label+' is behind a steady climb to the date',
    why:Object.assign({},whyT,{now:'Best so far '+now+' '+unit+', started from '+start+'. '+togo+' '+unit+' to go'+(left? ', '+left : '')+'.',
      target:'The bar is the way from where you started to the goal. On pace means at least as far along as a steady climb to the date.'})};
}

function signRunning(){
  const mon=mondayKey(), now=runMinutesWeek(mon), last=runMinutesWeek(addDays(mon,-7)), wp=weekRunPlan(), plan=wp.total;
  const jump=last>0&&now>last*1.3, behind=plan>0&&now<wp.sofar;
  const why={title:'Running',sub:'Minutes this week',
    now:now+' minutes run this week'+(plan? ' of '+plan+' planned, '+wp.sofar+' by today in the plan' : '')+'. Last week was '+last+'.',
    target:'Weekly minutes are the main thing to build, a little at a time.',
    moves:['Keep most runs easy: you should be able to talk.','Add no more than about 30% on last week.','Missing a run is normal. The week is what counts.'],
    source:'A jump of more than about 30% went with more injuries in new runners (Nielsen and colleagues 2014, observational). '+MOVE_SRC};
  if(!plan&&!now&&!last) return {key:'sign:run',st:'none',icon:'',label:'Running',value:'No runs planned or logged this week',word:'Not enough yet',why};
  const value= plan? now+' of '+plan+' min this week' : now+' min this week';
  let st='good', word, say='', fix='';
  if(jump){ st='look'; word='Big jump'; fix='your running is up more than 30% on last week. Build gradually'; }
  else if(plan&&now>=plan){ word='Week done'; say='this week\'s running is in'; }
  else if(behind){ st='look'; word='A bit behind'; fix='your running is a little behind this week\'s plan'; }
  else { word= plan? 'On pace' : 'Moving'; say='your running is on pace'; }
  return {key:'sign:run',st,icon:'',label:'Running',value,word,say,fix,bar: plan? Math.min(100,now/plan*100) : null,why};
}

function signsEat(){
  const t=S.targets||{}, keys=[]; for(let i=6;i>=0;i--) keys.push(addDays(todayKey(),-i));
  const fed=keys.filter(k=>dayFood(k).length), tot={}; fed.forEach(k=>{ tot[k]=foodTotals(k); });
  const fibreT=t.fibre||30, proteinT=t.protein||0, early=fed.length<3;
  const src='Fibre: 30g a day (SACN 2015). Protein: your own target. '+MOVE_SRC;
  if(!fed.length) return [{key:'sign:eat',st:'none',icon:'',label:'Protein and fibre',value:'Shows once food is logged',word:'Not enough yet',
    why:{title:'Protein and fibre',sub:'Day by day',now:'No food logged in the last seven days.',target:'A day counts when you reach about your protein target or '+fibreT+'g of fibre.',moves:['Log what you eat. One tap on Eat does it.'],source:src}}];
  const row=(id,label,days,goal,goodSay,fixSay,moves)=>{ const r=days/fed.length;
    return {key:'sign:'+id, st: early? 'none' : (r>=0.6? 'good' : 'look'), icon:'', label, value:days+' of '+fed.length+' logged days', word: early? 'Early days' : (r>=0.6? 'Most days' : 'Worth a look'),
      say:goodSay, fix:fixSay,
      why:{title:label,sub:'The last seven days',now:days+' of the '+fed.length+' days with food logged reached '+goal+'.',target:'A day counts when it reaches '+goal+'. Most days is the aim, not every day.',moves,source:src}}; };
  const out=[];
  if(proteinT) out.push(row('protein','Protein',fed.filter(k=>tot[k].protein>=proteinT*0.9).length,'about '+proteinT+'g','protein is landing most days','protein is short on most days. Start with protein at breakfast',['Protein first at breakfast makes the rest of the day easier.']));
  out.push(row('fibre','Fibre',fed.filter(k=>(tot[k].fibre||0)>=fibreT).length,fibreT+'g','fibre is landing most days','fibre is low on most days. Beans, oats, fruit and veg carry it',['Beans, oats, fruit and vegetables carry the fibre.']));
  return out;
}

/* everything the plan tracks, in order */
function planSigns(pd,imp){
  const a=planAims(), out=[], t=S.target;
  if(pd.dir) out.push(signWeight(pd,imp));
  if(a.indexOf('build')>=0||a.indexOf('strong')>=0) out.push(signLifts(pd));
  if(t&&t.kind&&t.kind!=='weight'){ const s=signTarget(t); if(s) out.push(s); }
  if(a.indexOf('endure')>=0) out.push(signRunning());
  if(a.indexOf('eat')>=0) signsEat().forEach(s=>out.push(s));
  return out;
}
/* one word and one sentence for the whole plan */
function planVerdict(signs){
  const good=signs.filter(s=>s.st==='good'), look=signs.filter(s=>s.st==='look');
  if(!good.length&&!look.length) return {st:'none',word:'Getting started',say:'This fills in as you weigh in, log sessions and log food.'};
  if(!look.length) return {st:'good',word:'Working',say:cap1(good.slice(0,2).map(s=>s.say).join(', and '))+'.'};
  const one=look[0], goodTxt=good.length? cap1(good[0].say)+'. ' : '';
  return {st:'look',word: good.length>=look.length? 'Mostly working' : 'Worth a look',say:goodTxt+cap1(one.fix)+'.'};
}

function signRow(s){
  return `<button class="sg sg-${s.st}" data-goalwhy="${s.key}" aria-label="${escHabit(s.label)}: ${escHabit(s.value)}. ${escHabit(s.word)}. Tap for what it means.">
    <span class="sg-ic" aria-hidden="true">${s.icon||'•'}</span>
    <span class="sg-t"><span class="sg-l">${s.label}</span><span class="sg-v">${s.value}</span>${s.bar!=null? `<span class="sg-bar"><i style="width:${Math.max(0,Math.min(100,Math.round(s.bar)))}%"></i></span>` : ''}</span>
    <span class="sg-w">${s.word}</span></button>`;
}

/* ----- Today ----- */
function goalLine(){
  const rule='<div class="wline rule" aria-hidden="true"></div>';
  if(isTeen()) return rule;
  Object.keys(GOAL_WHY).forEach(k=>{ delete GOAL_WHY[k]; });
  const imp=S.profile.units==='imperial', pd=planDir(), signs=planSigns(pd,imp);
  if(!signs.length) return rule;
  /* weight against a goal weight, and nothing else: the approved line, alone */
  if(signs.length===1&&signs[0].raw) return signs[0].raw;
  /* only the weight, and no weigh ins yet: the plain rule, as before (the line follows the data) */
  if(signs.length===1&&signs[0].key==='sign:weight'&&signs[0].st==='none') return rule;
  const v=planVerdict(signs), name=planName(pd);
  signs.forEach(s=>{ if(s.why) GOAL_WHY[s.key]=s.why; });
  const dirTxt= pd.dir==='down'? 'down' : (pd.dir==='up'? 'up, slowly' : (pd.dir==='hold'? 'steady' : ''));
  GOAL_WHY.plan={title:name,sub:'Your plan, in one place',now:v.say,
    target:(pd.dir? 'Your weight has one direction in this plan: '+dirTxt+(pd.from==='target'? ', set by your goal weight of '+showW(pd.goal,imp) : ', set by your aim')+'. Everything else is judged against that same direction, so the rows never pull against each other.' : 'Each row is judged on its own: there is no weight direction in this plan.')
      +(pd.dir==='down'&&keepsMuscle()? ' Losing while building: the weight should come down slowly and your lifts should go up or hold. That is how you know muscle is being kept.' : ''),
    moves:['Tap any row for what it means and what moves it.','Change or add an aim below. Your goal weight lives on You.'],
    source:'Murphy and Koehler 2022; Garthe and colleagues 2010; Helms and colleagues 2014; Iraki and colleagues 2019. '+MOVE_SRC};
  const raw=signs.filter(s=>s.raw).map(s=>s.raw).join(''), rows=signs.filter(s=>!s.raw);
  return `<section class="plan pl-${v.st}" aria-label="Your plan: ${escHabit(name)}. ${escHabit(v.word)}. ${escHabit(v.say)}">
    <button class="plan-h" data-goalwhy="plan">
      <span class="plan-top"><span class="plan-k">Your plan</span><span class="plan-w">${v.word}</span></span>
      <span class="plan-n">${escHabit(name)}</span>
      <span class="plan-say">${v.say}</span></button>
    ${raw}
    ${rows.length? `<div class="plan-rows">${rows.map(signRow).join('')}</div>` : ''}
  </section>`;
}

/* What a row means, in full, with where the target comes from. */
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
   draw once more when every script is in, or the plan is missing on opening. */
setTimeout(()=>{ try{ renderAll(); }catch(e){} },0);
Object.assign(window.__G,{goalLine,goalAim,ratePct,liftsTrend,runMinutesWeek,goalExtras,goalExtraMax,toggleAlsoAim,goalClash,GOAL_WHY,openGoalWhy,weekHits,weekRunPlan,planDir,planName,planSigns,planVerdict});
