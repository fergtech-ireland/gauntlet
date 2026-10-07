/* ===================== Eat (build 57) =====================
   The food diary as a tab of its own, built on the food functions in
   workouts/03-food.js rather than beside them: every add, step, skip, time and
   undo still goes through addFood, setFoodQty, skipMeal, setMealAt and the
   food sheet, which stays as the add and search step. Top to bottom:
     a date switcher (today and earlier days, never a future one)
     search, which opens the food sheet with the cursor in the box
     calories left against the target, eaten and the target, and bars for
     protein, carbs, fat and fibre against theirs
     breakfast, lunch, snacks and dinner as sections, each with its items,
     calories, time eaten and an Add; empty main meals can be marked skipped
     same as yesterday, quick add numbers and your saved meals
   Under 18s: no calories and no macros anywhere, as in the food sheet. The
   card counts meals instead, and items show what they are, not their energy. */
let eatDay=null;
const eatKey=()=>(eatDay&&eatDay<todayKey())? eatDay : todayKey();
const EAT_SECTIONS=[['b','Breakfast'],['l','Lunch'],['s','Snacks'],['d','Dinner']];
const longDate=k=>dateOf(k).toLocaleDateString('en-IE',{weekday:'long',day:'numeric',month:'long'});
function eatDayLabel(k){
  const t=todayKey();
  if(k===t) return 'Today';
  if(k===addDays(t,-1)) return 'Yesterday';
  return dateOf(k).toLocaleDateString('en-IE',{weekday:'short',day:'numeric',month:'short'});
}
/* Run something from the food code against the day on screen, then hand the
   food code back to today. */
