/* ---------- circuits, run for time ---------- */
/* ---------- the session player, for HYROX and CrossFit as well as circuits ----------
   One screen for every format: for time, AMRAP (as many rounds as possible,
   with a round counter) and EMOM (a new round each minute, with the minute
   shown). Strength work before a WOD is logged set by set with weight and
   reps. Runs record their split when ticked, so you can see whether the
   running holds up under fatigue. Any part can be changed mid-session:
   the movement, the amount and the weight, and the change can be kept for
   next time. At the end it asks how hard it was, 1 to 10. */
const FORMAT_TEXT={fortime:'For time',amrap:'AMRAP',emom:'EMOM'};
/* what was lifted last time on this movement in a session like this, as a
   normal workout does, so the boxes start with something sensible */
function lastStrengthKg(move){
  for(const w of (S.workouts||[])){ const s=(w.strength||[]).find(x=>x.move===move&&x.sets&&x.sets.length);
    if(s){ const top=Math.max(...s.sets.map(x=>+x.kg||0)); if(top>0) return top; } }
  return null;
}
function startCircuit(id){
  const c=circuitOf(id); if(!c) return null;
  closeSheets();
  GYM={mode:'circuit', circuitId:id, name:c.name, templateId:null, started:Date.now(),
    /* the workout's own length for AMRAP and EMOM, not the whole session with its strength work */
    format:c.format||'fortime', mins:(c.format==='amrap'||c.format==='emom')? (c.amrapMins||c.mins||null) : (c.mins||null), rounds:c.rounds||null, roundsDone:0, lastTick:Date.now(),
    strength:(c.strength||[]).map(x=>{ const prev=lastStrengthKg(x.move); return Object.assign({},x,{prev,sets:Array.from({length:+x.sets||3},()=>({kg:prev||x.kg||'',reps:x.amt||x.reps||5,done:false}))}); }),
    items:c.items.map(x=>Object.assign({},x,{done:false})), ex:[], pre:{}, done:false};
  document.getElementById('gym').classList.add('on');
  drawCircuit();
  clearInterval(gymTick);
  gymTick=setInterval(()=>{ if(GYM&&!GYM.done&&GYM.mode==='circuit') $('gymSub').textContent=circSubText(); },1000);
  return GYM;
}
function circuitDone(){ return GYM.items.filter(x=>x.done).length; }
function circSubText(){
  const t=elapsed();
  if(GYM.format==='amrap'&&GYM.mins) return t+' · AMRAP '+GYM.mins+' min';
  if(GYM.format==='emom'&&GYM.mins){ const m=Math.min(GYM.mins,Math.floor((Date.now()-GYM.started)/60000)+1); return t+' · EMOM, minute '+m+' of '+GYM.mins; }
  return t+' · for time';
}
const fmtSplit=ms=>{ const s=Math.round(ms/1000); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };
function drawCircuit(){
  { const sg=$('gymSegs'); if(sg) sg.innerHTML=''; }
  const c=circuitOf(GYM.circuitId)||{};
  $('gymName').textContent=GYM.name;
  $('gymSub').textContent=circSubText();
  const howTo= GYM.format==='amrap'? `As many rounds as you can in ${GYM.mins} minutes. Count each full round below.`
    : GYM.format==='emom'? `Every minute on the minute, for ${GYM.mins} minutes. Do the round, rest what is left of the minute.`
    : (GYM.rounds&&GYM.rounds>1? `${GYM.rounds} rounds, for time.` : 'For time: straight through, as quickly as you can do it well.');
  const strength=GYM.strength.length? `<div class="slab" style="margin:4px 0 6px">Strength first</div>`+GYM.strength.map((s,si)=>{ const m=moveOf(s.move)||{n:s.move};
    return `<div class="exc"><div class="exh"><div class="n">${escHabit(m.n)}</div></div>${s.prev? `<div class="note" style="margin:0 0 4px">Last time ${s.prev} kg</div>` : `<div class="note" style="margin:0 0 4px">First time here: pick a weight you could do a couple more reps with.</div>`}
      ${s.sets.map((x,j)=>`<div class="setline ${x.done?'done':''}">
        <span class="sn">${j+1}</span>
        <label class="mini-in">kg <input type="number" inputmode="decimal" step="0.5" value="${x.kg}" placeholder="kg" data-strset="${si}:${j}:kg" aria-label="${escHabit(m.n)} set ${j+1} weight"></label>
        <label class="mini-in">reps <input type="number" inputmode="numeric" value="${x.reps}" data-strset="${si}:${j}:reps" aria-label="${escHabit(m.n)} set ${j+1} reps"></label>
        <button class="tick" data-strdone="${si}:${j}" aria-label="Set ${j+1} done">${x.done?'✓':''}</button></div>`).join('')}</div>`; }).join('') : '';
  let prevAt=GYM.started;
  const items=GYM.items.map((x,i)=>{ const text=x.move? itemText(x) : x.label;
    let split='';
    if(x.done&&x.at){ if(x.t==='run') split=fmtSplit(x.at-prevAt); prevAt=x.at; }
    return `<div class="citemrow"><button class="citem ${x.done?'done':''}" data-citem="${i}">
        <span class="cn">${x.t==='run'?'run':'station'}</span>
        <span class="ct"><b>${escHabit(text)}</b>${x.sub?`<span>${escHabit(x.sub)}</span>`:''}${split?`<span class="split">split ${split}</span>`:''}</span>
        <span class="ctick">${x.done?'✓':''}</span></button>
        ${x.move? `<button class="citemedit" data-citemedit="${i}" aria-label="Change ${escHabit(text)}">Change</button>` : ''}</div>`; }).join('');
  const roundsCtl= GYM.format==='amrap'||GYM.format==='emom'||(GYM.rounds&&GYM.rounds>1)? `<div class="roundsctl">
      <span>${GYM.format==='emom'?'Minutes done':'Rounds done'}</span>
      <button class="mini" data-rounds="-1" aria-label="One fewer">&minus;</button><b id="roundsN">${GYM.roundsDone}</b>
      <button class="mini go" data-rounds="1" aria-label="One more">+</button></div>` : '';
  $('gymBody').innerHTML=`
    <div class="exc"><div class="cue">${escHabit(howTo)}</div>${c.why?`<div class="note" style="margin:6px 0 0">${escHabit(c.why)}</div>`:''}
      ${c.warn?`<div class="warn">${escHabit(c.warn)}</div>`:''}</div>
    ${strength}
    ${GYM.strength.length? '<div class="slab" style="margin:10px 0 6px">The workout</div>' : ''}
    ${roundsCtl}
    ${items}
    <div class="addex"><button id="cAdd">+ Add a station</button></div>`;
  $('gymFoot').innerHTML=`<div>Done <b>${circuitDone()} of ${GYM.items.length}</b></div>
    <div style="margin-left:auto">Tap each one as you finish it</div>`;
}
/* change one part, mid-session: movement, amount, weight; kept for next time if wanted */
let citemSel=null;
function moveOptions(cur){
  return Object.keys(MOVES).filter(id=>id===cur||kitOK(MOVES[id])).sort((a,b)=>MOVES[a].n.localeCompare(MOVES[b].n))
    .map(id=>`<option value="${id}" ${id===cur?'selected':''}>${escHabit(MOVES[id].n)}${MOVES[id].u==='m'?' (metres)':(MOVES[id].u==='cal'?' (calories)':(MOVES[id].u==='s'?' (seconds)':''))}</option>`).join('');
}
function openItemSheet(i){
  const x=GYM.items[i]; if(!x||!x.move) return;
  citemSel={i,move:x.move,amt:x.amt,kg:x.kg,keep:true};
  drawItemSheet(); openSheet('altSheet');
}
function drawItemSheet(){
  const s=citemSel, m=moveOf(s.move)||{};
  document.getElementById('altTitle').textContent='Change this part';
  document.getElementById('altSub').textContent='Pick the movement, how much, and the weight.';
  document.getElementById('altBody').innerHTML=`<div style="padding:0 14px 10px">
    <div class="nf"><label for="isMove">Movement</label><select id="isMove">${moveOptions(s.move)}</select></div>
    <div class="nf" style="margin-top:8px"><label for="isAmt">${m.u==='m'?'Metres':(m.u==='cal'?'Calories':(m.u==='s'?'Seconds':'Reps'))}</label>
      <input id="isAmt" type="number" inputmode="numeric" value="${s.amt||''}"></div>
    ${m.kg||s.kg? `<div class="nf" style="margin-top:8px"><label for="isKg">Weight, kg${m.each?' each':''}</label><input id="isKg" type="number" inputmode="decimal" step="0.5" value="${s.kg||''}"></div>` : ''}
    <label class="flagrow"><input type="checkbox" id="isKeep" ${s.keep?'checked':''}> <span>Keep this change for next time</span></label>
    <button class="sheetcta" id="isSave" style="width:100%">Use this</button></div>`;
}
document.addEventListener('change',e=>{
  if(!citemSel) return;
  if(e.target.id==='isMove'){ const m=moveOf(e.target.value)||{}; citemSel.move=e.target.value; citemSel.amt=m.r||citemSel.amt; citemSel.kg=m.kg? m.kg[sexKey()] : null; drawItemSheet(); }
  if(e.target.id==='isKeep') citemSel.keep=e.target.checked;
});
document.addEventListener('input',e=>{
  if(!citemSel) return;
  if(e.target.id==='isAmt') citemSel.amt=+e.target.value||citemSel.amt;
  if(e.target.id==='isKg') citemSel.kg=e.target.value===''? null : +e.target.value;
  const ss=e.target.closest&&e.target.closest('[data-strset]');
});
document.addEventListener('click',e=>{
  if(e.target.closest('#isSave')&&citemSel&&GYM){
    const s=citemSel, x=GYM.items[s.i];
    const apply=it=>{ it.move=s.move; it.amt=s.amt; it.kg=s.kg; it.t=s.move==='run'?'run':'station';
      delete it.origMove; delete it.origAmt; delete it.origKg; delete it.origSub; it.sub=''; };
    apply(x);
    if(s.keep){ const c=circuitOf(GYM.circuitId); if(c&&c.items[s.i]) apply(c.items[s.i]); save(); }
    citemSel=null; closeSheets(); drawCircuit(); toast('Changed to '+itemText(x)); return;
  }
  const ce=e.target.closest('[data-citemedit]'); if(ce&&GYM){ openItemSheet(+ce.dataset.citemedit); return; }
  const rd=e.target.closest('[data-rounds]'); if(rd&&GYM){ GYM.roundsDone=Math.max(0,GYM.roundsDone+ +rd.dataset.rounds); const n=document.getElementById('roundsN'); if(n) n.textContent=GYM.roundsDone; return; }
  const sd=e.target.closest('[data-strdone]'); if(sd&&GYM){ const [si,j]=sd.dataset.strdone.split(':').map(Number); const x=GYM.strength[si].sets[j]; x.done=!x.done; drawCircuit(); return; }
  const rp=e.target.closest('[data-rpe]'); if(rp&&GYM&&GYM.record){ GYM.record.rpe=+rp.dataset.rpe; save();
    const sl=document.getElementById('sLoad'); if(sl&&GYM.record.minutes) sl.textContent='Effort '+GYM.record.rpe+' out of 10 over '+GYM.record.minutes+' minutes: a training load of '+num(GYM.record.rpe*GYM.record.minutes)+' (session RPE times minutes).';
    document.querySelectorAll('[data-rpe]').forEach(b=>b.classList.toggle('on',b===rp)); return; }
});
document.addEventListener('input',e=>{
  const ss=e.target.closest&&e.target.closest('[data-strset]'); if(!ss||!GYM) return;
  const [si,j,k]=ss.dataset.strset.split(':'); GYM.strength[+si].sets[+j][k]=e.target.value===''? '' : +e.target.value;
});
function finishCircuit(){
  if(!GYM||GYM.done) return null;
  GYM.done=true; clearInterval(gymTick);
  const mins=Math.max(1,Math.round((Date.now()-GYM.started)/60000));
  const done=circuitDone(), total=GYM.items.length;
  let prevAt=GYM.started;
  const splits=GYM.items.filter(x=>x.done&&x.at).map(x=>{ const ms=x.at-prevAt; prevAt=x.at; return x.t==='run'? {what:itemText(x)||x.label,ms} : null; }).filter(Boolean);
  const strength=GYM.strength.map(s=>({move:s.move,sets:s.sets.filter(x=>x.done).map(x=>({kg:+x.kg||0,reps:+x.reps||0}))})).filter(s=>s.sets.length);
  const record={id:'w'+Date.now(),d:todayKey(),name:GYM.name,kind:'circuit',circuitId:GYM.circuitId,
    minutes:mins,sets:done,volume:strength.reduce((a,s)=>a+s.sets.reduce((b,x)=>b+x.kg*x.reps,0),0),stations:done,ofStations:total,
    format:GYM.format,rounds:GYM.roundsDone||null,splits,strength,rpe:null,
    ex:[]};
  GYM.record=record;
  S.workouts.unshift(record);
  const prev=S.workouts.filter(w=>w.circuitId===GYM.circuitId&&w.id!==record.id)[0];
  logSession({title:GYM.name,type:'workout',adds:1,steps:GYM.items.map(x=>({n:x.label||itemText(x)||'Part',r:x.t}))});
  $('gymBody').innerHTML=`<div class="summary">
    <div class="big">${mins} minutes.</div>
    <div class="numline" style="margin-top:10px"><div><b>${done}</b> of ${total} finished</div>
      <div>${prev? 'last time <b>'+prev.minutes+' min</b>':'first time on this one'}</div></div>
    ${prev? `<div class="note">${mins<prev.minutes? 'That is '+(prev.minutes-mins)+' minutes quicker than last time.' :
      (mins>prev.minutes? 'That is '+(mins-prev.minutes)+' minutes slower. Conditions, sleep and the weights all move this number.' :
      'Same time as last time.')}</div>`:'<div class="note">That is the time to beat.</div>'}
    ${done<total&&GYM.format==='fortime'? `<div class="note">You ticked ${done} of ${total}, so the time is not comparable to a full one.</div>`:''}
    ${GYM.roundsDone? `<div class="note"><b>${GYM.roundsDone}</b> ${GYM.format==='emom'?'minutes':'rounds'} done.</div>` : ''}
    ${splits.length? `<div class="slab" style="margin-top:10px">Run splits</div><div class="splits">${splits.map((s,i)=>`<span>${i+1}. ${fmtSplit(s.ms)}</span>`).join('')}</div>` : ''}
    <div class="slab" style="margin-top:12px">How hard was that?</div>
    <div class="rpe" role="group" aria-label="Effort from 1 to 10">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button data-rpe="${n}" aria-label="${n} out of 10">${n}</button>`).join('')}</div>
    <div class="note">1 is easy, 10 is everything you had. It helps spot when fatigue is building.</div>
  </div>`;
  $('gymFoot').innerHTML=`<div style="margin-left:auto"><button class="mini go" id="gymDone">Close</button></div>`;
  save(); renderAll();
  return {record,prev};
}
document.addEventListener('click',e=>{
  const ci=e.target.closest('[data-citem]');
  if(ci&&GYM&&GYM.items[+ci.dataset.citem]){ const it=GYM.items[+ci.dataset.citem]; if(!it.done) it.at=Date.now(); }
  if(ci&&GYM&&GYM.mode==='circuit'){ const i=+ci.dataset.citem;
    GYM.items[i].done=!GYM.items[i].done;
    if(GYM.items[i].done&&navigator.vibrate) navigator.vibrate(60);
    drawCircuit(); }
  if(e.target.closest('#cAdd')&&GYM&&GYM.mode==='circuit'){
    GYM.items.push({t:'station',label:'Extra station',sub:'',done:false}); drawCircuit(); }
});

/* ---------- exercise picker and per exercise menu ---------- */
let pickerFor=null;
let pickFilterG='', pickFilterE='', pickKitOnly=true;
function openExPicker(swapIndex){
  pickerFor=swapIndex;
  pickFilterG=''; pickFilterE=''; pickKitOnly=true;
  $('exSheetTitle').textContent = swapIndex===null? 'Add a movement' : 'Swap for';
  $('exQ').value=''; drawExList('');
  openSheet('exSheet');
}
/* 250 movements is only useful if you can find one in two taps, so: search
   across the name, the muscle and the kit, then filters for body part and for
   what you actually have. Anything you have done before floats to the top. */
function drawExList(q){
  const term=(q===undefined? ($('exQ')?$('exQ').value:'') : q||'').trim().toLowerCase();
  const done=Object.keys(S.lifts||{});
  let hits=LIBRARY.filter(x=>{
    if(pickFilterG&&x.g!==pickFilterG) return false;
    if(pickFilterE&&x.eq!==pickFilterE) return false;
    if(pickKitOnly&&!pickFilterE&&!hasKit(x.eq)) return false;
    if(!term) return true;
    return (x.n+' '+x.g+' '+x.m+' '+(x.s||'')+' '+x.p+' '+(EQUIP[x.eq]||'')).toLowerCase().includes(term);
  });
  const chips=`<div class="pickchips">
    <button class="${pickFilterG?'':'on'}" data-pickg="">All ${LIBRARY.length}</button>
    ${GROUPS.filter(g=>LIBRARY.some(x=>x.g===g)).map(g=>`<button class="${pickFilterG===g?'on':''}" data-pickg="${g}">${g}</button>`).join('')}
  </div>
  <div class="pickchips">
    <button class="${pickKitOnly&&!pickFilterE?'on':''}" data-pickkit="1">What you have</button>
    <button class="${!pickKitOnly&&!pickFilterE?'on':''}" data-picke="">Everything</button>
    ${Object.keys(EQUIP).filter(k=>LIBRARY.some(x=>x.eq===k)).map(k=>`<button class="${pickFilterE===k?'on':''}" data-picke="${k}">${EQUIP[k]}</button>`).join('')}
  </div>`;
  const row=x=>{
    const st=exerciseStats(x.id), out=((S.profile.excluded)||[]).includes(x.id);
    return `<button class="exrow ${out?'excluded':''}" data-pick="${x.id}">
      <div class="txt"><div class="n">${x.n}${out?' · you took this out':''}</div>
        <div class="s">${out? 'tap to put it back' : exBlurb(x)+(st? ' · '+st.sessions+' session'+(st.sessions===1?'':'s')+', best '+st.heaviest+'kg' : '')}</div>
        <div class="cue2">${x.c}</div></div>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--mute)" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>`;
  };
  if(term){
    /* a name match beats a primary muscle match beats a mention in passing */
    const rank=x=>(x.n.toLowerCase().startsWith(term)?400:0)+(x.n.toLowerCase().includes(term)?200:0)
      +((x.m||'').toLowerCase().includes(term)?120:0)+((x.g||'').toLowerCase()===term?80:0)
      +((EQUIP[x.eq]||'').toLowerCase().includes(term)?40:0)+((x.s||'').toLowerCase().includes(term)?20:0);
    hits=hits.slice().sort((p1,p2)=>rank(p2)-rank(p1));
  }
  const yours=hits.filter(x=>done.includes(x.id));
  const rest=hits.filter(x=>!done.includes(x.id));
  const body = !hits.length
    ? `<div class="empty">Nothing matching. Try a muscle name, or the kit you have.</div>`
    : (yours.length? `<div class="slab" style="padding:0 14px">You have done these</div>`+yours.map(row).join('') : '')
      + (term||pickFilterG||pickFilterE
        ? `<div class="slab" style="padding:0 14px">${hits.length} match${hits.length===1?'':'es'}</div>`+rest.map(row).join('')
        : GROUPS.map(g=>{ const rows=rest.filter(x=>x.g===g);
            return rows.length? `<div class="slab" style="padding:0 14px">${g} · ${rows.length}</div>`+rows.map(row).join('') : ''; }).join(''));
  $('exList').innerHTML=chips+body;
}
document.addEventListener('click',e=>{
  const fg=e.target.closest('[data-pickg]');
  if(fg){ pickFilterG=fg.dataset.pickg; drawExList(); }
  const fe=e.target.closest('[data-picke]');
  if(fe){ pickFilterE=fe.dataset.picke; pickKitOnly=false; drawExList(); }
  const fk=e.target.closest('[data-pickkit]');
  if(fk){ pickKitOnly=true; pickFilterE=''; drawExList(); }
});
$('exQ').addEventListener('input',e=>drawExList(e.target.value));
document.addEventListener('click',e=>{
  const pk=e.target.closest('[data-pick]'); if(!pk) return;
  const id=pk.dataset.pick;
  const gymOpen=document.getElementById('gym').classList.contains('on');
  if(!altSwapPick && !tplPicking && !gymOpen){ closeSheets(); notYet('Nothing open to add '+exOf(id).n+' to'); return; }
  if(altSwapPick){ const ctx=altSwapPick; altSwapPick=null;
    swapEverywhere(ctx.exId,id); toast('Swapped for '+exOf(id).n);
    closeSheets();
    if(ctx.ctx.onboarding&&typeof onbRender==='function') onbRender();
    if(ctx.ctx.draft&&typeof drawTplEdit==='function'){ drawTplEdit(); openSheet('tplEdit'); }
    return; }
  if(tplDraft && tplPicking){ tplDraft.ex.push({exId:id,sets:3,reps:12,tempo:tempoOf(id),rest:90,note:''}); tplPicking=false; closeSheets(); drawTplEdit(); openSheet('tplEdit'); return; }
  if(!GYM) return;
  if(((S.profile.excluded)||[]).includes(id)){ S.profile.excluded=S.profile.excluded.filter(x=>x!==id); save(); }
  if(pickerFor===null) GYM.ex.push(newExEntry({exId:id,sets:3,reps:12,rest:90,tempo:tempoOf(id)}));
  else { const keep=GYM.ex[pickerFor]; GYM.ex[pickerFor]=newExEntry({exId:id,sets:keep.sets.length,reps:keep.reps,rest:keep.rest}); }
  closeSheets(); drawGym();
});
function openExMenu(i){
  const e=GYM.ex[i], x=exOf(e.exId), st=exerciseStats(e.exId);
  $('exMenuTitle').textContent=x.n;
  $('exMenuStats').textContent = st
    ? `${st.sessions} sessions · heaviest ${st.heaviest}kg · best estimated 1RM ${st.best1}kg`
    : 'No history yet. This one starts today.';
  $('exMenuBody').innerHTML=`
    ${st? `<div style="padding:0 14px 12px">${st.last.sets.map(s=>`<div class="prcard"><div class="t">${s.kg}kg × ${s.reps}</div>
      <div class="tag">${e1RM(s.kg,s.reps)}kg e1RM</div></div>`).join('')}<div class="note">Last session, ${st.last.d}.</div></div>`:''}
    <button class="logrow" data-exact="swap:${i}"><div class="txt"><div class="t">Swap this exercise</div><div class="s">Keeps the sets you have done</div></div></button>
    <button class="logrow" data-exact="rest:${i}"><div class="txt"><div class="t">Rest timer: ${e.rest}s</div><div class="s">Tap to cycle 60, 90, 120, 180</div></div></button>
    ${i<GYM.ex.length-1? (()=>{ const gi=groupInfo(GYM.ex)[i], joined=gi&&!gi.last;
      const nxt=exOf(GYM.ex[i+1].exId).n;
      return `<button class="logrow" data-exact="link:${i}"><div class="txt"><div class="t">${joined? 'Split from '+escHabit(nxt) : (gi? 'Add '+escHabit(nxt)+' to this '+gi.label.toLowerCase() : 'Superset with '+escHabit(nxt))}</div>
        <div class="s">${joined? 'They go back to separate movements with their own rest' : 'Back to back, one set of each, then rest. Three or more is a giant set.'}</div></div></button>`; })() : ''}
    <button class="logrow" data-exact="hurt:${i}"><div class="txt"><div class="t">This one hurts</div><div class="s">Rate it and get a clear call: carry on, lighter, swap, or get it checked</div></div></button>
    <button class="logrow" data-exact="up:${i}"><div class="txt"><div class="t">Move up</div></div></button>
    <button class="logrow" data-exact="down:${i}"><div class="txt"><div class="t">Move down</div></div></button>
    <button class="logrow" data-exact="del:${i}"><div class="txt"><div class="t">Remove from today only</div>
      <div class="s">It stays in the template for next time</div></div></button>
    <button class="logrow" data-exact="forever:${i}"><div class="txt"><div class="t" style="color:var(--coral-text)">Take it out for good</div>
      <div class="s">Gone from every day, and never suggested again</div></div></button>`;
  openSheet('exMenu');
}
document.addEventListener('click',e=>{
  const a=e.target.closest('[data-exact]'); if(!a||!GYM) return;
  const [act,iRaw]=a.dataset.exact.split(':'); const i=+iRaw;
  if(act==='swap'){ closeSheets(); openExPicker(i); return; }
  if(act==='rest'){ const steps=[60,90,120,180]; const cur=steps.indexOf(GYM.ex[i].rest);
    GYM.ex[i].rest=steps[(cur+1)%steps.length]; S.restPrefs[GYM.ex[i].exId]=GYM.ex[i].rest; save(); openExMenu(i); drawGym(); return; }
  if(act==='up'&&i>0){ const t=GYM.ex[i]; GYM.ex[i]=GYM.ex[i-1]; GYM.ex[i-1]=t; }
  if(act==='down'&&i<GYM.ex.length-1){ const t=GYM.ex[i]; GYM.ex[i]=GYM.ex[i+1]; GYM.ex[i+1]=t; }
  if(act==='del') GYM.ex.splice(i,1);
  if(act==='link') toggleLinkNext(GYM.ex,i);
  if(act==='hurt'){ closeSheets(); openPainCheck(i); return; }
  normaliseGroups(GYM.ex);
  if(act==='forever'){ const id=GYM.ex[i].exId, n=exOf(id).n;
    GYM.ex.splice(i,1); removeEverywhere(id); toast(n+' taken out of every day'); }
  closeSheets(); drawGym();
});

