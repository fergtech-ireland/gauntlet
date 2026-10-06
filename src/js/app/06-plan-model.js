/* ===================== the plan ===================== */
function slotFor(code){
  if(SLOTS[code]) return Object.assign({slot:code},SLOTS[code],{templateId:null,runId:null,exclude:[],setDelta:0});
  const r=(S.runPlans||[]).find(x=>x.id===code);
  if(r) return {slot:code, runId:code, templateId:null, circuitId:null, label:r.name, sub:r.sub, mins:r.mins,
    kind:'run', type:'run', exclude:[], setDelta:0};
  const c=(S.circuits||[]).find(x=>x.id===code);
  if(c) return {slot:code, circuitId:code, templateId:null, runId:null, label:c.name, sub:c.sub, mins:c.mins,
    kind:'workout', type:'workout', exclude:[], setDelta:0};
  const t=(S.templates||[]).find(x=>x.id===code);
  if(isHifb(t)) return {slot:code, templateId:code, label:t.name, sub:t.ex.length+' blocks, '+fmtKm(hifbRunKm(t))+' km of running',
    mins:hifbMins(t), kind:'workout', type:'workout', exclude:[], setDelta:0};
  return {slot:code, templateId:code, label:(t?t.name:'Lift')+' day', sub:t? t.ex.length+' movements':'Lift',
    mins:50, kind:'workout', type:'workout', exclude:[], setDelta:0};
}
const AIM_DEFAULTS={lose:{lift:3,cardio:2},build:{lift:4,cardio:1},strong:{lift:4,cardio:1},endure:{lift:1,cardio:4},
  hold:{lift:3,cardio:1},eat:{lift:2,cardio:1}};
const LIFT_ORDER=['t_push','t_lower','t_pull'];
/* ---------- training splits ----------
   A 2024 meta-analysis of 14 trials (Ramos-Campo and colleagues) found no
   difference in strength or muscle growth between full-body and split
   routines when weekly volume is matched, and concluded people can pick by
   preference. Weekly volume is what drives growth (Pelland and colleagues,
   2025), so the thing to protect is enough weekly sets per muscle: that is why
   full body suits two or three days, and a body-part split needs about five.
   The week rolls on from where the last one stopped, so with fewer days than a
   split has sessions, nothing is left out, it just comes round a little later.
   People who joined before this keep exactly the week they had until they
   choose a split. */
const SPLITS={
  auto:{t:'Let Gauntlet choose',s:'Picked from how many days you lift'},
  full:{t:'Full body',s:'Everything, every session',best:[1,2,3],order:['t_full','t_fullB','t_fullC']},
  ul:{t:'Upper and lower',s:'Upper body one day, legs the next',best:[4],order:['t_upperA','t_lower','t_upperB','t_lowerB']},
  ppl:{t:'Push, pull, legs',s:'Chest and shoulders, then back, then legs',best:[3,6],order:['t_push','t_pull','t_legs']},
  bro:{t:'Body part',s:'Chest day, back day, legs, shoulders, arms. Each muscle once a week, with more sets that day',best:[5],order:['t_chest','t_back','t_legs','t_shoulders','t_arms']},
  pplul:{t:'Push, pull, legs, upper, lower',s:'Five days, each muscle twice',best:[5],order:['t_push','t_pull','t_legs','t_upperA','t_lower']}
};
function autoSplit(days){ return days<=3? 'full' : (days===4? 'ul' : (days===5? 'pplul' : 'ppl')); }
function splitOf(){
  const p=S.profile||{};
  if(!p.split) return null;
  return p.split==='auto'? autoSplit(dayCounts().lift) : (SPLITS[p.split]&&SPLITS[p.split].order? p.split : 'full');
}
function liftOrder(){
  const sp=splitOf();
  if(!sp) return {order:LIFT_ORDER,offset:0};
  const order=SPLITS[sp].order.filter(id=>(S.templates||[]).some(t=>t.id===id));
  const week=Math.floor(dateOf(mondayKey()).getTime()/(7*864e5));
  return {order:order.length? order : LIFT_ORDER, offset:(week*dayCounts().lift)%Math.max(1,order.length)};
}
/* an honest line about the fit between a split and the number of days */
/* ---------- HIFB: high-intensity functional bodybuilding (build 49) ----------
   Bodybuilding blocks, each finished with a run: a buy-in run, four lifting
   blocks of four sets with a 400m run straight after each, and a buy-out run.
   What the evidence says, and what it does not:
   - No trial has tested HIFB itself. It is a way of arranging concurrent
     training, so the evidence is the concurrent training evidence.
   - A meta-analysis of 43 studies found adding aerobic work to strength
     training did not reduce whole-muscle growth or maximal strength, but did
     blunt explosive strength, more so in the same session (Schumann and
     colleagues, Sports Medicine, 2022).
   - A companion analysis of muscle fibres found a small negative effect on
     type I fibre growth when the aerobic work was running, not cycling
     (Lundberg and colleagues, Sports Medicine, 2022). So the app says plainly
     that a bike or rower can stand in for the runs.
   - Session effort is rated 1 to 10 after the session and multiplied by its
     minutes: the session-RPE method (Foster and colleagues, 2001), a cheap,
     well-validated way to see training load and fatigue building.
   - 60 to 90 seconds between sets, and the run distances, are the method's
     own prescription, labelled as such: rules of thumb, not findings.
   - Where the method gives one number (8 reps), the row is a range topping
     out at it (6 to 8), because progression adds weight once the top of the
     range is reached on every set.
   Run splits are timed one by one, so the app can show whether the 400s hold
   up under fatigue and whether they get quicker from week to week. */
const HIFB={buyIn:800, between:400, buyOut:800, rest:75};
const HIFB_ORDER=['t_hifb_chest','t_hifb_back','t_hifb_shoulders','t_hifb_legs'];
/* where the sessions sit in a Monday-first week: four days is the classic
   shape, two on, a day off, two on */
const HIFB_DAYS={1:[0],2:[0,3],3:[0,2,4],4:[0,1,3,4],5:[0,1,3,4,5],6:[0,1,2,3,4,5]};
function hifbPattern(){
  const n=Math.max(1,Math.min(6,sessionsWanted()));
  const order=HIFB_ORDER.filter(id=>(S.templates||[]).some(t=>t.id===id));
  const out=Array(7).fill(S.profile.aim==='eat'? 'cook':'rest');
  if(!order.length) return out;
  /* with fewer days than sessions the week rolls on, so nothing is skipped for good */
  const week=Math.floor(dateOf(mondayKey()).getTime()/(7*864e5)), off=n<order.length? (week*n)%order.length : 0;
  (HIFB_DAYS[n]||HIFB_DAYS[4]).forEach((pos,j)=>{ out[pos]=order[(j+off)%order.length]; });
  return out;
}
const isHifb=t=>!!(t&&t.hifb);
function hifbRunKm(t){
  if(!isHifb(t)) return 0;
  const m=(+(t.hifb.buyIn&&t.hifb.buyIn.m)||0)+(+(t.hifb.buyOut&&t.hifb.buyOut.m)||0)+t.ex.reduce((a,r)=>a+(r.run? +r.run.m||0 : 0),0);
  return Math.round(m/100)/10;
}
/* minutes: two a set with its rest, six a kilometre, five for changeovers. An
   estimate for planning the day, not a target */
