/* ---------- goals, and starting things over (build 66) ----------
   Feargal reset his weight goal without meaning to. The old goal sheet opened
   with the goal weight filled in, "By when" on 12 weeks whatever the real
   date was, and one button, "Set it", which saved a brand new goal starting
   that day. Opening it to look, or to change only the date, moved the start
   to that day's trend and the date with it, said nothing, and kept nothing
   of the old goal.

   Now:
   · Opening the goal shows the goal: the weight and date, where it counts
     from, how far along, the outlook. Nothing on that screen saves.
   · Edit keeps the start and the progress, and changes only what is
     changed. Saving with nothing changed saves nothing.
   · A new goal says, in coral, that it replaces the current one and what
     that means, keeps the old one in Earlier goals with how far it got, and
     offers dates from your own trend and your pace. Undo for five seconds.
   · "Counting from" sets where a weight goal starts (the trend that day),
     which is also how a start moved by accident is put back.
   · Taking a goal off is the same: said plainly, kept, with Undo.
   · Training has a reset of its own that lists what changes, what is always
     kept (every weight and rep), and how each lift in the week will start,
     lighter where it is back after a break.
   · One place lists everything that can be started over: You, Your plan,
     "Start something over". Every reset is logged there.
   Nothing here deletes a weigh in, a session or a lift, and the weight graph
   is not touched. */
S.goalHistory=Array.isArray(S.goalHistory)? S.goalHistory : [];
S.resetLog=Array.isArray(S.resetLog)? S.resetLog : [];
const _fresh66=freshState;
freshState=function(){ const f=_fresh66(); f.goalHistory=[]; f.resetLog=[]; return f; };
const GOAL_KEEP=30, RESET_KEEP=20, GOAL_WEEKS=[6,12,16,26,52];
let goalDraft=null;

/* ----- what a goal is, in words and numbers ----- */
const goalUnit=k=>(TARGET_KINDS[k]||{unit:''}).unit;
function goalText(t){
  if(!t) return '';
  const v= t.kind==='weight'? showW(+t.value,S.profile.units==='imperial') : num(t.value)+' '+goalUnit(t.kind);
  const name= t.kind==='lift'&&t.exId&&typeof exOf==='function'? exOf(t.exId).n+' ' : (t.kind==='runkm'? 'A run of ' : (t.kind==='sessions'? '' : ''));
  return name+v+(t.by? ' by '+prettyDateSafe(t.by) : '');
}
/* the day a weight goal's start is read from: the day it was set, or the
   first weigh in when it was set before there were any */
function countDay(t){ const first=(weighIns()[0]||{}).d||null; return t&&t.set&&(!first||t.set>first)? t.set : (first||(t&&t.set)||todayKey()); }
/* where a goal stands right now, for any kind */
function goalFacts(t){
  if(!t) return null;
  if(t.kind==='weight'){
    const start=goalStartFor(t), now=weightNow(), goal=+t.value;
    if(now===null||start===null) return {start,now:null,pct:0,moved:0};
    const falling=goal<start, span=Math.abs(start-goal);
    const pct= span<0.05? 100 : Math.max(0,Math.min(100,Math.round((falling? start-now : now-start)/span*100)));
    return {start,now:+(+now).toFixed(1),pct:t.hit? 100 : pct,moved:+(now-start).toFixed(1),startDay:t.set||null};
  }
  const pr=targetProgress();
  return pr? {start:pr.start,now:pr.now,pct:pr.hit? 100 : pr.pct,moved:+(pr.now-pr.start).toFixed(1)} : {start:t.from||0,now:null,pct:0,moved:0};
}
/* Kept for good when a goal is replaced, met or taken off: what it was, where
   it counted from, where it ended and how far it got. */
function archiveGoal(t,how){
  if(!t) return null;
  const f=goalFacts(t)||{};
  const e={kind:t.kind,value:+t.value,by:t.by||null,exId:t.exId||null,set:t.set||null,
    start:f.start===undefined? null : f.start, end:f.now===undefined? null : f.now, pct:f.pct||0,
    hit:t.hit||null, ended:todayKey(), how};
  S.goalHistory=[e].concat(S.goalHistory||[]).slice(0,GOAL_KEEP);
  return e;
}
function logReset(what,note){
  S.resetLog=[{d:todayKey(),at:Date.now(),what,note}].concat(S.resetLog||[]).slice(0,RESET_KEEP);
}
const HOW_WORD={met:'met',replaced:'replaced',removed:'taken off'};
function historyRows(kind,max){
  const imp=S.profile.units==='imperial';
  const all=(S.goalHistory||[]).filter(h=>!kind||h.kind===kind), list=all.slice(0,max||5);
  if(!list.length) return '';
  return `<div class="slab">Earlier goals</div><div class="ghist">${list.map(h=>{
    const w=v=>h.kind==='weight'? showW(v,imp) : num(v)+' '+goalUnit(h.kind);
    const went= h.start!==null&&h.end!==null? ' · '+w(h.start).split(' ')[0]+' to '+w(h.end)+' ('+h.pct+'%)' : '';
    return `<div class="ghrow"><b>${escHabit(goalText(h))}</b><span>${h.set? prettyDateSafe(h.set)+' to ' : 'Until '}${prettyDateSafe(h.ended)}${went} · ${HOW_WORD[h.how]||h.how}</span></div>`; }).join('')}
    ${all.length>list.length? `<div class="note">And ${all.length-list.length} more.</div>` : ''}</div>`;
}