/* ---------- finishing ---------- */
function finishWorkout(){
  if(!GYM) return null;
  const k=todayKey(), prs=[];
  let volume=0, sets=0;
  GYM.ex.forEach(e=>{
    const done=e.sets.filter(s=>s.done&&!s.warm&&s.kg!==''&&s.reps!=='');
    if(!done.length) return;
    const before=exerciseStats(e.exId);
    if(GYM.deload){ done.forEach(s=>{ volume+=setVolume(s); sets++; });
      S.lifts[e.exId]=S.lifts[e.exId]||[];
      const dEntry={d:k,deload:GYM.deload,sets:done.map(s=>({kg:+s.kg,reps:+s.reps}))};
      const top=S.lifts[e.exId][0];
      if(top&&top.d===k&&top.deload) S.lifts[e.exId][0]=dEntry; else S.lifts[e.exId].unshift(dEntry);
      return; }
    done.forEach(s=>{ volume+=setVolume(s); sets++; });
    const heaviest=Math.max(...done.map(s=>+s.kg));
    const best1=Math.max(...done.map(s=>e1RM(s.kg,s.reps)));
    if(!before) prs.push({ex:exOf(e.exId).n,tag:'First',t:`${heaviest}kg on the board to beat`});
    else {
      if(heaviest>before.heaviest) prs.push({ex:exOf(e.exId).n,tag:'Weight',t:`${heaviest}kg, up from ${before.heaviest}kg`});
      if(best1>before.best1) prs.push({ex:exOf(e.exId).n,tag:'Est 1RM',t:`${best1}kg estimated, up from ${before.best1}kg`});
    }
    S.lifts[e.exId]=S.lifts[e.exId]||[];
    const entry={d:k,sets:done.map(s=>({kg:+s.kg,reps:+s.reps}))};
    if(GYM.deload) entry.deload=GYM.deload;
    /* same-day replace only touches an entry of the same kind, so an easy
       session can never overwrite a working one or the other way round */
    const top=S.lifts[e.exId][0];
    if(top&&top.d===k&&!!top.deload===!!entry.deload) S.lifts[e.exId][0]=entry; else S.lifts[e.exId].unshift(entry);
  });
  const mins=Math.max(1,Math.round((Date.now()-GYM.started)/60000));
  const record={id:'w'+Date.now(),d:k,name:GYM.name,templateId:GYM.templateId,minutes:mins,volume:Math.round(volume),sets,
    deload:GYM.deload||null,
    started:GYM.started||null, finished:Date.now(),
    ex:GYM.ex.map(e=>({exId:e.exId,group:e.group||undefined,sets:e.sets.filter(s=>s.done).map(s=>({kg:+s.kg||0,reps:+s.reps||0,warm:!!s.warm})),
      /* what was prescribed, kept so the session can say whether the range was hit */
      plan:{sets:(e.dp? e.dp.sets : (e.planSets||e.sets.filter(s=>!s.warm).length)), repMin:e.repMin||null, reps:e.dp? e.dp.reps : (e.reps||null),
        kg:e.dp? e.dp.kg : (e.rx&&typeof e.rx.kg==='number'? e.rx.kg : null), rest:e.rest||null}}))};
  if(GYM.hifb){
    /* a run left going when Finish is pressed ends there */
    gymRuns().forEach(x=>{ if(x.r.startAt&&!x.r.ms) stopRun(x.key,true); });
    const runs=gymRuns().map(x=>({key:x.key,label:x.label,after:x.after||null,m:x.r.m,pace:x.r.pace||'',ms:x.r.ms||null,manual:!!x.r.manual}));
    const timed=runs.filter(r=>r.ms), first=GYM.hifb.buyIn, last=GYM.hifb.buyOut;
    record.kind='hifb'; record.focus=GYM.hifb.focus||null; record.runs=runs;
    record.runMs=timed.reduce((a,r)=>a+r.ms,0); record.runM=timed.reduce((a,r)=>a+r.m,0);
    record.runMin=Math.round(record.runMs/60000);
    /* first metre of the buy-in to the last metre of the buy-out, when both were timed live */
    record.totalMs= first&&last&&first.startAt&&last.endAt&&!last.manual? last.endAt-first.startAt : null;
    record.rpe=null;
  }
  /* which movements set a personal best, kept so the session can show it later */
  try{ record.prs=GYM.ex.filter(e=>typeof exHasPR==='function'&&exHasPR(e)).map(e=>e.exId); }catch(err){ record.prs=[]; }
  S.workouts.unshift(record);
  if(record.kind==='hifb') GYM.record=record;
  GYM.done=true; clearInterval(gymTick); clearInterval(restTick); $('restBar').classList.remove('on');
  logSession({title:GYM.name,type:'workout',adds:1,workoutId:record.id,steps:GYM.ex.map(e=>({n:exOf(e.exId).n,r:''}))});
  const amended = GYM.templateId && templateChanged(GYM.templateId, GYM);
  $('gymBody').innerHTML=`<div class="summary">
    <div class="big">${record.name} done.</div>
    <div class="numline" style="margin-top:10px"><div><b>${mins}</b> min</div><div><b>${sets}</b> sets</div><div><b>${num(record.volume)}</b> kg lifted</div></div>
    ${prs.length? `<div class="slab">Records</div>${prs.map(p=>`<div class="prcard"><div class="tag"><span class="pr">PR</span> ${p.tag}</div>
      <div class="t"><b>${p.ex}</b> ${p.t}</div></div>`).join('')}` : `<div class="note">No records today. Most sessions are not record days, and that is how it should be.</div>`}
    ${(() => { const lines=progressLines(GYM); return lines.length? `<div class="slab">Next time</div>`+
      lines.map(l=>`<div class="nextrow ${l.p.kind==='load'?'up':''}">
        <div class="nn">${l.name}</div>
        <div class="nv">${l.p.kg!==null? l.p.kg+'kg × '+l.p.reps : 'your pick'}${l.p.kind==='load'? ` <span class="uparrow">+${l.p.inc}kg</span>`:''}</div>
        <div class="nw">${l.p.why}</div>
        <div class="nw">You moved ${num(Math.round(l.tonnage))}kg on it today.</div>
      </div>`).join('')
      +`<div class="note">Reps first, then the weight. That is double progression, and the trials say it grows muscle about as well as any other way of adding load, provided something goes up. These numbers are a suggestion: change them in the session if they are wrong.</div>` : ''; })()}
    ${record.kind==='hifb'? hifbSummary(record) : ''}
    <button class="sheetcta" id="seeSession" data-wid="${record.id}" style="margin:16px 0 0;width:100%">See everything you did</button>
    <div class="setbtns" style="margin-top:12px">
      ${amended? `<button id="tplUpdate">Update the ${GYM.name} template</button>`:''}
      <button id="tplNew">Save as new template</button></div>
  </div>`;
  $('gymFoot').innerHTML=`<div style="margin-left:auto"><button class="mini go" id="gymDone">Close</button></div>`;
  save(); renderAll();
  return {record,prs};
}
/* ---------- reading an HIFB session's runs ---------- */
const betweenRuns=w=>(w.runs||[]).filter(r=>r.ms&&r.key!=='in'&&r.key!=='out');
/* average 400 pace, and how much the last run between blocks slowed against the first */
function runStats(w){
  const b=betweenRuns(w); if(!b.length) return null;
  const avg=b.reduce((a,r)=>a+r.ms,0)/b.length;
  return {avg, n:b.length, m:b[0].m, fade: b.length>1? b[b.length-1].ms-b[0].ms : null};
}
const secs=ms=>Math.round(ms/1000);
function fadeText(f){ if(f===null) return '';
  const s2=secs(f); return s2>2? 'The last run between blocks was '+s2+' seconds slower than the first.' : (s2<-2? 'The last run between blocks was '+(-s2)+' seconds quicker than the first.' : 'Your runs held steady from first block to last.'); }
