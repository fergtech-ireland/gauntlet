/* ---------- You: the settings, where people can find them ----------
   Settings used to live in a panel called "Coaching detail", inside a sheet,
   behind a small text link at the bottom of the Progress screen. The things
   people check most (goal, calories, steps, habits, easy weeks) now sit at the
   top of their own screen, each row showing its current value, and the app's
   own settings sit at the bottom, where people look for them in every app. */
const SET_ICON={
  aim:'<path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="8"/>',
  goal:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.8"/>',
  body:'<path d="M5 20l2-8h10l2 8M9 12V8a3 3 0 0 1 6 0v4"/>',
  steps:'<path d="M8 20c-2 0-3-2-2-5l1-4c1-3 5-3 5 1 0 3-2 8-4 8zM16 13c-2 0-3-2-2-5l1-3c1-2 4-2 4 1 0 3-1 7-3 7z"/>',
  habits:'<path d="M5 12l4 4 10-10"/>',
  deload:'<path d="M4 17h4v-4h4V9h4V5h4"/>',
  kit:'<path d="M3 10v4M21 10v4M6 8v8M18 8v8M6 12h12"/>',
  cycle:'<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16"/>',
  records:'<path d="M4 19V9M10 19V5M16 19v-6M22 19H2"/>',
  coach:'<path d="M4 5h16v11H9l-5 4z"/>',
  data:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  theme:'<path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z"/>',
  tempo:'<circle cx="12" cy="13" r="7"/><path d="M12 13V9M10 3h4"/>',
  nudge:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20h4"/>',
  account:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  how:'<circle cx="12" cy="12" r="9"/><path d="M12 17v-5M12 8v.5"/>'
};
const TONE={
  marine:{bg:'var(--t-marine)',fg:'var(--marine)'}, forest:{bg:'var(--t-forest)',fg:'var(--forest)'},
  burnt:{bg:'var(--t-burnt)',fg:'var(--burnt)'}, oxblood:{bg:'var(--t-oxblood)',fg:'var(--oxblood)'},
  marigold:{bg:'var(--t-marigold)',fg:'var(--burnt)'}, grey:{bg:'var(--grey-btn)',fg:'var(--mute)'}
};
function setRow(key,tone,label,value,sub,id,subId){
  return `<button class="ysrow" data-setting="${key}"${id?` id="${id}"`:''}>
    <span class="sic" style="background:${TONE[tone].bg};color:${TONE[tone].fg}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SET_ICON[key]||''}</svg></span>
    <span class="stx"><b>${label}</b><span class="sv">${value}</span>${sub?`<small${subId?` id="${subId}"`:''}>${sub}</small>`:''}</span>
    <span class="chev" aria-hidden="true">›</span></button>`;
}
function renderSettings(){
  const top=document.getElementById('settingsList'), more=document.getElementById('settingsMore');
  const app=document.getElementById('appSettings');
  if(!top||!more) return;
  const p=S.profile||{};
  const aim=(typeof aimOf==='function')? aimOf(p.aim) : {t:p.aim||''};
  let ct=null; try{ ct=p.detailsSet? calorieTarget() : null; }catch(e){}
  const tg=S.target, TK=(typeof TARGET_KINDS!=='undefined')? TARGET_KINDS : {};
  const goal= !tg? 'Not set'
    : (tg.hit? 'Met on '+prettyDateSafe(tg.hit)
      : tg.value+(tg.kind==='sessions'?' a week':(TK[tg.kind]? ' '+TK[tg.kind].unit : ''))+(tg.by? ' by '+prettyDateSafe(tg.by) : ''));
  const hs=currentHabit('start'), hx=currentHabit('stop');
  const habits=[hs? escHabit(habitOf(hs.id).t)+(habitStreak('start')? ' · '+habitStreak('start')+' days' : '') : '',
                hx? 'Stop: '+escHabit(habitOf(hx.id).t)+(habitStreak('stop')? ' · '+habitStreak('stop')+' days' : '') : ''].filter(Boolean);
  let nx=null; try{ nx=nextDeload(); }catch(e){}
  const dl= typeof deloadDue==='function'&&deloadDue()? 'This week is an easy week'
    : (p.deload===false? 'Only when you add one' : 'Every '+(+p.deloadEvery||DELOAD_EVERY)+' weeks'+(nx? ', next '+prettyDateSafe(nx) : ''));
  const kit=kitOf().length===ALL_KIT.length? 'Everything' : KIT.filter(k=>kitOf().indexOf(k.id)>=0).map(k=>k.t).join(', ');
  const ns=nudgeState();
  const nudgeVal= ns==='on'? 'On, 7pm '+checkinDayName() : (ns==='blocked'? 'Blocked by your browser' : 'Off');
  const signed=signedInSafe();
  const showCycle= p.sex==='f'||(S.cycle&&S.cycle.tracking);

  top.innerHTML=`<div class="ysgroup"><div class="yshead">Your plan</div>
    ${setRow('aim','marine','Aim and training days', aim.t+' · '+(+p.liftDays||0)+' lifting, '+(+p.cardioDays||0)+' cardio')}
    ${setRow('goal','forest','Goal', goal)}
    ${setRow('body','burnt','Calories and body', p.detailsSet&&ct? 'Eat '+num(ct.kcal)+' kcal · maintenance '+num(ct.maintenance) : 'Add your details to work these out')}
    ${setRow('steps','marine','Daily steps', num(stepTarget())+' a day')}
    ${setRow('habits','forest','Habits', habits.length? habits.join('<br>') : 'None yet. One to start, one to stop')}
    ${setRow('style','burnt','Training style', STYLES[styleOf()].t+(styleOf()==='hybrid'? ' · '+hyroxDaysOf(sessionsWanted())+' HYROX, '+(sessionsWanted()-hyroxDaysOf(sessionsWanted()))+' CrossFit' : ''))}
    ${styleOf()!=='gym'? '' : setRow('split','marine','Training split', (()=>{ const sp=splitOf(); return sp? SPLITS[(S.profile.split||'auto')].t+(S.profile.split==='auto'? ' ('+SPLITS[sp].t.toLowerCase()+')' : '') : 'Push, lower, pull (the original week)'; })())})}
    ${setRow('focus','burnt','Lifting focus', LIFT_FOCUS[liftFocus()].t+' · '+(()=>{ const r=LIFT_FOCUS[liftFocus()].rx.heavy; return 'big lifts '+r.repMin+' to '+r.reps+' reps'; })()+(S.profile.liftFocus?'':' (from your aim)'))}
    ${(()=>{ const dir=goalDirection(); return dir==='hold'? '' :
      setRow('pace','forest','Pace', paceOf().label+' · '+(dir==='lose'? (paceOf().lose*100)+'% of your weight a week' : (paceOf().gain*100)+'% a week')); })()}
    ${setRow('deload','marigold','Easy weeks', dl)}
    ${setRow('kit','grey','Kit you train with', kit)}
  </div>`;

  more.innerHTML=`<div class="ysgroup"><div class="yshead">Your records</div>
    ${setRow('records','marine','Weight, tracker and numbers', S.weights.length? S.weights.length+' weigh ins' : 'No weigh ins yet')}
    ${setRow('coach','forest','Coach and weekly brief', coachReady&&coachReady()? 'Connected' : 'Your whole record in plain English')}
  </div>`;
  /* Settings are things people go looking for on purpose, so they live behind
     the gear rather than taking up room under what they check every day. */
  if(app) app.innerHTML=`<div class="ysgroup" style="padding-top:0">
    ${setRow('theme','grey','Theme', (THEMES.find(t=>t[0]===themeOf())||THEMES[0])[1])}
    ${setRow('tempo','grey','Tempo guidance', showTempoSafe()? 'On' : 'Off', 'The four digits beside your sets. Off leaves your programme exactly as it is.')}
    ${setRow('nudge','grey','Check in reminder', nudgeVal, nudgeHelp(), 'nudgeBtn', 'nudgeNote')}
    ${showCycle? setRow('cycle','oxblood','Cycle', S.cycle&&S.cycle.tracking? 'Tracking' : 'Off') : ''}
    ${setRow('account','grey','Account and sync', signed? 'Signed in' : 'On this device only')}
    ${setRow('data','grey','Your data', 'Download it, or delete it')}
    ${setRow('how','grey','How the numbers are worked out', 'Every formula, and where it comes from')}
  </div>`;
}
let yTab='progress';
function showYTab(name){
  yTab=['progress','sessions','plan'].indexOf(name)>=0? name : 'progress';
  ['progress','sessions','plan'].forEach(k=>{
    const panel=document.getElementById('ypanel-'+k), tab=document.getElementById('ytab-'+k);
    if(panel) panel.hidden = k!==yTab;
    if(tab){ tab.classList.toggle('on',k===yTab); tab.setAttribute('aria-selected',k===yTab?'true':'false'); }
  });
}
function openAppSettings(){ renderSettings(); openSheet('settingsSheet'); }
try{ Object.assign(window.__G,{showYTab,openAppSettings,renderSettings}); }catch(e){}
document.addEventListener('click',e=>{
  const yt=e.target.closest('[data-ytab]');
  if(yt){ showYTab(yt.dataset.ytab); return; }
  if(e.target.closest('#settingsBtn')){ openAppSettings(); return; }
});
/* left and right arrows move between tabs, as a tablist should */
document.addEventListener('keydown',e=>{
  if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight') return;
  const t=e.target.closest('[data-ytab]'); if(!t) return;
  const order=['progress','sessions','plan'];
  const i=order.indexOf(t.dataset.ytab);
  const n=order[(i+(e.key==='ArrowRight'?1:order.length-1))%order.length];
  showYTab(n); const btn=document.getElementById('ytab-'+n); if(btn) btn.focus();
});
function openThemeSheet(){
  const desc={light:'The default', dark:'Easier in a dark gym or late at night', auto:'Light or dark, whatever your phone is set to'};
  document.getElementById('altTitle').textContent='Theme';
  document.getElementById('altSub').textContent='Light unless you choose otherwise.';
  document.getElementById('altBody').innerHTML=`<div style="padding:0 14px 6px" id="themeOpts">
    ${THEMES.map(([id,label])=>`<button class="opt ${themeOf()===id?'on':''}" data-themepick="${id}">
      <div class="txt"><div class="t">${label}</div><div class="s">${desc[id]||''}</div></div><div class="rad"></div></button>`).join('')}
  </div>`;
  openSheet('altSheet');
}
document.addEventListener('click',e=>{
  const r=e.target.closest('[data-setting]'); if(!r) return;
  const k=r.dataset.setting;
  if(k==='aim'){ drawAimSheet(); openSheet('aimSheet'); }
  else if(k==='goal') openTargetSheet();
  else if(k==='body'||k==='steps') openDetails();
  else if(k==='habits') openHabitSheet();
  else if(k==='deload') openDeloadSheet();
  else if(k==='focus') openFocusSheet();
  else if(k==='split') openSplitSheet();
  else if(k==='pace') openPaceSheet();
  else if(k==='style') openStyleSheet();
  else if(k==='kit') openKitSheet();
  else if(k==='cycle') openCycle();
  else if(k==='records') openYou();
  else if(k==='coach') openCoach();
  else if(k==='data') openData();
  else if(k==='theme') openThemeSheet();
  else if(k==='tempo'){ S.profile.showTempo=!showTempoSafe(); save(); renderAll();
    toast(showTempoSafe()? 'Tempo guidance on' : 'Tempo guidance off. Your programme is unchanged.'); }
  else if(k==='account'){ openYou(); setTimeout(()=>{ const cp=document.getElementById('cloudPanel');
    if(cp&&cp.scrollIntoView) cp.scrollIntoView({block:'start',behavior:'smooth'}); },80); }
  else if(k==='how') openHow();
  /* 'nudge' is handled by its own existing handler, through id="nudgeBtn" */
});
/* the settings list redraws whenever the rest of the You screen does */
const _renderProgressYou=renderProgress;
renderProgress=function(){ _renderProgressYou(); renderSettings(); };

