/* ---------- the active workout ---------- */
let GYM=null, gymTick=null, restTick=null, rest={left:0,label:''};
/* ---------- supersets and giant sets ----------
   Two movements done back to back, one set of each with no rest between, is a
   superset; three or more is a giant set. The same rules run in the template
   editor and in a live workout:
     a group is an unbroken run of movements sharing a group id
     a group of one is not a group, so it quietly goes away
     moving or removing a movement can split a group; each piece is re-checked
   In the workout, ticking a set that is not the last in its group starts no
   rest and says which movement is next; the rest comes after the last one,
   and it is the longest rest of anything in the group. */
const newGroupId=()=>'g'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function normaliseGroups(list){
  const seen=new Set(); let i=0;
  while(i<list.length){
    const g=list[i]&&list[i].group; if(!g){ i++; continue; }
    let j=i; while(j+1<list.length&&list[j+1].group===g) j++;
    const id=seen.has(g)? newGroupId() : g; seen.add(id);
    if(j===i) delete list[i].group; else for(let k=i;k<=j;k++) list[k].group=id;
    i=j+1;
  }
  return list;
}
/* join a movement to the one after it, or split them if they are joined */
function toggleLinkNext(list,i){
  if(i<0||i>=list.length-1) return list;
  const a=list[i], b=list[i+1];
  if(a.group&&b.group===a.group){
    const g=a.group, fresh=newGroupId();
    for(let k=i+1;k<list.length&&list[k].group===g;k++) list[k].group=fresh;
  } else {
    const g=a.group||b.group||newGroupId(), old=b.group&&b.group!==g? b.group : null;
    a.group=g; b.group=g;
    if(old) list.forEach(x=>{ if(x.group===old) x.group=g; });
  }
  return normaliseGroups(list);
}
function groupInfo(list){
  const info={}; let letter=0, i=0;
  while(i<list.length){
    const g=list[i]&&list[i].group; if(!g){ i++; continue; }
    let j=i; while(j+1<list.length&&list[j+1].group===g) j++;
    const size=j-i+1, L=String.fromCharCode(65+(letter++%26));
    for(let k=i;k<=j;k++) info[k]={id:g,letter:L,pos:k-i+1,size,start:i,end:j,first:k===i,last:k===j,
      label:size>=3?'Giant set':'Superset'};
    i=j+1;
  }
  return info;
}
const groupRest=(list,gi)=>Math.max(...list.slice(gi.start,gi.end+1).map(x=>+x.rest||0));
function groupHead(list,gi){
  const names=list.slice(gi.start,gi.end+1).length;
  return `<div class="grouphead"><b>${gi.label} ${gi.letter}</b><span>${names} movements: one set of each back to back, then rest ${groupRest(list,gi)}s. Repeat.</span></div>`;
}
/* a run in a live session: the plan (metres, pace) and what happened (start,
   finish, the split). On an easy week the fast 400s become steady ones. */