function hifbRunsTable(w,prev){
  const runs=(w.runs||[]); if(!runs.length) return '';
  return `<div class="slab" style="margin-top:12px">Run splits</div><div class="rsplits">${runs.map(r=>{
    const p=prev&&(prev.runs||[]).find(y=>y.key===r.key&&y.ms), d=p&&r.ms? secs(r.ms-p.ms) : null;
    return `<div class="rsrow ${r.ms?'':'miss'}"><span class="rsl">${escHabit(r.label)}<small>${r.m}m${r.after? ' · after '+escHabit(exOf(r.after).n) : ''}</small></span>
      <b>${r.ms? fmtSplit(r.ms) : 'not timed'}</b><span class="rsd">${r.ms? perKm(r.ms,r.m)+' /km' : ''}${d!==null&&d!==0? ` <em class="${d<0?'up':'down'}">${d<0?'−':'+'}${Math.abs(d)}s</em>` : ''}</span></div>`; }).join('')}</div>`;
}
function hifbSummary(rec){
  const prev=lastHifb(rec.templateId,rec.id), st=runStats(rec), pst=prev&&runStats(prev);
  const lines=[];
  if(st){ lines.push(`Average ${st.m}m between blocks: <b>${fmtSplit(st.avg)}</b>`+(pst? ', against '+fmtSplit(pst.avg)+' last time.' : '. That is the number to beat.'));
    if(st.fade!==null) lines.push(fadeText(st.fade)); }
  if(rec.totalMs) lines.push(`First run to last: <b>${fmtSplit(rec.totalMs)}</b>`+(prev&&prev.totalMs? ', against '+fmtSplit(prev.totalMs)+' last time.' : '.'));
  if(!st&&!(rec.runs||[]).some(r=>r.ms)) lines.push('No runs were timed this time, so there is nothing to compare yet.');
  return hifbRunsTable(rec,prev)+lines.map(l=>`<div class="note">${l}</div>`).join('')+
    `<div class="slab" style="margin-top:12px">How hard was that?</div>
    <div class="rpe" role="group" aria-label="Effort from 1 to 10">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button data-rpe="${n}" aria-label="${n} out of 10">${n}</button>`).join('')}</div>
    <div class="note" id="sLoad">1 is easy, 10 is everything you had. Times the minutes, it gives the session's training load, which shows fatigue building over a week.</div>`;
}
function templateChanged(id,gym){
  const t=S.templates.find(x=>x.id===id); if(!t) return false;
  if(t.ex.length!==gym.ex.length) return true;
  return t.ex.some((row,i)=>row.exId!==gym.ex[i].exId || row.sets!==gym.ex[i].sets.filter(s=>!s.warm).length || !!row.run!==!!gym.ex[i].run);
}
function gymToTemplateRows(){
  return normaliseGroups(GYM.ex.map(e=>{ const r={exId:e.exId,sets:Math.max(1,e.sets.filter(s=>!s.warm).length),
    reps:e.reps,repMin:e.repMin,tempo:e.tempo,rest:e.rest,note:e.note}; if(e.group) r.group=e.group;
    if(e.run) r.run={m:e.run.m,pace:e.run.pace}; return r; }));
}
$('gymFinish').addEventListener('click',()=>{
  if(!GYM||GYM.done) return;
  if(GYM.mode==='circuit'){
    if(!circuitDone()){ toast('Tick at least one station first'); return; }
    finishCircuit(); return;
  }
  if(!gymSets()){ toast('Tick at least one set first'); return; }
  finishWorkout();
});
document.addEventListener('click',e=>{
  if(e.target.closest('#gymDone')){ $('gym').classList.remove('on'); go('today'); }
  if(e.target.closest('#tplUpdate')){
    const t=S.templates.find(x=>x.id===GYM.templateId);
    t.ex=gymToTemplateRows(); save(); toast('Template updated to match what you actually did');
  }
  if(e.target.closest('#tplNew')){
    const t={id:'t'+Date.now(),name:GYM.name+' (mine)',ex:gymToTemplateRows()};
    if(GYM.hifb){ t.kind='hifb'; t.focus=GYM.hifb.focus; t.hifb={buyIn:GYM.hifb.buyIn? {m:GYM.hifb.buyIn.m,pace:GYM.hifb.buyIn.pace} : null,
      buyOut:GYM.hifb.buyOut? {m:GYM.hifb.buyOut.m,pace:GYM.hifb.buyOut.pace} : null}; }
    S.templates.push(t); save(); toast('Saved as "'+t.name+'"');
  }
});