/* ----- dates worked out from your own data ----- */
/* when the trend gets to a weight at its current rate, from the last weigh in */
function trendEta(v){
  const r=trendRate(), now=weightNow(); if(!r||now===null||!(v>0)) return null;
  if((v-now)*r.perDay<=0||Math.abs(r.perDay)<0.005) return null;
  const days=Math.ceil((v-now)/r.perDay); if(days>730) return null;
  const w=weighIns(), from=w.length? w[w.length-1].d : todayKey();
  const k=addDays(from,days); return k>todayKey()? k : null;
}
function goalDir(v){ const kg=weightNow(); if(kg===null||!(v>0)) return 'hold'; return v<kg-0.2? 'lose' : (v>kg+0.2? 'gain' : 'hold'); }
/* the date your chosen pace gets there, as onboarding works it out */
function paceEta(v){
  const dir=goalDir(v); if(dir==='hold') return null;
  let ct=null; try{ ct=calorieTarget({dir,target:{kind:'weight',value:v,by:null,hit:null,autoDated:true}}); }catch(e){}
  return ct&&ct.eta? ct.eta : null;
}
/* what the chosen "by when" means: a date, and whether the app worked it out */
function resolveBy(d,v){
  if(d.byPick==='keep'&&S.target) return {by:S.target.by||null, auto:!!S.target.autoDated};
  if(d.byPick==='pace'){ const k=paceEta(v); return {by:k, auto:true}; }
  if(d.byPick==='trend') return {by:trendEta(v), auto:false};
  const n=+d.byPick||12; return {by:addDays(todayKey(),n*7), auto:false};
}
function draftValue(){ const el=document.getElementById('targetValue'); const v=el? +el.value : +(goalDraft&&goalDraft.value); return v>0? v : 0; }

/* Works the target out exactly as saving it would, without saving it. */
function targetKcalPreview(){
  const v=draftValue()||(S.target&&S.target.kind==='weight'? +S.target.value : 0);
  if(!v) return 'Put a weight in and this shows the calories it takes to get there.';
  const b=goalDraft? resolveBy(goalDraft,v) : {by:addDays(todayKey(),84),auto:false};
  const t={kind:'weight',value:v,by:b.by,hit:null,autoDated:b.auto};
  const ct=calorieTarget({dir:goalDir(v),target:t});
  return ct? calorieLine(ct) : 'Add your age, height and weight in You first, so there is something to work from.';
}