function runOf(r,easy){
  if(!r||!(+r.m>0)) return undefined;
  return {m:+r.m, pace: easy&&/fast|max/i.test(r.pace||'')? 'Steady' : (r.pace||''), startAt:null, endAt:null, ms:null, manual:false};
}
function newExEntry(row){
  const rest=S.restPrefs[row.exId]!==undefined? S.restPrefs[row.exId] : (row.rest||90);
  const prev=lastSets(row.exId);
  const rx=nextPrescription(row.exId,row);
  if(GYM){ GYM.pre=GYM.pre||{}; GYM.pre[row.exId]=exerciseStats(row.exId); }
  /* On an easy week the sets and the weight come from the deload prescription.
     The normal prescription is kept alongside it, untouched, so the finish
     screen can say exactly what next week goes back to. */
  if(GYM&&GYM.deload){
    const dp=deloadPrescription(row.exId,row,DELOAD_TIERS[GYM.deload]);
    return {exId:row.exId, group:row.group||undefined, tempo:row.tempo||tempoOf(row.exId), reps:row.reps||12, repMin:row.repMin,
      rx, dp, rest, note:row.note||'', run:runOf(row.run,true),
      sets:Array.from({length:dp.sets},()=>({kg: dp.kg!==null? dp.kg : '', reps: dp.reps, warm:false, done:false}))};
  }
  /* planSets is fixed here, when the session starts. Counting it at the end
     from whatever sets were left made "planned" silently match "done" as soon
     as a set was added, removed or marked as a warm up. */
  return {exId:row.exId, group:row.group||undefined, tempo:row.tempo||tempoOf(row.exId), reps:row.reps||12, repMin:row.repMin, rx, rest, note:row.note||'',
    run:runOf(row.run,GYM&&GYM.deload), planSets:row.sets||3,
    sets:Array.from({length:row.sets||3},(_,i)=>({
      kg: rx.kg!==null? rx.kg : (prev&&prev[i]? prev[i].kg : ''),
      reps: rx.kg!==null? rx.reps : (prev&&prev[i]? prev[i].reps : ''),
      warm:false, done:false}))};
}
function startWorkout(templateId,opts){
  opts=opts||{};
  const tpl=S.templates.find(t=>t.id===templateId)||null;
  let rows=tpl? tpl.ex.slice() : [];
  if(opts.exclude&&opts.exclude.length) rows=rows.filter(r=>!opts.exclude.includes(exOf(r.exId).n));
  if(opts.setDelta&&!opts.deload) rows=rows.map(r=>Object.assign({},r,{sets:Math.max(1,(r.sets||3)+opts.setDelta)}));
  const T=opts.deload? (DELOAD_TIERS[opts.deload]||deloadTier()) : null;
  if(T&&T.dropAccessories){
    const keep=rows.filter(r=>['isolation','core','hold'].indexOf(rxClass(r.exId))<0);
    if(keep.length) rows=keep;
  }
  GYM={name: opts.name || (tpl? tpl.name : 'Workout'), templateId: tpl?tpl.id:null, started:Date.now(),
    ex:[], pre:{}, done:false, deload: T? T.id : null};
  if(isHifb(tpl)) GYM.hifb={focus:tpl.focus||null, why:tpl.why||'',
    buyIn:runOf(tpl.hifb.buyIn,!!T), buyOut:runOf(tpl.hifb.buyOut,!!T)};
  rows.forEach(r=>{ GYM.pre[r.exId]=exerciseStats(r.exId); });
  GYM.ex=rows.map(newExEntry);
  closeSheets();
  $('gym').classList.add('on');
  drawGym();
  clearInterval(gymTick);
  gymTick=setInterval(()=>{ if(GYM&&!GYM.done){ $('gymSub').textContent=elapsed(); tickRuns(); } },1000);
  return GYM;
}
/* ---------- the runs inside an HIFB session ---------- */
function gymRuns(G){
  G=G||GYM; if(!G||!G.hifb) return [];
  const out=[]; let n=0;
  if(G.hifb.buyIn) out.push({key:'in',label:'Buy-in run',r:G.hifb.buyIn});
  G.ex.forEach((e,i)=>{ if(e.run) out.push({key:String(i),label:'Run '+(++n),after:e.exId,r:e.run}); });
  if(G.hifb.buyOut) out.push({key:'out',label:'Buy-out run',r:G.hifb.buyOut});
  return out;
}
const runByKey=k=>{ const x=gymRuns().find(y=>y.key===String(k)); return x? x.r : null; };
const runsDone=()=>gymRuns().filter(x=>x.r.ms).length;
function tickRuns(){
  document.querySelectorAll('[data-runlive]').forEach(el=>{ const r=runByKey(el.dataset.runlive);
    if(r&&r.startAt&&!r.ms) el.textContent=fmtSplit(Date.now()-r.startAt); });
}
function startRun(k){ const r=runByKey(k); if(!r||r.ms) return null;
  /* one run at a time: starting this one finishes any other still going */
  gymRuns().forEach(x=>{ if(x.r!==r&&x.r.startAt&&!x.r.ms) stopRun(x.key,true); });
  r.startAt=Date.now(); r.endAt=null; r.manual=false; return r; }
function stopRun(k,quiet){ const r=runByKey(k); if(!r||!r.startAt||r.ms) return null;
  r.endAt=Date.now(); r.ms=Math.max(1000,r.endAt-r.startAt);
  if(!quiet&&navigator.vibrate) navigator.vibrate(80); return r; }
