/* ===================== connected tracker =====================
   Steps, sleep and resting heart rate are passive data. A phone or watch
   already has them, so the app never asks. In a browser there is no
   HealthKit, so this reads from a stub that generates a plausible week;
   swapping SOURCES for a real bridge is the only change needed.
   ============================================================= */
const SOURCES=[{id:'apple',n:'Apple Health'},{id:'google',n:'Health Connect'},{id:'garmin',n:'Garmin'}];
/* Kept for anything outside that still reads it. The live figure is
   stepTarget(), which is the person's own. */
const STEP_TARGET=8000;
function hashDay(k){ let h=0; for(let i=0;i<k.length;i++) h=(h*31+k.charCodeAt(i))>>>0; return h; }
function stubDay(k){
  const h=hashDay(k);
  return {steps:3200+(h%9000), sleep:+(5.2+((h>>3)%30)/10).toFixed(1), rhr:54+((h>>7)%16)};
}
const healthOn=()=>!!(S.health&&S.health.connected);
const sourceName=()=>{ const s2=SOURCES.find(x=>x.id===(S.health&&S.health.source)); return s2?s2.n:'your tracker'; };
function healthSync(days){
  if(!healthOn()) return 0;
  let n=0;
  for(let i=0;i<(days||14);i++){
    const d=new Date(); d.setDate(d.getDate()-i);
    const k=keyOf(d);
    S.days[k]=S.days[k]||{};
    S.days[k].auto=Object.assign(stubDay(k),{sim:true});
    n++;
  }
  save(); return n;
}
function connectHealth(source){
  S.health={connected:true,source,since:todayKey(),simulated:true};
  healthSync(14); renderAll();
  toast(sourceName()+' connected in demo mode. The numbers are stand ins.');
}
function disconnectHealth(){ S.health={connected:false}; save(); renderAll(); }
const autoOf=k=>{ const d=S.days[k]; return d&&d.auto? d.auto : null; };
const stepsToday=()=>{ const a=autoOf(todayKey()); return a? a.steps : null; };

