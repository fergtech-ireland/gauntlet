/* ---------- template manager (build 49) ----------
   Twenty-odd lifting templates, the week's circuits and the runs made one
   long list. It now opens on what is in this week and what was done
   recently, then everything else in families that fold away, with a search
   that matches movements as well as names and filters by kind. */
let tplView={q:'',f:'all',open:null};
const TPL_FILTERS=[['all','All'],['week','In your week'],['lift','Lifting'],['hifb','HIFB'],['circuit','Circuits'],['run','Running'],['mine','Yours']];
function tplFamily(t){
  if(isHifb(t)) return 'HIFB';
  if(!t.seeded) return 'Yours';
  if(t.id==='t_mobility') return 'Mobility';
  const k=['full','ul','ppl','bro'].find(k2=>SPLITS[k2].order.indexOf(t.id)>=0);
  return k? SPLITS[k].t : 'More lifting';
}
const lastDone=(match)=>{ const w=(S.workouts||[]).find(match); return w? w.d : null; };
function agoText(d){ if(!d) return ''; const n=gapDays(d); return n<=0? 'done today' : (n===1? 'done yesterday' : 'done '+n+' days ago'); }
function tplEntries(){
  const out=[];
  (S.templates||[]).forEach(t=>{ const hf=isHifb(t);
    out.push({kind:hf?'hifb':'lift', id:t.id, name:t.name, mine:!t.seeded, family:tplFamily(t),
      sub: hf? t.ex.length+' blocks · '+fmtKm(hifbRunKm(t))+' km running' : t.ex.length+' movements · '+t.ex.map(r=>exOf(r.exId).n.split(' ')[0]).slice(0,3).join(', ')+(t.ex.length>3?'...':''),
      terms:(t.name+' '+t.ex.map(r=>exOf(r.exId).n).join(' ')).toLowerCase(),
      last:lastDone(w=>w.templateId===t.id)}); });
  const wk=(S.styleWeek&&S.styleWeek.ids)||[];
  (S.circuits||[]).filter(c=>!c.gen||wk.indexOf(c.id)>=0).forEach(c=>out.push({kind:'circuit',id:c.id,name:c.name,family:'Circuits and HYROX',
    sub:c.sub+' · '+c.items.length+' parts', terms:(c.name+' '+c.sub+' '+c.items.map(x=>x.label||'').join(' ')).toLowerCase(),
    last:lastDone(w=>w.circuitId===c.id)}));
  (S.runPlans||[]).forEach(r=>out.push({kind:'run',id:r.id,name:r.name,family:'Running and cardio',sub:r.sub+' · about '+r.mins+' min',
    terms:(r.name+' '+r.sub).toLowerCase(), last:null}));
  return out;
}
function tplRowHtml(x,dayLabel){
  const acts= x.kind==='circuit'? `<button class="mini" data-circedit="${x.id}">Edit</button><button class="mini go" data-circstart="${x.id}">Start</button>`
    : x.kind==='run'? `<button class="mini go" data-runstart="${x.id}">Start</button>`
    : `<button class="mini" data-tpledit="${x.id}">Edit</button><button class="mini go" data-tplstart="${x.id}">Start</button>`;
  const open=tplView.open===x.id;
  return `<div class="srow2 ${open?'open':''}"><div class="trow">
    <button class="txt tpeek" data-tplpeek="${x.id}" aria-expanded="${open}"><div class="n">${dayLabel? `<span class="tday">${dayLabel}</span>` : ''}${escHabit(x.name)}${x.kind==='hifb'?' <span class="tkind">HIFB</span>':''}${x.mine?' <span class="tkind mine">yours</span>':''}</div>
      <div class="s">${escHabit(x.sub)}${x.last? ' · '+agoText(x.last) : ''}</div></button>${acts}</div>${open? `<div class="tpwrap">${tplPreview(x)}</div>` : ''}</div>`;
}
function tplWeek(all){
  return (S.plan&&S.plan.days||[]).map((d,k)=>{ const id=d.templateId||d.circuitId||d.runId; if(!id) return null;
    const x=all.find(y=>y.id===id); return x? {x,day:DAYS[k]} : null; }).filter(Boolean);
}
function drawTplRows(){
  const box=$('tplRows'); if(!box) return;
  const all=tplEntries(), q=tplView.q.trim().toLowerCase(), f=tplView.f;
  const words=q.split(/\s+/).filter(Boolean);
  let list=all.filter(x=>words.every(w=>x.terms.indexOf(w)>=0));
  if(f==='lift') list=list.filter(x=>x.kind==='lift'); else if(f==='hifb') list=list.filter(x=>x.kind==='hifb');
  else if(f==='circuit') list=list.filter(x=>x.kind==='circuit'); else if(f==='run') list=list.filter(x=>x.kind==='run');
  else if(f==='mine') list=list.filter(x=>x.mine);
  let html='';
  if(f==='week'){
    const wk=tplWeek(all).filter(w=>list.indexOf(w.x)>=0);
    html= wk.length? wk.map(w=>tplRowHtml(w.x,w.day)).join('') : `<div class="empty">Nothing from this list is in your week${q?' that matches':''}.</div>`;
  } else if(q||f!=='all'){
    /* names that start with the search come first, then the rest */
    list.sort((a,b)=>(b.name.toLowerCase().indexOf(q)===0)-(a.name.toLowerCase().indexOf(q)===0));
    html= list.length? `<div class="slab tcount">${list.length} ${list.length===1?'match':'matches'}</div>`+list.map(x=>tplRowHtml(x)).join('')
      : `<div class="empty">Nothing matches${q? ' "'+escHabit(tplView.q.trim())+'"' : ''}.${f==='mine'? '<br>Your own templates appear here once you save or duplicate one.' : ''}</div>`;
  } else {
    const wk=tplWeek(all), inWk=new Set(wk.map(w=>w.x.id));
    const recent=all.filter(x=>x.last&&!inWk.has(x.id)).sort((a,b)=>a.last<b.last?1:-1).slice(0,3);
    if(wk.length) html+=`<div class="slab tsec">In your week</div>`+wk.map(w=>tplRowHtml(w.x,w.day)).join('');
    if(recent.length) html+=`<div class="slab tsec">Done recently</div>`+recent.map(x=>tplRowHtml(x)).join('');
    const fams=[]; all.forEach(x=>{ if(fams.indexOf(x.family)<0) fams.push(x.family); });
    const mineFam=styleOf()==='hifb'? 'HIFB' : (splitOf()? SPLITS[splitOf()].t : null);
    html+=`<div class="slab tsec">Everything</div>`+fams.map(fam=>{ const items=all.filter(x=>x.family===fam);
      return `<details class="tgrp" ${fam===mineFam||fam==='Yours'?'open':''}><summary><b>${escHabit(fam)}</b><span>${items.length}</span></summary>
        ${items.map(x=>tplRowHtml(x)).join('')}</details>`; }).join('');
  }
  box.innerHTML=html;
}
function drawTemplates(){
  $('tplList').innerHTML=`<div class="search tsearch"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="tplQ" type="search" placeholder="Name or movement: squat, chest, run" aria-label="Search templates" value="${escHabit(tplView.q)}"></div>
    <div class="tfilters" role="group" aria-label="Show">${TPL_FILTERS.map(([id,t])=>`<button class="${tplView.f===id?'on':''}" data-tplfilter="${id}" aria-pressed="${tplView.f===id}">${t}</button>`).join('')}</div>
    <div id="tplRows"></div>
    <button class="logrow" data-tplstart=""><div class="txt"><div class="t">Empty workout</div>
      <div class="s">Build it as you go, save it as a template after</div></div></button>
    <button class="logrow" id="circNew"><div class="txt"><div class="t">New circuit</div>
      <div class="s">Copy one of the HYROX sessions and make it yours</div></div></button>`;
  drawTplRows();
}
document.addEventListener('input',e=>{ if(e.target.id==='tplQ'){ tplView.q=e.target.value; drawTplRows(); } });
document.addEventListener('click',e=>{ const pk=e.target.closest('[data-tplpeek]'); if(!pk) return;
  tplView.open= tplView.open===pk.dataset.tplpeek? null : pk.dataset.tplpeek;
  const st=$('tplRows').closest('.sheet'), y=st? st.scrollTop : 0; drawTplRows(); if(st) st.scrollTop=y; });
