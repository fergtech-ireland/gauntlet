/* ===================== colophon, install, worker ===================== */
/* Auto follows the phone. The override is stored, because plenty of people run
   their phone light and want this dark at six in the morning. */
/* Light unless they choose otherwise. The stylesheet defaults to light too,
   so a phone in dark mode never flashes dark before this script runs. */
const THEMES=[['light','Light'],['dark','Dark'],['auto','Follow my phone']];
const DEFAULT_THEME='light';
const themeOf=()=>{ const t=S.profile&&S.profile.theme; return THEMES.some(x=>x[0]===t)? t : DEFAULT_THEME; };
function applyTheme(){
  const t=themeOf();
  const root=document.documentElement;
  if(t==='light') root.removeAttribute('data-theme'); else root.setAttribute('data-theme',t);
  const dark = t==='dark' || (t==='auto' && window.matchMedia
    && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const m=document.getElementById('themeColor');
  if(m) m.setAttribute('content', dark? '#151517' : '#ffffff');
}
function setTheme(t){ S.profile.theme=t; save(); applyTheme(); renderAll(); }
if(window.matchMedia){
  try{ window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyTheme); }catch(e){}
}
/* The footer said "Your week lives on this device and nowhere else" to
   everyone, including people whose week is synced to their account. It now
   says which is true, and is refreshed whenever the app redraws. */
function colophonText(){
  const synced=typeof signedInSafe==='function'&&signedInSafe();
  return 'Gauntlet, build '+APP_VERSION+'.<br>'+(synced
    ? 'Your week lives on this device, with a copy in your account so it reaches your other devices.'
    : 'Your week lives on this device and nowhere else.');
}
function mountColophons(){
  document.querySelectorAll('.screen').forEach(sc=>{
    const have=sc.querySelector('.colophon .sub');
    if(have){ have.innerHTML=colophonText(); return; }
    sc.insertAdjacentHTML('beforeend',`<div class="colophon"><div class="fx">FERG<i>TECH</i></div>
      <div class="sub">${colophonText()}</div></div>`);
  });
}
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferredPrompt=e; });
/* A check in that rebuilds the plan, and nothing that ever asks for it. When it
   is missed the plan quietly stops adapting, which is the entire product, so
   this is the one thing the app is allowed to interrupt you for.
   Permission is asked once, on a tap, never on load. Everything is local: a
   scheduled notification while the tab is alive, and a banner when it is not. */
const NUDGE_KEY='gauntlet.nudge';
function nudgeOn(){ return !!(S.profile&&S.profile.nudge); }
function canNudge(){ return typeof Notification!=='undefined'; }
/* iPhone and iPad only give web apps notifications once the app is on the
   Home Screen, and Safari in a tab does not expose them at all. Saying so
   beats "this browser cannot do reminders", which is true but useless. */
function onIOS(){
  const ua=navigator.userAgent||'';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
}
function installed(){
  try{ return window.navigator.standalone===true
    || (window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches); }catch(e){ return false; }
}
function nudgeHelp(){
  if(onIOS()&&!installed()) return 'On iPhone and iPad, reminders only work once Gauntlet is on your Home Screen: tap Share, then Add to Home Screen, and open it from there.';
  return 'One reminder a week, at 7pm on your check in day. It comes from the app itself rather than a server, so it can only arrive while Gauntlet is open or running in the background. If it is closed at 7pm, the check in waits for you on Today instead.';
}
function nudgeState(){
  if(!canNudge()) return 'unsupported';
  if(Notification.permission==='denied') return 'blocked';
  if(!nudgeOn()) return 'off';
  return Notification.permission==='granted'? 'on' : 'pending';
}
async function enableNudges(){
  if(!canNudge()){ toast(onIOS()&&!installed()? 'Add Gauntlet to your Home Screen first, then turn reminders on' : 'This browser cannot do reminders'); return false; }
  let perm=Notification.permission;
  if(perm==='default'){ try{ perm=await Notification.requestPermission(); }catch(e){ perm='denied'; } }
  if(perm!=='granted'){ toast('Reminders are blocked in your browser settings'); return false; }
  S.profile.nudge=true; save(); scheduleNudge(); renderAll();
  toast('One reminder a week, 7pm '+checkinDayName()+', while the app is open');
  return true;
}
function disableNudges(){ S.profile.nudge=false; save(); clearNudge(); renderAll(); toast('Reminders off'); }
/* the next check in day, at 7pm local */
function nextNudgeAt(){
  const ci=S.profile.checkinDay===undefined?6:S.profile.checkinDay;
  const now=new Date(), d=new Date(now.getFullYear(),now.getMonth(),now.getDate(),19,0,0);
  let delta=(ci-now.getDay()+7)%7;
  if(delta===0 && now.getTime()>d.getTime()) delta=7;
  d.setDate(d.getDate()+delta);
  return d;
}
let nudgeTimer=null;
function clearNudge(){ if(nudgeTimer) clearTimeout(nudgeTimer); nudgeTimer=null; }
function scheduleNudge(){
  clearNudge();
  if(nudgeState()!=='on') return;
  const at=nextNudgeAt(), ms=at.getTime()-Date.now();
  /* setTimeout is unreliable past a day or so, so it re-arms rather than
     trying to hold a week-long timer. */
  const step=Math.min(ms,6*3600e3);
  nudgeTimer=setTimeout(()=>{
    if(Date.now()>=nextNudgeAt().getTime()-60e3 && !checkinDone()) fireNudge();
    scheduleNudge();
  }, Math.max(1000,step));
}
/* Chrome on Android refuses new Notification() from a page and only allows
   it through a service worker. The old version used the refused call,
   swallowed the error, and had already recorded the reminder as sent, so on
   Android it silently never arrived. It now goes through the service worker
   where there is one, falls back to the page, and only records a reminder as
   sent once one actually was. */
