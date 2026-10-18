/* =====================================================================
   Repeat a session (build 77)

   Feargal: a session already done this week should be easy to do again,
   today or on a day of my choosing, from the finished session or from Plan.
   Before, the only way was Change this day, then finding the session in the
   whole template list.

   Where it is offered:
     - the finished session's sheet (You, sessions, or "See everything you
       did" after a workout): "Repeat on a day"
     - Plan, a day that is done: "Repeat on another day"
     - Change this day: "Done this week" at the top, one tap to use
   Picking a day sets that day to the session through the same swap Change
   this day uses (data-swapto), so Undo, fixed days and the week's counts all
   behave exactly as they always have. Only days from today to Sunday are
   offered: next week is built at the check-in.
   ===================================================================== */
function repeatable(code){
  return !!code&&((S.templates||[]).some(t=>t.id===code)||(S.circuits||[]).some(c=>c.id===code));
}
function repeatName(code){
  const t=(S.templates||[]).find(x=>x.id===code); if(t) return t.name;
  const c=(S.circuits||[]).find(x=>x.id===code); return c? c.name : 'This session';
}
/* sessions done this week, newest first, one entry each */
function weekDoneCodes(){
  const mon=mondayKey(), out=[];
  (S.workouts||[]).forEach(w=>{
    if(!w||w.d<mon||w.d>todayKey()) return;
    const code=w.circuitId||w.templateId;
    if(!repeatable(code)||out.some(x=>x.code===code)) return;
    out.push({code, name:repeatName(code), d:w.d});
  });
  return out;
}
const plainLabel=d=>String((d&&typeof dayLabel==='function'&&dayLabel(d))||'Rest').replace(/<[^>]+>/g,'');
function openRepeat(code){
  if(!repeatable(code)){ toast('That session is no longer in your templates'); return; }
  const name=repeatName(code), i=dowIdx(), isCirc=(S.circuits||[]).some(c=>c.id===code);
  const rows=[];
  for(let n=i;n<7;n++){
    const d=S.plan.days[n]||{}, same=(d.templateId||d.circuitId)===code;
    const sub= same? 'Already this session' : 'In place of '+plainLabel(d)+(dayDone(n)? ', already done' : '');
    rows.push(`<button class="logrow" data-swapto="${n}:${code}" ${same?'disabled aria-disabled="true"':''}>
      <div class="txt"><div class="t">${n===i? 'Today, '+DAYS[n] : DAYS[n]}</div><div class="s">${escHabit(sub)}</div></div></button>`);
  }
  $('altTitle').textContent='Repeat '+name;
  $('altSub').textContent='Pick the day. What is planned there now is swapped out, and Undo puts it back.';
  $('altBody').innerHTML=`<button class="logrow go" ${isCirc? `data-repeatnow="${code}"` : `data-redo="${code}"`}>
      <div class="txt"><div class="t">Start it now</div><div class="s">Opens the session straight away</div></div></button>
    <div class="slab">Or put it on a day this week</div>${rows.join('')}
    ${i===6? '<div class="note">Today is the last day of this week. Next week is built at your check-in.</div>' : ''}`;
  openSheet('altSheet');
}
document.addEventListener('click',e=>{
  const r=e.target.closest('[data-repeat]');
  if(r){ closeSheets(); openRepeat(r.dataset.repeat); return; }
  const now=e.target.closest('[data-repeatnow]');
  if(now){ closeSheets(); if(!(typeof liveGuard==='function'&&liveGuard())) startCircuit(now.dataset.repeatnow); }
});
/* the finished session's sheet gets "Repeat on a day" beside "Do this again" */
{ const _openSession=openSession;
  openSession=function(id){
    const out=_openSession.apply(this,arguments);
    const post=S.mine.find(m=>m.id===id), w=post&&typeof workoutFor==='function'? workoutFor(post) : null;
    const code=w&&(w.circuitId||w.templateId), body=$('sessBody');
    if(body&&repeatable(code)&&!body.querySelector('[data-repeat]')){
      const box=body.firstElementChild||body;
      box.insertAdjacentHTML('beforeend',`<button class="sheetcta ghostcta" data-repeat="${code}">Repeat on a day this week</button>`);
    }
    return out;
  };
}
/* Change this day: what was done this week, first */
{ const _drawSwapRows=drawSwapRows;
  drawSwapRows=function(){
    _drawSwapRows();
    const box=$('swapRows'); if(!box||swapView.q.trim()||swapView.f!=='all') return;
    const done=weekDoneCodes(); if(!done.length) return;
    const all=tplEntries();
    const items=done.map(x=>all.find(y=>y.id===x.code)).filter(Boolean);
    if(!items.length) return;
    box.insertAdjacentHTML('afterbegin',`<div class="slab tsec">Done this week, repeat it</div>`+
      items.map(x=>swapRowHtml(x,'Done '+prettyDate(done.find(d=>d.code===x.id).d))).join(''));
  };
}
Object.assign(window.__G,{repeatable,repeatName,weekDoneCodes,openRepeat,
  /* build 77 pieces defined in earlier scripts, for the tests */
  openSessionByWorkout,openSwap,stepsDeal,stepsWeek,stepAdjNow,stepsBaselineText,markDay,dayMarked,proteinTight});