/* ----- the sheet ----- */
function openTargetSheet(mode){
  const t=S.target;
  mode= mode||(t? 'overview' : 'new');
  if(mode!=='new'&&!t) mode='new';
  goalDraft=draftFor(mode);
  drawGoalSheet(); openSheet('altSheet');
}
function draftFor(mode){
  const t=S.target, live=t&&!t.hit;
  /* an edit keeps the day it counts from; a goal saved before goals had one
     counts from the first weigh in, as weightStart() reads it */
  if(mode==='edit') return {mode, kind:t.kind, value:t.value, byPick:t.by? 'keep' : 12, from:t.set||(weighIns()[0]||{}).d||todayKey(), exId:t.exId||null};
  const kind= live? t.kind : (t? t.kind : (S.profile.aim==='endure'? 'runkm' : 'weight'));
  const value= live? t.value : '';
  return {mode, kind, value, byPick: kind==='weight'&&value&&paceEta(+value)? 'pace' : 12, from:todayKey(), exId:t? t.exId||null : null};
}
function drawGoalSheet(){
  const d=goalDraft, title=$('altTitle'), sub=$('altSub'), body=$('altBody');
  if(d.mode==='overview'){ title.textContent='Your goal'; sub.textContent='Nothing here changes until you choose to.'; body.innerHTML=goalOverviewHtml(); return; }
  if(d.mode==='remove'){ title.textContent='Take the goal off?'; sub.textContent='You are about to remove your goal.'; body.innerHTML=goalRemoveHtml(); return; }
  const replacing= d.mode==='new'&&!!S.target;
  title.textContent= d.mode==='edit'? 'Edit your goal' : (replacing? (S.target.hit? 'Your next goal' : 'Start a new goal') : 'What are you actually after?');
  sub.textContent= d.mode==='edit'? 'Your start and your progress stay as they are, unless you change where it counts from.'
    : (replacing&&!S.target.hit? 'This replaces your current goal.' : 'A number and a date. Everything else in here already knows how to count.');
  body.innerHTML=goalFormHtml();
}
function goalOverviewHtml(){
  const t=S.target, imp=S.profile.units==='imperial', f=goalFacts(t)||{};
  const w=v=>t.kind==='weight'? showW(v,imp) : num(v)+' '+goalUnit(t.kind);
  let o=null, look='', st='';
  if(t.kind==='weight'&&!t.hit){ try{ o=weightOutlook(); }catch(e){} look=o? outlookLine(o,imp) : ''; st=o? ' st-'+o.status : ''; }
  if(t.hit) st=' st-hit';
  const left=t.by&&!t.hit? Math.round((dateOf(t.by)-dateOf(todayKey()))/864e5) : null;
  const from= t.kind==='weight'&&f.start!==null&&f.start!==undefined
    ? `Counting from ${w(f.start)}, the trend on ${prettyDateSafe(countDay(t))}`
    : (t.set? 'Set on '+prettyDateSafe(t.set) : '');
  return `<div style="padding:0 14px 8px">
    <section class="gcard${st}">
      <div class="gk">${t.hit? 'GOAL MET '+prettyDateSafe(t.hit).toUpperCase() : 'YOUR GOAL'}</div>
      <div class="gv">${escHabit(goalText(t))}</div>
      ${left!==null? `<div class="gs">${left>=0? left+' day'+(left===1?'':'s')+' left' : 'The date has passed'}</div>` : ''}
      <div class="ybar" role="img" aria-label="${f.pct||0}% of the way"><i style="width:${f.pct||0}%"></i></div>
      <div class="gends"><span>${from}</span>${f.now!==null&&f.now!==undefined? `<span>Now ${w(f.now)} · ${f.pct||0}%</span>` : ''}</div>
      ${look? `<p class="wlook">${look}</p>` : ''}
    </section>
    ${t.hit? `<button class="sheetcta" data-goalmode="new" style="margin:12px 0 4px;width:100%">Set your next goal</button>` : ''}
    <button class="opt" data-goalmode="edit"><div class="txt"><div class="t">Edit this goal</div>
      <div class="s">Change the ${t.kind==='weight'? 'weight' : 'number'}, the date${t.kind==='weight'? ', or where it counts from' : ''}. Keeps your progress.</div></div><span class="chev" aria-hidden="true">›</span></button>
    ${t.hit? '' : `<button class="opt reset" data-goalmode="new"><div class="txt"><div class="t">Start a new goal</div>
      <div class="s">Replaces this one and starts again from today. This one is kept in Earlier goals.</div></div><span class="chev" aria-hidden="true">›</span></button>`}
    <button class="opt reset" data-goalmode="remove"><div class="txt"><div class="t">Take the goal off</div>
      <div class="s">No goal, and calories follow your aim. Kept in Earlier goals.</div></div><span class="chev" aria-hidden="true">›</span></button>
    ${historyRows(null,5)}
  </div>`;
}
function goalRemoveHtml(){
  const t=S.target, f=goalFacts(t)||{}, imp=S.profile.units==='imperial';
  const aim=aimOf(S.profile.aim);
  return `<div style="padding:0 14px 8px">
    <div class="resetwarn"><b>Removing: ${escHabit(goalText(t))}</b>
      <ul><li>It is kept in Earlier goals${f.pct!==undefined? ', at '+f.pct+'% of the way' : ''}.</li>
      ${t.kind==='weight'? `<li>Calories go back to your aim, ${escHabit(aim.t.toLowerCase())}, at your usual pace, with no end date.</li>
      <li>Your weigh ins and the weight graph do not change.</li>` : '<li>Everything you have logged stays.</li>'}</ul></div>
    <button class="sheetcta danger" id="targetClear">Take the goal off</button>
    <button class="skipbtn" data-goalmode="overview">Keep my goal</button></div>`;
}
function goalFormHtml(){
  const d=goalDraft, t=S.target, k=d.kind, imp=S.profile.units==='imperial';
  const replacing= d.mode==='new'&&t&&!t.hit;
  const now=(()=>{ const keep=S.target; S.target={kind:k,exId:d.exId}; try{ return targetNow(); }finally{ S.target=keep; } })();
  return `<div style="padding:0 14px 8px">
    ${replacing? goalReplaceWarn() : ''}
    ${d.mode==='new'? `<div class="slab">What kind</div>
      <div class="chips">${Object.keys(TARGET_KINDS).map(id=>`<button class="${k===id?'on':''}" data-targetkind="${id}">${TARGET_KINDS[id].t}</button>`).join('')}</div>` : ''}
    <div class="nf" style="margin:12px 0 10px"><label>${TARGET_KINDS[k].t} of${k==='weight'? ' (kg)' : ''}</label>
      <input id="targetValue" type="number" inputmode="decimal" step="0.1" value="${d.value===''||d.value===undefined? '' : d.value}" placeholder="${now!==null? now : ''}"></div>
    ${k==='weight'? `<div id="goalGuide">${goalGuideHtml()}</div>` : `<div class="note" style="margin:0 0 6px">${now!==null? 'Right now that reads '+now+' '+goalUnit(k)+'.' : 'Nothing logged against this yet.'}</div>`}
    <div class="slab">By when</div>
    <div class="chips" id="goalBy">${byChipsHtml()}</div>
    ${k==='weight'? fromHtml() : ''}
    ${k==='weight'? `<div class="method" id="targetKcal"><b>What that means for food</b><span>${targetKcalPreview()}</span></div>` : ''}
    <button class="sheetcta${replacing?' danger':''}" id="goalSave">${d.mode==='edit'? 'Save changes' : (replacing? 'Replace my goal' : 'Set my goal')}</button>
    ${t? `<button class="skipbtn" data-goalmode="overview">${d.mode==='edit'? 'Cancel' : 'Cancel, keep my goal'}</button>` : ''}
    ${d.mode==='new'? historyRows(k,3) : ''}
  </div>`;
}
/* the coral box that says a goal is being replaced, and what happens */
function goalReplaceWarn(){
  const t=S.target, f=goalFacts(t)||{}, imp=S.profile.units==='imperial';
  const w=v=>t.kind==='weight'? showW(v,imp) : num(v)+' '+goalUnit(t.kind);
  const sofar= f.now!==null&&f.now!==undefined&&f.start!==null? (t.kind==='weight'
      ? (Math.abs(f.moved)<0.05? 'level so far' : w(Math.abs(f.moved))+(f.moved<0? ' down' : ' up')+' so far')+', '+f.pct+'% of the way'
      : f.pct+'% of the way') : '';
  return `<div class="resetwarn"><b>You are replacing your goal</b>
    <span>Now: ${escHabit(goalText(t))}${t.kind==='weight'&&f.start!==null? ', counting from '+w(f.start)+' on '+prettyDateSafe(countDay(t)) : ''}${sofar? '. '+sofar : ''}.</span>
    <ul><li>It is kept in Earlier goals with how far it got.</li>
    <li>The new goal counts from the day you pick below, so its bar starts again.</li>
    ${t.kind==='weight'? '<li>Your weigh ins and the weight graph do not change.</li>' : '<li>Everything you have logged stays.</li>'}</ul>
    <span>Only want a new date or weight? <button class="inlinebtn" data-goalmode="edit">Edit this goal instead</button></span></div>`;
}
/* Guidance from your own weigh ins: how the trend is moving, and what that
   means for the weight typed in. Redrawn as you type. */