/* the last time this session was done, for run-by-run comparison */
const lastHifb=(tid,notId)=>(S.workouts||[]).find(w=>w.kind==='hifb'&&w.templateId===tid&&w.id!==notId&&(w.runs||[]).some(r=>r.ms));
function runCard(x){
  const r=x.r, live=r.startAt&&!r.ms, prev=GYM&&lastHifb(GYM.templateId), pr=prev&&(prev.runs||[]).find(y=>y.key===x.key&&y.ms);
  return `<div class="runcard ${r.ms?'done':''} ${live?'live':''}">
    <div class="rch"><span class="rtag">run</span><div class="rct"><b>${x.label}: ${r.m}m</b><span>${escHabit(r.pace||'Your pace')}${r.pace?' pace':''}${pr? ' · last time '+fmtSplit(pr.ms) : ''}</span></div>
      ${live? `<span class="runlive" data-runlive="${x.key}" aria-live="off">${fmtSplit(Date.now()-r.startAt)}</span>` : ''}</div>
    <div class="rcrow">
      <label class="mini-in rtime">time <input type="text" inputmode="numeric" placeholder="m:ss" value="${r.ms? fmtSplit(r.ms) : ''}" data-runtime="${x.key}" aria-label="${x.label} time, minutes and seconds"></label>
      ${r.ms? `<span class="rpace">${perKm(r.ms,r.m)} /km</span><button class="mini" data-runclear="${x.key}">Clear</button>`
        : live? `<button class="mini go" data-runstop="${x.key}">Finish run</button>`
        : `<button class="mini go" data-runbegin="${x.key}">Start run</button>`}
    </div></div>`;
}
function elapsed(){
  const s=Math.floor((Date.now()-GYM.started)/1000);
  return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
}
function gymVolume(){ return GYM.ex.reduce((a,e)=>a+e.sets.filter(s=>s.done&&!s.warm).reduce((b,s)=>b+setVolume(s,e.exId),0),0); }
function gymSets(){ return GYM.ex.reduce((a,e)=>a+e.sets.filter(s=>s.done).length,0); }
function deloadBanner(){
  if(!GYM||!GYM.deload) return '';
  const T=DELOAD_TIERS[GYM.deload];
  const rows=GYM.ex.filter(e=>e.dp).map(e=>`<div class="dlrow"><b>${exOf(e.exId).n}</b>
    <span>${e.dp.sets} × ${e.dp.reps}${e.dp.kg!==null?' at '+e.dp.kg+'kg':''}${e.dp.work?' · normally '+e.dp.work+'kg':''}</span></div>`).join('');
  return `<div class="dlbanner"><div class="dlh"><b>Easy week, ${T.t.toLowerCase()}</b><span>${T.band} less work, about 10% lighter</span></div>
    ${rows}
    <div class="dls">These should feel easy. Stop each set with plenty left. Next week goes back to your working weights, not these.</div></div>`;
}
/* A weight like 102.5 is wider than the box on a small phone. Rather than a
   fixed smaller size for everyone, each number is measured and its text only
   shrinks, a pixel at a time, until it fits. */
function fitNumbers(root){
  (root||document).querySelectorAll('.stepper input').forEach(i=>{
    i.style.fontSize='';
    let fs=parseFloat(getComputedStyle(i).fontSize)||16;
    while(i.scrollWidth>i.clientWidth+1&&fs>11){ fs-=1; i.style.fontSize=fs+'px'; }
  });
}
document.addEventListener('input',e=>{ if(e.target.closest&&e.target.closest('.stepper')) fitNumbers(e.target.closest('.stepper')); });
document.addEventListener('change',e=>{
  if(e.target.id!=='mealAt') return;
  if(setMealAt(foodKey(),foodSlot,e.target.value)){ renderAll(); toast(MEALS.find(m=>m[0]===foodSlot)[1]+' set to '+e.target.value); }
});
/* ---------- the set in hand (build 58, Final-Train) ----------
   The order the session is actually done in: an exercise's sets in turn, a
   superset or giant set round by round, an HIFB run after its block, buy-in
   first and buy-out last. The first thing not yet done is "now": it gets the
   big reps and weight steppers and the Done button at the top, and every row
   below stays editable exactly as before. The same order draws the thin bar
   under the header, one segment per set and run. */