document.addEventListener('click',e=>{ const b=e.target.closest('[data-tplfilter]'); if(!b) return;
  tplView.f=b.dataset.tplfilter;
  document.querySelectorAll('[data-tplfilter]').forEach(x=>{ const on=x===b; x.classList.toggle('on',on); x.setAttribute('aria-pressed',on); });
  drawTplRows(); });
/* ---------- editing a circuit ---------- */
let circDraft=null;
function openCircEdit(id){
  const c=circuitOf(id); if(!c) return;
  circDraft=JSON.parse(JSON.stringify(c));
  drawCircEdit(); closeSheets(); openSheet('circEdit');
}
function drawCircEdit(){
  $('circEditTitle').textContent=circDraft.name;
  $('circEditBody').innerHTML=`
    <div class="nf" style="margin-bottom:10px"><label for="circName">Name</label>
      <input id="circName" value="${escHabit(circDraft.name)}" style="font-family:var(--font-ui);font-size:15px;font-weight:700"></div>
    <div class="nf" style="margin-bottom:12px"><label for="circSub">One line about it</label>
      <input id="circSub" value="${escHabit(circDraft.sub||'')}" style="font-family:var(--font-ui);font-size:13.5px;font-weight:600"></div>
    <div class="note" style="margin:0 0 12px">Changes apply every time you do this circuit from now on. Ones you have already done stay as they were.</div>
    ${circDraft.items.some(x=>x.move)? `<div class="nf" style="margin-bottom:10px"><label for="circFormat">Format</label>
      <select id="circFormat">${Object.keys(FORMAT_TEXT).map(f=>`<option value="${f}" ${(circDraft.format||'fortime')===f?'selected':''}>${FORMAT_TEXT[f]}</option>`).join('')}</select></div>
      <div class="twocol" style="margin-bottom:10px">
        <div class="nf"><label for="circMins">${(circDraft.format||'fortime')==='fortime'?'About how long, minutes':'Workout minutes'}</label><input id="circMins" type="number" inputmode="numeric" value="${(circDraft.format==='amrap'||circDraft.format==='emom')? (circDraft.amrapMins||circDraft.mins||'') : (circDraft.mins||'')}"></div>
        <div class="nf"><label for="circRounds">Rounds</label><input id="circRounds" type="number" inputmode="numeric" value="${circDraft.rounds||''}" placeholder="1"></div></div>
      ${(circDraft.strength||[]).length? `<div class="slab">Strength first</div>`+circDraft.strength.map((s,si)=>`<div class="tcard cecard">
        <div class="nf"><label>Lift</label><select data-cstr="${si}:move">${moveOptions(s.move)}</select></div>
        <div class="twocol"><div class="nf"><label>Sets</label><input type="number" inputmode="numeric" value="${s.sets||3}" data-cstr="${si}:sets"></div>
          <div class="nf"><label>Reps</label><input type="number" inputmode="numeric" value="${s.amt||5}" data-cstr="${si}:amt"></div>
          <div class="nf"><label>kg</label><input type="number" inputmode="decimal" step="0.5" value="${s.kg||''}" data-cstr="${si}:kg"></div></div>
        <div class="tacts"><button class="tact bad" data-cstrdel="${si}">Remove</button></div></div>`).join('') : ''}
      <div class="tacts" style="margin:0 0 10px"><button class="tadd" id="circAddLift">+ Add a strength lift first</button></div>` : ''}
    ${circDraft.items.map((it,i)=>{ const last=i===circDraft.items.length-1, run=it.t==='run';
      if(it.move){ const m=moveOf(it.move)||{};
        return `<div class="tcard cecard"><span class="ceno">Part ${i+1}</span>
        <div class="nf"><label>Movement</label><select data-cimv="${i}">${moveOptions(it.move)}</select></div>
        <div class="twocol"><div class="nf"><label>${m.u==='m'?'Metres':(m.u==='cal'?'Calories':(m.u==='s'?'Seconds':'Reps'))}</label><input type="number" inputmode="numeric" value="${it.amt||''}" data-ciamt="${i}"></div>
          ${m.kg||it.kg? `<div class="nf"><label>kg${m.each?' each':''}</label><input type="number" inputmode="decimal" step="0.5" value="${it.kg||''}" data-cikg="${i}"></div>` : ''}</div>
        ${it.sub? `<div class="note" style="margin:4px 0 0">${escHabit(it.sub)}</div>` : ''}
        <div class="tacts">
          <button class="tact icon" data-cimove="${i}:-1" aria-label="Move part ${i+1} up" ${i===0?'disabled':''}>&uarr;</button>
          <button class="tact icon" data-cimove="${i}:1" aria-label="Move part ${i+1} down" ${last?'disabled':''}>&darr;</button>
          <button class="tact bad" data-cidel="${i}" ${circDraft.items.length<2?'disabled':''}>Remove</button></div></div>`; }
      return `<div class="tcard cecard">
      <div class="cekind" role="group" aria-label="Part ${i+1} is a">
        <button class="${run?'on':''}" data-citype="${i}:run" aria-pressed="${run}">Run</button>
        <button class="${!run?'on':''}" data-citype="${i}:station" aria-pressed="${!run}">Station</button>
        <span class="ceno">Part ${i+1}</span></div>
      <input class="ceinput" value="${escHabit(it.label||'')}" data-cifield="${i}:label" aria-label="What part ${i+1} is" placeholder="${run?'400m run':'20 kettlebell swings'}">
      <input class="ceinput cesub" value="${escHabit(it.sub||'')}" data-cifield="${i}:sub" placeholder="A note, if it needs one" aria-label="Note for part ${i+1}">
      <div class="tacts">
        <button class="tact icon" data-cimove="${i}:-1" aria-label="Move part ${i+1} up" ${i===0?'disabled':''}>&uarr;</button>
        <button class="tact icon" data-cimove="${i}:1" aria-label="Move part ${i+1} down" ${last?'disabled':''}>&darr;</button>
        <button class="tact bad" data-cidel="${i}" ${circDraft.items.length<2?'disabled':''}>Remove</button>
      </div></div>`; }).join('')}
    <div class="tacts" style="margin:4px 0 4px"><button class="tadd" id="circAddRun">+ Add a run</button><button class="tadd" id="circAddStation">+ Add a station</button></div>`;
}
document.addEventListener('input',e=>{
  const f=e.target.closest('[data-cifield]');
  if(f&&circDraft){ const [i,k]=f.dataset.cifield.split(':'); circDraft.items[+i][k]=f.value; }
  if(e.target.id==='circName'&&circDraft) circDraft.name=e.target.value;
  if(e.target.id==='circSub'&&circDraft) circDraft.sub=e.target.value;
  if(!circDraft) return;
  const a=e.target.closest&&e.target.closest('[data-ciamt]'); if(a) circDraft.items[+a.dataset.ciamt].amt=+a.value||circDraft.items[+a.dataset.ciamt].amt;
  const k=e.target.closest&&e.target.closest('[data-cikg]'); if(k) circDraft.items[+k.dataset.cikg].kg=k.value===''? null : +k.value;
  const sr=e.target.closest&&e.target.closest('[data-cstr]'); if(sr&&sr.tagName==='INPUT'){ const [si,f]=sr.dataset.cstr.split(':'); circDraft.strength[+si][f]=sr.value===''? null : +sr.value; }
  if(e.target.id==='circMins'){ if(circDraft.format==='amrap'||circDraft.format==='emom') circDraft.amrapMins=+e.target.value||null; else circDraft.mins=+e.target.value||null; }
  if(e.target.id==='circRounds') circDraft.rounds=+e.target.value||null;
});
document.addEventListener('change',e=>{
  if(!circDraft) return;
  const mv=e.target.closest&&e.target.closest('[data-cimv]');
  if(mv){ const it=circDraft.items[+mv.dataset.cimv], m=moveOf(mv.value)||{};
    Object.assign(it,{move:mv.value,amt:m.r||it.amt,kg:m.kg? m.kg[sexKey()] : null,t:mv.value==='run'?'run':'station',sub:''});
    delete it.origMove; delete it.origAmt; delete it.origKg; delete it.origSub; drawCircEdit(); }
  const sr=e.target.closest&&e.target.closest('[data-cstr]'); if(sr&&sr.tagName==='SELECT'){ const si=+sr.dataset.cstr.split(':')[0], m=moveOf(sr.value)||{};
    Object.assign(circDraft.strength[si],{move:sr.value,kg:m.kg? m.kg[sexKey()] : circDraft.strength[si].kg}); drawCircEdit(); }
  if(e.target.id==='circFormat'){ circDraft.format=e.target.value; drawCircEdit(); }
});
document.addEventListener('click',e=>{
  if(!circDraft) return;
  if(e.target.closest('#circAddLift')){ circDraft.strength=(circDraft.strength||[]).concat([{move:'backsquat',sets:5,amt:5,kg:null}]); drawCircEdit(); }
  const sd=e.target.closest('[data-cstrdel]'); if(sd){ circDraft.strength.splice(+sd.dataset.cstrdel,1); drawCircEdit(); }
});
document.addEventListener('click',e=>{
  const ed=e.target.closest('[data-circedit]'); if(ed) openCircEdit(ed.dataset.circedit);
  if(circDraft&&circDraft.items.some(x=>x.move)&&(e.target.closest('#circAddRun')||e.target.closest('#circAddStation'))){
    circDraft.items.push(e.target.closest('#circAddRun')? {t:'run',move:'run',amt:400,kg:null} : {t:'station',move:'burpee',amt:10,kg:null});
    drawCircEdit(); e.stopImmediatePropagation(); return; }
  const cs=e.target.closest('[data-circstart]'); if(cs){ closeSheets(); startCircuit(cs.dataset.circstart); }
  const rs2=e.target.closest('[data-runstart]'); if(rs2){ closeSheets(); const sess=runSession(rs2.dataset.runstart); if(sess) startSession(sess); }
  if(e.target.closest('#circNew')){
    const base=(S.circuits||[])[0];
    const copy=JSON.parse(JSON.stringify(base));
    copy.id='c'+Date.now(); copy.name=base.name+' (mine)';
    S.circuits.push(copy); save(); openCircEdit(copy.id); return;
  }
  if(!circDraft) return;
  const ty=e.target.closest('[data-citype]');
  if(ty){ const [i,k]=ty.dataset.citype.split(':'); circDraft.items[+i].t = k==='run'? 'run' : 'station'; drawCircEdit(); }
  const mv=e.target.closest('[data-cimove]');
  if(mv&&!mv.disabled){ const [a,dir]=mv.dataset.cimove.split(':').map(Number), b=a+dir;
    if(b>=0&&b<circDraft.items.length){ const t=circDraft.items[a]; circDraft.items[a]=circDraft.items[b]; circDraft.items[b]=t; drawCircEdit(); } }
  const del=e.target.closest('[data-cidel]');
  if(del&&!del.disabled){
    if(circDraft.items.length<2){ toast('A circuit needs at least one part'); return; }
    const i=+del.dataset.cidel, gone=circDraft.items[i];
    circDraft.items.splice(i,1); drawCircEdit();
    toast((gone.label||'Part')+' removed','Undo',()=>{ if(circDraft){ circDraft.items.splice(i,0,gone); drawCircEdit(); } }); }
  if(e.target.closest('#circAddRun')){ circDraft.items.push({t:'run',label:'400m run',sub:''}); drawCircEdit(); }
  if(e.target.closest('#circAddStation')){ circDraft.items.push({t:'station',label:'New station',sub:''}); drawCircEdit(); }
  if(e.target.closest('#circSave')){
    const i=S.circuits.findIndex(c=>c.id===circDraft.id);
    if(i>=0) S.circuits[i]=circDraft; else S.circuits.push(circDraft);
    save(); closeSheets(); toast('Saved'); circDraft=null;
    if(document.getElementById('onb').classList.contains('on')&&typeof onbRender==='function') onbRender(); else renderAll();
  }
});
document.addEventListener('click',e=>{
  const st=e.target.closest('[data-tplstart]');
  if(st){ startWorkout(st.dataset.tplstart||null); return; }
  const ed=e.target.closest('[data-tpledit]');
  if(ed){ swapReturn= ed.closest('#swapSheet')? {n:swapView.n} : null; openTplEdit(ed.dataset.tpledit); return; }
  if(e.target.closest('[data-tplopen]')){ drawTemplates(); openSheet('tplSheet'); }
});
let tplDraft=null, tplPicking=false, swapReturn=null;
function openTplEdit(id){
  const t=S.templates.find(x=>x.id===id); if(!t) return;
  tplDraft=JSON.parse(JSON.stringify(t));
  $('tplEditTitle').textContent=t.name;
  drawTplEdit(); closeSheets(); openSheet('tplEdit');
}
/* ---------- editing a workout ----------
   The old editor squeezed each movement into one row: a name, three 38px
   boxes and three 22px symbols for help, swap and remove, well under the 44px
   a thumb needs, with no labels, and no way to change the rest time at all.
   Each movement is now a card: labelled boxes big enough to hit, the rest time
   back where it can be changed, and actions that say what they do. Moving a
   movement up or down is new, because order matters in a session.
   Saving changes the template, so every future day built from it follows.
   Sessions already done are records and do not change. */
