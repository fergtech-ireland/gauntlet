/* =====================================================================
   Gauntlet. Home answers one question: what am I doing today, and why.
   The plan is built from your aim and rebuilt from your check ins, so
   the answer changes when you do.
   ===================================================================== */
const HUE={run:{deep:'#1e3a6e',tint:'#eaeef6'},workout:{deep:'#6e1f2e',tint:'#f7ecee'},
  fast:{deep:'#1b4a3c',tint:'#e9f1ee'},meal:{deep:'#a8552a',tint:'#f8efe7'},any:{deep:'#161618',tint:'#efefef'},
  walk:{deep:'#1e3a6e',tint:'#eaeef6'},rest:{deep:'#9a9a9f',tint:'#efefef'},checkin:{deep:'#dfa33c',tint:'#fbf3e4'}};
const MARIGOLD='#dfa33c', CLAY='#eadfcb', STORE_KEY='gauntlet.v4', APP_VERSION='51';
const VERB={run:'Run it',meal:'Cook it',workout:'Start it',fast:'Start the clock'};
const DAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

/* ---------- habits ----------
   Up to three habits at once (it was one to start and one to stop). The plan used to promise "one food
   habit this week and nothing else" and then track nothing; the first version
   of this fixed that with a single habit. People also want to stop things, so
   there is now one slot for each, and still no more than that: doing one thing
   until it is boring beats doing five badly.
   A habit to stop is ticked the same way as one to start. A tick means the day
   went the way you wanted, which for a stop habit means you went without.
   Some only apply on certain days, like "no alcohol on weeknights". Those skip
   the days that do not count, so a weekend never breaks a streak.
   For expectations: in the best-known study, a new habit took a median of 66
   days to become automatic, anywhere from 18 to 254, and missing a single day
   did not undo it (Lally and colleagues, 2010). */
const HABITS=[
  {id:'protein_am', kind:'start', t:'Protein at breakfast', s:'Thirty grams before you leave the house', tag:'food'},
  {id:'veg_lunch',  kind:'start', t:'Something green at lunch', s:'Any vegetable, any amount', tag:'food'},
  {id:'water_am',   kind:'start', t:'A pint of water on waking', s:'Before the coffee', tag:'food'},
  {id:'lunch_prep', kind:'start', t:"Make tomorrow's lunch tonight", s:'So the easy option is the one you made', tag:'food'},
  {id:'walk_after', kind:'start', t:'Ten minutes after dinner', s:'Out the door, around the block', tag:'move'},
  {id:'stairs',     kind:'start', t:'Stairs, not the lift', s:'Every time, no negotiating', tag:'move'},
  {id:'stretch',    kind:'start', t:'Five minutes of stretching', s:'Any time, any five minutes', tag:'move'},
  {id:'phone_out',  kind:'start', t:'Phone out of the bedroom', s:'Charges somewhere else', tag:'sleep'},
  {id:'lights_out', kind:'start', t:'Same lights out time', s:'Within half an hour of it, anyway', tag:'sleep'},
  {id:'no_screen',  kind:'start', t:'No screen for the last half hour', s:'A book, a shower, anything else', tag:'sleep'},
  {id:'daylight',   kind:'start', t:'Ten minutes of daylight before noon', s:'Outside, not through a window', tag:'sleep'},
  {id:'breathe',    kind:'start', t:'Two minutes of slow breathing', s:'In for four, out for six', tag:'mind'},

  {id:'no_sugary_drinks', kind:'stop', t:'No sugary drinks', s:'Water, tea, coffee and sugar-free drinks are all fine', tag:'food'},
  {id:'no_takeaway_wk',   kind:'stop', t:'No takeaway on weeknights', s:'Monday to Thursday. Weekends are yours', tag:'food', days:[1,2,3,4]},
  {id:'no_alcohol_wk',    kind:'stop', t:'No alcohol on weeknights', s:'Monday to Thursday', tag:'food', days:[1,2,3,4]},
  {id:'no_caffeine_pm',   kind:'stop', t:'No caffeine after 2pm', s:'Coffee, tea, energy drinks and colas before 2 only', tag:'sleep'},
  {id:'no_snooze',        kind:'stop', t:'No snooze button', s:'Putting the alarm across the room helps', tag:'sleep'},
  {id:'no_phone_am',      kind:'stop', t:'No phone for the first 30 minutes', s:'Up, water, then the phone', tag:'mind'},
  {id:'no_screens_meals', kind:'stop', t:'No screens at meals', s:'Phone face down, or in another room', tag:'mind'},
  {id:'no_smoking',       kind:'stop', t:'Stop smoking or vaping', s:'Quitting with support works better than going it alone: quit.ie in Ireland, or your GP or pharmacist', tag:'health'}
];
const HABIT_TAGS={food:'Eating and drinking',move:'Moving',sleep:'Sleep',mind:'Headspace',health:'Health',own:'Your own'};
/* Whatever someone personally wants to start or stop. Kept as they wrote it,
   shown escaped, and never judged: it is their habit. */