async function fireNudge(){
  if(nudgeState()!=='on'||checkinDone()) return false;
  const last=(()=>{ try{ return +localStorage.getItem(NUDGE_KEY)||0; }catch(e){ return 0; } })();
  if(Date.now()-last < 20*3600e3) return false;
  const title='Two minutes, and next week builds itself';
  const opts={body:'Your check in is due. Skip it and the plan stops adapting.', tag:'gauntlet-checkin'};
  let sent=false;
  try{
    if('serviceWorker' in navigator&&navigator.serviceWorker.getRegistration){
      const reg=await navigator.serviceWorker.getRegistration();
      if(reg&&reg.showNotification){ await reg.showNotification(title,opts); sent=true; }
    }
  }catch(e){}
  if(!sent){ try{ new Notification(title,opts); sent=true; }catch(e){} }
  if(sent){ try{ localStorage.setItem(NUDGE_KEY,String(Date.now())); }catch(e){} }
  return sent;
}
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) scheduleNudge(); });
if('serviceWorker' in navigator && location.protocol.startsWith('http')){
  /* updateViaCache 'none': always fetch sw.js itself fresh, never from the
     browser's own cache, so a changed service worker is seen straight away */
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).catch(()=>{}));
}
/* ---------- getting new versions onto phones ----------
   The service worker loads the page network first, so any fresh open while
   online gets whatever was published last. This covers the other case: an
   app left open in the background, which never reloads on its own.
   When the app is opened or brought back to the front, it asks the server for
   the page, compares it with the version it is running, and if they differ
   shows a banner. It never reloads by itself, and it waits until nobody is in
   the middle of a workout, onboarding, or a half-filled form. */
const UPDATE_CHECK_MS=30*60e3;
const upd={base:null,last:0,ready:false,checking:false,timer:null};
function pageHash(t){
  /* FNV-1a: cheap, and only needs to notice that the text changed */
  let h=0x811c9dc5;
  for(let i=0;i<t.length;i++){ h^=t.charCodeAt(i); h=Math.imul(h,0x01000193); }
  return (h>>>0).toString(16);
}
const appUrl=()=>location.href.split('#')[0];
async function fetchPageHash(){
  const r=await fetch(appUrl(),{cache:'no-cache',credentials:'same-origin'});
  if(!r||!r.ok) throw new Error('status '+(r&&r.status));
  return pageHash(await r.text());
}
/* With no signal, the page being run is the copy the service worker saved. */
async function savedPageHash(){
  if(typeof caches==='undefined') return null;
  try{
    const res=await caches.match(new URL('./index.html',location.href).href);
    return res? pageHash(await res.text()) : null;
  }catch(e){ return null; }
}
function appBusy(){
  /* a finished session stays in memory for its summary; only one still in
     progress counts, or the banner never shows after the first workout */
  try{ if(typeof GYM!=='undefined'&&GYM&&!GYM.done) return true; }catch(e){}
  const on=id=>{ const el=document.getElementById(id); return !!(el&&el.classList.contains('on')); };
  return on('player')||on('onb')||on('gym')||!!document.querySelector('.sheet.on');
}
function showUpdateBar(){
  const bar=document.getElementById('updateBar'); if(!bar) return;
  const show=upd.ready&&!appBusy();
  bar.classList.toggle('on',show);
  /* keep looking while an update is waiting for a quiet moment */
  if(upd.ready&&!show&&!upd.timer) upd.timer=setInterval(showUpdateBar,15000);
  if((show||!upd.ready)&&upd.timer){ clearInterval(upd.timer); upd.timer=null; }
}
async function checkForUpdate(force){
  if(!location.protocol.startsWith('http')||upd.checking||upd.ready) return;
  if(!force&&Date.now()-upd.last<UPDATE_CHECK_MS) return;
  upd.checking=true; upd.last=Date.now();
  try{
    if('serviceWorker' in navigator&&navigator.serviceWorker.getRegistration){
      try{ const reg=await navigator.serviceWorker.getRegistration(); if(reg&&reg.update) reg.update().catch(()=>{}); }catch(e){}
    }
    const h=await fetchPageHash();
    if(upd.base===null) upd.base=h;
    else if(h!==upd.base) upd.ready=true;
  }catch(e){
    /* offline: at least know which version is running, so the first check
       once back online can tell whether it is out of date */
    if(upd.base===null){ const saved=await savedPageHash(); if(saved) upd.base=saved; }
  }finally{
    upd.checking=false; showUpdateBar();
  }
}
function reloadApp(){ (window.__reload||location.reload.bind(location))(); }
document.addEventListener('click',e=>{
  if(e.target.closest('#updateNow')){ reloadApp(); }
});
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) checkForUpdate(false); });
window.addEventListener('online',()=>checkForUpdate(true));
window.addEventListener('load',()=>setTimeout(()=>checkForUpdate(true),3000));

