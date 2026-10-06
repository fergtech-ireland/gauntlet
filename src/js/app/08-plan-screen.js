/* ===================== plan ===================== */
/* ---------- a day, and everything you can do with it ----------
   People could not find how to see or edit today's workout: the reasons sat
   in one block, the days in another with their own Change and Start buttons,
   and the templates in a third with their own Edit and Start. Now each day is
   one card. Closed, it says what the day is. Open, it shows the whole workout
   and every action in one place: Start, Edit workout, Change day, and Cannot
   do it. Today opens by itself. Editing opens the workout's template, so the
   change carries to every future day built from it. */
let planOpen=null;                                   /* null: today */
const planOpenIndex=()=>planOpen===null? dowIdx() : planOpen;
function dayMovesHTML(d){
  const tpl=d.templateId? (S.templates||[]).find(t=>t.id===d.templateId) : null;
  if(tpl) return `<div class="dmoves">${tpl.ex.filter(r=>!(d.exclude||[]).includes(exOf(r.exId).n)).map(r=>`<div class="dmove">
      <span class="dmn">${escHabit(exOf(r.exId).n)}</span>
      <span class="dmr">${d.deload&&typeof deloadPrescription==='function'
        ? (p=>p.sets+' × '+p.reps+(p.kg!==null?' at '+num(p.kg)+' kg':''))(deloadPrescription(r.exId,r,DELOAD_TIERS[d.deload]))
        : repText(r)}</span>
      <button class="movebtn" data-showmove="${r.exId}">show me</button></div>`).join('')}</div>
    ${d.exclude&&d.exclude.length?`<div class="note">Leaving out ${escHabit(d.exclude.join(', '))}.</div>`:''}
    ${d.deload?`<div class="note">Easy week: ${DELOAD_TIERS[d.deload].band} less work and about 10% lighter. Next week goes back to your working weights.</div>`
      : (d.setDelta?`<div class="note">One set lighter than usual this week.</div>`:'')}`;
  if(d.runId&&typeof runPlan==='function'&&runPlan(d.runId)){
    const rp=runPlan(d.runId);
    return `<div class="dmoves">${rp.steps.map(st=>`<div class="dmove"><span class="dmn">${escHabit(st.n)}</span><span class="dmr">${escHabit(st.r)}</span></div>`).join('')}</div>
      <div class="note">${rp.why}</div>`;
  }
  if(d.circuitId&&(S.circuits||[]).find(c=>c.id===d.circuitId)){
    const c=S.circuits.find(x=>x.id===d.circuitId);
    return `<div class="dmoves">${(c.items||[]).map(it=>`<div class="dmove"><span class="dmn">${escHabit(it.label||'')}</span>${it.sub?`<span class="dmr">${escHabit(it.sub)}</span>`:''}</div>`).join('')}</div>
      ${c.why?`<div class="note">${c.why}</div>`:''}`;
  }
  return `<div class="note">${d.slot==='rest'?'Nothing owed. Rest is part of it.':(d.slot==='walk'?'Counted by your tracker. Nothing to press.':(daySub(d)||''))}</div>`;
}
function dayActionsHTML(n,d){
  const startable=d.type&&d.slot!=='walk'&&d.slot!=='rest';
  const edit= d.templateId? `<button class="dact" data-tpledit="${d.templateId}">Edit workout</button>`
    : (d.circuitId? `<button class="dact" data-circedit="${d.circuitId}">Edit circuit</button>`
    : (d.runId? `<button class="dact" data-runswap="${n}">Change run</button>` : ''));
  return `${startable? `<button class="cta" data-startday="${n}">${n===dowIdx()?(dayDone(n)?'Do it again':'Start'):'Start '+DAYS[n]+'\u2019s now'}</button>`:''}
    <div class="dacts">${edit}
      <button class="dact" data-swap="${n}">Change day</button>
      ${startable? `<button class="dact" data-restday="${n}">Cannot do it</button>`:''}</div>`;
}
function dayCard(n,d,isToday,open){
  return `<div class="daycard ${isToday?'today':''} ${open?'open':''}">
    <button class="dch" data-planopen="${n}" aria-expanded="${open?'true':'false'}">
      <span class="dcd">${DAYS[n]}</span>
      <span class="dct"><b>${dayLabel(d)}${isToday?' <span class="cichip">today</span>':''}${d.checkin?' <span class="cichip">check in</span>':''}</b>
        <span>${daySub(d)}${d.exclude&&d.exclude.length?' · minus '+d.exclude.length+' movement'+(d.exclude.length>1?'s':''):''}${d.deload?' · easy week':''}</span></span>
      <span class="dcv" aria-hidden="true">${open?'−':'+'}</span></button>
    ${open? `<div class="dcb">${dayMovesHTML(d)}${dayActionsHTML(n,d)}</div>`:''}</div>`;
}
document.addEventListener('click',e=>{
  const po=e.target.closest('[data-planopen]');
  if(po){ const n=+po.dataset.planopen; planOpen= planOpenIndex()===n? -1 : n; renderPlan();
    const b=document.querySelector('[data-planopen="'+n+'"]'); if(b&&b.focus) b.focus(); return; }
  const ce=e.target.closest('[data-circedit]');
  if(ce&&typeof openCircEdit==='function'){ openCircEdit(ce.dataset.circedit); return; }
  if(e.target.closest('#todayViewEdit')){ planOpen=dowIdx(); go('plan');
    const card=document.querySelector('.daycard.open'); if(card&&card.scrollIntoView) card.scrollIntoView({block:'start'});
    const b=document.querySelector('.daycard.open .dch'); if(b&&b.focus) b.focus(); return; }
});
function renderPlan(){
  const plan=ensurePlan(), i=dowIdx(), aim=aimOf(S.profile.aim);
  $('planView').innerHTML=`
  <div class="h1">Your week</div>
  <div class="sect" style="border-bottom:0;padding-bottom:6px">
    <div class="numline"><div>Aim <b>${aim.t}</b></div><div>Training days <b>${plan.days.filter(d=>d.type&&d.slot!=='walk').length}</b></div></div>
    ${(()=>{ const due=deloadDue(), nx=nextDeload();
      return `<button class="dlweek" id="planDeload" style="border-top:0;padding-bottom:0">
        <div class="d"><b>${due? 'This is an easy week' : (nx? 'Next easy week: '+prettyDate(nx) : 'No easy weeks scheduled')}</b>
        <span>${due? DELOAD_TIERS[deloadTier().id].band+' less work, about 10% lighter. Tap to change.' : 'Tap to see the next ten weeks, or add one.'}</span></div>
        <span class="tag ${due?'on':''}">${due?'Easy':'Change'}</span></button>`; })()}
  </div>
  <div class="sect weeksect">
    <h2>This week</h2>
    <div class="whylist">${plan.why.map(w=>`<div class="note">${w}</div>`).join('')}</div>
    <div class="note" style="margin:10px 0 0">Tap a day to see it. Start, edit or change it from there.</div>
  </div>
  <div class="daycards">${plan.days.map((d,n)=>dayCard(n,d,n===i,n===planOpenIndex())).join('')}</div>
  <button class="logrow" data-tplopen="1" style="margin:4px 0 0">
    <div class="txt"><div class="t">All workouts and templates</div><div class="s">Including ones not in this week</div></div>
    <span class="chev">›</span></button>
  <div class="sect" style="border-bottom:0">
    <div class="note" style="margin:0">Every lifting day comes from one of these. Change the sets, the rep range, the rest or the movements themselves and the plan follows.</div>
    <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
      <button class="mini" id="changeAim">Change aim</button>
      <button class="mini" id="rebuild">Rebuild the week</button></div>
  </div>`;
}
/* ---------- changing a day (build 51) ----------
   It was one long list of every template, run and circuit (old generated
   weeks included), each with a sentence under it. Now: what the day is and a
   way to edit it, rest, walk or cook in one tap, three suggestions with the
   reason, then the same search, filters and folding groups as the template
   manager. Tap a name to see what is in it before choosing; Use sets the day,
   with Undo. */