const TPL_LIMITS={sets:[1,10], reps:[1,100], hold:[5,300], rest:[0,600]};
function tplRowErrors(r){
  const hold=rxClass(r.exId)==='hold', R=hold? TPL_LIMITS.hold : TPL_LIMITS.reps, errs=[];
  const bad=(v,[lo,hi])=>v===null||v===''||Number.isNaN(+v)||+v<lo||+v>hi||!Number.isInteger(+v);
  if(bad(r.sets,TPL_LIMITS.sets)) errs.push(['sets','Sets should be a whole number from 1 to 10.']);
  if(bad(r.repMin,R)) errs.push(['repMin',(hold?'Seconds':'Reps')+' from should be '+R[0]+' to '+R[1]+'.']);
  if(bad(r.reps,R)) errs.push(['reps',(hold?'Seconds':'Reps')+' to should be '+R[0]+' to '+R[1]+'.']);
  else if(!bad(r.repMin,R)&&+r.repMin>+r.reps) errs.push(['reps','The top of the range cannot be below the bottom.']);
  if(bad(r.rest,TPL_LIMITS.rest)) errs.push(['rest','Rest should be 0 to 600 seconds.']);
  return errs;
}
function tplErrors(t){
  const out=[];
  if(!t||!String(t.name||'').trim()) out.push({i:-1,k:'name',msg:'Give it a name.'});
  if(!t||!t.ex.length) out.push({i:-1,k:'ex',msg:'Add at least one movement.'});
  (t&&t.ex||[]).forEach((r,i)=>tplRowErrors(r).forEach(([k,msg])=>out.push({i,k,msg:exOf(r.exId).n+': '+msg})));
  /* runs are whole metres from 0 (no run) to 5,000 */
  const badM=v=>v!==null&&v!==undefined&&v!==''&&(Number.isNaN(+v)||+v<0||+v>5000||!Number.isInteger(+v));
  if(t&&t.hifb){ ['buyIn','buyOut'].forEach(k=>{ if(t.hifb[k]&&badM(t.hifb[k].m)) out.push({i:-1,k,msg:(k==='buyIn'?'Buy-in':'Buy-out')+' run: metres from 0 to 5,000.'}); });
    t.ex.forEach((r,i)=>{ if(r.run&&badM(r.run.m)) out.push({i,k:'run',msg:exOf(r.exId).n+': the run after it should be 0 to 5,000 metres.'}); }); }
  return out;
}
function drawTplEdit(){
  const t=tplDraft, uses=(S.plan&&S.plan.days||[]).filter(d=>d.templateId===t.id).length;
  const errs=tplDraft.__showErrors? tplErrors(t) : [];
  const errAt=(i,k)=>errs.some(e=>e.i===i&&e.k===k);
  const offRows=t.hifb? 0 : t.ex.filter(r=>!rowMatches(r)).length;
  $('tplEditBody').innerHTML=`
    ${t.hifb? '' : `<div class="focusnote" style="margin:0 0 12px"><b>Lifting focus: ${LIFT_FOCUS[liftFocus()].t.toLowerCase()}</b>
      <span>${LIFT_FOCUS[liftFocus()].effort}${offRows? ` ${offRows} movement${offRows>1?'s':''} here ${offRows>1?'are':'is'} set differently.` : ''}</span>
      ${offRows? `<button class="inlinebtn" id="tplRecAll">Set them all to the recommendation</button>` : ''}</div>`}
    <div class="note" style="margin:0 0 12px">Changes apply to every ${escHabit(t.name||'')} day from now on${uses? ', including '+uses+' this week' : ''}. Sessions you have already done stay exactly as they were.</div>
    <div class="nf ${errAt(-1,'name')?'bad':''}" style="margin-bottom:12px"><label for="tplName">Name</label>
      <input id="tplName" value="${escHabit(t.name)}" style="font-family:var(--font-ui);font-size:15px;font-weight:700"></div>
    ${errs.length? `<div class="warn" role="alert" style="margin-bottom:12px"><b>Not saved yet.</b> ${errs.map(e=>escHabit(e.msg)).join(' ')}</div>`:''}
    ${t.hifb? `<div class="focusnote" style="margin:0 0 12px"><b>Runs</b><span>A run before the first block, after each block, and after the last. Metres, and 0 for no run.</span>
      <div class="tfields" style="margin-top:8px">
        <label class="tf ${errAt(-1,'buyIn')?'bad':''}"><span>Buy-in, m</span><input type="number" inputmode="numeric" min="0" max="5000" step="100" value="${t.hifb.buyIn? t.hifb.buyIn.m : 0}" data-tplbuy="buyIn" aria-label="Buy-in run in metres"></label>
        <label class="tf ${errAt(-1,'buyOut')?'bad':''}"><span>Buy-out, m</span><input type="number" inputmode="numeric" min="0" max="5000" step="100" value="${t.hifb.buyOut? t.hifb.buyOut.m : 0}" data-tplbuy="buyOut" aria-label="Buy-out run in metres"></label>
      </div></div>` : ''}
    ${(()=>{ const TGI=groupInfo(t.ex); return t.ex.map((r,i)=>{ const tgi=TGI[i];
      const x=exOf(r.exId), hold=rxClass(r.exId)==='hold', last=i===t.ex.length-1;
      const field=(k,label,val,min,max)=>`<label class="tf ${errAt(i,k)?'bad':''}"><span>${label}</span>
        <input type="number" inputmode="numeric" min="${min}" max="${max}" value="${val===null||val===undefined?'':val}" data-tpl="${i}:${k}"
          aria-label="${escHabit(x.n)}: ${label}${k==='rest'?' in seconds':''}"></label>`;
      return `${tgi&&tgi.first? groupHead(t.ex,tgi) : ''}<div class="tcard ${tgi?'ingroup':''}">
        <div class="tch"><span class="tcn">${i+1}</span>
          <div class="tt"><b>${escHabit(x.n)}</b><span>${rxClass(r.exId)}${x.eq? ' · '+(EQUIP[x.eq]||x.eq).toLowerCase() : ''}</span></div></div>
        ${(()=>{ const rec=recommendedFor(r.exId); if(t.hifb) return `<div class="recline ok">Set by the HIFB method: four sets, short rests</div>`; if(rowMatches(r)) return `<div class="recline ok">Matches your focus: ${LIFT_FOCUS[liftFocus()].t.toLowerCase()}</div>`;
          return `<div class="recline">Recommended for ${LIFT_FOCUS[liftFocus()].t.toLowerCase()}: ${rec.sets} × ${hold? rec.repMin+' to '+rec.reps+'s' : rec.repMin+' to '+rec.reps}, rest ${rec.rest}s
            <button class="inlinebtn" data-tplrec="${i}">Use it</button></div>`; })()}
        <div class="tfields">
          ${field('sets','Sets',r.sets,1,10)}
          ${field('repMin',hold?'Seconds from':'Reps from',r.repMin!=null? r.repMin : Math.max(1,(r.reps||2)-2),1,hold?300:100)}
          ${field('reps','to',r.reps,1,hold?300:100)}
          ${field('rest','Rest, s',r.rest,0,600)}
          ${t.hifb? `<label class="tf ${errAt(i,'run')?'bad':''}"><span>Run after, m</span><input type="number" inputmode="numeric" min="0" max="5000" step="100" value="${r.run? r.run.m : 0}" data-tplrun="${i}" aria-label="${escHabit(x.n)}: run after it, in metres"></label>` : ''}
        </div>
        ${showTempo()?`<div class="tempoline">tempo ${r.tempo||tempoOf(r.exId)}${tempoMatters(r.tempo||tempoOf(r.exId))?', '+tempoWords(r.tempo||tempoOf(r.exId)):''}</div>`:''}
        <div class="tacts">
          <button class="tact" data-showmove="${r.exId}">How to</button>
          <button class="tact" data-tplswap="${r.exId}">Swap</button>
          ${!last? `<button class="tact ${r.group&&tplDraft.ex[i+1]&&tplDraft.ex[i+1].group===r.group?'on':''}" data-tpllink="${i}" aria-pressed="${!!(r.group&&tplDraft.ex[i+1]&&tplDraft.ex[i+1].group===r.group)}">${r.group&&tplDraft.ex[i+1]&&tplDraft.ex[i+1].group===r.group? 'Split' : 'Superset'}</button>` : ''}
          <button class="tact icon" data-tplmove="${i}:-1" aria-label="Move ${escHabit(x.n)} up" ${i===0?'disabled':''}>&uarr;</button>
          <button class="tact icon" data-tplmove="${i}:1" aria-label="Move ${escHabit(x.n)} down" ${last?'disabled':''}>&darr;</button>
          <button class="tact bad" data-tpldel="${i}">Remove</button>
        </div></div>`;
    }).join(''); })()}
    <button class="tadd" id="tplAddEx">+ Add a movement</button>
    <div class="setbtns" style="margin:12px 0 4px">
      <button id="tplDup">Duplicate</button>
      ${t.seeded? '' : `<button id="tplDel" class="bad">Delete template</button>`}</div>
    ${t.seeded? `<div class="note">A built-in template. Duplicate it to keep this one as it is and make a version of your own.</div>` : ''}`;
}
document.addEventListener('input',e=>{
  const f=e.target.closest('[data-tpl]');
  if(f&&tplDraft){ const [i,k]=f.dataset.tpl.split(':');
    tplDraft.ex[+i][k]= f.value.trim()===''? null : +f.value;
    /* once an error has been shown, it clears itself as soon as it is fixed */
    if(tplDraft.__showErrors){ const card=f.closest('.tf'); if(card&&!tplRowErrors(tplDraft.ex[+i]).some(([kk])=>kk===k)) card.classList.remove('bad'); } }
  if(e.target.id==='tplName'&&tplDraft) tplDraft.name=e.target.value;
  const tr=e.target.closest&&e.target.closest('[data-tplrun]');
  if(tr&&tplDraft){ const r=tplDraft.ex[+tr.dataset.tplrun], v=tr.value.trim();
    r.run= v===''? {m:null,pace:(r.run&&r.run.pace)||'Fast'} : {m:+v,pace:(r.run&&r.run.pace)||'Fast'}; }
  const tb=e.target.closest&&e.target.closest('[data-tplbuy]');
  if(tb&&tplDraft&&tplDraft.hifb){ const k=tb.dataset.tplbuy, v=tb.value.trim();
    tplDraft.hifb[k]={m: v===''? null : +v, pace:(tplDraft.hifb[k]&&tplDraft.hifb[k].pace)||(k==='buyIn'?'Moderate':'Sustained effort')}; }
});
/* duplicate a template, or delete one of your own */
document.addEventListener('click',e=>{
  if(e.target.closest('#tplDup')&&tplDraft){
    const src=S.templates.find(x=>x.id===tplDraft.id)||tplDraft;
    const copy=JSON.parse(JSON.stringify(src)); delete copy.__showErrors;
    copy.id='t'+Date.now().toString(36)+Math.random().toString(36).slice(2,5); copy.seeded=false; copy.name=src.name+' (copy)';
    S.templates.push(copy); save(); toast('Duplicated as "'+copy.name+'"');
    openTplEdit(copy.id); return; }
  if(e.target.closest('#tplDel')&&tplDraft){
    const id=tplDraft.id, i=S.templates.findIndex(x=>x.id===id); if(i<0){ closeSheets(); tplDraft=null; return; }
    const days=(S.plan&&S.plan.days||[]).map((d,k)=>d.templateId===id? DAYS[k] : null).filter(Boolean);
    if(days.length){ toast('It is in your week on '+days.join(', ')+'. Change '+(days.length>1?'those days':'that day')+' first.'); return; }
    const gone=S.templates[i]; S.templates.splice(i,1); save(); closeSheets(); tplDraft=null;
    drawTemplates(); openSheet('tplSheet');
    toast(gone.name+' deleted','Undo',()=>{ S.templates.splice(Math.min(i,S.templates.length),0,gone); save(); drawTemplates(); }); return; }
});
document.addEventListener('click',e=>{
  const del=e.target.closest('[data-tpldel]');
  if(del&&tplDraft){ const i=+del.dataset.tpldel, gone=tplDraft.ex[i];
    const keep=JSON.parse(JSON.stringify(tplDraft.ex));
    tplDraft.ex.splice(i,1); normaliseGroups(tplDraft.ex); drawTplEdit();
    if(gone) toast(exOf(gone.exId).n+' removed','Undo',()=>{ tplDraft.ex=keep; drawTplEdit(); }); }
  const tl=e.target.closest('[data-tpllink]');
  if(tl&&tplDraft){ toggleLinkNext(tplDraft.ex,+tl.dataset.tpllink); drawTplEdit(); return; }
  const mv=e.target.closest('[data-tplmove]');
  if(mv&&tplDraft&&!mv.disabled){ const [i,d]=mv.dataset.tplmove.split(':').map(Number), j=i+d;
    if(j>=0&&j<tplDraft.ex.length){ const tmp=tplDraft.ex[i]; tplDraft.ex[i]=tplDraft.ex[j]; tplDraft.ex[j]=tmp; normaliseGroups(tplDraft.ex); drawTplEdit();
      /* keep focus on the card that moved, so moving it again is one more tap */
      const card=document.querySelectorAll('#tplEditBody .tcard')[j];
      const moved=card&&(card.querySelector('[data-tplmove="'+j+':'+d+'"]:not([disabled])')||card.querySelector('.tact'));
      if(moved&&moved.focus) moved.focus(); } }
  const sw=e.target.closest('[data-tplswap]');
  if(sw&&tplDraft){ closeSheets(); openAlternatives(sw.dataset.tplswap,{draft:true}); }
  if(e.target.closest('#tplAddEx')&&tplDraft){ tplPicking=true; closeSheets(); openExPicker(null); }
});
$('tplSave').addEventListener('click',()=>{
  if(!tplDraft) return;
  const errs=tplErrors(tplDraft);
  if(errs.length){
    tplDraft.__showErrors=true; drawTplEdit();
    const first=errs[0], el= first.i<0? document.getElementById('tplName')
      : document.querySelector('[data-tpl="'+first.i+':'+first.k+'"]');
    if(el&&el.focus) el.focus();
    return;
  }
  delete tplDraft.__showErrors;
  tplDraft.name=String(tplDraft.name).trim();
  tplDraft.ex.forEach(r=>{ ['sets','repMin','reps','rest'].forEach(k=>{ r[k]=+r[k]; });
    if(r.run){ if(+r.run.m>0) r.run.m=+r.run.m; else delete r.run; } });
  if(tplDraft.hifb) ['buyIn','buyOut'].forEach(k=>{ const b=tplDraft.hifb[k]; if(!b||!(+b.m>0)) tplDraft.hifb[k]=null; else b.m=+b.m; });
  const i=S.templates.findIndex(t=>t.id===tplDraft.id);
  const uses=(S.plan&&S.plan.days||[]).filter(d=>d.templateId===tplDraft.id).length;
  if(i>=0) S.templates[i]=tplDraft; else S.templates.push(tplDraft);
  save(); closeSheets(); toast(tplDraft.name+' saved'+(uses? ', for every '+tplDraft.name+' day from now on' : '')); tplDraft=null;
  if(swapReturn){ const n=swapReturn.n; swapReturn=null; renderAll(); openSwap(n,true); return; }
  if(document.getElementById('onb').classList.contains('on')&&typeof onbRender==='function') onbRender();
  else renderAll();
});

