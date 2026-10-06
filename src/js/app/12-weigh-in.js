/* ===================== weigh in and details ===================== */
let draft=null;
/* ---------- entering a weight exactly ----------
   A slider cannot do this: 38 to 200 kg in steps of 0.1 is 1,620 positions
   across a phone's width. Instead: a big number you can tap and type, a
   minus and a plus of 0.1 kg (0.2 lb) each, which repeat and speed up when
   held, and quick jumps for anyone who has not weighed in for a while. The
   value is always kept in kilos; pounds are only how it is shown and typed. */
const W_MIN=30, W_MAX=350;
const wUnit=imp=>imp? 'lb' : 'kg';
const wStep=imp=>imp? 0.2 : 0.1;
const wJumps=imp=>imp? [-2,-1,1,2] : [-1,-0.5,0.5,1];
const toShown=(kg,imp)=>Math.round((imp? kg*LB_PER_KG : kg)*10)/10;
const fromShown=(v,imp)=>imp? Math.round(v/LB_PER_KG*100)/100 : Math.round(v*10)/10;
const wValid=kg=>typeof kg==='number'&&!Number.isNaN(kg)&&kg>=W_MIN&&kg<=W_MAX;
function weightControl(id,kg,imp,label){
  const v=toShown(kg,imp), u=wUnit(imp);
  return `<div class="wctl">
    <div class="wrow">
      <button class="wbtn" data-wstep="${id}:-1" aria-label="Down ${wStep(imp)} ${u}">&minus;</button>
      <label class="wval"><span class="sr">${label}, in ${u === 'kg' ? 'kilos' : 'pounds'}</span>
        <input id="${id}Input" type="text" inputmode="decimal" autocomplete="off" value="${v.toFixed(1)}" data-winput="${id}">
        <span class="wunit">${u}</span></label>
      <button class="wbtn" data-wstep="${id}:1" aria-label="Up ${wStep(imp)} ${u}">+</button>
    </div>
    <div class="wjumps">${wJumps(imp).map(j=>`<button data-wjump="${id}:${j}" aria-label="${j>0?'Up':'Down'} ${Math.abs(j)} ${u}">${j>0?'+':'&minus;'}${Math.abs(j)}</button>`).join('')}</div>
    <div class="note wmsg" id="${id}Msg" role="status"></div>
  </div>`;
}
/* which draft value each control writes to, and what to do after */
const W_TARGETS={
  weigh:{imp:()=>S.profile.units==='imperial', after:()=>weighHint()},
  det:{imp:()=>draft&&draft.units==='imperial', after:()=>{ const n=document.getElementById('stepsWorth');
    if(n&&typeof detailsSplitText==='function') n.innerHTML=detailsSplitText(); }}
};
function setW(id,kg,fromTyping){
  const T=W_TARGETS[id]; if(!T||!draft) return;
  const imp=T.imp();
  const ok=wValid(kg);
  if(ok) draft.weight=kg;
  const input=document.getElementById(id+'Input'), msg=document.getElementById(id+'Msg');
  if(input&&!fromTyping&&ok) input.value=toShown(kg,imp).toFixed(1);
  if(msg) msg.textContent= ok? '' : 'Somewhere between '+toShown(W_MIN,imp)+' and '+toShown(W_MAX,imp)+' '+wUnit(imp)+'.';
  const save=document.getElementById(id==='weigh'?'saveWeight':'saveDetails');
  if(save) save.disabled=!ok;
  T.after();
}
function nudgeW(id,shownDelta){
  const T=W_TARGETS[id]; if(!T||!draft) return;
  const imp=T.imp();
  const input=document.getElementById(id+'Input');
  const cur=input&&input.value.trim()!==''&&!Number.isNaN(+input.value.replace(',','.'))
    ? +input.value.replace(',','.') : toShown(draft.weight,imp);
  const next=Math.round((cur+shownDelta)*10)/10;
  setW(id,fromShown(Math.min(toShown(W_MAX,imp),Math.max(toShown(W_MIN,imp),next)),imp));
}
/* hold to repeat, speeding up after a couple of seconds */
/* A finger press steps straight away and repeats while held; the tap the
   browser sends after the finger lifts must then be ignored, or one tap
   would step twice. It is ignored only if it comes from the same button
   within a moment of lifting. A flag that waited for "the next tap" got stuck
   whenever a long press was cancelled without one, and swallowed the next
   real tap. */