function onEatDay(fn){
  const k=eatKey(), was=foodDay;
  foodDay= k===todayKey()? null : k;
  try{ return fn(k); } finally { foodDay=was; }
}
function eatRing(frac,tone,value,caption,aria){
  const len=Math.max(0,Math.min(1,frac||0))*RING_C, vs=String(value);
  const fs= vs.length>=6? 22 : (vs.length>=5? 25 : 30);
  return `<div class="eatring" role="img" aria-label="${aria}" style="--tone:var(--${tone})">
    <svg viewBox="0 0 104 104" aria-hidden="true"><circle class="rt" cx="52" cy="52" r="44"/>
      ${len>0? `<circle class="ra" cx="52" cy="52" r="44" stroke-dasharray="${len.toFixed(1)} ${RING_C.toFixed(1)}" transform="rotate(-90 52 52)"/>` : ''}</svg>
    <span class="ev" style="font-size:${fs}px">${value}</span><span class="ec">${caption}</span></div>`;
}
function eatSummary(k){
  const food=dayFood(k), t=foodTotals(k), tg=S.targets||{}, isToday=k===todayKey();
  if(isTeen()){
    const meals=new Set(food.map(x=>x.meal||'s')).size;
    return `<section class="eatcard eatsum teen">
      <div class="eattop">${eatRing(meals/3,'coral',String(meals),meals===1?'meal logged':'meals logged',`${meals} ${meals===1?'meal':'meals'} logged ${isToday?'today':'that day'}`)}
        <div class="eatnums"><div class="enrow"><span>Things logged</span> <b>${food.length}</b></div>
          <div class="enote">Regular meals and plenty of variety matter most while you are growing. No counting needed.</div></div></div>
    </section>`;
  }
  const eaten=Math.round(t.kcal), target=+tg.kcal||0, maint=+tg.maintenance||0;
  let ring, note;
  if(!target){
    ring=eatRing(0,'coral',num(eaten),'kcal eaten',`${num(eaten)} kcal eaten, no target yet`);
    note='No target yet. Add your height, weight and goal in You and the app works one out.';
  } else if(eaten<=target){
    ring=eatRing(eaten/target,'coral',num(target-eaten),'kcal left',`${num(target-eaten)} kcal left of ${num(target)}`);
    note= !maint||maint===target? 'No weight goal set, so this is about what you burn.' : `Set for your goal. About ${num(maint)} keeps your weight where it is.`;
  } else {
    /* over target: how far, and where that sits against maintenance, the same
       as the Food ring on Today */
    const past=!maint||eaten>maint;
    ring=eatRing(1,past?'coral':'amber',num(eaten-target),'kcal over',`${num(eaten-target)} kcal over target`);
    note= maint? (eaten<=maint? `Over target but still ${num(maint-eaten)} under maintenance (${num(maint)}), so still a small deficit.` : `${num(eaten-maint)} over maintenance (${num(maint)}).`) : '';
  }
  const fi=fibreInfo(k);
  const macro=(n,v,of,tone,attr)=>{
    const pct=of? Math.min(100,Math.round(v/of*100)) : 0;
    const tag=attr? 'button' : 'div';
    return `<${tag} class="emac" ${attr||''}><span class="en">${n}</span> <span class="evv"><b>${Math.round(v)}</b><small>${of? '/'+of+'g' : 'g'}</small></span> <span class="ebar"><i style="width:${pct}%;background:var(--${tone})"></i></span></${tag}>`;
  };
  return `<section class="eatcard eatsum">
    <div class="eattop">${ring}
      <div class="eatnums">
        <div class="enrow"><span>Target</span> <b>${target? num(target) : 'not set'}</b></div>
        <div class="enrow"><span>Eaten</span> <b>${num(eaten)}</b></div>
        ${note? `<div class="enote">${note}</div>` : ''}</div></div>
    <div class="emacs">
      ${macro('Protein',t.protein,tg.protein,'coral')}
      ${macro('Carbs',t.carbs,tg.carbs,'carbs')}
      ${macro('Fat',t.fat,tg.fat,'fat')}
      ${macro('Fibre',fi.g,tg.fibre||30,'fibre',`data-fibrewhy="${k}" aria-label="Fibre ${Math.round(fi.g)} of ${tg.fibre||30} grams. Where it came from, and why it matters"`)}
    </div>
  </section>`;
}
function eatSections(k){
  const food=dayFood(k), teen=isTeen(), isToday=k===todayKey(), skipped=((S.days[k]||{}).skipped)||[];
  /* planned times and the meal after training come from today's plan, so
     they are shown for today only */
  let slots=[]; if(isToday){ try{ slots=mealSlots(k).slots; }catch(e){} }
  const per=teen? null : perMealProtein();
  const now=new Date().getHours()*60+new Date().getMinutes();
  const secs=EAT_SECTIONS.map(([m,label])=>{
    const items=food.filter(f=>(f.meal||'s')===m), sl=m==='s'? null : slots.find(x=>x.role===m);
    if(m==='d'&&sl&&sl.tag==='post') label='Dinner, after training';
    if(m==='d'&&sl&&sl.tag==='pre') label='Dinner, before training';
    if(m==='b'&&sl&&sl.tag==='post') label='Breakfast, after training';
    const kcal=Math.round(items.reduce((a,f)=>a+(+f.kcal||0)*(+f.q||1),0));
    const p=Math.round(items.reduce((a,f)=>a+(+f.p||0)*(+f.q||1),0));
    return {m,label,items,sl,kcal,p,skipped:skipped.indexOf(m)>=0};
  });
  const next= isToday? secs.find(r=>r.m!=='s'&&!r.items.length&&!r.skipped&&(!r.sl||r.sl.min>=now-90)) : null;
  return secs.map(r=>{
    const lower=r.label.split(',')[0].toLowerCase();
    const when= r.items.length? (r.m==='s'? '' : mealAtValue(k,r.m)) : (r.sl&&!r.skipped? 'around '+r.sl.time : '');
    const hit=per&&r.m!=='s'&&r.p>=per;
    const head=`<div class="ehead"><div class="eht"><b>${r.label}</b>${when? `<span class="ewhen">${when}</span>` : ''}</div>
      ${!teen&&r.items.length? `<span class="ek">${num(r.kcal)}</span>` : ''}
      <button class="eadd" data-eatadd="${r.m}" aria-label="Add to ${lower}">+</button></div>`;
    const rows=r.items.map(x=>`<button class="eitem" data-eatitem="${r.m}" aria-label="${escHabit(x.n)}, ${qtyText(x.q)}${teen? '' : ', '+Math.round(x.kcal*x.q)+' kcal'}. Tap to change how much.">
        <span class="eit"><span class="ein">${escHabit(x.n)}${x.q!==1? ` <span class="eiq">× ${qtyText(x.q)}</span>` : ''}</span>
          <span class="eis">${x.quick? 'your numbers' : escHabit(x.u)}${teen? '' : ' · '+Math.round(x.p*x.q)+'g protein · '+foodSource(x)}</span></span>
        ${teen? '' : `<span class="eik">${Math.round(x.kcal*x.q)}</span>`}</button>`).join('');
    let empty='';
    if(!r.items.length){
      if(r.skipped) empty=`<div class="eempty"><span>Skipped</span><button class="inlinebtn" data-eatunskip="${r.m}">Undo</button></div>`;
      else empty=`<div class="eempty"><span>${r.m==='s'? 'None yet' : 'Nothing logged yet'}</span>${r.m!=='s'? `<button class="inlinebtn" data-eatskip="${r.m}">I skipped ${lower}</button>` : ''}</div>`;
    }
    const pr= per&&r.items.length&&r.m!=='s'? `<div class="epr ${hit?'hit':''}">${r.p}g protein${hit? ', at the '+per+'g mark' : ' of about '+per+'g a meal'}</div>` : '';
    return `<section class="eatcard eatmeal ${r===next?'next':''} ${r.skipped?'skipped':''}" data-eatmeal="${r.m}">${head}${rows}${empty}${pr}</section>`;
  }).join('');
}
function eatShortcuts(k){
  const prev=dayFood(addDays(k,-1)).length, teen=isTeen(), saved=savedMeals();
  const tiles=[];
  if(prev) tiles.push(`<button class="etile" data-eatsame><b>Same as ${k===todayKey()? 'yesterday' : 'the day before'}</b><span>All ${prev} ${prev===1?'thing':'things'}, one tap</span></button>`);
  if(!teen) tiles.push(`<button class="etile" data-eatquick><b>Quick add numbers</b><span>Calories and protein, nothing else</span></button>`);
  return `${tiles.length? `<div class="etiles">${tiles.join('')}</div>` : ''}
    ${saved.length? `<div class="esaved"><span class="slab">Your meals</span><div class="shortcuts">${saved.map(m=>`<button class="mini" data-eatsaved="${m.id}">${escHabit(m.name)}</button>`).join('')}</div></div>` : ''}`;
}
function renderEat(){
  const el=$('eatView'); if(!el) return;
  const k=eatKey(), t=todayKey();
  if(typeof mergeDayFood==='function') mergeDayFood(k);
  const dl=$('eatDate'); if(dl) dl.textContent=longDate(k);
  el.innerHTML=`
    <div class="eatdate" role="group" aria-label="Which day">
      <button class="edbtn" data-eatday="-1" aria-label="The day before"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>
      <div class="edl"><b>${eatDayLabel(k)}</b>${k!==t? `<button class="inlinebtn" data-eatday="today">Back to today</button>` : ''}</div>
      <button class="edbtn" data-eatday="1" aria-label="The day after" ${k>=t? 'disabled' : ''}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button>
    </div>
    <button class="eatsearch" data-eatsearch><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><span>Search food or meals</span></button>
    ${eatSummary(k)}
    ${eatSections(k)}
    ${eatShortcuts(k)}
    ${k===t? `<div class="efoot"><button class="inlinebtn" data-eattimes>Why these meal times</button></div>` : ''}`;
}
/* the meal to open the food sheet on when nothing says which */
function eatSlot(){ return eatKey()===todayKey()? slotNow() : 'd'; }
function openEatFood(slot,extra){ openFood(false,Object.assign({day:eatKey(),slot:slot||eatSlot()},extra||{})); }
/* Today's Meals rows land here, on the meal that was tapped */
function goEatMeal(m){
  eatDay=null; go('eat');
  const sec=[...document.querySelectorAll('#eatView [data-eatmeal]')].find(x=>x.dataset.eatmeal===m);
  if(sec){ try{ sec.scrollIntoView({block:'center'}); }catch(e){}
    sec.classList.add('flash'); setTimeout(()=>sec.classList.remove('flash'),1200); }
}
document.addEventListener('click',e=>{
  const dd=e.target.closest('[data-eatday]');
  if(dd){ const v=dd.dataset.eatday, t=todayKey();
    if(v==='today') eatDay=null;
    else { const n=addDays(eatKey(),+v); eatDay= n>=t? null : n; }
    renderEat(); return; }
  if(e.target.closest('[data-eatsearch]')){ openEatFood(null,{search:true}); return; }
  const ad=e.target.closest('[data-eatadd]'); if(ad){ openEatFood(ad.dataset.eatadd); return; }
  const it=e.target.closest('[data-eatitem]'); if(it){ openEatFood(it.dataset.eatitem); return; }
  const sk=e.target.closest('[data-eatskip]');
  if(sk){ skipMeal(eatKey(),sk.dataset.eatskip,true); renderAll();
    toast(isTeen()? 'Noted. While you are growing, regular meals really help, so try not to make it a habit.' : 'Noted as skipped'); return; }
  const us=e.target.closest('[data-eatunskip]'); if(us){ skipMeal(eatKey(),us.dataset.eatunskip,false); renderAll(); return; }
  if(e.target.closest('[data-eatsame]')){
    const k=eatKey(), n=onEatDay(()=>repeatYesterday()); renderAll();
    toast(n? n+' things copied from '+(k===todayKey()? 'yesterday' : 'the day before') : 'Nothing logged the day before'); return; }
  if(e.target.closest('[data-eatquick]')){
    openEatFood(null); foodQuick=true; drawFood();
    setTimeout(()=>{ const q=document.getElementById('qaKcal'); if(q) try{ q.focus({preventScroll:true}); }catch(e2){} },60); return; }
  const sv=e.target.closest('[data-eatsaved]');
  if(sv){ const n=onEatDay(()=>addSavedMeal(sv.dataset.eatsaved)); renderAll(); toast(n+' things added'); return; }
  if(e.target.closest('[data-eattimes]')&&typeof openEating==='function'){ openEating(); return; }
});
/* Anything changed in the food sheet shows on Eat straight away. The food
   code redraws its own sheet as it handles the tap, which takes the tapped
   button out of the page, so where the tap was is noted on the way in
   (capture) and Eat is redrawn on the way out, after the food code. */
let eatTapInSheet=false;
document.addEventListener('click',e=>{ eatTapInSheet=!!(e.target.closest&&e.target.closest('#foodSheet,#altSheet')); },true);
document.addEventListener('click',()=>{
  if(eatTapInSheet&&document.body.dataset.screen==='eat') renderEat();
  eatTapInSheet=false;
});
document.addEventListener('change',e=>{
  if(e.target.id==='mealAt'&&document.body.dataset.screen==='eat') renderEat();
});
if(window.__G){
  Object.assign(window.__G,{renderEat,goEatMeal,eatSections,eatSummary,eatDayLabel,openEatFood});
  Object.defineProperties(window.__G,{
    eatDay:{get:()=>eatDay,set:v=>{eatDay=v},configurable:true},
    foodDay:{get:()=>foodDay,configurable:true}
  });
}