function gymSeq(){
  const G=GYM; if(!G) return [];
  const GI=groupInfo(G.ex), runs=gymRuns(), out=[];
  const runSeg=k=>{ const x=runs.find(y=>y.key===k); if(x) out.push({run:x}); };
  runSeg('in');
  let i=0, block=0;
  while(i<G.ex.length){
    const gi=GI[i], a=i, b=gi? gi.end : i; block++;
    const max=Math.max(...G.ex.slice(a,b+1).map(x=>x.sets.length));
    for(let r=0;r<max;r++) for(let k=a;k<=b;k++) if(G.ex[k].sets[r]) out.push({i:k,j:r,block});
    for(let k=a;k<=b;k++) runSeg(String(k));
    i=b+1;
  }
  runSeg('out');
  out.blocks=block;
  return out;
}
const seqDone=x=>x.run? !!x.run.r.ms : !!(GYM.ex[x.i]&&GYM.ex[x.i].sets[x.j]&&GYM.ex[x.i].sets[x.j].done);
function gymNow(seq){
  seq=seq||gymSeq();
  const live=seq.find(x=>x.run&&x.run.r.startAt&&!x.run.r.ms);
  if(live) return live;
  /* whatever comes after the last thing done, so a run or set someone chose
     to skip does not hold the top of the screen; then anything left */
  let last=-1; seq.forEach((x,n)=>{ if(seqDone(x)) last=n; });
  return seq.slice(last+1).find(x=>!seqDone(x))||seq.find(x=>!seqDone(x))||null;
}
function drawSegs(seq,now){
  const el=$('gymSegs'); if(!el) return;
  el.style.gridTemplateColumns=`repeat(${Math.max(1,seq.length)},minmax(0,1fr))`;
  el.innerHTML=seq.map(x=>`<i class="${seqDone(x)?'done':(x===now?'now':'')}${x.run?' run':''}"></i>`).join('');
}
function focusCard(seq,now){
  if(!GYM||!GYM.ex.length&&!seq.length) return '';
  if(!now) return `<section class="gnow alldone"><div class="gk">EVERY SET DONE</div>
    <div class="gn">That is the session.</div><button class="cta" data-ffinish="1">Finish</button></section>`;
  if(now.run){
    const r=now.run.r, live=r.startAt&&!r.ms;
    return `<section class="gnow grun"><div class="gk">${escHabit(now.run.label.toUpperCase())} · ${r.m} M</div>
      <div class="gn">${live? 'Running' : 'Run next'}${r.pace? ', '+escHabit(r.pace.toLowerCase())+' pace' : ''}</div>
      ${live? `<div class="gbig" data-runlive="${now.run.key}">${fmtSplit(Date.now()-r.startAt)}</div>
        <button class="cta" data-runstop="${now.run.key}">Finish run</button>`
        : `<button class="cta" data-runbegin="${now.run.key}">Start run</button>`}</section>`;
  }
  const e=GYM.ex[now.i], s=e.sets[now.j], x=exOf(e.exId), warm=s.warm;
  const work=e.sets.filter(z=>!z.warm).length, wi=workingIndex(e,now.j);
  const where= GYM.hifb||now.block>1||seq.blocks>1? (GYM.hifb? 'BLOCK ' : 'EXERCISE ')+now.block+' OF '+seq.blocks+' · ' : '';
  const kick= where+(warm? 'WARM UP' : 'SET '+wi+' OF '+work);
  const rx=e.rx, rxLine= rx&&rx.why? `<div class="grx ${rx.kind==='load'?'up':''}">${rx.kind==='load'? 'Up to '+(rx.kg!==null&&rx.kg!==undefined? num(rx.kg)+' kg' : 'a heavier weight')+': ' : ''}${rx.why}</div>` : '';
  const inc=incrementFor(e.exId), key=now.i+':'+now.j;
  const box=(k,label,d,less,more)=>`<div class="gstep"><div class="gl">${label}</div><div class="gsrow">
      <button class="gsb" data-fstep="${key}:${k}:-${d}" aria-label="${less}">−</button>
      <input type="number" inputmode="${k==='kg'?'decimal':'numeric'}" value="${s[k]}" data-fset="${key}:${k}" placeholder="${k==='kg'?'kg':e.reps}" aria-label="${k==='kg'?'Weight':'Reps'}, set in hand">
      <button class="gsb" data-fstep="${key}:${k}:${d}" aria-label="${more}">+</button></div></div>`;
  return `<section class="gnow">
    <div class="ghead">
      <button class="gthumb" data-showmove="${e.exId}" aria-label="Show me how ${escHabit(x.n)} moves"><span class="gplay"><svg width="12" height="14" viewBox="0 0 20 22" aria-hidden="true"><path d="M4 2l14 9-14 9z" fill="currentColor"/></svg></span><span class="gsm">show me</span></button>
      <div class="gtx"><div class="gk">${kick}</div><div class="gn">${escHabit(x.n)}</div>${rxLine}</div></div>
    <div class="gsteps">${box('reps','REPS',1,'Fewer reps','More reps')}${box('kg',isBodyweight(e.exId)?'ADDED KG':'KG',inc,'Less weight','More weight')}</div>
    <button class="cta gdone" data-fdone="${key}">${warm? 'Done, warm up' : 'Done, set '+wi}</button></section>`;
}
function afterNote(){
  if(!GYM||!GYM.ex.length) return '';
  const per=(typeof perMealProtein==='function')? perMealProtein() : null;
  return `<div class="afternote"><b>After this:</b> ${per? 'about '+per+'g' : '20 to 40g'} of protein at your next meal or snack. The day's total matters more than the exact timing.</div>`;
}
function drawGym(){
  if(!GYM) return;
  $('gymName').textContent=GYM.name;
  $('gymSub').textContent=elapsed();
  const GI=groupInfo(GYM.ex);
  const lastW=(S.workouts||[]).find(w=>w.d<todayKey()), away=lastW? gapDays(lastW.d) : 0;
  const backBanner= away>=14? `<div class="deloadbanner"><b>Welcome back.</b> ${weeksText(away)} since your last session. Anything you have not done in a while starts a little lighter today; the weights climb back quickly.</div>` : '';
  const RUNS=gymRuns(), runAt=k=>{ const x=RUNS.find(y=>y.key===k); return x? runCard(x) : ''; };
  const hifbHead=GYM.hifb? `<div class="focusnote gymfocus"><b>HIFB: run, lift, run</b><span>Rest about ${HIFB.rest} seconds between sets. After the last set of each block, go straight into the run: it starts timing itself when you tick that set. Type a time instead if you use a watch.${GYM.hifb.why? ' '+escHabit(GYM.hifb.why) : ''}</span></div>` : '';
  const SEQ=gymSeq(), NOW=gymNow(SEQ); drawSegs(SEQ,NOW);
  $('gymBody').innerHTML=focusCard(SEQ,NOW)+backBanner+deloadBanner()+hifbHead+runAt('in')+GYM.ex.map((e,i)=>{
    const x=exOf(e.exId), prev=lastSets(e.exId), pre=GYM.pre? GYM.pre[e.exId] : null, gi=GI[i];
    const range=repRangeFor({reps:e.reps,repMin:e.repMin});
    return `${i===0? `<div class="focusnote gymfocus"><b>${LIFT_FOCUS[liftFocus()].t}</b><span>${LIFT_FOCUS[liftFocus()].effort}</span></div>` : ''}${gi&&gi.first? groupHead(GYM.ex,gi) : ''}<div class="exc ${gi?'ingroup':''} ${gi&&gi.last?'grouplast':''}" data-ex="${i}">
      <div class="exh">${gi?`<span class="gbadge">${gi.letter}${gi.pos}</span>`:''}<div class="n">${x.n}</div>${exHasPR(e)?`<span class="pr" title="Personal record">PR</span>`:''}<button class="dots" data-exmenu="${i}" aria-label="Options">···</button></div>
      <div class="cue">${e.sets.length} × ${range.bottom===range.top? e.reps : range.bottom+' to '+range.top}${e.tempo&&showTempo()?' @ '+e.tempo:''} · rest ${e.rest}s${pre&&pre.heaviest?` · best ${pre.heaviest}kg`:''}</div>
      ${prev&&prev.length? `<div class="prevline">Last time <b>${prev.map(p2=>p2.kg+' × '+p2.reps).join(', ')}</b></div>`:''}
      ${e.rx? `<div class="rxline"><b>${e.rx.kind==='load'?'Weight up today':(e.rx.kind==='first'?'First time':(e.rx.kind==='return'?'Welcome back':'Chase the reps'))}</b> ${e.rx.why}
        ${e.rx.lastTonnage? `<span class="tonn">Last time you moved ${num(Math.round(e.rx.lastTonnage))}kg on this. Today so far: ${num(Math.round(tonnageOf(e.sets)))}kg.</span>`:''}</div>`:''}
      ${e.tempo&&showTempo()&&tempoMatters(e.tempo)?`<div class="tempo">${tempoWords(e.tempo)}</div>`:''}
      ${e.note?`<div class="note">${e.note}</div>`:''}
      <div class="sethead"><div>Set</div><div>${isBodyweight(e.exId)?'+kg':'kg'}</div><div>Reps</div><div></div></div>
      ${(()=>{ const pi=prIndex(e); return e.sets.map((s,j)=>{ const pr=j===pi; const short=!pr&&setShort(e,s); const inc=incrementFor(e.exId);
        return `<div class="setline ${s.done?'done':''} ${pr?'ispr':''} ${short?'short':''} ${s.warm?'warm':''} ${NOW&&!NOW.run&&NOW.i===i&&NOW.j===j?'now':''}">
        <div class="sn">${s.warm?'W':workingIndex(e,j)}</div>
        <div class="stepper">
          <button class="step" data-step="${i}:${j}:kg:-${inc}" aria-label="Less weight">−</button>
          <input type="number" inputmode="decimal" step="${inc}" value="${s.kg}" data-set="${i}:${j}:kg" placeholder="${prev&&prev[j]?prev[j].kg:'kg'}" aria-label="Weight">
          <button class="step" data-step="${i}:${j}:kg:${inc}" aria-label="More weight">+</button>
        </div>
        <div class="stepper">
          <button class="step" data-step="${i}:${j}:reps:-1" aria-label="Fewer reps">−</button>
          <input type="number" inputmode="numeric" value="${s.reps}" data-set="${i}:${j}:reps" placeholder="${e.reps}" aria-label="Reps">
          <button class="step" data-step="${i}:${j}:reps:1" aria-label="More reps">+</button>
        </div>
        <button class="tick" data-done="${i}:${j}" aria-label="${pr?'Personal best':(short?'Short of the target reps':'Complete set')}">
          ${pr? `<span class="prtick">PR</span>` : short? `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>` : `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6.5"/></svg>`}</button>
      </div>`; }).join(''); })()}
      ${(()=>{ const work=e.sets.filter(s=>!s.warm&&s.kg!=='').map(s=>+s.kg);
        const kg=work.length? Math.max(...work) : null;
        const pl=kg? plateLine(e.exId,kg) : '';
        return pl? `<div class="tempoline">${pl}</div>` : ''; })()}
      <div class="setbtns"><button data-addset="${i}">+ Set</button><button data-addwarm="${i}">+ Warm up</button>
        ${e.sets.length>1?`<button data-delset="${i}">Remove set</button>`:''}${GYM.hifb&&!e.run?`<button data-addrun="${i}">+ Run after</button>`:''}</div>
    </div>${runAt(String(i))}`;
  }).join('')+runAt('out')
  + (GYM.ex.length? afterNote() : `<div class="empty">Nothing in here yet.<br>Add your first movement and the sets appear.</div>`)
  + `<div class="addex"><button id="addExBtn">+ Add exercise</button></div>`;
  $('gymFoot').innerHTML=`<div>Volume <b>${num(Math.round(gymVolume()))} kg</b></div>
    <div>Sets <b>${gymSets()}</b></div>${RUNS.length? `<div>Runs <b>${runsDone()} of ${RUNS.length}</b></div>` : `<div class="hint">Tap the tick to start the rest clock</div>`}`;
  fitNumbers($('gymBody'));
}
document.addEventListener('click',e=>{
  if(!GYM||GYM.done||!GYM.hifb) return;
  const b=e.target.closest('[data-runbegin]'); if(b){ startRest(0); startRun(b.dataset.runbegin); drawGym(); return; }
  const f=e.target.closest('[data-runstop]'); if(f){ const r=stopRun(f.dataset.runstop); if(r) toast('Run done in '+fmtSplit(r.ms)); drawGym(); return; }
  const c=e.target.closest('[data-runclear]'); if(c){ const r=runByKey(c.dataset.runclear); if(r){ r.startAt=null; r.endAt=null; r.ms=null; r.manual=false; } drawGym(); return; }
  const a=e.target.closest('[data-addrun]'); if(a){ const ex=GYM.ex[+a.dataset.addrun]; if(ex){ ex.run=runOf({m:HIFB.between,pace:'Fast'},GYM.deload); drawGym(); } return; }
});
document.addEventListener('change',e=>{
  const t=e.target.closest&&e.target.closest('[data-runtime]'); if(!t||!GYM||!GYM.hifb) return;
  const r=runByKey(t.dataset.runtime); if(!r) return;
  const ms=parseSplit(t.value);
  if(ms===null){ r.startAt=null; r.endAt=null; r.ms=null; r.manual=false; drawGym(); return; }
  if(Number.isNaN(ms)){ toast('Times look like 1:45, minutes then seconds'); t.value=r.ms? fmtSplit(r.ms) : ''; return; }
  r.ms=ms; r.manual=true; r.endAt=r.endAt||Date.now(); drawGym();
});
function startRest(sec,label){
  rest={left:sec,label,total:sec};
  if(!sec){ $('restBar').classList.remove('on'); return; }
  $('restBar').classList.add('on');
  paintRest();
  clearInterval(restTick);
  restTick=setInterval(()=>{
    rest.left--;
    if(rest.left<=0){ clearInterval(restTick); $('restBar').classList.remove('on'); if(navigator.vibrate) navigator.vibrate(200); return; }
    paintRest();
  },1000);
}
function paintRest(){
  $('restNum').textContent=Math.floor(rest.left/60)+':'+String(rest.left%60).padStart(2,'0');
  $('restLbl').textContent='Rest · '+rest.label;
  const f=$('restFill'); if(f) f.style.width=Math.max(0,Math.min(100,100*rest.left/Math.max(1,rest.total||rest.left)))+'%';
}
document.addEventListener('click',e=>{
  if(!GYM) return;
  const d=e.target.closest('[data-done]')||e.target.closest('[data-fdone]');
  if(d){ const [i,j]=(d.dataset.done||d.dataset.fdone).split(':').map(Number);
    const st=GYM.ex[i].sets[j]; st.done=!st.done;
    if(st.done){
      if(st.reps==='') st.reps=GYM.ex[i].reps;
      fillForward(i,j);
      const gi=groupInfo(GYM.ex)[i];
      if(gi&&!gi.last&&!st.warm){
        /* not the last in its group: straight on to the next, no rest */
        startRest(0);
        toast('Now '+gi.letter+(gi.pos+1)+': '+exOf(GYM.ex[i+1].exId).n+', no rest');
      } else if(gi&&!st.warm){
        startRest(groupRest(GYM.ex,gi), gi.label+' '+gi.letter);
      } else {
        startRest(st.warm?0:GYM.ex[i].rest, exOf(GYM.ex[i].exId).n);
      }
      /* HIFB: the block is finished, so no rest, straight into the run */
      const ex=GYM.ex[i], blockDone=ex.sets.filter(x=>!x.warm).every(x=>x.done);
      if(ex.run&&!st.warm&&blockDone&&!ex.run.startAt&&!ex.run.ms&&(!gi||gi.last)){
        startRest(0); startRun(String(i)); toast('Block done. Straight into the '+ex.run.m+'m run, the clock is going');
      }
    }
    drawGym(); }
  const w=e.target.closest('[data-warm]');
  if(w){ const [i,j]=w.dataset.warm.split(':').map(Number); GYM.ex[i].sets[j].warm=!GYM.ex[i].sets[j].warm; drawGym(); }
  if(e.target.closest('[data-ffinish]')){ const f=$('gymFinish'); if(f) f.click(); return; }
  const st=e.target.closest('[data-step]')||e.target.closest('[data-fstep]');
  if(st&&GYM){
    /* Update the number in place rather than redrawing the list. Tapping plus
       five times in a row should not be racing a re render, and nothing should
       flicker while you are mid set. */
    const [i,j,k,d]=(st.dataset.step||st.dataset.fstep).split(':');
    const set=GYM.ex[+i].sets[+j];
    const cur=+set[k]|| (k==='reps'? (+GYM.ex[+i].reps||0) : 0);
    const next=Math.max(0,+(cur+ +d).toFixed(2));
    set[k]= next;
    set.touched=true;
    const box=document.querySelector(`[data-set="${i}:${j}:${k}"]`);
    if(box){ box.value=next; fitNumbers(box.closest('.stepper')); }
    const big=document.querySelector(`[data-fset="${i}:${j}:${k}"]`); if(big) big.value=next;
    if(navigator.vibrate) navigator.vibrate(10);
    return;
  }
  const a=e.target.closest('[data-addset]');
  if(a){ const i=+a.dataset.addset;
    const working=GYM.ex[i].sets.filter(x=>!x.warm);
    const src=working.filter(x=>x.done).pop() || working[working.length-1] || {};
    GYM.ex[i].sets.push({kg:src.kg||'',reps:src.reps||'',warm:false,done:false}); drawGym(); }
  const aw=e.target.closest('[data-addwarm]');
  if(aw){ const i=+aw.dataset.addwarm, e2=GYM.ex[i];
    const work=e2.sets.filter(s=>!s.warm&&s.kg!=='').map(s=>+s.kg);
    const target=work.length? Math.max(...work) : (e2.rx&&e2.rx.kg) || 0;
    const ramp=warmSetsFor(e2.exId,target);
    if(ramp.length){ e2.sets=ramp.concat(e2.sets.filter(s=>!s.warm)); drawGym();
      toast(ramp.length+' warm up sets built from '+target+'kg'); }
    else { e2.sets.unshift({kg:'',reps:'',warm:true,done:false}); drawGym();
      toast('Put a working weight in and this fills itself'); } }
  const ds=e.target.closest('[data-delset]');
  if(ds){ const i=+ds.dataset.delset;
    if(GYM.ex[i].sets.length>1){ const gone=GYM.ex[i].sets.pop(); drawGym();
      toast('Set removed','Undo',()=>{ GYM.ex[i].sets.push(gone); drawGym(); }); } }
  if(e.target.closest('#addExBtn')) openExPicker(null);
  const m=e.target.closest('[data-exmenu]');
  if(m) openExMenu(+m.dataset.exmenu);
});
document.addEventListener('input',e=>{
  const f=e.target.closest('[data-set]')||e.target.closest('[data-fset]');
  if(!f||!GYM) return;
  const [i,j,k]=(f.dataset.set||f.dataset.fset).split(':');
  /* the set in hand and its row are the same set: keep the other box in step */
  const twin=document.querySelector(f.dataset.set? `[data-fset="${i}:${j}:${k}"]` : `[data-set="${i}:${j}:${k}"]`);
  if(twin) twin.value=f.value;
  GYM.ex[+i].sets[+j][k]= f.value===''? '' : +f.value;
  GYM.ex[+i].sets[+j].touched=true;
  $('gymFoot').querySelector('b').textContent=num(Math.round(gymVolume()))+' kg';
});
$('restPlus').addEventListener('click',()=>{ rest.left+=15; rest.total=Math.max(rest.total||0,rest.left); paintRest(); });
$('restSkip').addEventListener('click',()=>{ clearInterval(restTick); $('restBar').classList.remove('on'); });
$('gymClose').addEventListener('click',()=>{
  const work=GYM&&!GYM.done&&(GYM.mode==='circuit'? circuitDone()>0 : gymSets()>0);
  $('gym').classList.remove('on'); clearInterval(restTick); $('restBar').classList.remove('on');
  if(work) toast('Session paused, nothing lost','Resume',()=>{ $('gym').classList.add('on');
    GYM.mode==='circuit'? drawCircuit() : drawGym(); });
  else clearInterval(gymTick);
});