let wHold=null, wPress=null;
function stopHold(){ if(wHold){ clearTimeout(wHold.t); clearInterval(wHold.i); wHold=null; } }
document.addEventListener('pointerdown',e=>{
  const b=e.target.closest('[data-wstep]'); if(!b) return;
  const [id,dir]=b.dataset.wstep.split(':');
  const imp=W_TARGETS[id]&&W_TARGETS[id].imp();
  wPress={el:b,up:null}; stopHold();
  nudgeW(id,+dir*wStep(imp));
  let n=0;
  wHold={t:setTimeout(()=>{ wHold.i=setInterval(()=>{ n++; nudgeW(id,+dir*wStep(imp)*(n>15?5:1)); },90); },450)};
});
document.addEventListener('pointerup',()=>{ stopHold(); if(wPress) wPress.up=Date.now(); });
document.addEventListener('pointercancel',()=>{ stopHold(); wPress=null; });
document.addEventListener('pointerleave',stopHold);
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-wstep]');
  if(b){
    const fromPress=wPress&&wPress.el===b&&wPress.up&&Date.now()-wPress.up<600;
    wPress=null;
    if(fromPress) return;             /* that press already stepped */
    const [id,dir]=b.dataset.wstep.split(':'); nudgeW(id,+dir*wStep(W_TARGETS[id].imp())); return; }
  const j=e.target.closest('[data-wjump]');
  if(j){ const [id,d]=j.dataset.wjump.split(':'); nudgeW(id,+d); }
});
document.addEventListener('input',e=>{
  const f=e.target.closest('[data-winput]'); if(!f) return;
  const id=f.dataset.winput, imp=W_TARGETS[id].imp();
  const raw=f.value.replace(',','.').trim();
  const v=raw===''? NaN : +raw;
  setW(id, Number.isNaN(v)? NaN : fromShown(v,imp), true);
});
document.addEventListener('focusin',e=>{ const f=e.target.closest('[data-winput]'); if(f&&f.select) f.select(); });
document.addEventListener('focusout',e=>{
  const f=e.target.closest('[data-winput]'); if(!f||!draft) return;
  const id=f.dataset.winput, T=W_TARGETS[id];
  /* show exactly what will be saved, e.g. 90.25 becomes 90.3 */
  if(T&&wValid(draft.weight)) f.value=toShown(draft.weight,T.imp()).toFixed(1);
});
/* the last weigh in, and the change, so the number means something */
function weighHint(){
  const el=document.getElementById('weighHint'); if(!el||!draft) return;
  const imp=S.profile.units==='imperial';
  const prev=S.weights.filter(w=>w.d!==todayKey()).slice(-1)[0];
  if(!prev||!wValid(draft.weight)){ el.textContent= prev? '' : 'Your first weigh in.'; return; }
  const diff=Math.round((toShown(draft.weight,imp)-toShown(prev.kg,imp))*10)/10;
  const days=Math.round((dateOf(todayKey())-dateOf(prev.d))/864e5);
  el.textContent='Last time '+showW(prev.kg,imp)+', '+(days===1?'yesterday':days+' days ago')+
    (diff===0? '. The same.' : '. '+(diff>0?'Up ':'Down ')+Math.abs(diff).toFixed(1)+' '+wUnit(imp)+'.');
}
function openWeigh(){
  draft=Object.assign({},S.profile);
  const startKg=S.weights.length? S.weights[S.weights.length-1].kg : S.profile.weight;
  draft.weight=wValid(+startKg)? +startKg : 80;
  const imp=S.profile.units==='imperial';
  const already=S.weights.length&&S.weights[S.weights.length-1].d===todayKey();
  $('weighBody').innerHTML=`<div class="note" style="margin:0 0 10px">${already? 'You weighed in already today. Saving replaces it.' : 'Tap the number to type it, or use the buttons.'}</div>
    ${weightControl('weigh',draft.weight,imp,'Weight today')}
    <div class="note" id="weighHint"></div>`;
  const sv=document.getElementById('saveWeight'); if(sv) sv.disabled=false;
  weighHint();
  openSheet('weighSheet');
}
$('saveWeight').addEventListener('click',()=>{
  if(!draft||!wValid(draft.weight)) return;
  S.profile.weight=draft.weight;
  const k=todayKey(), last=S.weights[S.weights.length-1];
  if(last&&last.d===k) last.kg=draft.weight; else S.weights.push({d:k,kg:draft.weight});
  save(); closeSheets(); renderAll(); toast('Logged at '+showW(draft.weight,S.profile.units==='imperial'));
});
function openDetails(){ draft=Object.assign({},S.profile); drawDetails(); openSheet('detailsSheet'); }
function drawDetails(){
  const imp=draft.units==='imperial';
  $('detailsBody').innerHTML=`<div class="pair">
      <button class="big-pick ${draft.sex==='f'?'on':''}" data-set="sex" data-val="f">Female</button>
      <button class="big-pick ${draft.sex==='m'?'on':''}" data-set="sex" data-val="m">Male</button></div>
    <button class="big-pick ${draft.sex==='x'?'on':''}" data-set="sex" data-val="x" style="width:100%;margin-top:8px">Rather not say</button>
    <div class="field"><div class="fl"><div class="k">Age</div><div class="v" id="outage">${draft.age}</div>
      <div class="unitsw"><button class="${!imp?'on':''}" data-units="metric">cm, kg</button><button class="${imp?'on':''}" data-units="imperial">ft, lb</button></div></div>
      <input type="range" min="14" max="90" value="${draft.age}" data-range="age" aria-label="Age"></div>
    <div class="field"><div class="fl"><div class="k">Height</div><div class="v" id="outheight">${showH(draft.height,imp)}</div></div>
      <input type="range" min="135" max="215" value="${draft.height}" data-range="height" aria-label="Height"></div>
    <div class="field"><div class="fl"><div class="k">Weight</div></div>
      ${weightControl('det',wValid(+draft.weight)? +draft.weight : 80,imp,'Weight')}</div>
    <div class="field"><div class="fl"><div class="k">Daily step target</div><div class="v" id="outstepTarget">${num(stepTarget(draft))}</div></div>
      <input type="range" min="2000" max="25000" step="500" value="${stepTarget(draft)}" data-range="stepTarget" aria-label="Daily step target"></div>
    <div class="nf" style="margin:12px 0 4px"><label>Body fat %, if you know it</label>
      <input id="detBf" type="number" inputmode="decimal" step="0.1" value="${draft.bodyFat||''}" placeholder="blank, and it is estimated"></div>
    <div class="note" id="stepsWorth">${detailsSplitText()}</div>`;
}
/* The same figures the app will use once saved, worked out from the unsaved
   draft, so the person sees the consequence before they commit to it. */