const OWN_MAX=60;
const ownHabits=()=>Array.isArray(S.customHabits)? S.customHabits : [];
const escHabit=t=>String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function addOwnHabit(kind,text){
  const t=String(text||'').replace(/\s+/g,' ').trim();
  if(!t) return {error:'Write the habit first.'};
  if(t.length>OWN_MAX) return {error:'Keep it under '+OWN_MAX+' characters.'};
  const k= kind==='stop'? 'stop' : 'start';
  const dup=ownHabits().find(h=>h.kind===k&&h.t.toLowerCase()===t.toLowerCase());
  if(dup) return {habit:dup};
  const h={id:'own_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),kind:k,t,s:'Your own',tag:'own'};
  /* The twenty most recent are kept, so the list stays usable, but never at
     the cost of one someone is tracking right now. Trimming by age alone used
     to drop an active habit and wipe it from Today. */
  const all=ownHabits().concat([h]);
  const inUse=new Set(['start','stop'].map(k=>S.habits&&S.habits[k]&&S.habits[k].id).filter(Boolean));
  const keep=all.filter(x=>inUse.has(x.id));
  const rest=all.filter(x=>!inUse.has(x.id)).slice(-(20-keep.length));
  S.customHabits=all.filter(x=>keep.includes(x)||rest.includes(x));
  save(); return {habit:h};
}
const DAY_NAMES=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
/* The habit row is drawn during startup, before the script that defines
   addDays() has loaded. Using addDays here threw on every open for anyone with
   a habit, and stopped the rest of startup running. This helper exists from
   the first line. */
const habitDay=(k,n)=>{ const d=dateOf(k); d.setDate(d.getDate()+n); return keyOf(d); };
const habitOf=id=>HABITS.find(h=>h.id===id)||ownHabits().find(h=>h.id===id)||null;
function habitSlots(){ if(!S.habits||typeof S.habits!=='object') S.habits={}; return S.habits; }
const currentHabit=slot=>{ const h=habitSlots()[slot||'start']; return h&&h.id&&!h.retired&&habitOf(h.id)? h : null; };
/* ---------- how many habits at once ----------
   One at a time was a deliberate choice and the evidence behind it is real:
   a habit takes a median of 66 days to become automatic (Lally, 2010), and
   spreading attention thin is how people end up keeping none of them. But the
   app gave no way to say "I already have that one, I want another", which read
   as a missing feature rather than a decision.
   So: three at once, no more, with the third one warned about rather than
   blocked, and the count always on screen. Slots are named so old saves keep
   working: start and stop as before, plus extra ones. */
const HABIT_MAX=3;
const HABIT_SLOTS=['start','stop','extra1','extra2'];
function activeHabits(){
  const h=habitSlots();
  return HABIT_SLOTS.map(slot=>{ const x=h[slot];
    return (x&&x.id&&!x.retired&&habitOf(x.id))? Object.assign({slot},x) : null; }).filter(Boolean);
}
const habitCount=()=>activeHabits().length;
const habitRoom=()=>Math.max(0,HABIT_MAX-habitCount());
/* Where a new one goes: its own kind if that is free, otherwise the first
   spare slot, otherwise it replaces the one of the same kind. */
function slotForNew(kind){
  const h=habitSlots();
  const free=s=>!(h[s]&&h[s].id&&!h[s].retired&&habitOf(h[s].id));
  if(free(kind)) return kind;
  if(habitCount()<HABIT_MAX){ const spare=['extra1','extra2'].find(free); if(spare) return spare; }
  return kind;
}
function startHabit(id,slot){
  const m=habitOf(id); if(!m) return null;
  const put=slot||slotForNew(m.kind);
  habitSlots()[put]={id,started:todayKey(),days:{},retired:false,kind:m.kind};
  save(); return habitSlots()[put];
}
function habitSlotOf(id){
  const h=habitSlots();
  return HABIT_SLOTS.find(s=>h[s]&&h[s].id===id&&!h[s].retired)||null;
}
function retireHabit(slot){ const h=habitSlots()[slot||'start']; if(h) h.retired=true; save(); }
/* does this habit count on this day? */
function habitApplies(meta,k){ return !meta||!meta.days||meta.days.indexOf(dateOf(k).getDay())>=0; }
function toggleHabitDay(k,slot){
  const h=currentHabit(slot); if(!h) return;
  if(!habitApplies(habitOf(h.id),k)) return;
  h.days=h.days||{};
  if(h.days[k]) delete h.days[k]; else h.days[k]=true;
  save();
}
/* Seven dots, oldest on the left, today on the right. */
function habitWeek(slot){
  const h=currentHabit(slot); if(!h) return [];
  const meta=habitOf(h.id), out=[];
  for(let i=6;i>=0;i--){ const k=habitDay(todayKey(),-i);
    out.push({k,done:!!(h.days&&h.days[k]),today:i===0,before:k<h.started,off:!habitApplies(meta,k)}); }
  return out;
}
/* Counts back from today over the days the habit applies to. Today only breaks
   the run once it is over, so an unticked today starts the count at yesterday. */
function habitStreak(slot){
  const h=currentHabit(slot); if(!h) return 0;
  const meta=habitOf(h.id), has=k=>!!(h.days&&h.days[k]);
  let n=0, k=todayKey();
  if(!habitApplies(meta,k)||!has(k)) k=habitDay(k,-1);
  for(let guard=0; guard<400 && k>=h.started; guard++){
    if(!habitApplies(meta,k)){ k=habitDay(k,-1); continue; }
    if(!has(k)) break;
    n++; k=habitDay(k,-1);
  }
  return n;
}
/* share of the days it applied to, over the last four weeks, that went to plan */
function habitRate(slot){
  const h=currentHabit(slot); if(!h) return null;
  const meta=habitOf(h.id); let days=0, kept=0;
  for(let i=0;i<28;i++){ const k=habitDay(todayKey(),-i);
    if(k<h.started) break;
    if(!habitApplies(meta,k)) continue;
    days++; if(h.days&&h.days[k]) kept++; }
  return days? kept/days : null;
}
/* Which habit the app suggests, given what the check in actually said. */
function suggestHabit(){
  const c=S.checkins[0];
  if(c && typeof c.proteinHit==='number' && c.proteinHit<=4) return habitOf('protein_am');
  const sleep=avg7('sleep',{real:true});
  if(sleep!==null && sleep<6.5) return habitOf('phone_out');
  const steps=avg7('steps',{real:true});
  if(steps!==null && steps<6000) return habitOf('walk_after');
  return habitOf('veg_lunch');
}
/* only habits to start are ever suggested; what someone wants to stop is theirs to say */
const AIMS=[
  {id:'lose',   t:'Lose fat',     s:'Move often, eat a bit less'},
  {id:'build',  t:'Build muscle', s:'Lift, and lift heavier'},
  {id:'strong', t:'Get stronger', s:'Heavier weights, fewer reps'},
  {id:'endure', t:'Run further',  s:'Miles in the legs'},
  {id:'hold',   t:'Hold steady',  s:'Keep the habit ticking over'},
  {id:'eat',    t:'Eat better',   s:'Cook more than you order'}
];
const aimOf=id=>AIMS.find(a=>a.id===id)||AIMS[0];
/* An aim with no destination is a mood. The forecast had nothing to count down
   to and Progress had nothing to mark, because "lose fat" never said how much or
   by when. A target is optional, and it is one line. */
const TARGET_KINDS={
  weight:{unit:'kg', t:'A weight'},
  runkm: {unit:'km', t:'A distance in one run'},
  lift:  {unit:'kg', t:'A lift'},
  sessions:{unit:'a week', t:'Sessions a week'}
};
function targetOf(){ const t=S.target; return t&&t.kind&&!t.hit? t : (t&&t.hit? t : null); }
function setTarget(kind,value,by,exId){
  S.target={kind,value:+value,by,exId:exId||null,set:todayKey(),hit:null};
  save(); return S.target;
}
function clearTarget(){ S.target=null; save(); }
function targetNow(){
  const t=S.target; if(!t) return null;
  if(t.kind==='weight') return S.weights.length? S.weights[S.weights.length-1].kg : null;
  if(t.kind==='runkm'){
    const runs=S.mine.filter(p=>p.kind==='run'&&p.km); 
    return runs.length? Math.max(...runs.map(p=>+p.km)) : null;
  }
  if(t.kind==='lift'){
    /* the heaviest single set ever logged for that movement */
    const hist=(S.lifts&&S.lifts[t.exId])||[];
    const kgs=hist.flatMap(e=>(e.sets||[]).map(x=>+x.kg||0)).filter(x=>x>0);
    return kgs.length? Math.max(...kgs) : null;
  }
  if(t.kind==='sessions'){
    const wk=mondayKey();
    return S.mine.filter(p=>p.d>=wk&&p.kind!=='meal').length;
  }
  return null;
}
function targetProgress(){
  const t=S.target; if(!t) return null;
  const now=targetNow(); if(now===null) return null;
  const start=t.from!==undefined? t.from : (t.kind==='weight'&&S.weights.length? S.weights[0].kg : 0);
  const falling=t.kind==='weight'&&t.value<start;
  const span=Math.abs(t.value-start)||1;
  const moved=falling? (start-now) : (now-start);
  const pct=Math.max(0,Math.min(100,Math.round(moved/span*100)));
  const hit=falling? now<=t.value : now>=t.value;
  const daysLeft=t.by? Math.round((dateOf(t.by)-dateOf(todayKey()))/864e5) : null;
  return {now,start,pct,hit,daysLeft,unit:TARGET_KINDS[t.kind].unit,
    remaining:+(falling? now-t.value : t.value-now).toFixed(1)};
}
/* Four runs a week, one of them hard and one of them long: the 80/20 shape. */
const PATTERNS={
  lose:  ['t_push','walk','t_lower','r_easy','t_pull','walk','checkin'],
  build: ['t_push','t_lower','walk','t_pull','t_lower','rest','checkin'],
  endure:['r_easy','t_lower','r_intervals','walk','r_easy','r_long','checkin'],
  hold:  ['t_push','walk','t_lower','rest','t_pull','r_easy','checkin'],
  eat:   ['cook','t_push','cook','walk','t_lower','cook','checkin']
};
const SLOTS={
  walk:{label:'Walk',sub:'30 to 45 minutes, easy',mins:35,kind:'walk',type:'run'},
  run:{label:'Run',sub:'Zone 2, conversational',mins:40,kind:'run',type:'run'},
  cook:{label:'Cook',sub:'Something with protein in it',mins:20,kind:'meal',type:'meal'},
  rest:{label:'Rest',sub:'Nothing owed today',mins:0,kind:'rest',type:null},
  checkin:{label:'Check in',sub:'Two minutes. Next week is built from it.',mins:2,kind:'checkin',type:null}
};
/* What somebody actually has to hand. The templates used to assume a full
   commercial gym, so a person with two dumbbells in a spare room got an
   unperformable week on day one and had to hand-swap eighteen movements to find
   out. The library already carries the kit each movement needs, so this is a
   question and a filter. */
const KIT=[{id:'bodyweight',t:'Bodyweight',s:'Floor, a wall, maybe a bar'},
  {id:'dumbbell',t:'Dumbbells',s:'Adjustable or a rack of them'},
  {id:'barbell',t:'Barbell and rack',s:'Bar, plates, somewhere to rack it'},
  {id:'machine',t:'Machines',s:'Selectorised or plate loaded'},
  {id:'cable',t:'Cables',s:'A pulley stack'},
  {id:'kettlebell',t:'Kettlebells',s:''},
  {id:'band',t:'Bands',s:''},
  {id:'other',t:'Odds and ends',s:'Anything else'},
  {id:'rower',t:'Rowing machine',s:''},{id:'skierg',t:'SkiErg',s:''},{id:'sled',t:'Sled',s:'To push and pull'},
  {id:'medball',t:'Wall ball or med ball',s:''},{id:'pullup',t:'Pull-up bar',s:''},
  {id:'box',t:'Plyo box',s:''},{id:'rope',t:'Skipping rope',s:''}];
const ALL_KIT=KIT.map(x=>x.id);
const KIT_PRESETS=[
  {id:'gym',t:'Full gym',kit:ALL_KIT.slice()},
  {id:'home',t:'Home weights',kit:['bodyweight','dumbbell','kettlebell','band']},
  {id:'bw',t:'Nothing at all',kit:['bodyweight']}];
const kitOf=()=>{ const k=S.profile&&S.profile.kit;
  return Array.isArray(k)&&k.length? k : ALL_KIT; };
const hasKit=eq=>kitOf().indexOf(eq||'other')>=0;
const ACTIVITY=[
  {id:'low',t:'Mostly sitting',s:'Desk job, not much walking',mult:1.2},
  {id:'light',t:'Lightly active',s:'On your feet, one or two sessions',mult:1.375},
  {id:'mod',t:'Active',s:'Three or four sessions a week',mult:1.55},
  {id:'high',t:'Very active',s:'Five plus, or a physical job',mult:1.725}];
const actOf=id=>ACTIVITY.find(a=>a.id===id)||ACTIVITY[2];
const ME={id:'me',n:'you',full:'You',c:'#1e3a6e',s:'You'};
/* No invented people. The feed is whoever is signed in to your project and
   nobody else, and it is empty until you follow one of them. */
const people=[];
const P=Object.fromEntries([ME].map(p=>[p.id,p]));

/* Starter sessions. These are what the plan and the log sheet use for a run,
   a meal or a fast. They are never posted and never appear in the feed. */
const SEED_POSTS=[
  {id:'p1',by:'niamh',kind:'run',when:'22m',title:'14.2',unit:'km along the Shannon',
   chips:['5:12 /km','1:13:47','Annacotty loop'],baseTries:412,
   cap:'Easy miles along the river.',
   session:{title:'Shannon 14.2km',type:'run',adds:14.2,steps:[
     {n:'Easy opening 3 km',r:'5:35 /km',sec:12},{n:'Settle to goal pace',r:'5:10 /km',sec:14},
     {n:'Riverside push, 6 km',r:'5:02 /km',sec:16},{n:'Last 2 km, empty the tank',r:'4:48 /km',sec:12},
     {n:'Walk back over the bridge',r:'cool down',sec:8}]}},
  {id:'p2',by:'saoirse',kind:'meal',when:'1h',title:'Harissa chickpea bowl',unit:'42g protein, 12 minutes',
   chips:['12 min','5 ingredients','€2.40 a portion'],baseTries:1204,macros:{p:42,c:64,f:19},
   cap:'Batch of four, better on day two.',
   session:{title:'Harissa chickpea bowl',type:'meal',adds:1,steps:[
     {n:'Roast chickpeas with harissa',r:'12 min',sec:14},{n:'Whip the lemon yoghurt',r:'2 min',sec:8},
     {n:'Char the tenderstem',r:'4 min',sec:10},{n:'Build the bowl, seeds last',r:'1 min',sec:8}]}},
  {id:'p3',by:'dara',kind:'workout',when:'3h',title:'Push A',unit:'6 movements, 48 min',
   chips:['Upper','Dumbbells and bench','RPE 8'],baseTries:318,
   cap:'Pressing day, done.',
   session:{title:'Push A',type:'workout',adds:1,steps:[
     {n:'Incline dumbbell press',r:'4 × 8',sec:14},{n:'Standing overhead press',r:'4 × 6',sec:14},
     {n:'Weighted dip',r:'3 × 8',sec:12},{n:'Cable fly',r:'3 × 12',sec:12},
     {n:'Lateral raise, slow down',r:'3 × 15',sec:10},{n:'Overhead triceps',r:'3 × 12',sec:10}]}},
  {id:'p4',by:'tom',kind:'fast',when:'5h',title:'16:8',unit:'closed at 12.30',
   chips:['Black coffee only','Broke it with eggs','Slept 7h 40m'],baseTries:96,
   cap:'Sixteen hours, eight to eat.',
   session:{title:'16:8 fast',type:'fast',adds:1,steps:[
     {n:'Last bite logged',r:'20:30',sec:8},{n:'Sleep window',r:'8 hours',sec:12},
     {n:'Coffee, water, salt',r:'morning',sec:10},{n:'Break the fast',r:'12:30',sec:8}]}}
];