function goalGuideHtml(){
  const v=draftValue(), r=trendRate(), now=weightNow(), imp=S.profile.units==='imperial';
  if(now===null) return `<div class="note" style="margin:0 0 6px">No weigh ins yet. Your first one becomes where this counts from.</div>`;
  const parts=[];
  if(r){ const pw=Math.abs(r.perWeek);
    parts.push(`Your trend is ${showW(now,imp)}, ${pw<0.05? 'level' : (r.perWeek<0? 'down ' : 'up ')+showW(pw,imp)+' a week'} over the last ${r.days} days.`); }
  else parts.push(`Your trend is ${showW(now,imp)}. A week or so of weigh ins gives its direction.`);
  if(v){
    const eta=trendEta(v), dir=goalDir(v);
    if(dir==='hold') parts.push('That is about where you are now, so it holds steady.');
    else if(eta) parts.push(`At that rate ${showW(v,imp)} is about ${Math.max(1,Math.round((dateOf(eta)-dateOf(todayKey()))/864e5/7))} weeks away, around ${prettyDate(eta)}.`);
    else if(r&&Math.abs(r.perWeek)>=0.05) parts.push(`That is the other way from your trend, so the food target does the work.`);
    const pe=paceEta(v);
    if(pe) parts.push(`At your ${paceOf().label.toLowerCase()} pace it is around ${prettyDate(pe)}.`);
  }
  return `<div class="gguide">${parts.join(' ')}</div>`;
}
function byChipsHtml(){
  const d=goalDraft, t=S.target, v=draftValue(), on=x=>String(d.byPick)===String(x)? 'on' : '';
  const out=[];
  if(d.mode==='edit'&&t&&t.by) out.push(`<button class="${on('keep')}" data-goalby="keep">Keep ${prettyDateSafe(t.by)}</button>`);
  if(d.kind==='weight'&&v){
    const pe=paceEta(v), te=trendEta(v);
    if(pe) out.push(`<button class="${on('pace')}" data-goalby="pace">Your pace · ${prettyDate(pe)}</button>`);
    if(te) out.push(`<button class="${on('trend')}" data-goalby="trend">Your trend · ${prettyDate(te)}</button>`);
  }
  GOAL_WEEKS.forEach(n=>out.push(`<button class="${on(n)}" data-goalby="${n}">${n} weeks</button>`));
  const b=v||d.kind!=='weight'? resolveBy(d,v||1) : null;
  return out.join('')+(b&&b.by? `<div class="note" style="width:100%;margin-top:4px">That puts the date at ${prettyDate(b.by)}.</div>` : '');
}
/* Where a weight goal counts from: the trend on that day. Your first weigh
   in, the day it was set, today, or any day between. */