window.__G={
  freshState,load,save,migrate,normalise,fmt,num,pct,ago,triesOf,allPosts,postById,goalCredit,avg7,
  bmrOf,tdeeOf,proteinOf,showH,showW,todayKey,mondayKey,dowIdx,
  buildPlan,ensurePlan,adaptPlan,composePlan,previewPlan,planDiff,todayPlan,startPlanDay,slotFor,openSwap,setAim,
  pushPlanDay,dropPlanDay,openRestChoice,absorberFor,nextSlots,dayCounts,weekPattern,AIM_DEFAULTS,
  deloadDue,weeksTraining,DELOAD_EVERY,DELOAD_RANGE,DELOAD_TIERS,deloadSchedule,deloadInfo,nextDeload,setDeloadMark,deloadTier,deloadPrescription,painAlternative,painToReview,painSince,clearPain,proteinBasis,openDeloadSheet,
  weekStats,openRunSwap,checkinDone,checkinDayName,healthOn,connectHealth,disconnectHealth,healthSync,stubDay,sourceName,openConnect,openDayDetail,dayLabel,daySub,showSeg,walkDone,stepsToday,
  SOURCES,STEP_TARGET,
  toggleFollow,startSessionFromPost,startSession,nextStep,prevStep,finishSession,closePlayer,
  logSession,openWeigh,openDetails,renderAll,renderToday,renderPlan,renderProgress,renderFeed,renderPeople,
  go,openSheet,closeSheets,topLayer,notYet,openLog,toast,weightControl,setW,nudgeW,wValid,toShown,fromShown,W_MIN,W_MAX,LB_PER_KG,checkForUpdate,showUpdateBar,pageHash,appBusy,upd,reloadApp,bmrOf,tdeeOf,sexTerm,plausibleBody,maintenance,calorieTarget,calorieLine,goalDirection,currentKg,RATE,kcalFloor,stepTarget,stepKcal,liftNetKcal,bodyFatPct,validBodyFat,DEFICIT_CAP,FAT_KCAL_PER_KG,stepSplit,splitText,recentRealSteps,withProfile,sessionMinutes,plannedLiftMinPerDay,plannedTdee,BASAL_STEPS,DEFAULT_STEPS,STEP_BANDS,validSteps,applyTheme,setTheme,THEMES,openYou,who,snapshotPlan,restorePlan,updateBadge,mountColophons,startOnboarding,onbRender,finishOnboarding,openTempoHelp,showTempoSafe,
  get __cloudReady(){ try{ return typeof cloudReady==='function'&&cloudReady(); }catch(e){ return false; } },
  SEED_POSTS,people,AIMS,ACTIVITY,PATTERNS,SLOTS,HUE,DAYS,STORE_KEY,APP_VERSION
};
Object.defineProperties(window.__G,{
  S:{get:()=>S,set:v=>{S=v},configurable:true},
  SESSION:{get:()=>SESSION,configurable:true},
  step:{get:()=>step,set:v=>{step=v},configurable:true},
  onbDraft:{get:()=>onbDraft,set:v=>{onbDraft=v},configurable:true},
  progSeg:{get:()=>progSeg,configurable:true},
  draft:{get:()=>draft,set:v=>{draft=v},configurable:true}
});