/* Every choice comes with a reason, taken from the aim you picked and what you
   have actually been doing. Suggestions, not instructions: the label says why a
   thing is being put forward, and you are free to ignore it. */
function suggestFor(code){
  const aim=S.profile.aim, st=(typeof weekStats==='function')? weekStats() : null;
  const counts=dayCounts();
  const lifts=S.plan? S.plan.days.filter(d=>d.templateId).length : 0;
  const cardio=S.plan? S.plan.days.filter(d=>d.runId||d.slot==='walk').length : 0;
  const steps=st&&st.steps!==null? st.steps : null;
  if((S.templates||[]).some(t=>t.id===code)){
    if(lifts<counts.lift) return 'You asked for '+counts.lift+' lifting days and the week has '+lifts;
    if(aim==='build') return 'Lifting is the main lever for what you are after';
    if(aim==='lose') return 'Holds on to muscle while you are eating less';
    if(aim==='endure') return 'Strength work is what keeps you in one piece as the mileage climbs';
    if(aim==='eat') return 'Two lifting days sit fine alongside the cooking';
    return 'Enough to keep what you have';
  }
  if((S.runPlans||[]).some(r=>r.id===code)){
    const r=runPlan(code);
    if(aim==='endure'&&r.id==='r_long') return 'One longer run a week is the backbone of this aim';
    if(aim==='endure'&&r.id==='r_intervals') return 'Your one hard session. The rest should stay easy';
    if(aim==='lose') return 'Cheap calories and it leaves you fresh for lifting';
    if(r.id==='r_walkrun') return 'Where to start if running is new or you are coming back';
    return 'Most of a running week should feel this easy';
  }
  if((S.circuits||[]).some(c=>c.id===code)){
    const c=circuitOf(code);
    if(c.id==='c_hyrox_half') return 'A sensible first one before the full simulation';
    if(c.id==='c_hyrox_stations') return 'For a day you cannot get outside';
    return 'Hard, and it counts as both a lift and a run';
  }
  if(code==='walk'){
    if(steps!==null&&steps<5000) return 'Your steps have been low, and this is the cheapest thing to move';
    return 'Counted by your tracker, so there is nothing to log';
  }
  if(code==='rest'){
    if(cardio+lifts>=5) return 'You have five hard days already. This one earns its place';
    return 'Rest is part of the plan, not the absence of one';
  }
  if(code==='cook') return aim==='eat'? 'The habit your aim is built on' : 'A cooked meal is usually the cheapest nutrition win';
  return '';
}