/* ---------- a past session, opened ---------- */
const KIND_LABEL={workout:'Workout',run:'Run',meal:'Meal',fast:'Fast',circuit:'Circuit',walk:'Walk'};
function workoutFor(post){
  if(!post) return null;
  const s=post.session||{};
  if(s.workoutId){ const w=(S.workouts||[]).find(x=>x.id===s.workoutId); if(w) return w; }
  /* sessions logged before posts carried the link: same day, same name */
  if(post.kind==='workout') return (S.workouts||[]).find(x=>x.d===post.d&&x.name===post.title)||null;
  return null;
}
function setText(s){
  const kg=+s.kg||0, reps=+s.reps||0;
  return (kg? num(kg)+'kg × ' : '× ')+reps;
}
/* ---------- a finished session, in full ----------
   Everything here is computed from what was actually logged: nothing is
   estimated except the one-rep max, which says it is an estimate and which
   formula it uses. Comparisons are with the last WORKING session of the same
   thing, so an easy week is never held up as a drop. */
function workSets(e){ return (e.sets||[]).filter(s=>!s.warm); }
function exVolume(e){ return workSets(e).reduce((a,s)=>a+(+s.kg||0)*(+s.reps||0),0); }
function exReps(e){ return workSets(e).reduce((a,s)=>a+(+s.reps||0),0); }
function bestSet(e){
  const ws=workSets(e); if(!ws.length) return null;
  return ws.reduce((a,s)=>{ const ea=e1RM(+a.kg||0,+a.reps||0), es=e1RM(+s.kg||0,+s.reps||0);
    return es>ea||(es===ea&&(+s.kg||0)>(+a.kg||0))? s : a; }, ws[0]);
}
function finishedAt(w){
  if(w.finished) return new Date(w.finished);
  const ms=+String(w.id||'').replace(/^w/,'');
  return ms>1e12? new Date(ms) : null;
}
const hhmm=d=>d? String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0') : '';
/* the most recent working entry for this movement before this session */
function previousOf(exId,w){
  const hist=(S.lifts&&S.lifts[exId])||[];
  return hist.filter(h=>!h.deload&&h.d<w.d).sort((a,b)=>a.d<b.d?1:-1)[0]||null;
}
function previousWorkout(w){
  return (S.workouts||[]).filter(x=>x!==w&&x.templateId&&x.templateId===w.templateId&&!x.deload&&x.d<w.d)
    .sort((a,b)=>a.d<b.d?1:-1)[0]||null;
}
function signed(n,unit){ const r=Math.round(n*10)/10; return (r>0?'+':(r<0?'−':''))+num(Math.abs(r))+(unit||''); }
function sessionDetail(w){
  const exs=(w.ex||[]).filter(e=>e.sets&&e.sets.length);
  const work=exs.reduce((a,e)=>a+workSets(e).length,0);
  const warm=exs.reduce((a,e)=>a+(e.sets.length-workSets(e).length),0);
  const reps=exs.reduce((a,e)=>a+exReps(e),0);
  const vol=exs.reduce((a,e)=>a+exVolume(e),0);
  /* muscles, by working sets */
  const groups={};
  exs.forEach(e=>{ const g=exOf(e.exId).g||'Other'; groups[g]=(groups[g]||0)+workSets(e).length; });
  const muscles=Object.keys(groups).sort((a,b)=>groups[b]-groups[a]).map(g=>({g,sets:groups[g]}));
  const end=finishedAt(w), start=w.started? new Date(w.started) : (end&&w.minutes? new Date(end.getTime()-w.minutes*60000) : null);
  const prev=previousWorkout(w);
  return {exs,work,warm,reps,vol,muscles,start,end,prev,
    prevVolPct: prev&&prev.volume? Math.round((vol-prev.volume)/prev.volume*100) : null};
}
/* an HIFB session's runs, as recorded, against the one before it */
function hifbDetail(w){
  const prev=lastHifbBefore(w), st=runStats(w), pst=prev&&runStats(prev), lines=[];
  if(st) lines.push(`Average ${st.m}m between blocks ${fmtSplit(st.avg)}${pst? ', against '+fmtSplit(pst.avg)+' on '+prettyDateSafe(prev.d) : ''}. ${fadeText(st.fade)}`);
  if(w.totalMs) lines.push(`First run to last: ${fmtSplit(w.totalMs)}${prev&&prev.totalMs? ', against '+fmtSplit(prev.totalMs) : ''}.`);
  if(w.runM) lines.push(`${fmtKm(w.runM/1000)} km run in ${fmtSplit(w.runMs)}.`);
  if(w.rpe) lines.push(`Effort ${w.rpe} out of 10, a training load of ${num(w.rpe*(w.minutes||0))} (session RPE times minutes).`);
  return hifbRunsTable(w,prev)+lines.map(l=>`<div class="note sline">${l}</div>`).join('');
}
const lastHifbBefore=w=>{ const all=(S.workouts||[]); const i=all.indexOf(w);
  return all.slice(i+1).find(x=>x.kind==='hifb'&&x.templateId===w.templateId&&(x.runs||[]).some(r=>r.ms))||null; };
