/* ===================== chrome and actions ===================== */
const scrim=$('scrim');
/* Sheets are opened from inside full screen layers (onboarding, the gym, the
   guided session), and those sit above the default sheet layer. So work out what
   is on screen and put the sheet above it, rather than behind it where it looks
   like the button did nothing. */
function topLayer(){
  let z=60;
  [['onb',90],['gym',75],['player',70]].forEach(([id,base])=>{
    const el=$(id); if(el&&el.classList.contains('on')) z=Math.max(z,base);
  });
  return z;
}
/* A sheet is a modal, so it behaves like one: it takes focus, keeps Tab inside
   itself, closes on Escape, hands focus back where it came from, and honours the
   swipe the grab handle has been promising all along. */
let sheetReturn=null;
const FOCUSABLE='button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';
function openSheet(id){
  const el=$(id); if(!el) return;
  const z=topLayer();
  scrim.style.zIndex=z+10; el.style.zIndex=z+11;
  const h=el.querySelector('h3');
  if(h) el.setAttribute('aria-label',h.textContent);
  if(!el.classList.contains('on')) sheetReturn=document.activeElement;
  el.classList.add('on'); scrim.classList.add('on');
  el.scrollTop=0;
  setTimeout(()=>{ const f=el.querySelector(FOCUSABLE); (f||el).focus({preventScroll:true}); },40);
}
function closeSheets(){
  const wasOpen=document.querySelector('.sheet.on');
  document.querySelectorAll('.sheet').forEach(s2=>{ s2.classList.remove('on'); s2.style.zIndex=''; s2.style.transform=''; });
  scrim.classList.remove('on'); scrim.style.zIndex='';
  if(wasOpen&&sheetReturn&&document.contains(sheetReturn)){
    try{ sheetReturn.focus({preventScroll:true}); }catch(e){}
  }
  sheetReturn=null;
}
document.addEventListener('keydown',e=>{
  const open=document.querySelector('.sheet.on');
  if(e.key==='Escape'){
    if(open){ e.preventDefault(); closeSheets(); return; }
    if($('player').classList.contains('on')){ e.preventDefault(); closePlayer(); return; }
  }
  if(e.key!=='Tab'||!open) return;
  const items=[...open.querySelectorAll(FOCUSABLE)].filter(x=>x.offsetParent!==null);
  if(!items.length) return;
  const first=items[0], last=items[items.length-1];
  if(e.shiftKey&&document.activeElement===first){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey&&document.activeElement===last){ e.preventDefault(); first.focus(); }
});
/* ---------- the keyboard ----------
   On a phone the keyboard covers the bottom half of the screen, and a sheet
   that is 88% of the window ends up with its input underneath it. The visual
   viewport tells us how much room is actually left, so the sheet is resized to
   that, and whatever was focused is scrolled back into sight. */