/* ---------- swapping something you cannot do ---------- */
let altCtx=null;
function openAlternatives(exId,ctx){
  const x=exOf(exId);
  altCtx={exId,ctx:ctx||{}};
  document.getElementById('altTitle').textContent=x.n;
  document.getElementById('altSub').textContent=(x.p? x.p.charAt(0).toUpperCase()+x.p.slice(1)+'. ' : '')+tempoWords(tempoOf(exId));
  const alts=similarTo(exId,3);
  document.getElementById('altBody').innerHTML=
    `<div class="slab" style="padding:0 14px">Trains the same thing</div>`+
    (alts.length? alts.map(a=>`<button class="logrow" data-alt="${a.id}">
        <div class="txt"><div class="t">${a.n}</div><div class="s">${a.p} · ${a.g} · tempo ${a.t}</div></div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mute)" stroke-width="2.2" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg></button>`).join('')
      : `<div class="note" style="padding:0 14px">Nothing close enough to suggest. You can take it out instead.</div>`)+
    `<button class="logrow" id="altPick"><div class="txt"><div class="t">Something else entirely</div>
      <div class="s">Choose from the full list</div></div></button>
    <button class="logrow" id="altRemove"><div class="txt"><div class="t" style="color:var(--coral-text)">Take it out</div>
      <div class="s">Removed from every day, and never suggested again</div></div></button>
    <button class="logrow" id="altKeep"><div class="txt"><div class="t">Keep it as it is</div></div></button>`;
  openSheet('altSheet');
}
function swapEverywhere(oldId,newId){
  (S.templates||[]).forEach(t=>t.ex.forEach(r=>{ if(r.exId===oldId){ r.exId=newId; r.tempo=tempoOf(newId); } }));
  if(tplDraft) tplDraft.ex.forEach(r=>{ if(r.exId===oldId){ r.exId=newId; r.tempo=tempoOf(newId); } });
  save();
}
function removeEverywhere(exId){
  (S.templates||[]).forEach(t=>{ t.ex=t.ex.filter(r=>r.exId!==exId); });
  if(tplDraft) tplDraft.ex=tplDraft.ex.filter(r=>r.exId!==exId);
  S.profile.excluded=(S.profile.excluded||[]).concat([exId]).filter((v,i,a)=>a.indexOf(v)===i);
  save();
}
function afterAlt(){
  closeSheets();
  if(altCtx&&altCtx.ctx.onboarding&&typeof onbRender==='function') onbRender();
  if(altCtx&&altCtx.ctx.draft&&typeof drawTplEdit==='function'){ drawTplEdit(); openSheet('tplEdit'); }
  if(altCtx&&altCtx.ctx.day){ renderAll(); }
  if(altCtx&&altCtx.ctx.gym&&typeof GYM!=='undefined'&&GYM){
    GYM.ex=GYM.ex.filter(x=>x.exId!==altCtx.exId);
    if(typeof drawGym==='function') drawGym();
  }
  altCtx=null;
}
document.addEventListener('click',e=>{
  const a=e.target.closest('[data-alt]');
  if(a&&altCtx){ const to=exOf(a.dataset.alt);
    swapEverywhere(altCtx.exId,a.dataset.alt);
    toast(exOf(altCtx.exId).n+' swapped for '+to.n); afterAlt(); return; }
  if(e.target.closest('#altRemove')&&altCtx){
    const n=exOf(altCtx.exId).n; removeEverywhere(altCtx.exId);
    toast(n+' taken out. It will not come back.'); afterAlt(); return; }
  if(e.target.closest('#altKeep')&&altCtx){ afterAlt(); return; }
  if(e.target.closest('#altPick')&&altCtx){ altSwapPick=altCtx; closeSheets(); openExPicker(null); return; }
});
let altSwapPick=null;

