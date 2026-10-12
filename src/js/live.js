/* ===================== build 59: a session keeps going when closed =====================
   Feargal lost sessions by closing the player: the chevron hid it with a
   Resume toast that went after five seconds, and pressing Start again built a
   new session over the old one. A reload, or the phone dropping the app, lost
   it outright, because the session lived only in memory.

   Now:
     closing (the chevron, or a swipe down on the player's header) minimises it
     the clock keeps running, and a bar sits above the bottom nav with the name,
     the time and the sets done; tapping it opens the session where it was
     Start anywhere while one is going opens that one instead of a new one
     the session is written to its own key on this device after every change,
     so a reload or a closed app comes back to the same sets (for twelve hours)
     the bar has End, which throws it away, with Undo
   It is kept on the phone only (gauntlet.live), not in the backed up state: a
   half-done session is not a record. Delete everything removes it. */
const LIVE_KEY='gauntlet.live', LIVE_MAX_MS=12*3600e3;
function gymHasWork(G){
  G=G||GYM; if(!G||G.done) return false;
  if(G.mode==='circuit') return (G.items||[]).some(x=>x.done)||(G.roundsDone||0)>0||(G.strength||[]).some(s=>s.sets.some(x=>x.done));
  if(G.ex.some(e=>e.sets.some(s=>s.done||s.touched))) return true;
  return (typeof gymRuns==='function')&&gymRuns(G).some(x=>x.r.startAt||x.r.ms);
}
/* started counts too: a session opened on purpose is kept until it is ended */
const liveSession=()=>!!(typeof GYM!=='undefined'&&GYM&&!GYM.done&&GYM.started);
const gymShown=()=>document.getElementById('gym').classList.contains('on');
function liveClock(){ if(!liveSession()) return ''; const s=Math.floor((Date.now()-GYM.started)/1000);
  const h=Math.floor(s/3600), m=Math.floor(s%3600/60); return h? h+':'+String(m).padStart(2,'0')+':'+String(s%60).padStart(2,'0') : m+':'+String(s%60).padStart(2,'0'); }