const hifbMins=t=>Math.round(t.ex.reduce((a,r)=>a+(+r.sets||0)*2,0)+hifbRunKm(t)*6+5);
const fmtKm=km=>(Math.round(km*10)/10).toString().replace(/\.0$/,'');
const parseSplit=v=>{ v=String(v||'').trim().replace(/[.,']/g,':'); if(!v) return null;
  let sec; if(v.indexOf(':')>=0){ const [m,ss]=v.split(':'); if(ss===undefined||!/^\d+$/.test(m)||!/^\d{1,2}$/.test(ss)||+ss>59) return NaN; sec=+m*60+ +ss; }
  else { if(!/^\d+$/.test(v)) return NaN; sec=+v; }
  return sec>=5&&sec<=7200? sec*1000 : NaN; };
const perKm=(ms,m)=>m? fmtSplit(ms/(m/1000)) : '';

/* ---------- week styles: HYROX, CrossFit, or both (build 48) ---------- */
/* HYROX is a fixed race: 8 runs of 1km, each followed by one of eight stations
   in a fixed order. Open weights are the same in every source: sled push 152kg
   for men and 102kg for women, sled pull 103 and 78, farmers carry 2 x 24 and
   2 x 16, sandbag lunges 20 and 10, wall balls 6kg and 4kg. Pro weights differ
   between sources, so Pro is pointed to the official site, not guessed.
   CrossFit is varied work against the clock. Systematic reviews put its injury
   rate alongside weightlifting and powerlifting (Klimek and colleagues, 2018;
   Meyer and colleagues, 2017), with the shoulder the place to watch, so every
   movement has a scaled version and the pain check works here too.
   Both are offered because people stick to training they like; neither is
   presented as better than lifting. */
const STYLES={
  gym:{t:'Gym',s:'Strength sessions, split the way you like'},
  hyrox:{t:'HYROX',s:'Runs and the eight race stations, building towards race day'},
  crossfit:{t:'CrossFit',s:'Varied workouts against the clock, with a strength piece'},
  hybrid:{t:'HYROX and CrossFit',s:'A mix of both: you choose how many days of each'},
  hifb:{t:'HIFB',s:'Bodybuilding blocks with a run after each one: functional bodybuilding with an engine'}};
/* the three styles built from weekly circuits; Gym and HIFB are built from templates */
const circStyle=s=>s==='hyrox'||s==='crossfit'||s==='hybrid';
/* how many of a mixed week are HYROX; the rest are CrossFit */
function hyroxDaysOf(n){ const h=S.profile&&S.profile.hyroxDays; return Math.max(1,Math.min(Math.max(1,n-1),(h===undefined||h===null)? Math.ceil(n/2) : +h)); }
const styleOf=()=>{ const s=(S.profile&&S.profile.style)||'gym'; return STYLES[s]? s : 'gym'; };
/* Every movement a session can use: what it needs, how it is measured, the
   Rx or race weight, and what to do instead when the kit is not there. The
   factor converts the amount: 1000m on a SkiErg is not 1000 band pulldowns. */
const MOVES={
  run:{n:'Run',kit:[],u:'m',cat:'mono'},
  skierg:{n:'SkiErg',kit:['skierg'],u:'m',cat:'hyrox',alt:[{id:'row',f:1},{id:'bandpull',f:0.06},{id:'burpee',f:0.02}]},
  sledpush:{n:'Sled push',kit:['sled'],u:'m',kg:{m:152,f:102},cat:'hyrox',alt:[{id:'dblungewalk',f:0.4},{id:'wallsprint',f:0.6}]},
  sledpull:{n:'Sled pull',kit:['sled'],u:'m',kg:{m:103,f:78},cat:'hyrox',alt:[{id:'dbrow',f:0.4},{id:'bandrow',f:0.6},{id:'bearcrawl',f:0.5}]},
  bbj:{n:'Burpee broad jumps',kit:[],u:'m',cat:'hyrox'},
  row:{n:'Row',kit:['rower'],u:'m',cat:'hyrox',alt:[{id:'skierg',f:1},{id:'run',f:1}]},
  farmers:{n:'Farmers carry',kit:['kettlebell','dumbbell'],u:'m',kg:{m:24,f:16},each:true,cat:'hyrox',alt:[{id:'bearcrawl',f:0.25}]},
  sblunge:{n:'Sandbag lunges',kit:['other'],u:'m',kg:{m:20,f:10},cat:'hyrox',alt:[{id:'dblungewalk',f:1},{id:'lunge',f:1}]},
  wallball:{n:'Wall balls',kit:['medball'],u:'reps',kg:{m:6,f:4},cat:'hyrox',r:20,alt:[{id:'dbthruster',f:1},{id:'squatjump',f:0.6}]},
  dblungewalk:{n:'Dumbbell walking lunges',kit:['dumbbell','kettlebell'],u:'m',kg:{m:20,f:12},each:true,alt:[{id:'lunge',f:1}]},
  wallsprint:{n:'Wall drive sprints',kit:[],u:'s',scaleNote:'Hands on a wall, drive the knees hard'},
  bandpull:{n:'Band straight-arm pulldowns',kit:['band'],u:'reps',alt:[{id:'burpee',f:0.4}]},
  dbrow:{n:'Dumbbell rows',kit:['dumbbell','kettlebell'],u:'reps',kg:{m:22.5,f:12.5},each:true,r:12,alt:[{id:'bandrow',f:1},{id:'bearcrawl',f:1}]},
  bandrow:{n:'Band rows',kit:['band'],u:'reps',r:15,alt:[{id:'bearcrawl',f:1}]},
  bearcrawl:{n:'Bear crawl',kit:[],u:'m'},
  lunge:{n:'Walking lunges',kit:[],u:'m'},
  squatjump:{n:'Squat jumps',kit:[],u:'reps',r:15},
  dbthruster:{n:'Dumbbell thrusters',kit:['dumbbell'],u:'reps',kg:{m:15,f:10},each:true,r:12,alt:[{id:'squatjump',f:0.8}]},
  pushup:{n:'Push-ups',kit:[],u:'reps',r:10,cat:'bw'},
  airsquat:{n:'Air squats',kit:[],u:'reps',r:15,cat:'bw'},
  situp:{n:'Sit-ups',kit:[],u:'reps',r:15,cat:'bw'},
  burpee:{n:'Burpees',kit:[],u:'reps',r:10,cat:'bw'},
  pullup:{n:'Pull-ups',kit:['pullup'],u:'reps',r:8,cat:'gym',scaleNote:'Band assisted, or jumping pull-ups',alt:[{id:'dbrow',f:1.5},{id:'bandrow',f:2},{id:'burpee',f:1}]},
  t2b:{n:'Toes to bar',kit:['pullup'],u:'reps',r:10,cat:'gym',scaleNote:'Hanging knee raises',alt:[{id:'vup',f:1}]},
  vup:{n:'V-ups',kit:[],u:'reps',r:12},
  boxjump:{n:'Box jumps',kit:['box'],u:'reps',r:12,cat:'gym',scaleNote:'Step ups, or a lower box',alt:[{id:'squatjump',f:1}]},
  du:{n:'Double unders',kit:['rope'],u:'reps',r:30,cat:'mono',scaleNote:'Single unders, twice the number',alt:[{id:'jumpingjack',f:2}]},
  jumpingjack:{n:'Jumping jacks',kit:[],u:'reps',r:40},
  thruster:{n:'Thrusters',kit:['barbell'],u:'reps',kg:{m:43,f:29},r:12,cat:'wl',alt:[{id:'dbthruster',f:1},{id:'wallball',f:1.5},{id:'squatjump',f:1}]},
  kbswing:{n:'Kettlebell swings',kit:['kettlebell'],u:'reps',kg:{m:24,f:16},r:15,cat:'wl',alt:[{id:'dbswing',f:1},{id:'glutebridge',f:1.5}]},
  dbswing:{n:'Dumbbell swings',kit:['dumbbell'],u:'reps',kg:{m:22.5,f:15},r:15,alt:[{id:'glutebridge',f:1.5}]},
  glutebridge:{n:'Glute bridges',kit:[],u:'reps',r:20},
  deadlift:{n:'Deadlifts',kit:['barbell'],u:'reps',kg:{m:102,f:70},r:9,cat:'wl',alt:[{id:'dbdeadlift',f:1.2},{id:'glutebridge',f:2}]},
  dbdeadlift:{n:'Dumbbell deadlifts',kit:['dumbbell','kettlebell'],u:'reps',kg:{m:30,f:20},each:true,r:12,alt:[{id:'glutebridge',f:2}]},
  clean:{n:'Power cleans',kit:['barbell'],u:'reps',kg:{m:61,f:43},r:6,cat:'wl',alt:[{id:'dbclean',f:1.5},{id:'burpee',f:1.5}]},
  cleanjerk:{n:'Clean and jerks',kit:['barbell'],u:'reps',kg:{m:61,f:43},r:5,cat:'wl',alt:[{id:'dbclean',f:1.5},{id:'burpee',f:1.5}]},
  dbclean:{n:'Dumbbell cleans',kit:['dumbbell','kettlebell'],u:'reps',kg:{m:22.5,f:15},each:true,r:10,alt:[{id:'burpee',f:1}]},
  pushpress:{n:'Push press',kit:['barbell'],u:'reps',kg:{m:52,f:34},r:10,cat:'wl',alt:[{id:'dbpushpress',f:1},{id:'pikepushup',f:1}]},
  dbpushpress:{n:'Dumbbell push press',kit:['dumbbell','kettlebell'],u:'reps',kg:{m:20,f:12.5},each:true,r:10,alt:[{id:'pikepushup',f:1}]},
  pikepushup:{n:'Pike push-ups',kit:[],u:'reps',r:10},
  rowcal:{n:'Row',kit:['rower'],u:'cal',r:15,cat:'mono',alt:[{id:'skicals',f:1},{id:'runm',f:14}]},
  skicals:{n:'SkiErg',kit:['skierg'],u:'cal',r:15,alt:[{id:'runm',f:14}]},
  runm:{n:'Run',kit:[],u:'m'},
  backsquat:{n:'Back squat',kit:['barbell'],u:'reps',cat:'lift',alt:[{id:'gobletsquat',f:2}]},
  frontsquat:{n:'Front squat',kit:['barbell'],u:'reps',cat:'lift',alt:[{id:'gobletsquat',f:2}]},
  gobletsquat:{n:'Goblet squat',kit:['dumbbell','kettlebell'],u:'reps',alt:[{id:'airsquat',f:3}]},
  strictpress:{n:'Strict press',kit:['barbell'],u:'reps',cat:'lift',alt:[{id:'dbpress',f:1.5},{id:'pikepushup',f:2}]},
  dbpress:{n:'Dumbbell shoulder press',kit:['dumbbell','kettlebell'],u:'reps',alt:[{id:'pikepushup',f:1.5}]},
  liftdl:{n:'Deadlift',kit:['barbell'],u:'reps',cat:'lift',alt:[{id:'dbdeadlift',f:2}]}};
const HYROX_ORDER=['skierg','sledpush','sledpull','bbj','row','farmers','sblunge','wallball'];
const HYROX_RACE={skierg:1000,sledpush:50,sledpull:50,bbj:80,row:1000,farmers:200,sblunge:100,wallball:100};
const moveOf=id=>MOVES[id]||null;
const kitList=()=>((S.profile&&Array.isArray(S.profile.kit)&&S.profile.kit.length)? S.profile.kit : ALL_KIT);
const kitOK=m=>!m||!m.kit||!m.kit.length||m.kit.some(k=>kitList().indexOf(k)>=0);
const sexKey=()=>((S.profile&&S.profile.sex==='f')||(typeof isTeen==='function'&&isTeen()))? 'f' : 'm';
function niceAmt(v,u){
  if(u==='m') return v>=200? Math.round(v/50)*50 : Math.max(10,Math.round(v/5)*5);
  if(u==='s') return Math.max(10,Math.round(v/5)*5);
  return Math.max(1,Math.round(v));
}
/* Readable text for a part of a session, structured or written by hand. */
function itemText(it){
  if(!it) return '';
  const m=it.move&&moveOf(it.move);
  if(!m) return it.label||'';
  const a=it.amt;
  const amount= m.u==='m'? (a>=1000&&a%1000===0? (a/1000)+'km' : a+'m') : (m.u==='cal'? a+' cal' : (m.u==='s'? a+' s' : String(a||'')));
  const lead= it.sets? it.sets+' × '+(a||'') : amount;
  const kg= it.kg? ' @ '+it.kg+'kg'+(m.each?' each':'') : '';
  if(it.t==='run'&&it.move==='run') return amount+' run';
  return (lead? lead+' ' : '')+m.n.toLowerCase().replace(/^./,ch=>ch.toUpperCase())+kg;
}
/* What to do when the kit is not there: the first stand in the person can
   do, with the amount converted, and a note saying what it stands in for. */
function fitItem(it){
  if(!it||!it.move) return it;
  const orig=it.origMove||it.move, om=moveOf(orig);
  if(!om) return it;
  if(kitOK(om)){
    if(it.origMove&&it.move!==it.origMove){ /* the kit is back: return to the real thing */
      Object.assign(it,{move:orig,amt:it.origAmt,kg:it.origKg,sub:it.origSub||''});
      delete it.origMove; delete it.origAmt; delete it.origKg; delete it.origSub; }
    return it;
  }
  const seen={};
  const walk=(id,f)=>{ if(seen[id]) return null; seen[id]=1; const m=moveOf(id);
    if(!m) return null; if(kitOK(m)) return {id,f};
    for(const a of (m.alt||[])){ const r=walk(a.id,f*a.f); if(r) return r; } return null; };
  let pick=null;
  for(const a of (om.alt||[])){ pick=walk(a.id,a.f); if(pick) break; }
  if(!pick) pick={id:'burpee',f:om.u==='m'? 0.1 : 1};
  const nm=moveOf(pick.id), base=it.origAmt!==undefined? it.origAmt : it.amt;
  if(it.origMove===undefined){ it.origMove=orig; it.origAmt=it.amt; it.origKg=it.kg; it.origSub=it.sub||''; }
  it.move=pick.id;
  it.amt=niceAmt((+base||nm.r||10)*pick.f,nm.u);
  it.kg=nm.kg? nm.kg[sexKey()] : null;
  it.sub='Standing in for '+om.n.toLowerCase()+', which needs '+(om.kit.map(k=>(KIT.find(x=>x.id===k)||{t:k}).t.toLowerCase()).join(' or '))+'.';
  return it;
}
/* a seeded random, so a week's sessions are the same every time it is drawn
   and different from the week before */
function seeded(seed){ let a=seed>>>0; return ()=>{ a=(a+0x6D2B79F5)>>>0; let t=a; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }
const weekIndex=()=>Math.floor(dateOf(mondayKey()).getTime()/(7*864e5));
const st=(move,amt,extra)=>Object.assign({t:move==='run'?'run':'station',move,amt,kg:(moveOf(move)&&moveOf(move).kg)? moveOf(move).kg[sexKey()] : null},extra||{});
/* ---- HYROX: compromised running, station strength, running engine, and a
   race simulation every fourth week. Amounts build across the four weeks:
   half, 60%, three quarters, then the full race. */
function hyroxSession(kind,w,k){
  const frac=[0.5,0.6,0.75,1][w%4], race=(id)=>niceAmt(HYROX_RACE[id]*frac,moveOf(id).u);
  if(kind==='sim'){
    const items=[]; HYROX_ORDER.forEach(id=>{ items.push(st('run',1000)); items.push(st(id,HYROX_RACE[id])); });
    return {name:'HYROX race simulation',sub:'8 x 1km and every station at race distance',mins:90,format:'fortime',items,
      why:'The whole race, in race order, at race distances. The time to beat for the next block.',
      warn:'Pace the first two runs. If a station falls apart, finish it at a lighter weight rather than stopping.'};
  }
  if(kind==='comp'){
    const start=(w*2+k*3)%8, ids=[0,1,2,3].map(n=>HYROX_ORDER[(start+n)%8]);
    const items=[]; ids.forEach(id=>{ items.push(st('run',1000)); items.push(st(id,race(id))); });
    return {name:'Compromised running',sub:ids.map(id=>moveOf(id).n).join(', '),mins:45,format:'fortime',items,
      why:'Run, then straight into a station, the way the race works. This week: '+Math.round(frac*100)+'% of race distance on each station.',
      warn:'Hold the same run pace each time. If it drops away, ease the station, not the running.'};
  }
  if(kind==='strength'){
    const push=(w+k)%2===0;
    const items= push? [st('sledpush',25,{kg:Math.round(moveOf('sledpush').kg[sexKey()]*1.1)}),st('wallball',20),st('sblunge',20)]
                     : [st('sledpull',25,{kg:Math.round(moveOf('sledpull').kg[sexKey()]*1.1)}),st('farmers',100),st('row',250)];
    return {name:push? 'Station strength: push' : 'Station strength: pull',sub:'4 rounds, a little heavier than race weight',mins:40,format:'fortime',rounds:4,items,
      why:'Heavier than race weight on the sled, so race weight feels manageable. Rest as long as you need between rounds.',
      warn:'Form over speed here. This is the strength day, not the race.'};
  }
  const reps=[5,6,6,4][w%4], dist=[1000,1000,800,1000][(w+k)%4];
  const items=Array.from({length:reps},()=>st('run',dist,{sub:'then 90 seconds easy'}));
  return {name:'Running engine',sub:reps+' x '+(dist>=1000?dist/1000+'km':dist+'m')+' at race pace',mins:40,format:'fortime',items,
    why:'Most of a HYROX is running. Race pace with short recoveries builds the engine the stations sit on.',
    warn:'Race pace, not flat out. You should be able to say a few words at the end of each one.'};
}
function hyroxWeek(n,w){
  const base=['comp','engine','strength','comp','engine','strength','comp'];
  const kinds=base.slice(0,Math.max(1,n));
  if(w%4===3) kinds[0]='sim';
  return kinds.map((kd,k)=>hyroxSession(kd,w,k));
}
/* ---- CrossFit: AMRAP, for time, EMOM, and a named benchmark each week, with
   a strength piece before the AMRAP and EMOM days. */
const CF_BENCH={
  cindy:{name:'Cindy',format:'amrap',mins:20,items:[['pullup',5],['pushup',10],['airsquat',15]]},
  fran:{name:'Fran',format:'fortime',mins:12,items:[['thruster',21],['pullup',21],['thruster',15],['pullup',15],['thruster',9],['pullup',9]]},
  helen:{name:'Helen',format:'fortime',rounds:3,mins:20,items:[['run',400],['kbswing',21],['pullup',12]]},
  grace:{name:'Grace',format:'fortime',mins:10,items:[['cleanjerk',30]]},
  annie:{name:'Annie',format:'fortime',mins:15,items:[['du',50],['situp',50],['du',40],['situp',40],['du',30],['situp',30],['du',20],['situp',20],['du',10],['situp',10]]},
  karen:{name:'Karen',format:'fortime',mins:15,items:[['wallball',150]]},
  jackie:{name:'Jackie',format:'fortime',mins:20,items:[['row',1000],['thruster',50,{kg:{m:20,f:15}}],['pullup',30]]},
  diane:{name:'Diane',format:'fortime',mins:15,items:[['deadlift',21],['pikepushup',21,{sub:'Handstand push-ups in the original; pike push-ups are the scaled version'}],['deadlift',15],['pikepushup',15],['deadlift',9],['pikepushup',9]]}};
const CF_BENCH_ORDER=['cindy','fran','helen','grace','annie','karen','jackie','diane'];
const CF_POOLS={bw:['pushup','airsquat','situp','burpee','lunge'],gym:['pullup','t2b','boxjump','du'],
  wl:['thruster','kbswing','deadlift','clean','wallball','pushpress'],mono:['rowcal','run','du']};
const CF_LIFTS=['backsquat','liftdl','strictpress','frontsquat','pushpress'];
function cfItem(id,amt,extra){
  const m=moveOf(id), kg=(extra&&extra.kg)? extra.kg[sexKey()] : (m.kg? (id==='wallball'? (sexKey()==='f'?6:9) : m.kg[sexKey()]) : null);
  return Object.assign({t:id==='run'?'run':'station',move:id,amt:amt||m.r||(m.u==='m'?(id==='run'||id==='runm'?400:20):10),kg},extra&&extra.sub? {sub:extra.sub} : {});
}
function crossfitSession(w,k){
  const r=seeded(w*977+k*131+7), pick=a=>a[Math.floor(r()*a.length)];
  const fmt=['amrap','fortime','emom','bench'][(w+k)%4];
  const lift=CF_LIFTS[(w+k)%CF_LIFTS.length];
  const strength=(fmt==='amrap'||fmt==='emom')? [{t:'lift',move:lift,sets:5,amt:[5,3,5,3,5][(w+k)%5],kg:null}] : [];
  if(fmt==='bench'){
    const b=CF_BENCH[CF_BENCH_ORDER[(w+k)%CF_BENCH_ORDER.length]];
    return {name:b.name,sub:'A CrossFit benchmark. Write the result down; it comes round again.',mins:b.mins,format:b.format,rounds:b.rounds||0,
      items:b.items.map(([id,a,ex])=>cfItem(id,a,ex)),strength:[],
      why:'Benchmarks are the same workout every time, so they show progress honestly. Scale the weight or reps so you can keep moving.',
      warn:'Shoulders are where CrossFit injuries tend to show up. If a press or a pull-up pinches, scale it or use "This one hurts".'};
  }
  const moves=[pick(CF_POOLS.wl),pick(CF_POOLS.gym),pick(CF_POOLS.bw.concat(CF_POOLS.mono))].filter((x,i,a)=>a.indexOf(x)===i);
  if(fmt==='amrap'){ const mins=[12,15,18,20][Math.floor(r()*4)];
    return {name:'AMRAP '+mins,sub:'As many rounds as possible in '+mins+' minutes',mins:mins+15,format:'amrap',amrapMins:mins,
      strength,items:moves.map(id=>cfItem(id)),
      why:'Steady from the first round. Count rounds as you go; the clock does the rest.',
      warn:'Scale anything you cannot do cleanly for the whole time.'}; }
  if(fmt==='emom'){ const mins=[10,12,14,16][Math.floor(r()*4)];
    return {name:'EMOM '+mins,sub:'Every minute on the minute, alternating',mins:mins+15,format:'emom',amrapMins:mins,
      strength,items:moves.slice(0,2).map(id=>cfItem(id,Math.max(1,Math.round((moveOf(id).r||10)*0.6)))),
      why:'Each minute, do the movement for that minute, then rest until the next one starts.',
      warn:'If you are not finishing with at least 15 seconds to spare, take reps off.'}; }
  const rounds=[3,4,5][Math.floor(r()*3)];
  return {name:rounds+' rounds for time',sub:moves.map(id=>moveOf(id).n).join(', '),mins:rounds*6+10,format:'fortime',rounds,
    strength:[],items:moves.map(id=>cfItem(id)),
    why:'Move steadily rather than sprinting the first round.',warn:'Scale the weight before you slow to a crawl.'};
}
function crossfitWeek(n,w){ return Array.from({length:Math.max(1,n)},(_,k)=>crossfitSession(w,k)); }
/* The week's sessions for the chosen style. Generated once per week, then
   kept, so edits stick; a change of kit refits them in place. */
function sessionsWanted(){ const {lift,cardio}=dayCounts(); return Math.max(1,Math.min(7,lift+cardio)); }
function ensureStyleWeek(){
  const style=styleOf(); if(!circStyle(style)) return [];
  S.circuits=Array.isArray(S.circuits)? S.circuits : [];
  const wk=mondayKey(), n=sessionsWanted(), key=wk+'|'+style+'|'+n+(style==='hybrid'? '|h'+hyroxDaysOf(n) : '');
  if(S.styleWeek&&S.styleWeek.key===key&&S.styleWeek.ids.every(id=>S.circuits.some(c=>c.id===id))){
    S.styleWeek.ids.forEach(id=>{ const c=S.circuits.find(x=>x.id===id); (c.items||[]).concat(c.strength||[]).forEach(fitItem); });
    return S.styleWeek.ids;
  }
  const w=weekIndex();
  let list;
  if(style==='hyrox') list=hyroxWeek(n,w);
  else if(style==='crossfit') list=crossfitWeek(n,w);
  else {
    /* the chosen split, spread so the two kinds alternate as far as they can */
    const h=hyroxDaysOf(n), hw=hyroxWeek(h,w), cw=crossfitWeek(n-h,w);
    list=[]; let a=0,b=0;
    for(let k=0;k<n;k++){ const wantH= a<hw.length&&(b>=cw.length||a/Math.max(1,h)<=b/Math.max(1,n-h)); list.push(wantH? hw[a++] : cw[b++]); }
  }
  const used=new Set((S.workouts||[]).map(x=>x.circuitId));
  S.circuits=S.circuits.filter(c=>!c.gen||used.has(c.id));
  const ids=list.map((c,i)=>{ const id='g'+wk.replace(/-/g,'')+'_'+style.slice(0,2)+i;
    const full=Object.assign({id,gen:true,weekOf:wk,forTime:true,style},c);
    (full.items||[]).concat(full.strength||[]).forEach(fitItem);
    S.circuits=S.circuits.filter(x=>x.id!==id); S.circuits.push(full); return id; });
  S.styleWeek={key,weekOf:wk,ids};
  return ids;
}
function splitFit(id,days){
  const s=SPLITS[id]; if(!s||!s.best) return '';
  /* said plainly, as for body part: fewer than six days means once a week */
  if(id==='ppl'&&days<6) return 'At '+days+' day'+(days===1?'':'s')+' each muscle is trained once a week, which works when each session has enough sets. At 6 days it goes round twice.';
  if(s.best.indexOf(days)>=0) return 'A good fit for '+days+' day'+(days===1?'':'s')+'.';
  if(id==='bro'&&days<5) return 'Best with 5 days. With '+days+', each muscle comes round less than once a week, so weekly work per muscle drops.';
  if(id==='full'&&days>=5) return 'Works, but '+days+' full sessions a week is a lot of recovery to ask for.';
  return 'Works with '+days+' days; it simply rolls on through the week.';
}
const CARDIO_BY_AIM={endure:['r_easy','r_intervals','r_easy','r_long'],
  lose:['r_easy','walk','r_easy','walk'], build:['walk','r_easy','walk','r_easy'], strong:['walk','r_easy','walk','r_easy'],
  hold:['r_easy','walk','r_easy','walk'], eat:['walk','r_easy','walk','r_easy']};
function dayCounts(){
  const p=S.profile, d=AIM_DEFAULTS[p.aim]||AIM_DEFAULTS.lose;
  const lift=p.liftDays===undefined||p.liftDays===null? d.lift : p.liftDays;
  const cardio=p.cardioDays===undefined||p.cardioDays===null? d.cardio : p.cardioDays;
  return {lift:Math.max(0,Math.min(6,lift)), cardio:Math.max(0,Math.min(6,cardio))};
}
/* Interleave lifting and cardio so two hard days do not sit on top of each other,
   then fill what is left with rest, or cooking if that is the aim. */
function weekPattern(){
  const {lift,cardio}=dayCounts();
  if(styleOf()==='hifb') return hifbPattern();
  if(circStyle(styleOf())){
    /* HYROX, CrossFit or both: every training day is one of this week's
       sessions, spread across the week rather than bunched together */
    const ids=ensureStyleWeek(), out=Array(7).fill(S.profile.aim==='eat'? 'cook':'rest');
    ids.forEach((id,j)=>{ let pos=Math.min(6,Math.round(j*7/ids.length)); while(out[pos]!=='rest'&&out[pos]!=='cook'&&pos<6) pos++; out[pos]=id; });
    return out;
  }
  const slots=[0,1,2,3,4,5,6];
  const LO=liftOrder();
  const lifts=Array.from({length:Math.min(lift,slots.length)},(_,n)=>LO.order[(n+LO.offset)%LO.order.length]);
  const cardios=Array.from({length:Math.min(cardio,Math.max(0,slots.length-lifts.length))},
    (_,n)=>(CARDIO_BY_AIM[S.profile.aim]||CARDIO_BY_AIM.lose)[n%4]);
  const mixed=[];
  const big=lifts.length>=cardios.length? lifts : cardios;
  const small=lifts.length>=cardios.length? cardios : lifts;
  const gap=small.length? Math.max(1,Math.round(big.length/small.length)) : 0;
  let si=0;
  big.forEach((x,n)=>{ mixed.push(x); if(si<small.length&&gap&&((n+1)%gap===0)) mixed.push(small[si++]); });
  while(si<small.length) mixed.push(small[si++]);
  const filler=S.profile.aim==='eat'? 'cook':'rest';
  while(mixed.length<slots.length) mixed.push(filler);
  return mixed.slice(0,7);
}
/* ---------- easy weeks ----------
   What the evidence actually says, which is less than the fitness industry
   implies and is written into the sheet the user sees:
   - Planned deloads usually sit every 4 to 8 weeks and last about a week (Bell,
     Darragh, Travis, Rogerson and Nolan, Strength and Conditioning Journal,
     2025).
   - In a survey of 246 competitive strength and physique athletes the typical
     gap was 5.6 weeks, give or take 2.3, lasting 6.4 days (Rogerson and
     colleagues, Sports Medicine Open, 2024).
   - A week off at the midpoint of a 9-week block made no difference to muscle
     growth, but the group that trained straight through gained a little more
     strength (Coleman and colleagues, PeerJ, 2024). That was a week of no
     training at all, not a lighter one, and the same researchers describe a
     planned deload as a checkpoint rather than a compulsion.
   So: six weeks by default, the middle of the range and closest to what people
   who lift for sport actually do. Every week is the user's to change: they can
   move the cadence, switch it off, skip a scheduled one, or add one to any week.
   The week counts from the last easy week, so an added one resets the clock and
   a skipped one starts it again.

   How an easy week is built, from the same 2025 recommendations: one step down
   at the start of the week, the same days and the same exercises, about 10%
   lighter on the bar, and less total work. How much less depends on how
   recovered the person says they are:
     low recovery needs       25 to 45% less volume
     moderate                 40 to 60% less
     high                     60 to 90% less, and accessories come out

   And the rule the user asked for explicitly: an easy week never sets the next
   week's weights. Those sessions are kept on the record, marked, and skipped by
   everything that works out what to lift next, so the week after picks up
   exactly where the week before the deload left off. */
const DELOAD_EVERY=6;
/* This block runs during boot, before the forecast script that defines
   addDays() has loaded, so it carries its own. */
const plusDays=(k,n)=>{ const d=dateOf(k); d.setDate(d.getDate()+n); return keyOf(d); };
const DELOAD_RANGE=[4,5,6,7,8];
const DELOAD_TIERS={
  low:     {id:'low',      t:'Light',    band:'25 to 45%', load:0.10, sets:n=>Math.max(1,n-1),              reps:'mid'},
  moderate:{id:'moderate', t:'Moderate', band:'40 to 60%', load:0.10, sets:n=>Math.max(1,n-1),              reps:'bottom'},
  high:    {id:'high',     t:'Deep',     band:'60 to 90%', load:0.10, sets:n=>Math.max(1,Math.round(n*0.4)), reps:'bottom', dropAccessories:true}
};
function weeksTraining(){
  const first=S.profile.firstWeek;
  if(!first) return 0;
  return Math.max(0,Math.round((dateOf(mondayKey())-dateOf(first))/(7*864e5)));
}
const deloadMarks=()=>(S.deloadWeeks&&typeof S.deloadWeeks==='object')? S.deloadWeeks : {};
const weeksApart=(a,b)=>Math.round((dateOf(b)-dateOf(a))/(7*864e5));
/* Walk the calendar a week at a time from the start, applying the cadence and
   the user's own changes, so a week that went by without the app being opened
   is still counted the same way. Returns one entry per week from the start to
   `ahead` weeks past this one. */
function deloadSchedule(ahead){
  const every=+S.profile.deloadEvery||DELOAD_EVERY, auto=S.profile.deload!==false;
  const marks=deloadMarks(), cur=mondayKey();
  const firsts=[S.profile.firstWeek].concat(Object.keys(marks)).filter(Boolean).sort();
  const origin=firsts.length? firsts[0] : cur;
  let anchor=plusDays(origin,-7);
  const out=[], end=plusDays(cur,7*(ahead||0));
  for(let wk=origin, guard=0; wk<=end && guard<600; wk=plusDays(wk,7), guard++){
    const m=marks[wk];
    let kind='work', why='';
    if(m==='added'){ kind='deload'; why='added'; anchor=wk; }
    else if(m==='skipped'){ kind='work'; why='skipped'; anchor=wk; }
    else if(auto && S.profile.firstWeek && wk>=S.profile.firstWeek && weeksApart(anchor,wk)>=every){
      kind='deload'; why='scheduled'; anchor=wk; }
    out.push({wk,kind,why,n:weeksApart(anchor,wk)});
  }
  return out;
}
function deloadInfo(wk){
  const k=wk||mondayKey();
  const row=deloadSchedule(Math.max(0,weeksApart(mondayKey(),k))).find(r=>r.wk===k);
  return row||{wk:k,kind:'work',why:'',n:0};
}
function deloadDue(wk){ return deloadInfo(wk).kind==='deload'; }
function nextDeload(){
  const ahead=deloadSchedule(12).filter(r=>r.wk>mondayKey()&&r.kind==='deload');
  return ahead.length? ahead[0].wk : null;
}
function setDeloadMark(wk,mark){
  S.deloadWeeks=Object.assign({},deloadMarks());
  if(mark) S.deloadWeeks[wk]=mark; else delete S.deloadWeeks[wk];
  save();
}
/* How deep this one goes: what the user picked, or what their last check in
   says about recovery. */
function deloadTier(){
  const pick=S.profile.deloadDepth;
  if(pick&&DELOAD_TIERS[pick]) return DELOAD_TIERS[pick];
  const c=S.checkins&&S.checkins[0];
  if(c&&typeof c.recovery==='number'){
    if(c.recovery>=7) return DELOAD_TIERS.low;
    if(c.recovery<=3) return DELOAD_TIERS.high;
  }
  return DELOAD_TIERS.moderate;
}
/* The weights to lift. Built from the last WORKING session only, so it is 10%
   under what they were actually lifting, not 10% under last week's easy week. */
function deloadPrescription(exId,row,tier){
  const T=tier||deloadTier(), range=repRangeFor(row);
  const normalSets=row.sets||3;
  const mid=Math.round((range.bottom+range.top)/2);
  const sets=T.sets(normalSets);
  const reps=T.reps==='bottom'? range.bottom : mid;
  const hist=exHistory(exId);
  const last=hist[0];
  const working=last&&last.sets? last.sets.filter(s2=>!s2.warm&&+s2.kg>0) : [];
  const work=working.length? Math.max(...working.map(s2=>+s2.kg)) : null;
  /* Round to the nearest weight that can actually be loaded, not down to the
     progression step. Rounding down to a 5kg squat step turned "10% lighter"
     into anything up to 15%. */
  const eq=exOf(exId).eq;
  const step={barbell:2.5,dumbbell:2,kettlebell:4,machine:2.5,cable:2.5}[eq]||2.5;
  let kg=null;
  if(work){
    kg=Math.round((work*(1-T.load))/step)*step;
    if(kg>=work) kg=work-step;
    kg=+kg.toFixed(2);
    if(eq==='barbell'&&kg<BAR_KG) kg=Math.min(work,BAR_KG);
    if(kg<=0) kg=null;
  }
  const cut=Math.max(0,Math.round((1-(sets*reps)/(normalSets*mid))*100));
  return {sets,reps,kg,work,cut,tier:T.id,
    why: work
      ? `${sets} × ${reps} at ${kg}kg. Your working weight is ${work}kg and it will be there next week.`
      : `${sets} × ${reps}, and keep it comfortably short of hard. Nothing logged yet to take 10% off.`};
}
function composePlan(c,swaps){
  const pattern=weekPattern();
  if(swaps) Object.keys(swaps).forEach(i=>{ pattern[+i]=swaps[i]; });
  const ci=Math.min(6,Math.max(0,S.profile.checkinDay===undefined?6:S.profile.checkinDay));
  const days=pattern.map((code,i)=>Object.assign(slotFor(code),{dow:i,checkin:i===ci}));
  const why=adaptPlan(days,c);
  return {weekOf:mondayKey(), at:Date.now(), days, why};
}
function previewPlan(c){ return composePlan(c); }
function planDiff(a,b){
  const out=[];
  b.days.forEach((d,i)=>{
    const was=a&&a.days[i];
    if(!was) return;
    if(was.label!==d.label) out.push(`${DAYS[i]}: ${dayLabel(was)} becomes ${dayLabel(d)}`);
    else if(was.setDelta!==d.setDelta && d.setDelta) out.push(`${DAYS[i]}: ${dayLabel(d)}, one set lighter`);
  });
  return out;
}
function buildPlan(swaps){
  S.plan=composePlan(S.checkins[0],swaps);
  const training=S.plan.days.filter(d=>d.type&&d.slot!=='walk').length;
  S.goal={kind:'any',target:training,unit:'sessions',label:'Move '+training+' times',now:S.goal?S.goal.now:0};
  if(S.target&&!S.target.hit){ const pr=targetProgress(); if(pr&&pr.hit) S.target.hit=todayKey(); }
  /* maintenance moves from estimated to measured to observed as data arrives,
     and a met target returns the calories to maintenance */
  if(typeof ownTargets==='function') S.targets=ownTargets();
  return S.plan;
}
function adaptPlan(days,c){
  const why=[], sleep=avg7('sleep',{real:true}), steps=avg7('steps',{real:true});
  let easier=false;
  if(c && c.recovery<=5){ easier=true;
    why.push(`Recovery came in at <b>${c.recovery} out of 10</b> on Sunday, so a set comes off every lift this week.`); }
  if(sleep!==null && sleep<6.5){ easier=true;
    why.push(`Sleep averaged <b>${sleep.toFixed(1)} hours</b>, so this week is lighter than last. Volume goes back up when sleep does.`); }
  if(easier) days.forEach(d=>{ if(d.templateId) d.setDelta=-1; });
  if(c && c.recovery<=4){
    const last=[...days].reverse().find(d=>d.templateId);
    if(last){ const idx=days.indexOf(last); days[idx]=Object.assign(slotFor('walk'),{dow:idx});
      why.push('The last lifting day drops to a walk. You can put it back in the plan if you feel fine by then.'); }
  }
  if(c && c.pain && c.pain.length){
    days.forEach(d=>{ if(d.templateId) d.exclude=c.pain.slice(); });
    const subs=c.pain.map(n=>{ const alt=painAlternative(n); return alt? n+' for now, '+alt.n+' instead' : n; });
    why.push(`<b>${c.pain.join(', ')}</b> stays out of every session until you say otherwise.`
      +(subs.some(s=>/instead/.test(s))? ' Suggested stand ins: '+subs.filter(s=>/instead/.test(s)).join('; ')+'.' : ''));
  }
  if(c && typeof c.proteinHit==='number' && c.proteinHit<=4){
    const h=(typeof currentHabit==='function')&&currentHabit();
    why.push(h
      ? `Protein came in well under target. Your habit stays as it is: <b>${escHabit(habitOf(h.id).t.toLowerCase())}</b>, and nothing else added on top of it.`
      : 'Protein came in well under target, so there is one food habit this week and nothing else. Pick it on Today.');
  }
  if(steps!==null && steps<5000 && !days.some(d=>d.slot==='walk'))
    why.push('Steps have been low, so a walk is in the week.');
  if(typeof deloadDue==='function' && deloadDue()){
    const info=deloadInfo(), T=deloadTier();
    /* the reactive lighter week does not stack on top of a planned one */
    days.forEach(d=>{ if(d.templateId){ d.deload=T.id; d.setDelta=0; } });
    const c0=S.checkins&&S.checkins[0];
    const flying=c0&&c0.recovery>=8&&c0.motivation>=7&&info.why==='scheduled';
    why.unshift(`<b>${info.why==='added'?'Easy week, because you asked for one.':'Planned easy week.'}</b> `
      +`Same days, same movements, about 10% lighter and ${T.band} less work. `
      +`Next week picks up from the weights you were lifting before this one, not from these.`
      +(flying? ` Your last check in says you are recovering well, so skipping this one is a fair call. It is on Plan.` : ''));
  }
  if(!why.length) why.push('Nothing flagged last week, so this is last week again, with a little more weight where you earned it.');
  return why;
}
/* Something that trains the same body part without repeating the pattern that
   was hurting. A suggestion for the person to accept, never an automatic swap:
   what aggravates a joint is not a thing an app can work out. */
function painAlternative(name){
  if(typeof LIBRARY==='undefined') return null;
  const hurt=LIBRARY.find(x=>x.n===name); if(!hurt) return null;
  const pool=LIBRARY.filter(x=>x.g===hurt.g&&x.p!==hurt.p&&(typeof hasKit!=='function'||hasKit(x.eq))
    &&(x.d||1)<=(hurt.d||2));
  return pool.sort((a,b)=>(a.d||1)-(b.d||1))[0]||null;
}
/* How long a movement has been out, so the app can ask rather than forget. */
function painSince(name){
  for(let i=0;i<S.checkins.length;i++){
    const c=S.checkins[i];
    if(!c.pain||c.pain.indexOf(name)<0) return i? S.checkins[i-1].at : null;
  }
  return S.checkins.length? S.checkins[S.checkins.length-1].at : null;
}
function painToReview(){
  const c=S.checkins[0];
  if(!c||!c.pain||!c.pain.length) return [];
  const asked=c.painAsked||0;
  if(Date.now()-asked < 7*864e5) return [];
  return c.pain.filter(n=>{ const since=painSince(n);
    return since && (Date.now()-since)>=13*864e5; });
}
function clearPain(name){
  const c=S.checkins[0]; if(!c||!c.pain) return;
  c.pain=c.pain.filter(x=>x!==name);
  buildPlan(); save(); renderAll();
}
function ensurePlan(){
  if(!S.plan || S.plan.weekOf!==mondayKey() || (S.checkins[0] && S.checkins[0].at>S.plan.at)) buildPlan();
  /* Migration only: older saves gave the check in a day of its own, and this
     converts them. Nothing built today can produce a checkin slot, so no other
     code needs to handle one. */
  const ci=S.profile.checkinDay===undefined?6:S.profile.checkinDay;
  if(S.plan.days.some(d=>d.slot==='checkin')){
    S.plan.days=S.plan.days.map((d,i)=>d.slot==='checkin'? Object.assign(slotFor('rest'),{dow:i}) : d);
  }
  S.plan.days.forEach((d,i)=>{ d.checkin=(i===ci); });
  return S.plan;
}
function dayLabel(d){
  if(!d) return '';
  if(d.templateId){ const t=(S.templates||[]).find(x=>x.id===d.templateId); if(t) return t.name+' day'; }
  if(d.runId&&typeof runPlan==='function'){ const r=runPlan(d.runId); if(r) return r.name; }
  if(d.circuitId&&typeof circuitOf==='function'){ const c=circuitOf(d.circuitId); if(c) return c.name; }
  return d.label;
}
function daySub(d){
  if(d.templateId){ const t=(S.templates||[]).find(x=>x.id===d.templateId); if(t) return t.ex.length+' movements'; }
  if(d.runId&&typeof runPlan==='function'){ const r=runPlan(d.runId); if(r) return r.sub; }
  if(d.circuitId&&typeof circuitOf==='function'){ const c=circuitOf(d.circuitId); if(c) return c.sub; }
  return d.sub||'';
}
const todayPlan=()=>{ ensurePlan(); return S.plan.days[dowIdx()]; };
function weekStats(){
  const planned=S.plan? S.plan.days.filter(d=>d.type&&d.slot!=='walk').length : 0;
  const done=S.week.filter(d=>d.done.length).length;
  const lifted=S.workouts? S.workouts.filter(w=>w.d>=mondayKey()).length : 0;
  const vol=S.workouts? S.workouts.filter(w=>w.d>=mondayKey()).reduce((a,w)=>a+w.volume,0) : 0;
  /* This is the WEEK's change. It used to be every kilo since the first ever
     weigh in, rendered beside five genuinely weekly figures. */
  const monday=mondayKey();
  const w=S.weights.filter(x=>x.d>=monday);
  const before=S.weights.filter(x=>x.d<monday).slice(-1)[0];
  const wChange = (w.length&&before)? +(w[w.length-1].kg-before.kg).toFixed(1)
    : (w.length>1? +(w[w.length-1].kg-w[0].kg).toFixed(1) : null);
  return {planned,done,lifted,vol,steps:avg7('steps'),sleep:avg7('sleep'),wb:avg7('wb'),
    protein:avg7('protein'),weighIns:w.length,wChange};
}
/* Pushing a day along. The week absorbs it at the first rest day rather than
   shunting everything into next week: if Thursday is a rest day and you skip
   Tuesday, Tuesday lands on Wednesday, Wednesday lands on Thursday, and nothing
   past that needs to move. If there is no rest day left, the last session in the
   week drops out and the app says so rather than quietly losing it. */
function nextSlots(i){
  const out=[];
  for(let k=i+1;k<7;k++) out.push(k);
  return out;
}
function absorberFor(i){
  const after=nextSlots(i);
  for(const k of after){ const d=S.plan.days[k]; if(d.slot==='rest') return k; }
  return after.length? after[after.length-1] : null;
}
function pushPlanDay(i){
  ensurePlan();
  const moved=dayLabel(S.plan.days[i]);
  const absorb=absorberFor(i);
  if(absorb===null){ S.plan.days[i]=Object.assign(slotFor('rest'),{dow:i}); save(); renderAll();
    return {ok:true,moved,dropped:moved,absorbed:null}; }
  const chain=nextSlots(i).filter(k=>k<=absorb);
  const dropped = S.plan.days[absorb].slot==='rest'? null : dayLabel(S.plan.days[absorb]);
  const flags=S.plan.days.map(d=>!!d.checkin);
  for(let n=chain.length-1;n>0;n--) S.plan.days[chain[n]]=Object.assign({},S.plan.days[chain[n-1]],{dow:chain[n]});
  S.plan.days[chain[0]]=Object.assign({},S.plan.days[i],{dow:chain[0]});
  S.plan.days[i]=Object.assign(slotFor('rest'),{dow:i});
  S.plan.days.forEach((d,n)=>{ d.checkin=flags[n]; });
  S.goal.target=S.plan.days.filter(d=>d.type&&d.slot!=='walk').length;
  S.goal.label='Move '+S.goal.target+' times';
  save(); renderAll();
  return {ok:true,moved,to:chain[0],dropped,absorbed:absorb};
}
function dropPlanDay(i){
  ensurePlan();
  const dropped=dayLabel(S.plan.days[i]);
  const wasCheckin=!!S.plan.days[i].checkin;
  S.plan.days[i]=Object.assign(slotFor('rest'),{dow:i,checkin:wasCheckin});
  S.goal.target=S.plan.days.filter(d=>d.type&&d.slot!=='walk').length;
  S.goal.label='Move '+S.goal.target+' times';
  save(); renderAll();
  return {ok:true,dropped};
}
function openRestChoice(i){
  const d=S.plan.days[i];
  document.getElementById('altTitle').textContent='Taking '+DAYS[i]+' off';
  document.getElementById('altSub').textContent=dayLabel(d)+' is on for that day. What do you want done with it?';
  const absorb=absorberFor(i);
  const landing=absorb===null? null : nextSlots(i)[0];
  document.getElementById('altBody').innerHTML=`
    <button class="logrow" data-restchoice="push:${i}"><div class="txt"><div class="t">Push it to ${landing!==null?DAYS[landing]:'the next day'}</div>
      <div class="s">${landing!==null? 'Everything after it shifts along too'+(absorb!==null&&S.plan.days[absorb].slot==='rest'?', and the week soaks it up at '+DAYS[absorb]:'')
        : 'Nothing left in the week to move it to'}</div></div></button>
    <button class="logrow" data-restchoice="drop:${i}"><div class="txt"><div class="t">Drop it this week</div>
      <div class="s">Rest day instead. It comes back next week</div></div></button>
    <button class="logrow" data-restchoice="keep:${i}"><div class="txt"><div class="t">Leave it where it is</div></div></button>`;
  openSheet('altSheet');
}
document.addEventListener('click',e=>{
  const rc=e.target.closest('[data-restchoice]'); if(!rc) return;
  const [mode,iRaw]=rc.dataset.restchoice.split(':'); const i=+iRaw;
  closeSheets();
  if(mode==='keep') return;
  const before=snapshotPlan();
  if(mode==='drop'){ const r=dropPlanDay(i);
    toast(r.dropped+' dropped for this week','Undo',()=>restorePlan(before,r.dropped+' put back')); return; }
  const r=pushPlanDay(i);
  const msg = (!r.to&&r.dropped)? 'Nothing left to move it to, so '+r.dropped+' comes off this week'
    : r.moved+' moved to '+DAYS[r.to]+(r.dropped? ', and '+r.dropped+' came off the end':'');
  toast(msg,'Undo',()=>restorePlan(before,'Week put back as it was'));
});

/* Undo needs the thing as it was, not a description of it. */
function snapshotPlan(){ return JSON.parse(JSON.stringify({plan:S.plan,goal:S.goal})); }
function restorePlan(snap,msg){
  S.plan=snap.plan; S.goal=snap.goal; save(); renderAll(); if(msg) toast(msg);
}
function startPlanDay(day){
  if(!day) return null;
  if(day.templateId) return startWorkout(day.templateId,{exclude:day.exclude,setDelta:day.setDelta,deload:day.deload});
  if(day.circuitId&&typeof startCircuit==='function') return startCircuit(day.circuitId);
  if(day.runId){ const sess=runSession(day.runId); if(sess) return startSession(sess); }
  if(day.slot==='rest'){ toast('Rest is part of it. Nothing owed today.'); return null; }
  const seed=SEED_POSTS.find(p=>p.kind===day.type);
  if(seed) return startSession(Object.assign({},seed.session,{title:day.label}));
  return null;
}

