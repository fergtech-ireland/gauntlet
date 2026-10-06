/* ===================== state ===================== */
/* ===================== state ===================== */
function freshState(){
  return {
    v:4,
    profile:{onboarded:false,handle:'',aim:'lose',detailsSet:false,checkinDay:6,excluded:[],showTempo:true,liftDays:null,cardioDays:null,kit:null,
      sex:'',age:34,height:178,weight:82,units:'metric',activity:'mod'},
    plan:null, habit:null, goal:{kind:'any',target:4,unit:'sessions',label:'Move 4 times',now:0},
    mine:[], tries:[], pickups:[], tryCounts:{}, weights:[],
    days:{}, checkins:[], lifts:{}, health:{connected:false},
    cycle:{tracking:false,lastPeriod:null,length:28,periodLen:5}, forecasts:{},
    follows:{},
    week:[{d:'M',done:[]},{d:'T',done:[]},{d:'W',done:[]},{d:'T',done:[]},
          {d:'F',done:[]},{d:'S',done:[],today:true},{d:'S',done:[]}],
    sessions:0
  };
}
let memoryOnly=false;
function save(){ if(memoryOnly) return false;
  try{ localStorage.setItem(STORE_KEY,JSON.stringify(S)); return true; }catch(e){ memoryOnly=true; return false; } }
function migrate(d){
  /* Older saves are upgraded, never discarded. Each step is additive, so a
     device that has been away for three releases walks up the chain. */
  if(!d||typeof d!=='object') return null;
  const steps={
    1:x=>Object.assign(x,{v:2,profile:Object.assign({onboarded:!!x.profile,handle:'',aim:'lose'},x.profile||{})}),
    2:x=>Object.assign(x,{v:3,goal:x.goal||{kind:'any',target:4,unit:'sessions',label:'Move 4 times',now:0},
        templates:x.templates||[],workouts:x.workouts||[]}),
    3:x=>Object.assign(x,{v:4,plan:null,profile:Object.assign({checkinDay:6},x.profile||{}),
        cycle:x.cycle||{tracking:false,lastPeriod:null,length:28,periodLen:5},forecasts:x.forecasts||{}})
  };
  let guard=0;
  while(d.v<4 && steps[d.v] && guard++<10) d=steps[d.v](d);
  return d.v===4? d : null;
}
function normalise(d){
  const f=freshState();
  return Object.assign(f,d,{
    week:Array.isArray(d.week)&&d.week.length===7? d.week : f.week,
    profile:d.profile&&typeof d.profile==='object'? Object.assign({},f.profile,d.profile) : f.profile,
    goal:Object.assign({},f.goal,d.goal||{}),
    plan:d.plan&&Array.isArray(d.plan.days)&&d.plan.days.length===7? d.plan : null,
    mine:Array.isArray(d.mine)?d.mine:[],
    tries:Array.isArray(d.tries)?d.tries:[], pickups:Array.isArray(d.pickups)?d.pickups:[],
    weights:Array.isArray(d.weights)?d.weights:[], checkins:Array.isArray(d.checkins)?d.checkins:[],
    days:d.days&&typeof d.days==='object'?d.days:{}, lifts:d.lifts&&typeof d.lifts==='object'?d.lifts:{},
    templates:Array.isArray(d.templates)&&d.templates.length?d.templates:(typeof seedTemplates==='function'?seedTemplates():[]),
    workouts:Array.isArray(d.workouts)?d.workouts:[],
    health:d.health&&typeof d.health==='object'?d.health:{connected:false},
    cycle:Object.assign({tracking:false,lastPeriod:null,length:28,periodLen:5},d.cycle||{}),
    forecasts:d.forecasts&&typeof d.forecasts==='object'?d.forecasts:{},
    tryCounts:d.tryCounts&&typeof d.tryCounts==='object'?d.tryCounts:{}
  });
}
function load(){
  let raw=null;
  try{ raw=localStorage.getItem(STORE_KEY); }catch(e){ memoryOnly=true; }
  if(!raw){
    /* a key from an older release still counts as this person's data */
    try{ for(const k of ['gauntlet.v3','gauntlet.v2','gauntlet.v1']){ const old=localStorage.getItem(k); if(old){ raw=old; break; } } }catch(e){}
  }
  if(!raw) return freshState();
  try{
    let d=JSON.parse(raw);
    if(d && d.v!==4) d=migrate(d);
    if(!d||!Array.isArray(d.mine)) return freshState();
    return normalise(d);
  }catch(e){ return freshState(); }
}
let S=load();