function fitToKeyboard(){
  const vv=window.visualViewport; if(!vv) return;
  const covered=Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  document.documentElement.style.setProperty('--keyboard', covered+'px');
  document.documentElement.classList.toggle('keyboard-open', covered>120);
  if(covered>120){
    const el=document.activeElement;
    if(el&&/^(INPUT|TEXTAREA)$/.test(el.tagName)){
      try{ el.scrollIntoView({block:'center',behavior:'smooth'}); }catch(e){ try{ el.scrollIntoView(); }catch(e2){} }
    }
  }
}
if(window.visualViewport){
  window.visualViewport.addEventListener('resize',fitToKeyboard);
  window.visualViewport.addEventListener('scroll',fitToKeyboard);
}
document.addEventListener('focusin',e=>{
  if(!/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
  /* wait for the keyboard to actually appear before measuring */
  setTimeout(fitToKeyboard,120);
  setTimeout(()=>{ try{ e.target.scrollIntoView({block:'center'}); }catch(err){} },200);
});
document.addEventListener('focusout',()=>setTimeout(fitToKeyboard,120));

/* Swipe down to dismiss. Only from the top of the sheet, so a scrolled list
   still scrolls. */
(function(){
  let y0=null, dy=0, sheet=null;
  document.addEventListener('touchstart',e=>{
    sheet=e.target.closest? e.target.closest('.sheet.on') : null;
    if(!sheet||sheet.scrollTop>4){ sheet=null; return; }
    y0=e.touches[0].clientY; dy=0;
  },{passive:true});
  document.addEventListener('touchmove',e=>{
    if(!sheet||y0===null) return;
    dy=e.touches[0].clientY-y0;
    if(dy>0){ sheet.style.transition='none'; sheet.style.transform='translateY('+dy+'px)'; }
  },{passive:true});
  document.addEventListener('touchend',()=>{
    if(!sheet){ y0=null; return; }
    sheet.style.transition='';
    if(dy>90) closeSheets(); else sheet.style.transform='';
    sheet=null; y0=null; dy=0;
  },{passive:true});
})();
scrim.addEventListener('click',closeSheets);
let toastTimer=null,undoFn=null;
/* Messages keep out of the way of what they are about. Taps go straight
   through them to whatever is underneath, except the Undo button. When a sheet
   or a workout fills the bottom of the screen they appear at the top instead.
   A plain message goes after about two and a half seconds; one with Undo stays
   long enough to use it. (Review P2-05.) */
function toast(msg,undoLabel,fn){
  const t=$('toast'); t.querySelector('.msg').textContent=msg;
  const b=$('toastAct'); b.style.display=undoLabel?'block':'none'; b.textContent=undoLabel||''; undoFn=fn||null;
  const busyBottom=!!document.querySelector('.sheet.on')||(document.getElementById('gym')||{classList:{contains:()=>false}}).classList.contains('on');
  t.classList.toggle('top',busyBottom);
  t.classList.add('on'); clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('on'), undoLabel? 5000 : 2600);
}
$('toastAct').addEventListener('click',()=>{ if(undoFn) undoFn(); $('toast').classList.remove('on'); });
/* Nothing in here should feel broken. If a button is ahead of the build, it says
   so in its own words rather than doing nothing at all. */