let swapView={q:'',f:'all',n:0,open:null};
function swapSuggest(n){
  const d=S.plan.days[n]||{}, inWeek=new Set(S.plan.days.map(x=>x.templateId||x.circuitId||x.runId).filter(Boolean));
  const st=styleOf(), sp=splitOf();
  let pool= st==='hifb'? HIFB_ORDER.slice()
    : circStyle(st)? ((S.styleWeek&&S.styleWeek.ids)||[]).slice()
    : (sp? SPLITS[sp].order : LIFT_ORDER).slice();
  pool=pool.concat((CARDIO_BY_AIM[S.profile.aim]||CARDIO_BY_AIM.lose).filter(x=>x!=='walk'));
  const cur=d.templateId||d.circuitId||d.runId;
  const seen=new Set(); const out=[];
  /* things missing from the week first, then the rest of the shape */
  pool.filter(id=>!inWeek.has(id)).concat(pool).forEach(id=>{ if(id===cur||seen.has(id)) return; seen.add(id);
    const x=tplEntries().find(y=>y.id===id); if(x) out.push(x); });
  return out.slice(0,3);
}
function tplPreview(x){
  if(x.kind==='lift'||x.kind==='hifb'){ const t=S.templates.find(y=>y.id===x.id); if(!t) return '';
    const rows=[];
    if(t.hifb&&t.hifb.buyIn) rows.push(`<li class="prun">Buy-in run ${t.hifb.buyIn.m}m</li>`);
    t.ex.forEach(r=>{ rows.push(`<li><b>${escHabit(exOf(r.exId).n)}</b> <span>${repText(r)}</span></li>`);
      if(r.run) rows.push(`<li class="prun">Run ${r.run.m}m</li>`); });
    if(t.hifb&&t.hifb.buyOut) rows.push(`<li class="prun">Buy-out run ${t.hifb.buyOut.m}m</li>`);
    return `<ul class="tprev">${rows.join('')}</ul>`; }
  if(x.kind==='circuit'){ const c=circuitOf(x.id); if(!c) return '';
    return `<ul class="tprev">${(c.strength||[]).map(z=>`<li><b>${escHabit((moveOf(z.move)||{n:z.move}).n)}</b> <span>${z.sets||3} sets</span></li>`).join('')}${c.items.map(it=>`<li class="${it.t==='run'?'prun':''}">${escHabit(it.move? itemText(it) : it.label)}</li>`).join('')}</ul>`; }
  const r=(S.runPlans||[]).find(y=>y.id===x.id); if(!r) return '';
  return `<ul class="tprev">${(r.steps||[]).map(z=>`<li><b>${escHabit(z.n)}</b> <span>${escHabit(z.r)}</span></li>`).join('')}</ul>`;
}
function swapRowHtml(x,why){
  const n=swapView.n, d=S.plan.days[n]||{}, cur=(d.templateId||d.circuitId||d.runId)===x.id, open=swapView.open===x.id;
  const editAttr= x.kind==='circuit'? `data-circedit="${x.id}"` : (x.kind==='run'? '' : `data-tpledit="${x.id}"`);
  return `<div class="srow2 ${open?'open':''}">
    <div class="trow">
      <button class="txt tpeek" data-swappeek="${x.id}" aria-expanded="${open}"><div class="n">${escHabit(x.name)}${x.kind==='hifb'?' <span class="tkind">HIFB</span>':''}${x.mine?' <span class="tkind mine">yours</span>':''}${cur?' <span class="tkind cur">now</span>':''}</div>
        <div class="s">${escHabit(x.sub)}</div>${why? `<div class="why-row">${escHabit(why)}</div>` : ''}</button>
      ${cur? '' : `<button class="mini go" data-swapto="${n}:${x.id}">Use</button>`}</div>
    ${open? `<div class="tpwrap">${tplPreview(x)}<div class="setbtns">${cur? '' : `<button class="go" data-swapto="${n}:${x.id}">Use for ${DAYS[n]}</button>`}${editAttr? `<button ${editAttr}>Edit</button>` : ''}</div></div>` : ''}
  </div>`;
}
function drawSwapRows(){
  const box=$('swapRows'); if(!box) return;
  const all=tplEntries(), q=swapView.q.trim().toLowerCase(), f=swapView.f, words=q.split(/\s+/).filter(Boolean);
  let list=all.filter(x=>words.every(w=>x.terms.indexOf(w)>=0));
  if(f==='mine') list=list.filter(x=>x.mine); else if(f!=='all') list=list.filter(x=>x.kind===f);
  let html='';
  if(q||f!=='all'){
    list.sort((a,b)=>(b.name.toLowerCase().indexOf(q)===0)-(a.name.toLowerCase().indexOf(q)===0));
    html= list.length? `<div class="slab tcount">${list.length} ${list.length===1?'match':'matches'}</div>`+list.map(x=>swapRowHtml(x)).join('')
      : `<div class="empty">Nothing matches${q? ' "'+escHabit(swapView.q.trim())+'"' : ''}.</div>`;
  } else {
    const sug=swapSuggest(swapView.n);
    if(sug.length) html+=`<div class="slab tsec">Suggested for ${DAYS[swapView.n]}</div>`+sug.map(x=>swapRowHtml(x,suggestFor(x.id))).join('');
    const fams=[]; all.forEach(x=>{ if(fams.indexOf(x.family)<0) fams.push(x.family); });
    const d=S.plan.days[swapView.n]||{}, curX=all.find(y=>y.id===(d.templateId||d.circuitId||d.runId));
    html+=`<div class="slab tsec">Everything</div>`+fams.map(fam=>{ const items=all.filter(x=>x.family===fam);
      const openIt=(curX&&curX.family===fam)||(swapView.open&&items.some(x=>x.id===swapView.open));
      return `<details class="tgrp" ${openIt?'open':''}><summary><b>${escHabit(fam)}</b><span>${items.length}</span></summary>${items.map(x=>swapRowHtml(x)).join('')}</details>`; }).join('');
  }
  box.innerHTML=html;
}
function openSwap(n,keep){
  if(!keep) swapView={q:'',f:'all',n:+n,open:null}; else swapView.n=+n;
  const d=S.plan.days[n]||{}, all=tplEntries(), curX=all.find(y=>y.id===(d.templateId||d.circuitId||d.runId));
  $('swapTitle').textContent='Change '+DAYS[n];
  const quick=[['rest','Rest'],['walk','Walk'],['cook','Cook']];
  $('swapBody').innerHTML=`
    <div class="swapnow"><div class="txt"><div class="k">${DAYS[n]} is</div><div class="t">${escHabit(dayLabel(d)||'Rest')}</div>${curX? `<div class="s">${escHabit(curX.sub)}</div>` : ''}</div>
      ${curX&&curX.kind!=='run'? `<button class="mini" ${curX.kind==='circuit'? `data-circedit="${curX.id}"` : `data-tpledit="${curX.id}"`}>Edit</button>` : ''}</div>
    <div class="swapquick" role="group" aria-label="Quick change">${quick.map(([c,l])=>`<button class="${d.slot===c?'on':''}" data-swapto="${n}:${c}" ${d.slot===c?'aria-pressed="true"':''}>${l}</button>`).join('')}</div>
    <div class="search tsearch"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="swapQ" type="search" placeholder="Name or movement: squat, chest, run" aria-label="Search sessions" value="${escHabit(swapView.q)}"></div>
    <div class="tfilters" role="group" aria-label="Show">${TPL_FILTERS.filter(([id])=>id!=='week').map(([id,t])=>`<button class="${swapView.f===id?'on':''}" data-swapfilter="${id}" aria-pressed="${swapView.f===id}">${t}</button>`).join('')}</div>
    <div id="swapRows"></div>`;
  drawSwapRows();
  openSheet('swapSheet');
}
document.addEventListener('input',e=>{ if(e.target.id==='swapQ'){ swapView.q=e.target.value; swapView.open=null; drawSwapRows(); } });
document.addEventListener('click',e=>{
  const f=e.target.closest('[data-swapfilter]');
  if(f){ swapView.f=f.dataset.swapfilter; swapView.open=null;
    document.querySelectorAll('[data-swapfilter]').forEach(x=>{ const on=x===f; x.classList.toggle('on',on); x.setAttribute('aria-pressed',on); });
    drawSwapRows(); return; }
  const pk=e.target.closest('[data-swappeek]');
  if(pk){ swapView.open= swapView.open===pk.dataset.swappeek? null : pk.dataset.swappeek;
    const st=$('swapRows').closest('.sheet'), y=st? st.scrollTop : 0; drawSwapRows(); if(st) st.scrollTop=y; return; }
});