function liveSummary(){
  if(!liveSession()) return '';
  if(GYM.mode==='circuit'){ const n=(GYM.items||[]).filter(x=>x.done).length; return liveClock()+' in · '+n+' of '+(GYM.items||[]).length+' done'; }
  const n=GYM.ex.reduce((a,e)=>a+e.sets.filter(s=>s.done&&!s.warm).length,0), all=GYM.ex.reduce((a,e)=>a+e.sets.filter(s=>!s.warm).length,0);
  return liveClock()+' in · '+n+' of '+all+' sets done';
}
function persistLive(){
  try{
    if(liveSession()) localStorage.setItem(LIVE_KEY,JSON.stringify({at:Date.now(),gym:GYM}));
    else localStorage.removeItem(LIVE_KEY);
  }catch(e){}
}
function clearLive(){ try{ localStorage.removeItem(LIVE_KEY); }catch(e){} }
/* the clock, the bar and the save, once a second while a session is going */
let liveTick=null;
function ensureLiveTick(){
  clearInterval(liveTick);
  if(!liveSession()) return;
  let n=0;
  liveTick=setInterval(()=>{
    if(!liveSession()){ clearInterval(liveTick); liveTick=null; drawLiveBar(); return; }
    const sub=$('gymSub');
    if(sub&&gymShown()) sub.textContent= GYM.mode==='circuit'&&typeof circSubText==='function'? circSubText() : elapsed();
    const t=$('liveTime'); if(t) t.textContent=liveClock();
    if(++n%5===0) persistLive();
  },1000);
}
function drawLiveBar(){
  const bar=$('liveBar'); if(!bar) return;
  const show=liveSession()&&!gymShown();
  bar.classList.toggle('on',show);
  document.body.classList.toggle('has-live',show);
  if(!show) return;
  bar.innerHTML=`<button class="lvmain" data-liveresume="1" aria-label="Back to ${escHabit(GYM.name)}, ${liveSummary()}">
      <span class="lvdot" aria-hidden="true"></span>
      <span class="lvtx"><b>${escHabit(GYM.name)}</b><span><span id="liveTime">${liveClock()}</span> · ${liveSummary().replace(/^[^·]*· /,'')}</span></span>
      <span class="lvgo">Resume</span></button>
    <button class="lvend" data-liveend="1" aria-label="End this session without saving">End</button>`;
}
function minimiseGym(){
  if(!GYM) return;
  $('gym').classList.remove('on');
  clearInterval(restTick); $('restBar').classList.remove('on');
  if(GYM.done){ clearLive(); drawLiveBar(); return; }
  /* opened and closed with nothing done or typed: not worth keeping */
  if(!gymHasWork()){ GYM.done=true; GYM.dropped=true; clearInterval(gymTick); clearLive(); drawLiveBar(); renderAll(); return; }
  persistLive(); ensureLiveTick(); drawLiveBar(); renderAll();
}
function resumeLive(){
  if(!liveSession()) return false;
  closeSheets();
  $('gym').classList.add('on');
  if(GYM.mode==='circuit') drawCircuit(); else drawGym();
  ensureLiveTick(); drawLiveBar();
  return true;
}
function endLive(){
  if(!liveSession()) return;
  const snap=JSON.parse(JSON.stringify(GYM));
  GYM.done=true; GYM.dropped=true; clearInterval(gymTick); clearLive(); drawLiveBar(); renderAll();
  toast(snap.name+' ended, nothing saved','Undo',()=>{ GYM=snap; persistLive(); ensureLiveTick(); drawLiveBar(); renderAll(); });
}
/* Start anywhere while a session is going opens that one. True when it did. */
function liveGuard(){
  if(!liveSession()||gymShown()) return false;
  resumeLive(); toast(GYM.name+' is still going. Finish or end it to start another.');
  return true;
}
/* back after a reload or a closed app */
function restoreLive(){
  let raw=null; try{ raw=localStorage.getItem(LIVE_KEY); }catch(e){}
  if(!raw||liveSession()) return false;
  try{
    const o=JSON.parse(raw), G=o&&o.gym;
    if(!G||G.done||!G.started||Date.now()-G.started>LIVE_MAX_MS||!Array.isArray(G.ex)){ clearLive(); return false; }
    GYM=G; ensureLiveTick(); drawLiveBar(); renderAll();
    return true;
  }catch(e){ clearLive(); return false; }
}
/* the player's own changes save straight away; the tick catches typing */
['drawGym','drawCircuit'].forEach(fn=>{
  const orig=window[fn]; if(typeof orig!=='function') return;
  window[fn]=function(){ const r=orig.apply(this,arguments); if(liveSession()){ persistLive(); if(!liveTick) ensureLiveTick(); } return r; };
});
document.addEventListener('change',e=>{ if(gymShown()&&e.target.closest&&e.target.closest('#gym')) persistLive(); });
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') persistLive(); });
window.addEventListener('pagehide',persistLive);
document.addEventListener('click',e=>{
  if(e.target.closest('[data-liveresume]')){ resumeLive(); return; }
  if(e.target.closest('[data-liveend]')){ endLive(); return; }
},true);
/* swipe down on the player's header minimises it, as a sheet would close */
(function(){
  let y0=null, dy=0;
  const top=()=>document.querySelector('#gym .gymtop');
  document.addEventListener('touchstart',e=>{ const t=top(); y0= t&&t.contains(e.target)&&gymShown()? e.touches[0].clientY : null; dy=0; },{passive:true});
  document.addEventListener('touchmove',e=>{ if(y0===null) return; dy=e.touches[0].clientY-y0;
    const g=$('gym'); if(dy>0&&g){ g.style.transition='none'; g.style.transform='translateY('+Math.min(dy,240)+'px)'; } },{passive:true});
  document.addEventListener('touchend',()=>{ if(y0===null) return; const g=$('gym');
    if(g){ g.style.transition=''; g.style.transform=''; }
    if(dy>80) minimiseGym(); y0=null; dy=0; },{passive:true});
})();
/* for the tests */
if(window.__G) Object.assign(window.__G,{nextUp,nextCandidates,laterToday,thenAfter,nextCard,focusSignals,focusPills,dayClock,openSleepLog,saveSleep,hoursBetween,
  sleepNightLabel,openCheckin,realAuto,warmFor,firstWarm,rememberWarmups,liveSession,gymHasWork,minimiseGym,resumeLive,endLive,restoreLive,
  persistLive,liveGuard,drawLiveBar,liveSummary,isSearchBox,searchToTop,priorities,heroCard,clockOf,realSleep,openDay,coachCard,weighIns,weightNow,weightScale,weightStart,weightProgress,weightOutlook,outlookLine,trendRate,trendOn,tidyWeights,LIVE_KEY});