const NOT_YET=[
  'Not built yet. It is on the list, somewhere under the biscuits.',
  'That one is still in the oven. Give it a week.',
  'Coming, but not today. Consider this a very polite shrug.',
  'Half built. The other half is out for a walk.',
  'Not wired up yet. It knows, and it is embarrassed.'
];
function notYet(what){
  const line=NOT_YET[Math.floor(Math.random()*NOT_YET.length)];
  toast((what? what+'. ':'')+line);
}
function go(name){
  /* Build 55: Eat has its own tab, but until the Eat screen arrives (build 57)
     it opens the food sheet over whatever screen you are on. */
  if(name==='eat'){ openFood(false); return; }
  const target=$('s-'+name);
  if(!target){ console.warn('no screen called '+name); return; }
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  target.classList.add('on');
  document.body.dataset.screen=name;
  document.querySelectorAll('.tab').forEach(t=>{
    const on=t.dataset.go===name;
    t.classList.toggle('on',on);
    if(t.dataset.go) t.setAttribute('aria-selected',on?'true':'false');
  });
  /* a screen reader needs to be told the page changed under it */
  setTimeout(()=>{ try{ target.focus({preventScroll:true}); }catch(e){} },30);
  window.scrollTo({top:0});
  if(name==='today') renderToday();
  if(name==='plan') renderPlan();
  if(name==='progress'){ S.pickups.forEach(k=>k.seen=true); save(); renderProgress(); }
  if(name==='feed') renderFeed();
}
function toggleFollow(id){ S.follows[id]=!S.follows[id]; save(); renderPeople(); renderFeed(); }
function startSessionFromPost(post){
  if(!post) return null;
  return startSession(Object.assign({},post.session,{fromPost:post.id,fromUser:post.by}));
}
function setAim(id){
  S.profile.aim=id; buildPlan(); save(); renderAll();
  return S.plan;
}
/* What was actually eaten today, or nothing. */
function loggedMealMacros(){
  if(typeof dayFood!=='function'||typeof foodTotals!=='function') return null;
  if(!dayFood(todayKey()).length) return null;
  const t=foodTotals(todayKey());
  const m={p:Math.round(t.protein),c:Math.round(t.carbs),f:Math.round(t.fat)};
  return (m.p+m.c+m.f)>0? m : null;
}
function goalCredit(sess){ return S.goal.kind==='any'? 1 : (S.goal.kind===sess.type? (S.goal.kind==='run'?(sess.adds||1):1) : 0); }
function logSession(sess){
  const credited = sess.fromUser && sess.fromUser!=='me' ? (P[sess.fromUser]||null) : null;
  const add=goalCredit(sess);
  if(add) S.goal.now=+(S.goal.now+add).toFixed(1);
  const day=S.week[todayIdx()];
  if(day && !day.done.includes(sess.type)) day.done.push(sess.type);
  S.sessions++;
  const src=SEED_POSTS.find(p=>p.kind===sess.type);
  const post={id:'m'+Date.now()+Math.random().toString(16).slice(2,5),d:todayKey(),by:'me',mine:true,kind:sess.type,when:'0m',
    title: sess.type==='run'? fmt(sess.adds||0) : sess.title,
    unit: sess.type==='run'? 'km logged on this device' : (src?src.unit:'logged'),
    chips:['just logged',(sess.steps?sess.steps.length:0)+' parts',credited?'from @'+credited.n:'your own'],
    cap: credited? `Tried ${credited.n}'s ${sess.title}.` : 'Done and logged.',
    origin: credited? {by:sess.fromUser,postId:sess.fromPost}:null,
    baseTries:0, macros: sess.type==='meal'? loggedMealMacros() : undefined, session:sess};
  S.mine.unshift(post);
  if(credited){
    S.tries.unshift({id:'t'+Date.now()+Math.random().toString(16).slice(2,5),at:Date.now(),
      postId:sess.fromPost,from:sess.fromUser,title:sess.title,kind:sess.type});
    S.tryCounts[sess.fromPost]=(S.tryCounts[sess.fromPost]||0)+1;
  }
  if(typeof afterLog==='function') afterLog(sess);
  save(); renderAll();
  return {post,goal:S.goal,credited,added:add};
}
document.addEventListener('click',e=>{
  const nav=e.target.closest('[data-go]'); if(nav) go(nav.dataset.go);
  const pl=e.target.closest('[data-play]'); if(pl) startSessionFromPost(postById(pl.dataset.play));
  const tr=e.target.closest('[data-try]'); if(tr) startSessionFromPost(postById(tr.dataset.try));
  const fo=e.target.closest('[data-follow]'); if(fo) toggleFollow(fo.dataset.follow);
  if(e.target.closest('#startToday')) startPlanDay(todayPlan());
  const sd=e.target.closest('[data-startday]'); if(sd){ closeSheets(); startPlanDay(S.plan.days[+sd.dataset.startday]); }
  const pd=e.target.closest('[data-planday]'); if(pd) openDayDetail(+pd.dataset.planday);
  const vw=e.target.closest('[data-view]'); if(vw) openDayDetail(+vw.dataset.view,{readOnly:true});
  const sw=e.target.closest('[data-swap]'); if(sw){ closeSheets(); openSwap(+sw.dataset.swap); }
  const dsw=e.target.closest('[data-dayswap]');
  if(dsw){ closeSheets(); openAlternatives(dsw.dataset.dayswap,{day:true}); }
  const rd=e.target.closest('[data-restday]');
  if(rd){ closeSheets(); openRestChoice(+rd.dataset.restday); }
  const rs=e.target.closest('[data-runswap]');
  if(rs){ const n=+rs.dataset.runswap; closeSheets(); openRunSwap(n, S.plan.days[n].runId); }
  const st=e.target.closest('[data-swapto]');
  if(st){ const [n,code]=st.dataset.swapto.split(':');
    const beforeSwap=snapshotPlan();
    const old=S.plan.days[+n];
    S.plan.days[+n]=Object.assign(slotFor(code),{dow:+n,checkin:!!old.checkin,exclude:old.exclude,setDelta:old.setDelta});
    S.goal.target=S.plan.days.filter(d=>d.type&&d.slot!=='walk').length;
    S.goal.label='Move '+S.goal.target+' times';
    save(); closeSheets(); renderAll();
    toast(DAYS[+n]+' is now '+S.plan.days[+n].label,'Undo',()=>restorePlan(beforeSwap,DAYS[+n]+' put back')); }
  if(e.target.closest('#rebuild')){ buildPlan(); save(); renderAll(); toast('Week rebuilt from your last check in'); }
  if(e.target.closest('#changeAim')){ drawAimSheet(); openSheet('aimSheet'); }
  const am=e.target.closest('[data-aim]');
  if(am){ setAim(am.dataset.aim); closeSheets(); toast('Aim changed. The week rebuilt around it.'); }
  if(e.target.closest('[data-habitadd]')){ openHabitSheet(); return; }
  const hp=e.target.closest('[data-habitpick]');
  if(hp&&!e.target.closest('#habitSheet')){ openHabitSheet(); return; }
  if(e.target.closest('#altBody [data-habittoggle]')){
    const slot=e.target.closest('[data-habittoggle]').dataset.habittoggle;
    const was=habitWeek(slot).slice(-1)[0].done;
    toggleHabitDay(todayKey(),slot); closeSheets(); renderAll();
    toast(was? 'Unticked' : 'Ticked'); return; }
  const ht=e.target.closest('[data-habittoggle]');
  if(ht){
    const slot=ht.dataset.habittoggle==='stop'? 'stop' : 'start';
    const wk=habitWeek(slot); if(!wk.length) return;
    const before=wk[wk.length-1].done;
    toggleHabitDay(todayKey(),slot); renderAll();
    const n=habitStreak(slot);
    toast(before? 'Unmarked' : (slot==='stop'? (n>1? n+' days without' : 'Marked: went without') : (n>1? n+' days running' : 'Marked')));
    return; }
  const hc=e.target.closest('[data-habitchoose]');
  if(hc){ const beforeH=JSON.parse(JSON.stringify(habitSlots()));
    const h=startHabit(hc.dataset.habitchoose); const meta=h? habitOf(h.id) : null;
    closeSheets(); renderAll();
    toast(meta? (meta.kind==='stop'? meta.t+'. One day at a time.' : meta.t+' it is. One thing.') : 'Could not start that',
      meta? 'Undo' : undefined, meta? ()=>{ S.habits=beforeH; save(); renderAll(); } : undefined);
    return; }
  const ho=e.target.closest('[data-habitown]');
  if(ho){
    const kind=ho.dataset.habitown==='stop'? 'stop' : 'start';
    const box=document.getElementById('own_'+kind), msg=document.getElementById('ownmsg_'+kind);
    const r=addOwnHabit(kind,box? box.value : '');
    if(r.error){ if(msg) msg.textContent=r.error; if(box) box.focus(); return; }
    const beforeH=JSON.parse(JSON.stringify(habitSlots()));
    startHabit(r.habit.id); closeSheets(); renderAll();
    toast((kind==='stop'? 'Stop: ' : '')+r.habit.t+(kind==='stop'? '. One day at a time.' : '. One thing.'),'Undo',()=>{ S.habits=beforeH; save(); renderAll(); });
    return; }
  const trec=e.target.closest('[data-tplrec]');
  if(trec&&tplDraft){ const i=+trec.dataset.tplrec, r=tplDraft.ex[i];
    const before=Object.assign({},r); Object.assign(r,recommendedFor(r.exId)); drawTplEdit();
    toast('Set to the recommendation','Undo',()=>{ Object.assign(tplDraft.ex[i],before); drawTplEdit(); }); return; }
  if(e.target.closest('#tplRecAll')&&tplDraft){
    const before=JSON.parse(JSON.stringify(tplDraft.ex));
    tplDraft.ex.forEach(r=>Object.assign(r,recommendedFor(r.exId))); drawTplEdit();
    toast('All set to the recommendation','Undo',()=>{ tplDraft.ex=before; drawTplEdit(); }); return; }
  const hopen=e.target.closest('[data-habitopen]');
  if(hopen){ openHabitOne(hopen.dataset.habitopen); return; }
  const hr=e.target.closest('[data-habitretire]');
  if(hr){
    /* any slot, not just the first two: the third habit could never be
       removed because everything that was not "stop" was treated as "start" */
    const slot=HABIT_SLOTS.indexOf(hr.dataset.habitretire)>=0? hr.dataset.habitretire : 'start';
    const cur=currentHabit(slot), meta=cur? habitOf(cur.id) : null;
    const snapshot=JSON.parse(JSON.stringify(habitSlots()));
    retireHabit(slot); closeSheets(); renderAll();
    toast((meta? meta.t : 'Habit')+' put down','Undo',()=>{ S.habits=snapshot; save(); renderAll(); });
    return; }
  if(e.target.closest('#habitChange')){ openHabitSheet(); return; }
  const gl=e.target.closest('[data-glance]');
  if(gl){ const what=gl.dataset.glance;
    if(what==='food') openFood(false);
    else if(what==='weigh') openWeigh();
    else if(what==='checkin') openDay();
    else if(what==='sleep') openSleep();
    else openQuick(what);
    return; }
  const qs=e.target.closest('[data-quickstep]');
  if(qs){ const el=document.getElementById('quickValue');
    if(el){ el.value=Math.max(0,(+el.value||0)+ +qs.dataset.quickstep); quickPreview(); } return; }
  if(e.target.closest('#quickSave')){ saveQuick(); return; }
  if(e.target.closest('#quickFull')){ const k=quickKind; closeSheets();
    if(k==='day') openDay(); else if(k==='protein') openFood(false); else openDay(); return; }
  const pok=e.target.closest('[data-painok]');
  if(pok){ const n=pok.dataset.painok; clearPain(n); toast(n+' is back in the plan'); }
  const pso=e.target.closest('[data-painsore]');
  if(pso){ const n=pso.dataset.painsore;
    const c=S.checkins[0]; if(c){ c.painAsked=Date.now(); }
    save(); renderAll();
    const alt=(typeof painAlternative==='function')? painAlternative(n) : null;
    toast(alt? n+' stays out. '+alt.n+' trains the same thing if you want it in.'
            : n+' stays out. If it keeps up, that is a physio question.'); }
  if(e.target.closest('#setTarget')){ openTargetSheet(); return; }
  const tk=e.target.closest('[data-targetkind]');
  if(tk){ targetDraft.kind=tk.dataset.targetkind; drawTargetSheet(); return; }
  const tw=e.target.closest('[data-targetweeks]');
  if(tw){ targetDraft.weeks=+tw.dataset.targetweeks; drawTargetSheet(); return; }
  if(e.target.closest('#targetSave')){
    const v=+((document.getElementById('targetValue')||{}).value||0);
    if(!v){ toast('Put a number on it'); return; }
    const by=addDays(todayKey(),targetDraft.weeks*7);
    const t=setTarget(targetDraft.kind,v,by,targetDraft.exId);
    t.from=targetNow()!==null? targetNow() : 0;
    S.targets=ownTargets(); save();
    closeSheets(); renderAll();
    const ct=t.kind==='weight'? calorieTarget() : null;
    toast(ct&&ct.dir!=='hold'? v+'kg: eat '+num(ct.kcal)+' kcal'+(ct.capped?', capped to a safe rate':'') : v+' by '+prettyDate(by)); return; }
  if(e.target.closest('#targetClear')){
    const was=JSON.parse(JSON.stringify(S.target||null));
    clearTarget(); S.targets=ownTargets(); save(); closeSheets(); renderAll();
    toast('Target cleared','Undo',()=>{ S.target=was; save(); renderAll(); }); return; }
  if(e.target.closest('#todoWeigh')) openWeigh();
  if(e.target.closest('#todoDay')) openDay();
  if(e.target.closest('#todoCheck')) openWeek();
  if(e.target.closest('#connectBtn')||e.target.closest('#connectBtn2')) openConnect();
  const cn=e.target.closest('[data-connect]');
  if(cn){ connectHealth(cn.dataset.connect); closeSheets(); }
  if(e.target.closest('#disconnectBtn')){ disconnectHealth(); toast('Tracker disconnected'); }
  if(e.target.closest('[data-weigh]')) openWeigh();
  if(e.target.closest('#detailsBtn')) openDetails();
  if(e.target.closest('#tempoSetting')){ S.profile.showTempo=!showTempoSafe(); save(); renderProgress();
    if(typeof GYM!=='undefined'&&GYM) drawGym(); toast(showTempoSafe()?'Tempo shown':'Tempo hidden'); }
  if(e.target.closest('#nudgeBtn')){
    const st=nudgeState();
    if(st==='on') disableNudges();
    else if(st==='blocked') toast('Your browser is blocking notifications for this site');
    else if(st==='unsupported') toast(onIOS()&&!installed()? 'Add Gauntlet to your Home Screen first, then turn reminders on' : 'This browser cannot do reminders');
    else enableNudges();
    return; }
  /* The page itself carries data-theme once a theme is chosen, so a picker
     that also used data-theme matched the whole page: every tap anywhere
     re-ran setTheme, redrew everything, and replaced any Undo toast with
     "Theme: ...". The picker has its own attribute now. */
  const th=e.target.closest('[data-themepick]');
  /* A single choice: make it, close the sheet, say so once. The sheet used to
     stay open with the old option still ticked while the app had changed. */
  if(th){ const v=th.dataset.themepick;
    if(v!==themeOf()){ setTheme(v); closeSheets(); toast('Appearance: '+(THEMES.find(x=>x[0]===v)||[])[1]); } }
  if(e.target.closest('#tempoWhat')&&typeof openTempoHelp==='function') openTempoHelp();
});
$('findBtn').addEventListener('click',()=>{renderPeople();openSheet('findSheet')});
$('themeBtn').addEventListener('click',flipTheme);
/* One button that reaches everything you can put in, from any screen. Logging
   used to live only on Today, so anywhere else meant navigating home first. */