function fromHtml(){
  const d=goalDraft, w=weighIns(), today=todayKey();
  if(!w.length) return '';
  const first=w[0].d, cur=S.target&&S.target.set&&d.mode==='edit'? S.target.set : null;
  const opts=[[first,'First weigh in · '+prettyDate(first)]];
  if(cur&&cur!==first&&cur!==today) opts.push([cur,'When it was set · '+prettyDate(cur)]);
  if(today!==first) opts.push([today,'Today']);
  const pick=d.from<first? first : d.from;
  const start=goalStartFor({kind:'weight',set:pick});
  return `<div class="slab">Counting from</div>
    <div class="chips" style="margin-bottom:8px">${opts.map(([k,l])=>`<button class="${pick===k?'on':''}" data-goalfrom="${k}">${l}</button>`).join('')}</div>
    <div class="nf" style="margin-bottom:6px"><label>Or pick a day</label><input id="goalFrom" type="date" min="${first}" max="${today}" value="${pick}"></div>
    <div class="note" style="margin:0 0 12px">Starts at <b>${showW(start,S.profile.units==='imperial')}</b>, the trend on ${prettyDate(pick)}. This sets the start of the bar, not your weigh ins or the graph.</div>`;
}

/* ----- saving ----- */
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function saveGoal(){
  const d=goalDraft; if(!d) return;
  const v=draftValue();
  if(!v){ toast('Put a number on it'); return; }
  const b=resolveBy(d,v);
  const prev=S.target? JSON.parse(JSON.stringify(S.target)) : null;
  const hist0=(S.goalHistory||[]).slice(), log0=(S.resetLog||[]).slice();
  if(d.mode==='edit'&&prev){
    const next=Object.assign({},prev,{value:v,by:b.by,autoDated:b.auto});
    if(d.kind==='weight') next.set=d.from;
    const changed=['value','by','set'].filter(k=>(prev[k]||null)!==(next[k]||null));
    if(!changed.length){ closeSheets(); toast('Nothing changed'); return; }
    if(next.value!==prev.value) next.hit=null;
    if(d.kind==='weight') next.from=goalStartFor(next);
    S.target=next; S.targets=ownTargets(); save(); closeSheets(); renderAll();
    const startTxt= d.kind==='weight'? ' It counts from '+prettyDate(next.set)+'.' : '';
    toast('Goal updated.'+startTxt,'Undo',()=>{ S.target=prev; S.targets=ownTargets(); save(); renderAll(); });
    return;
  }
  /* a new goal: the old one is kept, and the reset is logged */
  if(prev) archiveGoal(prev, prev.hit? 'met' : 'replaced');
  const t={kind:d.kind,value:v,by:b.by,exId:d.exId||null,set:d.kind==='weight'? d.from : todayKey(),hit:null,autoDated:b.auto};
  if(d.kind==='weight') t.from=goalStartFor(t);
  else { S.target=t; const n=targetNow(); t.from=n!==null? n : 0; }
  S.target=t;
  if(prev&&!prev.hit) logReset('goal','Goal replaced: '+goalText(prev)+' for '+goalText(t));
  S.targets=ownTargets(); save(); closeSheets(); renderAll();
  const ct=t.kind==='weight'? calorieTarget() : null;
  const food= ct&&ct.dir!=='hold'? ', eat '+num(ct.kcal)+' kcal'+(ct.capped? ', capped to a safe rate' : '') : '';
  toast((prev&&!prev.hit? 'New goal: ' : 'Goal set: ')+goalText(t)+food+(prev? '. The old one is in Earlier goals.' : ''),
    prev? 'Undo' : null, prev? ()=>{ S.target=prev; S.goalHistory=hist0; S.resetLog=log0; S.targets=ownTargets(); save(); renderAll(); } : null);
}
function removeGoal(){
  const prev=S.target? JSON.parse(JSON.stringify(S.target)) : null; if(!prev) return;
  const hist0=(S.goalHistory||[]).slice(), log0=(S.resetLog||[]).slice();
  archiveGoal(prev, prev.hit? 'met' : 'removed');
  logReset('goal','Goal taken off: '+goalText(prev));
  clearTarget(); S.targets=ownTargets(); save(); closeSheets(); renderAll();
  toast('Goal taken off. It is in Earlier goals.','Undo',()=>{ S.target=prev; S.goalHistory=hist0; S.resetLog=log0; S.targets=ownTargets(); save(); renderAll(); });
}
document.addEventListener('click',e=>{
  if(!goalDraft||!e.target.closest('#altSheet')) return;
  const m=e.target.closest('[data-goalmode]');
  if(m){ goalDraft=draftFor(m.dataset.goalmode); drawGoalSheet(); $('altSheet').scrollTop=0; return; }
  const k=e.target.closest('[data-targetkind]');
  if(k){ goalDraft.kind=k.dataset.targetkind; goalDraft.value=''; goalDraft.byPick=12; drawGoalSheet(); return; }
  const b=e.target.closest('[data-goalby]');
  if(b){ goalDraft.value=draftValue()||goalDraft.value; goalDraft.byPick=b.dataset.goalby; refreshGoalBits(); return; }
  const f=e.target.closest('[data-goalfrom]');
  if(f){ goalDraft.value=draftValue()||goalDraft.value; goalDraft.from=f.dataset.goalfrom; drawGoalSheet(); return; }
  if(e.target.closest('#goalSave')){ saveGoal(); return; }
  if(e.target.closest('#targetClear')){ removeGoal(); return; }
});
/* only the parts that depend on the number redraw, so the box keeps its focus */
function refreshGoalBits(){
  const by=$('goalBy'); if(by) by.innerHTML=byChipsHtml();
  const g=$('goalGuide'); if(g) g.innerHTML=goalGuideHtml();
  const el=$('targetKcal'); if(el){ const sp=el.querySelector('span'); if(sp) sp.textContent=targetKcalPreview(); }
}
document.addEventListener('input',e=>{
  if(e.target.id!=='targetValue'||!goalDraft) return;
  goalDraft.value=e.target.value;
  /* a date worked out from the number needs a number to work from */
  if((goalDraft.byPick==='pace'&&!paceEta(draftValue()))||(goalDraft.byPick==='trend'&&!trendEta(draftValue()))) goalDraft.byPick=12;
  refreshGoalBits();
});
document.addEventListener('change',e=>{
  if(e.target.id!=='goalFrom'||!goalDraft) return;
  const w=weighIns(), first=w.length? w[0].d : todayKey(), v=e.target.value;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
  goalDraft.value=draftValue()||goalDraft.value;
  goalDraft.from= v<first? first : (v>todayKey()? todayKey() : v);
  drawGoalSheet();
});