function exerciseDetail(e,w){
  const x=exOf(e.exId), ws=workSets(e), b=bestSet(e), weighted=ws.some(s=>+s.kg>0);
  const prev=previousOf(e.exId,w), pws=prev? prev.sets.filter(s=>!s.warm) : [];
  const top=ws.length? Math.max(...ws.map(s=>+s.kg||0)) : 0;
  const ptop=pws.length? Math.max(...pws.map(s=>+s.kg||0)) : null;
  const preps=pws.reduce((a,s)=>a+(+s.reps||0),0);
  const pvol=pws.reduce((a,s)=>a+(+s.kg||0)*(+s.reps||0),0);
  const pl=e.plan||null;
  const topHit= pl&&pl.reps? ws.length>0&&ws.every(s=>+s.reps>=pl.reps) : null;
  return {x,ws,b,weighted,prev,top,ptop,reps:exReps(e),vol:exVolume(e),
    dTop: ptop!==null? top-ptop : null, dReps: prev? exReps(e)-preps : null, dVol: prev&&weighted? exVolume(e)-pvol : null,
    e1:b&&weighted? e1RM(+b.kg,+b.reps) : null, plan:pl, topHit};
}
/* From the finish screen, straight to the full record of what was just done. */
function openSessionByWorkout(wid){
  const post=S.mine.find(m=>m.session&&m.session.workoutId===wid)||S.mine.find(m=>m.workoutId===wid);
  if(post) return openSession(post.id);
  /* no feed card for it: build a stand-in so the same viewer is used */
  const w=S.workouts.find(x=>x.id===wid); if(!w) return;
  const temp={id:'tmp_'+wid,kind:'workout',title:w.name,d:w.d,session:{workoutId:wid},__temp:true};
  S.mine.unshift(temp);
  try{ openSession(temp.id); } finally { S.mine=S.mine.filter(m=>m!==temp); }
}
document.addEventListener('click',e=>{
  const ss=e.target.closest('#seeSession');
  if(ss){ const wid=ss.dataset.wid;
    const g=document.getElementById('gym'); if(g) g.classList.remove('on');
    if(typeof closeGym==='function'){ try{ closeGym(); }catch(err){} }
    openSessionByWorkout(wid); }
});
function openSession(id){
  const post=S.mine.find(m=>m.id===id); if(!post) return;
  const w=workoutFor(post);
  document.getElementById('sessTitle').textContent=post.title||'Session';
  const when=w? sessionDetail(w) : null;
  document.getElementById('sessSub').textContent=[KIND_LABEL[post.kind]||'Session', prettyDateSafe(post.d),
    when&&when.start&&when.end? hhmm(when.start)+' to '+hhmm(when.end) : ''].filter(Boolean).join(' · ');
  let body='';
  if(w){
    const D=when, prs=w.prs||[];
    body+=`<div class="sgrid">
      <div><b>${w.minutes||0}</b><span>minute${(w.minutes||0)===1?'':'s'}</span></div>
      <div><b>${D.work}</b><span>working sets${D.warm?' + '+D.warm+' warm up':''}</span></div>
      <div><b>${num(D.reps)}</b><span>reps</span></div>
      <div><b>${num(Math.round(D.vol))}</b><span>kg lifted</span></div></div>`;
    if(w.kind==='hifb') body+=hifbDetail(w);
    if(D.prev&&D.prevVolPct!==null)
      body+=`<div class="note sline">${D.prevVolPct===0?'The same total as':(Math.abs(D.prevVolPct)+'% '+(D.prevVolPct>0?'more':'less')+' in total than')} your last ${escHabit(w.name)}, on ${prettyDateSafe(D.prev.d)}.</div>`;
    if(D.muscles.length)
      body+=`<div class="slab">What it worked</div><div class="mgrid">${D.muscles.map(m=>`<span><b>${escHabit(m.g)}</b> ${m.sets} set${m.sets===1?'':'s'}</span>`).join('')}</div>`;
    if(prs.length) body+=`<div class="note sline"><b>Personal best${prs.length>1?'s':''}:</b> ${prs.map(id=>escHabit(exOf(id).n)).join(', ')}.</div>`;
    if(w.deload) body+=`<div class="note sline">An easy week session. It is on your record, but it never set the weights that followed it.</div>`;
    body+=`<div class="slab">Every set</div>`;
    body+=D.exs.map(e=>{
      const X=exerciseDetail(e,w);
      let n=0;
      const setsHtml=e.sets.map(s=>{ const lab=s.warm? 'W' : String(++n);
        return `<div class="srow ${s.warm?'warm':''} ${s===X.b?'best':''}"><span class="sn">${lab}</span><span>${setText(s)}</span>${s===X.b&&!s.warm?'<span class="stag">best</span>':''}</div>`; }).join('');
      const lines=[];
      lines.push(`${X.ws.length} set${X.ws.length===1?'':'s'} · ${num(X.reps)} reps${X.weighted?' · '+num(Math.round(X.vol))+' kg':''}`);
      if(X.e1) lines.push(`Best set ${setText(X.b)}. About ${num(X.e1)} kg estimated one-rep max (Epley formula, an estimate rather than a test).`);
      if(X.plan&&X.plan.reps&&X.ws.length){
        const target=(X.plan.repMin&&X.plan.repMin<X.plan.reps? X.plan.repMin+' to '+X.plan.reps : X.plan.reps)+' reps'+(X.plan.kg? ' at '+num(X.plan.kg)+' kg' : '');
        const planned=X.plan.sets||X.ws.length;
        const diff= planned!==X.ws.length? ` You did ${X.ws.length} working set${X.ws.length===1?'':'s'}, ${X.ws.length>planned? (X.ws.length-planned)+' more' : (planned-X.ws.length)+' fewer'} than planned.` : '';
        lines.push(`Planned ${planned} × ${target}.${diff} `+(X.topHit? 'Top of the range on every set, so the weight goes up next time.' : 'Not every set reached the top of the range yet.'));
      }
      if(X.prev){
        const bits=[];
        if(X.weighted&&X.dTop) bits.push(signed(X.dTop,' kg')+' on the top set');
        if(X.dReps) bits.push(signed(X.dReps,'')+' rep'+(Math.abs(X.dReps)===1?'':'s'));
        if(X.weighted&&X.dVol) bits.push(signed(Math.round(X.dVol),' kg')+' in total');
        lines.push('Against '+prettyDateSafe(X.prev.d)+': '+(bits.length? bits.join(', ')+'.' : 'exactly the same.'));
      } else lines.push('The first time this one was logged.');
      return `<div class="sessex">
        <div class="sxh"><b>${escHabit(X.x.n)}</b>${prs.indexOf(e.exId)>=0?'<span class="pr" title="Personal record">PR</span>':''}
          <button class="movebtn" data-showmove="${e.exId}">show me</button></div>
        <div class="slist">${setsHtml}</div>
        ${lines.map(l=>`<div class="sxl">${l}</div>`).join('')}</div>`;
    }).join('');
    if(w.templateId&&(S.templates||[]).some(t=>t.id===w.templateId))
      body+=`<button class="sheetcta" data-redo="${w.templateId}">Do this again</button>`;
  } else if(post.kind==='workout'){
    body+=`<div class="note">The set by set detail for this one was not kept. Every session from now on keeps it.</div>`;
  } else {
    if(post.chips&&post.chips.length) body+=`<div class="chips" style="pointer-events:none;margin-bottom:10px">${post.chips.map(c=>`<button>${c}</button>`).join('')}</div>`;
    if(post.unit) body+=`<div class="method"><b>${post.title}</b><span>${post.unit}</span></div>`;
    if(post.macros&&(post.macros.p+post.macros.c+post.macros.f)>0)
      body+=`<div class="numline" style="margin:10px 0"><div><b>${post.macros.p}g</b> protein</div><div><b>${post.macros.c}g</b> carbs</div><div><b>${post.macros.f}g</b> fat</div></div>`;
    const steps=(post.session&&post.session.steps)||[];
    if(steps.length) body+=`<div class="slab">What was in it</div>`+steps.map(s=>`<div class="revrow" style="pointer-events:none"><div class="txt"><div class="t">${s.n}</div>${s.r?`<div class="s">${s.r}</div>`:''}</div></div>`).join('');
    if(post.cap) body+=`<div class="note">${post.cap}</div>`;
  }
  document.getElementById('sessBody').innerHTML=`<div style="padding:0 14px 6px">${body}</div>`;
  openSheet('sessSheet');
}
Object.assign(window.__G||{},{sessionDetail,exerciseDetail,bestSet,previousOf,previousWorkout,openSession});
function openAllSessions(){
  const byMonth={};
  S.mine.forEach(m=>{ const key=(m.d||'').slice(0,7); (byMonth[key]=byMonth[key]||[]).push(m); });
  const monthName=k=>{ try{ return dateOf(k+'-01').toLocaleDateString('en-GB',{month:'long',year:'numeric'}); }catch(e){ return k; } };
  document.getElementById('sessTitle').textContent='All sessions';
  document.getElementById('sessSub').textContent=S.mine.length+' logged';
  document.getElementById('sessBody').innerHTML=`<div style="padding:0 14px 6px">${Object.keys(byMonth).sort().reverse().map(k=>
    `<div class="slab">${monthName(k)}</div>`+byMonth[k].map(m=>`<button class="revrow" data-sess="${m.id}">
      <div class="txt"><div class="t">${m.title}</div><div class="s">${KIND_LABEL[m.kind]||'Session'} · ${prettyDateSafe(m.d)}</div></div>
      <span class="chev">›</span></button>`).join('')).join('')}</div>`;
  openSheet('sessSheet');
}
document.addEventListener('click',e=>{
  const sc=e.target.closest('[data-sess]');
  if(sc){ openSession(sc.dataset.sess); return; }
  if(e.target.closest('#allSess')){ openAllSessions(); return; }
  const rd=e.target.closest('[data-redo]');
  if(rd){ const id=rd.dataset.redo; closeSheets(); startWorkout(id); }
});
Object.assign(window.__G||{},{renderSettings,openThemeSheet,openSession,openAllSessions,workoutFor,setRow,prettyDateSafe});
Object.assign(window.__G||{},{STYLES,circStyle,HIFB,HIFB_ORDER,HIFB_DAYS,hifbPattern,isHifb,hifbRunKm,hifbMins,parseSplit,perKm,runOf,gymRuns,startRun,stopRun,runStats,fadeText,
  hifbSummary,hifbDetail,openSwap,drawSwapRows,swapSuggest,tplPreview,FIBRE,FIBRE_ROUGH,fibreOf,fibreInfo,openFibre,fibreSheetHtml,hifbProgressPanel,openHifbWhy,tplEntries,drawTplRows,tplFamily,TPL_FILTERS,startWorkout,finishWorkout,loggedTraining,plannedTraining,maintenance,openStyleSheet});
try{ Object.defineProperty(window.__G,'swapView',{get:()=>swapView,set:v=>{swapView=v},configurable:true}); }catch(e){}
try{ Object.defineProperty(window.__G,'tplView',{get:()=>tplView,set:v=>{tplView=v},configurable:true}); }catch(e){}