function detailsSplitText(){
  if(!draft||!plausibleBody(draft)) return '';
  const p=Object.assign({},S.profile,draft,{detailsSet:true});
  if(p.bodyFat!==null&&p.bodyFat!==''&&!validBodyFat(p.bodyFat)) return 'Body fat should be between 3 and 70%. Leave it blank and it will be estimated.';
  return withProfile(p,()=>{
    const m=maintenance(); if(!m) return '';
    const ct=calorieTarget({m});
    const sp=stepSplit(ct,m,p);
    return `<b>${num(ct.kcal)} kcal a day</b> once saved. `+splitText(sp);
  });
}
document.addEventListener('input',e=>{
  if(e.target.id==='detBf'&&draft){
    draft.bodyFat= e.target.value===''? null : +e.target.value;
    const n=document.getElementById('stepsWorth'); if(n) n.innerHTML=detailsSplitText();
  }
});
document.addEventListener('click',e=>{
  const set=e.target.closest('[data-set]');
  if(set&&draft){ draft[set.dataset.set]=set.dataset.val; drawDetails(); }
  const u=e.target.closest('[data-units]');
  if(u&&draft){ draft.units=u.dataset.units; drawDetails(); }
});
document.addEventListener('input',e=>{
  if(e.target.id==='onbPeriod'&&onbDraft){ onbDraft.lastPeriod=e.target.value; }
  if(onbDraft&&['onbAge','onbHeight','onbWeight','onbGoal','onbSteps','onbBf'].includes(e.target.id)){
    const k=e.target.id.replace('onb','').toLowerCase();
    onbDraft[k]= e.target.value===''? null : +e.target.value;
    clearTimeout(onbDraft._t);
    onbDraft._t=setTimeout(()=>{ const a=document.activeElement&&document.activeElement.id;
      onbRender(); const el=a&&document.getElementById(a);
      if(el){ el.focus(); const v=el.value; el.value=''; el.value=v; } },600);
  }
  const r=e.target.closest('[data-range]'); if(!r||!draft) return;
  const k=r.dataset.range; draft[k]=+r.value;
  const out=$('out'+k);
  if(out) out.textContent = k==='stepTarget'? num(draft.stepTarget)
    : (k==='age'? draft.age : (k==='height'? showH(draft.height,draft.units==='imperial') : showW(draft.weight,draft.units==='imperial')));
  /* every slider can move the answer, so the split follows all of them */
  const sw=document.getElementById('stepsWorth'); if(sw&&typeof detailsSplitText==='function') sw.innerHTML=detailsSplitText();
});
$('saveDetails').addEventListener('click',()=>{
  if(!draft.sex){ toast('Pick one so the sums work'); return; }
  S.profile=Object.assign({},S.profile,draft,{detailsSet:true});
  if(typeof ownTargets==='function') S.targets=ownTargets();
  if(!S.weights.length) S.weights.push({d:todayKey(),kg:S.profile.weight});
  save(); closeSheets(); renderProgress();
  const ct=calorieTarget();
  toast(ct? 'Maintenance '+num(ct.maintenance)+', eating '+num(ct.kcal)+' kcal' : 'Saved');
});