/* ---------- training: start over, keeping every weight ---------- */
let trDraft=null;
/* the starting templates as onboarding would build them today: your style's
   seeds, your lifting focus, fitted to your kit. Worked out without touching
   what is saved. */
function freshSeeded(){
  const keep=S.templates, mo=memoryOnly;
  memoryOnly=true;
  try{
    S.templates=seedTemplates();
    if(typeof applyFocusToTemplates==='function') applyFocusToTemplates(liftFocus());
    if(typeof fitTemplatesToKit==='function') fitTemplatesToKit();
    return S.templates;
  } finally { S.templates=keep; memoryOnly=mo; }
}
const rowsSig=t=>JSON.stringify((t.ex||[]).map(r=>[r.exId,+r.sets||0,+r.reps||0,+r.repMin||0,+r.rest||0,r.group?1:0,(r.run&&+r.run.m)||0]));
function trainingPreview(withTemplates){
  const fresh=freshSeeded();
  const changed=(S.templates||[]).filter(t=>t.seeded&&(()=>{ const f=fresh.find(x=>x.id===t.id); return !f||rowsSig(f)!==rowsSig(t); })());
  const own=(S.templates||[]).filter(t=>!t.seeded);
  const tpls= withTemplates? fresh : S.templates;
  /* the movements in this week's sessions, and how each will start */
  const plan=ensurePlan(), seen=new Set(), lifts=[];
  plan.days.forEach(d=>{ const tp=d.templateId&&tpls.find(x=>x.id===d.templateId); if(!tp) return;
    tp.ex.forEach(r=>{ if(seen.has(r.exId)) return; seen.add(r.exId);
      let p=null; try{ p=nextPrescription(r.exId,r); }catch(e){}
      const h=exHistory(r.exId), top=h.length? topSetOf(h[0]) : null, last=lastDoneOf(r.exId);
      const kind= !last? 'new' : ((p&&(p.kind==='return'||p.away))? 'break' : 'carry');
      lifts.push({exId:r.exId,n:exOf(r.exId).n,p,top,last,kind}); }); });
  const moved=Object.keys(S.lifts||{}).filter(k=>(S.lifts[k]||[]).length).length;
  return {fresh,changed,own,lifts,moved,sessions:(S.workouts||[]).length};
}
function openTrainingReset(){
  trDraft={week:true,templates:true,easy:false};
  drawTrainingReset(); openSheet('altSheet');
}
function drawTrainingReset(){
  const d=trDraft, pv=trainingPreview(d.templates), every=+S.profile.deloadEvery||DELOAD_EVERY;
  const easyOk=S.profile.deload!==false;
  $('altTitle').textContent='Reset your training';
  $('altSub').textContent='You are about to start your programme over. Pick what to reset; your lifting history comes with you either way.';
  const part=(k,t,s)=>`<button class="opt check ${d[k]?'on':''}" data-trpart="${k}" role="checkbox" aria-checked="${d[k]?'true':'false'}">
    <span class="box" aria-hidden="true"></span><div class="txt"><div class="t">${t}</div><div class="s">${s}</div></div></button>`;
  const st=STYLES[styleOf()].t, sp=styleOf()==='gym'&&splitOf()? ', '+SPLITS[splitOf()].t.toLowerCase() : '';
  const liftRow=l=>{
    const p=l.p||{}, kgTxt=p.kg? num(p.kg)+' kg × '+p.reps : (p.reps? '× '+p.reps : 'your pick');
    const was=l.top? num(l.top.kg)+' kg × '+l.top.reps+', '+prettyDate(l.top.d) : (l.last? 'bodyweight, '+prettyDate(l.last) : '');
    const sub= l.kind==='break'? `${weeksText(p.gap||p.away).toLowerCase()} off · ${p.kg? Math.round(p.cut*100)+'% lighter, back to '+num(p.was.kg)+' kg '+(p.steps>1? 'over about '+p.steps+' sessions' : 'next time') : 'keep a rep or two in hand'}`
      : (l.kind==='new'? 'Not done before: pick a weight you could do a couple more reps with' : 'Picks up from last time');
    return `<div class="trlift ${l.kind}"><div class="tn"><b>${escHabit(l.n)}</b><span>${sub}</span></div>
      <div class="tv">${l.kind==='new'? '' : `<span>${was}</span>`}<b>${l.kind==='new'? 'New' : kgTxt}</b></div></div>`; };
  const brk=pv.lifts.filter(l=>l.kind==='break'), carry=pv.lifts.filter(l=>l.kind==='carry'), nw=pv.lifts.filter(l=>l.kind==='new');
  const any=d.week||d.templates||(d.easy&&easyOk);
  $('altBody').innerHTML=`<div style="padding:0 14px 8px">
    <div class="resetwarn"><b>You are resetting your training</b><span>Nothing changes until you tap Reset my training below, and Undo is offered straight after.</span></div>
    <div class="slab">Reset</div>
    ${part('week','This week\'s plan','Built again from '+(d.templates? 'the starting templates' : 'your templates')+' and your last check in. Sessions already done stay done.')}
    ${part('templates','Your templates, back to the start', (pv.changed.length
      ? `${pv.changed.length} of the starting templates ${pv.changed.length===1?'has':'have'} been changed (${escHabit(pv.changed.slice(0,3).map(t=>t.name).join(', '))}${pv.changed.length>3?' and more':''}). They go back to the ${escHabit(st.toLowerCase())}${escHabit(sp)} programme for your focus and kit.`
      : 'They already match the starting programme, so nothing in them changes.')
      +(pv.own.length? ` Your own ${pv.own.length===1?'template is':pv.own.length+' templates are'} not touched.` : '')+' Runs and circuits are not changed.')}
    ${easyOk? part('easy','The easy week count','Counts again from this week, so the next easy week is '+prettyDate(plusDays(mondayKey(),every*7))+'. This week is a normal week.') : ''}
    <div class="keepbox"><b>Always kept</b><span>Every weight and rep you have lifted${pv.moved? ' ('+pv.moved+' movement'+(pv.moved===1?'':'s')+')' : ''}, so each lift picks up from your last session. Personal bests, warm ups, rest times, ${pv.sessions? pv.sessions+' logged session'+(pv.sessions===1?'':'s')+', ' : ''}runs, food, weigh ins and your goal.</span></div>
    ${pv.lifts.length? `<div class="slab">How this week's lifts start</div>
      ${brk.length? `<div class="trgroup brk"><div class="trh">After a break · ${brk.length}</div>${brk.map(liftRow).join('')}
        <button class="inlinebtn" data-trwhy="1">${d.why? 'Hide the evidence' : 'Why lighter, and how much'}</button>${d.why? `<div class="rwhy">${RETURN_EVIDENCE}</div>` : ''}</div>` : ''}
      ${carry.length? `<details class="trgroup"${brk.length? '' : ' open'}><summary class="trh">Picks up where you left off · ${carry.length}</summary>${carry.map(liftRow).join('')}</details>` : ''}
      ${nw.length? `<details class="trgroup"><summary class="trh">New to you · ${nw.length}</summary>${nw.map(liftRow).join('')}</details>` : ''}` : ''}
    <button class="sheetcta danger" id="trainResetGo"${any? '' : ' disabled'}>${any? 'Reset my training' : 'Pick something to reset'}</button>
    <button class="skipbtn" data-trcancel="1">Cancel</button>
    ${resetLogHtml('training')}
  </div>`;
}
function applyTrainingReset(){
  const d=trDraft; if(!d) return;
  const easyOk=S.profile.deload!==false;
  if(!(d.week||d.templates||(d.easy&&easyOk))) return;
  const snap=JSON.parse(JSON.stringify({templates:S.templates,plan:S.plan,goal:S.goal,deloadWeeks:S.deloadWeeks||{},styleWeek:S.styleWeek||null}));
  const log0=(S.resetLog||[]).slice();
  const done=[];
  if(d.templates){
    const fresh=freshSeeded(), have=new Set();
    S.templates=S.templates.map(t=>{ if(!t.seeded) return t; const f=fresh.find(x=>x.id===t.id); if(f) have.add(f.id); return f||t; })
      .concat(fresh.filter(f=>!have.has(f.id)&&!S.templates.some(t=>t.id===f.id)));
    done.push('templates');
  }
  if(d.easy&&easyOk){ setDeloadMark(mondayKey(),'skipped'); done.push('easy week count'); }
  if(d.week||d.templates){ S.styleWeek=null; buildPlan(); if(d.week) done.push('this week'); }
  logReset('training','Training reset: '+done.join(', '));
  save(); closeSheets(); renderAll();
  toast('Training reset. Every weight and rep carried across.','Undo',()=>{
    S.templates=snap.templates; S.plan=snap.plan; S.goal=snap.goal; S.deloadWeeks=snap.deloadWeeks; S.styleWeek=snap.styleWeek;
    S.resetLog=log0; save(); renderAll(); });
}
document.addEventListener('click',e=>{
  if(!trDraft||!e.target.closest('#altSheet')) return;
  const p=e.target.closest('[data-trpart]');
  if(p){ const k=p.dataset.trpart; trDraft[k]=!trDraft[k]; drawTrainingReset(); return; }
  if(e.target.closest('[data-trwhy]')){ trDraft.why=!trDraft.why; drawTrainingReset(); return; }
  if(e.target.closest('#trainResetGo')){ applyTrainingReset(); trDraft=null; return; }
  if(e.target.closest('[data-trcancel]')){ closeSheets(); trDraft=null; return; }
});