/* the You screen gets a lifting block */
const _renderProgress3=renderProgress;
renderProgress=function(){
  _renderProgress3();
  const w=S.workouts.slice(0,3);
  const vol=S.workouts.filter(x=>Date.now()-dateOf(x.d).getTime()<7*864e5).reduce((a,x)=>a+x.volume,0);
  $('dashLifts').innerHTML=(`
    <div class="panel">
      <div class="ph"><h3>Lifting, last few weeks</h3><button data-tplopen="1">Templates</button></div>
      ${w.length? `<div class="numline" style="margin-bottom:10px"><div>This week <b>${num(vol)} kg</b></div>
          <div>Sessions <b>${S.workouts.length}</b></div></div>`+
        w.map(x=>`<div class="actrow"><div class="txt"><div class="t"><b>${x.name}</b> · ${x.sets} sets · ${num(x.volume)} kg</div>
          <div class="w">${x.d} · ${x.minutes} min</div></div></div>`).join('')
        : `<div class="note" style="margin:0">No sessions logged yet. Templates are ready to go, and every one of them is yours to change.</div>`}
    </div>`)+hifbProgressPanel();
};
/* Are the 400s getting quicker, and do they hold up? Session by session. */
function hifbProgressPanel(){
  const ws=(S.workouts||[]).filter(w=>w.kind==='hifb'&&runStats(w)).slice(0,8);
  if(!ws.length) return '';
  const st=ws.map(runStats), latest=st[0], older=st.slice(1).filter(x=>x.m===latest.m);
  let trend='';
  if(older.length>=2){ const base=older.reduce((a,x)=>a+x.avg,0)/older.length, d=secs(latest.avg-base);
    trend= d<-1? `Your latest ${latest.m}m average is ${-d} seconds quicker than your ${older.length} sessions before it.`
      : d>1? `Your latest ${latest.m}m average is ${d} seconds slower than your ${older.length} sessions before it. Sleep, food and how heavy the lifting was all move this.`
      : `Your ${latest.m}m average is holding steady across your last ${older.length+1} sessions.`; }
  else trend='A couple more sessions and this shows whether your runs are getting quicker.';
  const loads=ws.filter(w=>w.rpe&&w.d>=addDays(todayKey(),-6));
  const top=Math.max(...st.map(x=>x.avg)), low=Math.min(...st.map(x=>x.avg)), span=Math.max(1,top-low);
  return `<div class="panel">
    <div class="ph"><h3>HIFB runs</h3><button data-hifbwhy="1">How it works</button></div>
    <div class="note" style="margin:0 0 10px">${trend}${loads.length? ' Training load this week: '+num(loads.reduce((a,w)=>a+w.rpe*(w.minutes||0),0))+'.' : ''}</div>
    ${ws.map((w,i)=>{ const x=st[i], pct=Math.round(30+70*(top-x.avg)/span);
      return `<div class="hrow"><div class="txt"><div class="t"><b>${escHabit(w.name)}</b></div><div class="w">${prettyDateSafe(w.d)}${x.fade!==null? ' · '+(secs(x.fade)>=0?'+':'−')+Math.abs(secs(x.fade))+'s first to last' : ''}${w.rpe? ' · effort '+w.rpe : ''}</div></div>
        <div class="hbar" aria-hidden="true"><i style="width:${pct}%"></i></div><b class="hv">${fmtSplit(x.avg)}</b></div>`; }).join('')}
    <div class="note" style="margin:8px 0 0">Average ${latest.m}m between blocks. A longer bar is a quicker run.</div>
  </div>`;
}
/* the method, said honestly */
function openHifbWhy(){
  document.getElementById('altTitle').textContent='How HIFB works';
  document.getElementById('altSub').textContent='What is behind it, and what is only a rule of thumb.';
  document.getElementById('altBody').innerHTML=`<div style="padding:0 14px 10px">
    <div class="note"><b>The session.</b> A buy-in run, four lifting blocks of four sets, a 400m run straight after each block, and a buy-out run. Four days a week by default: chest and triceps, back and biceps, a day off, shoulders and abs, legs.</div>
    <div class="note"><b>Does the running cost muscle?</b> No trial has tested HIFB itself. It is lifting and running in the same session, and for that the evidence is reassuring: a review of 43 studies found adding aerobic training did not reduce muscle growth or maximal strength, though it did blunt explosive power, more so in the same session (Schumann and colleagues, 2022).</div>
    <div class="note"><b>One caveat.</b> Looking at muscle fibres rather than whole muscles, a second review found a small cost to growth when the aerobic work was running, but not cycling (Lundberg and colleagues, 2022). If size matters most, a bike or rower can stand in for the runs: change any run in the template editor.</div>
    <div class="note"><b>What is tracked, and why.</b> Every set's weight and reps, as with any lifting session. Each run's time, so you can see whether the 400s hold up under fatigue and get quicker from week to week. The time from the first run to the last. And effort from 1 to 10, which times the minutes gives a training load (the session-RPE method, Foster and colleagues, 2001): a rising load with flat or slower runs is the early sign of fatigue building.</div>
    <div class="note"><b>Rules of thumb, not findings.</b> 60 to 90 seconds between sets, the run distances and the paces are how the method is written. Change any of them.</div></div>`;
  openSheet('altSheet');
}
document.addEventListener('click',e=>{ if(e.target.closest('[data-hifbwhy]')) openHifbWhy(); });