/* The + used to be a list of seven rows of equal weight, which made the two
   things people do every day (food and the session) no easier to reach than
   the two they do weekly. Tiles instead: bigger targets, scannable at a
   glance, and ordered by how often they are actually used.
   Food gets the top, full width, with today's total on it, because eating is
   logged several times a day and everything else once at most. */
const LOG_ICONS={
  food:'<path d="M4 3v8a3 3 0 0 0 3 3v7M7 3v7M10 3v8M17 3c-1.5 2-2 4-2 7h4c0-3-.5-5-2-7ZM17 10v11"/>',
  today:'<path d="M4 9v6M8 5v14M16 5v14M20 9v6M8 12h8"/>',
  weigh:'<circle cx="12" cy="12" r="8"/><path d="M12 12 9 8"/>',
  day:'<circle cx="12" cy="12" r="8"/><path d="M9 14c.9.9 1.9 1.3 3 1.3s2.1-.4 3-1.3M9 9.5h.01M15 9.5h.01"/>',
  week:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4"/>',
  templates:'<path d="M4 6h16M4 12h16M4 18h10"/>',
  coach:'<path d="M21 12a8 8 0 1 1-3.2-6.4M12 8v4l2.5 2.5"/>'};
const logIcon=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LOG_ICONS[k]||''}</svg>`;
function openLog(){
  const d=todayPlan(), logged=S.days[todayKey()], k=todayKey();
  const weighed=S.weights.length&&S.weights[S.weights.length-1].d===k;
  const t=S.targets||{}, eaten=(typeof foodTotals==='function')? foodTotals(k) : {kcal:0,protein:0};
  const tile=(id,title,sub,tone,done)=>`<button class="logtile ${done?'done':''}" data-log="${id}" style="--tone:${tone||'var(--mute)'}">
    <span class="ic">${logIcon(id)}</span>
    <span class="t">${title}</span><span class="s">${sub}</span></button>`;
  const left=t.kcal? Math.max(0,Math.round(t.kcal-eaten.kcal)) : null;
  $('logBody').innerHTML=`
    <button class="logtile wide" data-log="food" style="--tone:var(--amber-text)">
      <span class="ic">${logIcon('food')}</span>
      <span class="t">Log food</span>
      <span class="s">${dayFood(k).length
        ? num(Math.round(eaten.kcal))+' kcal so far'+(left!==null? ', '+num(left)+' left today' : '')+' · '+Math.round(eaten.protein)+'g protein'
        : (t.kcal? num(t.kcal)+' kcal and '+t.protein+'g protein to aim at today' : 'Tap what you ate from a list')}</span>
      ${t.kcal? `<span class="bar"><i style="width:${Math.min(100,Math.round(eaten.kcal/t.kcal*100))}%"></i></span>`:''}
    </button>
    <div class="logtiles">
      ${d&&d.type&&d.slot!=='walk'? tile('today',(dayDone(dowIdx())?'Do it again':'Start '+dayLabel(d)),daySub(d),(HUE[d.kind]||HUE.any).deep,dayDone(dowIdx())):''}
      ${isTeen()? '' : tile('weigh',weighed?'Weigh in again':'Weigh in',weighed? S.weights[S.weights.length-1].kg+' kg today':'Five seconds','var(--green-text)',weighed)}
      ${tile('day',"Today's Check-in",logged&&logged.checkedIn? 'Done for today' : 'Twenty seconds','var(--green-text)',!!(logged&&logged.checkedIn))}
      ${!isTeen()&&typeof stepsToday==='function'&&!healthOn()? tile('steps','Steps',(()=>{ const v=(S.days[todayKey()]||{}).steps; return typeof v==='number'? num(v)+' today' : 'What your phone says'; })(),'var(--amber-text)',typeof (S.days[todayKey()]||{}).steps==='number') : ''}
      ${tile('week','Weekly check in',checkinDone()?'Done for this week':'Next week is built from it','var(--amber)',checkinDone())}
      ${tile('templates','Something else','Any template, circuit or run','var(--ink)')}
      ${tile('coach','Ask about your record','Everything the app knows','var(--cta)')}
    </div>`;
  openSheet('logSheet');
}
document.addEventListener('click',e=>{
  if(e.target.closest('#logBtn')){ openLog(); return; }
  const lg=e.target.closest('[data-log]'); if(!lg) return;
  const what=lg.dataset.log; closeSheets();
  if(what==='today') startPlanDay(todayPlan());
  if(what==='weigh') openWeigh();
  if(what==='food'&&typeof openFood==='function') openFood(false);
  if(what==='day') openDay();
  if(what==='week') openWeek();
  if(what==='steps') openQuick('steps');
  if(what==='templates'&&typeof drawTemplates==='function'){ drawTemplates(); openSheet('tplSheet'); }
  if(what==='coach'&&typeof openCoach==='function') openCoach();
});
function drawAimSheet(){
  $('aimBody').innerHTML=AIMS.map(a=>`<button class="opt ${S.profile.aim===a.id?'on':''}" data-aim="${a.id}">
    <div class="txt"><div class="t">${a.t}</div><div class="s">${a.s}</div></div><div class="rad"></div></button>`).join('');
}