/* ---------- one place for everything that can be started over ---------- */
function resetLogHtml(what){
  const list=(S.resetLog||[]).filter(r=>!what||r.what===what).slice(0,4);
  if(!list.length) return '';
  return `<div class="slab">Earlier resets</div><div class="ghist">${list.map(r=>`<div class="ghrow"><b>${escHabit(r.note)}</b><span>${prettyDateSafe(r.d)}</span></div>`).join('')}</div>`;
}
function openResetHub(){
  goalDraft=null; trDraft=null;
  const t=S.target;
  $('altTitle').textContent='Start something over';
  $('altSub').textContent='Each one shows exactly what changes before anything does. Nothing you have logged is deleted.';
  $('altBody').innerHTML=`<div style="padding:0 14px 8px">
    ${isTeen()? '' : `<button class="opt reset" data-resetopen="goal"><div class="txt"><div class="t">Your goal</div>
      <div class="s">${t? escHabit(goalText(t))+'. Edit it, start a new one, or take it off.' : 'No goal set. Set one.'}</div></div><span class="chev" aria-hidden="true">›</span></button>`}
    <button class="opt reset" data-resetopen="training"><div class="txt"><div class="t">Your training</div>
      <div class="s">This week, your templates and the easy week count. Every weight and rep is kept.</div></div><span class="chev" aria-hidden="true">›</span></button>
    <div class="note">To remove everything instead, that is <button class="inlinebtn" data-setting="data">Your data</button>.</div>
    ${resetLogHtml(null)}
  </div>`;
  openSheet('altSheet');
}
document.addEventListener('click',e=>{
  const o=e.target.closest('[data-resetopen]');
  if(o){ if(o.dataset.resetopen==='goal') openTargetSheet(); else openTrainingReset(); return; }
  if(e.target.closest('#planReset')){ openTrainingReset(); return; }
});
try{ Object.assign(window.__G,{openTargetSheet,drawGoalSheet,saveGoal,removeGoal,archiveGoal,goalStartFor,goalFacts,goalText,
  trendEta,paceEta,resolveBy,targetKcalPreview,openTrainingReset,applyTrainingReset,trainingPreview,freshSeeded,openResetHub,
  breakCut,rebuildOf,topSetOf,rampSteps,lastDoneOf,RETURN_TIERS,RETURN_EVIDENCE,returnNotice});
  Object.defineProperties(window.__G,{goalDraft:{get:()=>goalDraft,configurable:true},trDraft:{get:()=>trDraft,configurable:true}}); }catch(e){}