/* the coach brief now reads real sets */
const _brief=coachBrief;
coachBrief=function(){
  let t=_brief();
  if(S.workouts.length){
    const w=S.workouts[0];
    t+=`\nLast workout: ${w.name}, ${w.d}, ${w.sets} sets, ${w.volume} kg total, ${w.minutes} min.`;
    t+=`\n`+w.ex.map(e=>`  ${exOf(e.exId).n}: ${e.sets.map(s=>s.kg+'kg × '+s.reps).join(', ')}`).join('\n');
  }
  return t;
};

Object.assign(window.__G,{SPLITS,autoSplit,splitOf,liftOrder,splitFit,openSplitSheet,weekPattern,openPainCheck,nextPrescriptionBase,breakCut,gapDays,fitNumbers,normaliseGroups,toggleLinkNext,groupInfo,groupRest,prIndex,setShort,gymToTemplateRows,tplErrors,tplRowErrors,drawTplEdit,TPL_LIMITS,LIBRARY,EQUIP,DIFF,exBlurb,drawExList,exOf,exHistory,nextPrescription,rxClass,prescribe,repText,LIFT_FOCUS,AIM_FOCUS,liftFocus,rxOf,recommendedFor,rowMatches,applyFocusToTemplates,RX_CLASS,warmSetsFor,platesFor,plateLine,fitToKit,fitTemplatesToKit,kitOf,hasKit,KIT,KIT_PRESETS,ALL_KIT,openKitSheet,applyKitChange,loggedMealMacros,mealArt,simulatedHealth,keyOf,dateOf,incrementFor,repRangeFor,nextPrescription,tonnageOf,progressLines,fillForward,suggestFor,openCircEdit,drawCircEdit,drawTemplates,seedTemplates,
  FOODS,FOOD_CATS,FOOD_COMMON,foodOf,addFood,foodSource,mealAtMs,mealAtValue,setMealAt,skipMeal,setFoodQty,mergeDayFood,quickAddFood,qtyText,removeFood,dayFood,foodTotals,openFood,closeFood,drawFood,drawFoodList,drawFoodNew,recentFoods,MEALS,slotNow,repeatYesterday,addCustomFood,saveMealAs,addSavedMeal,allFoods,customFoods,savedMeals,seedRunPlans,seedCircuits,circuitOf,startCircuit,finishCircuit,drawCircuit,runPlan,runSession,tempoOf,tempoWords,showTempo,tempoMatters,similarTo,openAlternatives,swapEverywhere,removeEverywhere,startWorkout,finishWorkout,drawGym,openExPicker,coachBrief,
  openExMenu,openTplEdit,drawTemplates,exerciseStats,e1RM,lastSets,gymVolume,gymSets,templateChanged,startRest,isBodyweight,isBwFull,bodyweightNow,setVolume,BW_FULL,openQuick,QUICK,saveQuick,fitToKeyboard,
  get GYM(){return GYM}, get tplDraft(){return tplDraft}});
Object.defineProperties(window.__G,{
  GYM:{get:()=>GYM,set:v=>{GYM=v},configurable:true},
  tplDraft:{get:()=>tplDraft,set:v=>{tplDraft=v},configurable:true},
  circDraft:{get:()=>circDraft,set:v=>{circDraft=v},configurable:true},
  rest:{get:()=>rest,configurable:true}
});
