/* ===================== Eating pattern (build 81) =====================
   Feargal: let people choose how they like to eat (do they fast, what hourly
   split, once or twice a day, at what times), and say what each choice means
   for their goals, pros and cons.

   What the research says, and so what this does:
   - A window is a way of eating less, not a way of burning more. Added to a
     calorie deficit, windows gave about 2 kg more weight loss over 8 to 14
     weeks in seven small trials (458 adults), with no change in lean mass,
     glucose, cholesterol or blood pressure, and low certainty (a meta-analysis
     of time-restricted eating plus calorie restriction). The best long trial
     found no extra loss at 12 months: 139 adults, an 8am to 4pm window plus a
     calorie limit lost 8.0 kg against 6.3 kg for the limit alone, a gap that
     could be chance (Liu and colleagues, 2022). A 12 week trial of 16:8 with
     no calorie advice found no more weight loss than three regular meals, and
     in a 50 person scan subset the arms and legs lost more lean mass (0.64 kg
     against 0.17 kg, Lowe and colleagues, 2020).
   - With lifting: eight small studies (219 people, 4 to 8 weeks) of fasting
     patterns plus resistance training mostly kept lean mass and lost fat; none
     was long and none measured strength (a 2020 systematic review).
   - Earlier beats later: across 41 trials (2,287 people, median 8 weeks) an
     early window (last meal before 5pm) lost 1.15 kg more than a late one
     (after 7pm), with lower fasting insulin; most of that comparison is
     indirect (BMJ Medicine network meta-analysis, 2026).
   - Eating before exercise: across 46 studies a meal beforehand improved
     prolonged aerobic performance and made no difference to shorter efforts
     (Aird, Davies and Carson, 2018).
   - Protein in few meals: a 100g dose raised muscle protein building for more
     than 12 hours, longer than 25g did (Trommelen and colleagues, 2023), so a
     big meal is not wasted; the daily total still matters most.
   - One meal a day: in an 11 person, 11 day trial at maintenance calories it
     lost weight and fat and also muscle and bone (Frontiers in Physiology,
     2021); a large observational study followed over 24,000 people for about
     15 years and linked one meal a day to higher death from any cause and from
     cardiovascular disease, which cannot show cause.
   - Windows under 8 hours were linked to higher cardiovascular death in a
     preliminary 2024 American Heart Association abstract: early, unconfirmed.
   - Who should not, or should ask first: pregnant or breastfeeding, a history
     of eating disorders, diabetes or medicines that depend on food, older
     adults with memory problems, athletes who need to fuel (Baylor College of
     Medicine). Under 18s are never offered it here: the teen version works
     with regular meals only.
   What this is not: a claim that a window burns fat. Calories decide that.
   Timing is offered for people who find it easier to live with, and the fit
   shown is for their own goals, numbers and training time. Nothing is blocked
   for an adult; the words say how good a fit it is.
   The fit levels and the rules behind them are this app's reading of the
   evidence above, labelled as such in the method note. */

const EAT_DEFS={
  'regular':{t:'Regular meals', chip:'Regular', s:'Breakfast, lunch and dinner, with snacks if you like', len:null, meals:null, kind:'reg'},
  '12-12':{t:'12:12', chip:'12:12', s:'Twelve hours without food overnight', len:12, meals:3},
  '14-10':{t:'14:10', chip:'14:10', s:'Ten hours to eat, no late night snacking', len:10, meals:3},
  '16-8':{t:'16:8', chip:'16:8', s:'Eight hours to eat, usually skipping breakfast', len:8, meals:3},
  '18-6':{t:'18:6', chip:'18:6', s:'Six hours to eat, two or three meals', len:6, meals:2},
  '20-4':{t:'20:4', chip:'20:4', s:'Four hours to eat, one or two meals', len:4, meals:2},
  'two':{t:'Two meals a day', chip:'Two meals', s:'You choose the two times', len:null, meals:2},
  'omad':{t:'One meal a day', chip:'One meal', s:'One meal, you choose the time', len:null, meals:1},
  'custom':{t:'Your own window', chip:'Custom', s:'Pick the start, the end and the number of meals', len:null, meals:3}
};
const EAT_ORDER=['regular','12-12','14-10','16-8','18-6','20-4','two','omad','custom'];
const EAT_MEALS_MAX=5;
const EAT_EVIDENCE=`Windows are a way of eating less, not of burning more. Added to a calorie deficit they gave about 2 kg more weight loss in seven small trials, low certainty. The best long trial (Liu and colleagues, 2022, 139 adults, 12 months) found no extra loss over a calorie limit alone, and a 12 week trial of 16:8 found no extra weight loss and more lean mass lost (Lowe and colleagues, 2020). Lifting on a fasting pattern kept lean mass in eight small, short studies. An earlier window beat a later one across 41 trials (BMJ Medicine, 2026). A meal before exercise improved long efforts across 46 studies (Aird and colleagues, 2018). A big protein dose is not wasted (Trommelen and colleagues, 2023). One meal a day lost muscle and bone in a tiny trial and was linked to higher death rates in a large observational study; windows under 8 hours were linked to higher cardiovascular death in a preliminary abstract. The who-should-ask-first list is from Baylor College of Medicine. How good a fit each one is for each goal is this app's reading of that evidence, a rule of thumb, not a verdict. Under 18s are not offered this.`;
const LV_ORD={good:0,ok:1,care:2,poor:3};
const LV_WORD={good:'Good fit',ok:'Works',care:'Be careful',poor:'Not a good fit'};
const LV_TONE={good:'green',ok:'green',care:'amber',poor:'coral'};
const worse=(lv,n)=>{ const o=Object.keys(LV_ORD); return o[Math.min(3,LV_ORD[lv]+(n||1))]; };
const fmtH=m=>{ const h=m/60; return (Math.abs(h-Math.round(h))<0.05? String(Math.round(h)) : h.toFixed(1)).replace('.0',''); };

/* ---------- the person's pattern, if they have one ---------- */
function eatAdult(){ const a=ageOf(); return !a||a>=ADULT_AGE; }
function eatPatId(){ const e=S.profile&&S.profile.eat; return e&&EAT_DEFS[e.id]? e.id : 'regular'; }
function eatPat(){
  const e=S.profile&&S.profile.eat;
  if(!e||typeof e!=='object'||!EAT_DEFS[e.id]||e.id==='regular'||!eatAdult()) return null;
  const s=hhmmToMin(e.start), en=hhmmToMin(e.end);
  if(s===null||en===null) return null;
  const len=((en-s)%1440+1440)%1440;
  if(len<30||len>1200) return null;
  const def=EAT_DEFS[e.id];
  const meals=Math.max(1,Math.min(EAT_MEALS_MAX,Math.round(+e.meals||def.meals||3)));
  return {id:e.id,start:minToHhmm(s),end:minToHhmm(en),s,e:en,lenMin:len,fastMin:1440-len,meals,
    label:eatLabel(e.id,s,en,len,meals)};
}
function eatLabel(id,s,en,len,meals){
  if(id==='two') return 'Two meals';
  if(id==='omad') return 'One meal';
  const eat=Math.round(len/60), fast=24-eat;
  return fast+':'+eat;
}
/* is a clock time (minutes since midnight) inside the window? */
function inWindowMin(m,pat){ pat=pat||eatPat(); if(!pat) return true; return ((m-pat.s)%1440+1440)%1440<pat.lenMin; }
/* where the clock is against the window right now */
function windowState(at){
  const pat=eatPat(); if(!pat) return null;
  const now=typeof at==='number'? at : nowMins();
  const rel=((now-pat.s)%1440+1440)%1440, open=rel<pat.lenMin;
  return open
    ? {pat,open:true,leftMin:pat.lenMin-rel,frac:rel/pat.lenMin}
    : {pat,open:false,opensInMin:1440-rel,fastedMin:rel-pat.lenMin,frac:(rel-pat.lenMin)/pat.fastMin};
}
function fmtLeft(m){ m=Math.max(0,Math.round(m)); const h=Math.floor(m/60), r=m%60; return h? h+'h'+(r? ' '+r+'m' : '') : r+'m'; }
function windowText(){
  const w=windowState(); if(!w) return '';
  return w.open? 'Window open until '+w.pat.end+', '+fmtLeft(w.leftMin)+' left'
    : 'Window opens at '+w.pat.start+', in '+fmtLeft(w.opensInMin);
}
/* a small line under the Meals heading on Today */
function windowChip(){
  const w=windowState(); if(!w) return '';
  return `<div class="mwin ${w.open?'open':'shut'}"><span>${w.pat.label} · ${w.pat.start} to ${w.pat.end}</span><b>${windowText().replace(/^Window /,'')}</b></div>`;
}

/* ---------- the day laid out inside the window ----------
   Same shape as eatingPlan() so the meals list, Eat, Up next and the habits
   all keep working: items with a tag, time, what and why. Meals are spread
   from the first to the last start, to the quarter hour. */
function patternPlan(){
  const pat=eatPat(); if(!pat) return null;
  const wakeA=clockOf('wake'), bedA=clockOf('bed'), trainA=clockOf('train');
  const rel=t=>(((t-wakeA)%1440)+1440)%1440, abs=r=>(((wakeA+r)%1440)+1440)%1440;
  const bed=rel(bedA)||960, train=rel(trainA), startR=rel(pat.s);
  const t=S.targets||{}, protein=+t.protein||0, n=pat.meals;
  const per=protein? Math.round(protein/n) : null, P=per? per+'g' : '20 to 40g';
  const kind=todayTrains(), trains=!!kind&&train<bed;
  const lastAt=n===1? startR : startR+Math.max(30,Math.min(pat.lenMin-30,pat.lenMin-60));
  const slot=k=>n===1? startR : Math.round((startR+k*(lastAt-startR)/(n-1))/15)*15;
  const roleAt=r=>r<300? 'b' : (r>=bed-300? 'd' : 'l');
  const taken={}, items=[];
  for(let k=0;k<n;k++){
    const at=slot(k); let role=roleAt(at);
    if(k===n-1&&n>1&&role!=='d'&&at>=bed-420) role='d';
    if(taken[role]){ if(role==='d'){ /* the last one is dinner; earlier ones become snacks */
        const prev=items.find(i=>i.tag==='last'); if(prev){ prev.tag='meal'+prev.k; prev.what='A meal or a proper snack'+(per?`, about ${per}g protein`:''); } }
      else role='s'; }
    taken[role]=true;
    const tag= role==='b'? 'breakfast' : (role==='l'? 'lunch' : (role==='d'? 'last' : 'meal'+k));
    const first=k===0, last=k===n-1;
    const what= (n===1? 'Your meal' : (first? 'First meal' : (last? 'Last meal' : 'A meal')))+(per? `, about ${per}g protein` : '');
    const why= n===1? 'Everything for the day goes in here: the protein, the fibre and the calories. Start with the protein.'
      : first? 'The window opens. Put protein first: it is the meal that sets the rest of the day up.'
      : last? 'The window closes after this. Two to three hours before bed is the aim; this is the last meal to count.'
      : `Spreading protein across ${n} meals of about ${P} is the aim, and the day's total matters most.`;
    items.push({tag,time:at,what,why,k});
  }
  if(trains){
    const inside=((train-startR)%1440+1440)%1440<pat.lenMin;
    items.push({tag:'train',time:train,what:kind==='lifting'? 'Train' : 'Cardio',
      why: inside? 'Inside your window, so you can eat before or after it.'
        : 'Outside your window: you train fasted, or after the fast. Fine for a short session; for a long or hard one, a meal beforehand helps.'});
  }
  items.push({tag:'coffee',time:Math.max(60,bed-480),what:'Last coffee',
    why:'A full coffee within about eight hours of bed fragments sleep even when it does not feel like it. Black coffee does not break a fast.'});
  const out=items.slice().sort((x,y)=>x.time-y.time).map(i=>{ const o=Object.assign({},i,{time:minToHhmm(abs(i.time))}); delete o.k; return o; });
  return {items:out,bed:minToHhmm(bedA),train:minToHhmm(trainA),wake:minToHhmm(wakeA),kind,meals:n,per,pat};
}
/* which of breakfast, lunch and dinner are part of today's pattern */
function eatRolesIn(){
  const pl=patternPlan(); if(!pl) return ['b','l','d'];
  const r=[]; pl.items.forEach(i=>{ if(i.tag==='breakfast') r.push('b'); else if(i.tag==='lunch') r.push('l'); else if(i.tag==='last') r.push('d'); });
  return r;
}
const eatRoleOff=m=>!!eatPat()&&(m==='b'||m==='l'||m==='d')&&eatRolesIn().indexOf(m)<0;
function firstMealRole(){ const pl=patternPlan(); if(!pl) return null; const r=eatRolesIn(); return r.indexOf('b')>=0? null : (r[0]||null); }
function firstMealMin(){ const pl=patternPlan(); if(!pl) return null;
  const f=pl.items.filter(i=>i.tag!=='train'&&i.tag!=='coffee')[0]; return f? hhmmToMin(f.time) : null; }
const firstMealWord=()=>eatRoleOff('b')? 'your first meal' : 'breakfast';
/* has the first meal of the pattern's day come round yet (plus some minutes)?
   Always true with no pattern */
function windowStarted(plus){
  const fm=firstMealMin(); if(fm===null) return true;
  const w=clockOf('wake'), rel=t=>((t-w)%1440+1440)%1440;
  return rel(nowMins())>=rel(fm)+(plus||0);
}
/* the part of the day food is expected in, in minutes since waking, for the
   protein pace (a window ends the day's eating early) */
function foodHorizon(){
  const pat=eatPat(); if(!pat) return null;
  const w=clockOf('wake'), rel=t=>((t-w)%1440+1440)%1440, from=rel(pat.s);
  return {from, to:Math.max(from+60,from+pat.lenMin)};
}

/* ---------- how well it is keeping to the window ---------- */
function windowStats(days){
  const pat=eatPat(); if(!pat) return null;
  days=days||7; let logged=0, inside=0, outsideDays=[];
  for(let i=1;i<=days;i++){
    const k=addDays(todayKey(),-i), food=dayFood(k).filter(f=>f.at);
    if(!food.length) continue;
    logged++;
    const out=food.filter(f=>{ const d=new Date(f.at); return !inWindowMin(d.getHours()*60+d.getMinutes(),pat); });
    if(out.length) outsideDays.push(k); else inside++;
  }
  return logged? {logged,inside,outsideDays,pct:Math.round(inside/logged*100)} : null;
}

/* ---------- the fit, for this person's goals ---------- */
function eatKind(draft){
  if(!draft||draft.id==='regular') return 'reg';
  const len=((hhmmToMin(draft.end)-hhmmToMin(draft.start))%1440+1440)%1440, fast=(1440-len)/60;
  if(+draft.meals===1||draft.id==='omad') return 'one';
  if(fast<=14.05) return 'light';
  if(fast<=16.05) return 'mid';
  return 'tight';
}
const FIT={
  reg:  {lose:'good',build:'good',strong:'good',endure:'good',hold:'good',eat:'good'},
  light:{lose:'good',build:'good',strong:'good',endure:'good',hold:'good',eat:'good'},
  mid:  {lose:'ok',build:'care',strong:'care',endure:'care',hold:'ok',eat:'ok'},
  tight:{lose:'care',build:'poor',strong:'poor',endure:'poor',hold:'care',eat:'care'},
  one:  {lose:'poor',build:'poor',strong:'poor',endure:'poor',hold:'care',eat:'care'}
};
const FIT_WHY={
  light:{_:'An overnight break of 12 to 14 hours is close to what many people already do. It changes little, so nothing here works against a goal.'},
  mid:{
    lose:'It can help if a window stops you grazing. The best long trial found it no better than eating to a calorie target (Liu and colleagues, 2022).',
    hold:'Fine if it is easy to live with. It does not change what you burn.',
    eat:'A clear rule is easy to follow. It does not make the food itself any better.',
    build:'Possible, but a window makes the extra food and protein harder to fit in, and one 16:8 trial lost more lean mass than regular meals (Lowe and colleagues, 2020).',
    strong:'Heavy training wants fuel around it. Lean mass held in small studies of lifters on fasting patterns, but none measured strength.',
    endure:'Long efforts go better with food beforehand: across 46 studies a meal before improved prolonged aerobic work (Aird and colleagues, 2018).'},
  tight:{
    lose:'A short window is hard to keep and hard to get enough protein into. It is not better for fat loss than a calorie target.',
    hold:'It can be kept, but it is more of a squeeze than a steadying habit needs.',
    eat:'Less time means fewer chances to cook and eat well, not more.',
    build:'Too little time to eat the food and the protein that growth needs, and no good evidence that it works.',
    strong:'Heavy training wants fuel before and protein after, both of which a short window can squeeze out.',
    endure:'Not enough fuel around long efforts, and eating before them is what helps.'},
  one:{
    lose:'The one small trial lost weight and also muscle and bone, and a large study linked one meal a day to higher death rates. Not worth the risk for fat loss.',
    hold:'Possible, but one meal has to carry all your protein, fibre and vitamins.',
    eat:'One meal has to carry everything, which is hard to do well.',
    build:'One meal cannot carry the food and the protein that building muscle needs.',
    strong:'One meal cannot fuel heavy training and recover from it.',
    endure:'One meal cannot fuel training and recovery for running.'}
};
function eatCtx(){
  const ob=(typeof onbDraft!=='undefined'&&onbDraft&&document.getElementById('onb')&&document.getElementById('onb').classList.contains('on'))? onbDraft : null;
  const p=S.profile||{}, T=S.targets||{};
  let aims= ob? [ob.aim||'lose'] : (typeof planAims==='function'? planAims() : [p.aim||'lose']);
  const pd=(!ob&&typeof planDir==='function')? planDir() : null, dir=pd? pd.dir : null;
  if(dir==='up'&&aims.indexOf('build')<0) aims=aims.concat(['build']);
  if(dir==='down'&&aims.indexOf('lose')<0) aims=aims.concat(['lose']);
  const lifts=+(ob? ob.liftDays : p.liftDays)||0, cardio=+(ob? ob.cardioDays : p.cardioDays)||0;
  return {aims, dir, onb:!!ob,
    kg:+(ob? ob.weight : p.weight)||null, cm:+(ob? ob.height : p.height)||null, age:+(ob? ob.age : p.age)||null,
    protein: ob? null : (+T.protein||null), kcal: ob? null : (+T.kcal||null),
    trains:(lifts+cardio)>0, trainMin:clockOf('train'), bedMin:clockOf('bed'), wakeMin:clockOf('wake')};
}
function eatFit(draft,ctx){
  ctx=ctx||eatCtx();
  const kind=eatKind(draft), n=+draft.meals||1;
  const s=hhmmToMin(draft.start), en=hhmmToMin(draft.end), len=((en-s)%1440+1440)%1440, fastH=(1440-len)/60;
  const rows=ctx.aims.map(a=>({aim:a,lv:(FIT[kind]||FIT.reg)[a]||'ok'}));
  const pros=[], cons=[], numbers=[], steps=[];
  const has=a=>ctx.aims.indexOf(a)>=0;
  const eatsMuscle=has('build')||has('strong');
  const cap=(lv)=>{ rows.forEach(r=>{ if(LV_ORD[r.lv]<LV_ORD[lv]) r.lv=lv; }); };
  const bump=(pred,by)=>{ rows.forEach(r=>{ if(pred(r.aim)) r.lv=worse(r.lv,by||1); }); };
  if(kind!=='reg'){
    numbers.push('Window '+draft.start+' to '+draft.end+', '+fmtH(len)+' hours to eat and '+fmtH(1440-len)+' without food.');
    /* safety first: things that move every row */
    if(ctx.kg&&ctx.cm){ const bmi=ctx.kg/Math.pow(ctx.cm/100,2);
      if(bmi<18.5&&fastH>=14){ cap('poor'); cons.push({t:'Your height and weight put you under 18.5 BMI. Skipping meals is not advised at that weight. Talk to your doctor first.',s:'rule of thumb'}); } }
    if(ctx.age&&ctx.age>=65&&kind!=='light'){ cap('care'); cons.push({t:'From 65, losing muscle matters more and fasting is less studied. Ask your doctor first.',s:'Baylor College of Medicine'}); }
    /* what it does to the food */
    if(ctx.protein){ const pm=Math.round(ctx.protein/n);
      numbers.push(ctx.protein+' g of protein a day is about '+pm+' g in each of '+n+' meal'+(n===1?'':'s')+'.');
      if(n<=2&&pm>=60){ bump(a=>a==='build'||a==='strong',1);
        cons.push({t:'About '+pm+' g of protein a meal is a lot of food at once. It is not wasted: a 100g dose kept muscle building going for over 12 hours in one trial. But the day\'s total is what counts, so a smaller total in a window is worse than a full one outside it.',s:'Trommelen and colleagues, 2023'}); } }
    if(ctx.kcal){ const km=Math.round(ctx.kcal/n);
      numbers.push(num(ctx.kcal)+' kcal a day is about '+num(km)+' in each meal.');
      if(km>=1000&&(has('build')||ctx.dir==='up')){ bump(a=>a==='build',1); cons.push({t:'Eating '+num(ctx.kcal)+' kcal in '+n+' meal'+(n===1?'':'s')+' is about '+num(km)+' each. A surplus is hard to fit into a short window.',s:'rule of thumb'}); } }
    /* training against the window */
    if(ctx.trains){
      const inside=((ctx.trainMin-s)%1440+1440)%1440<len;
      numbers.push('Your usual session at '+minToHhmm(ctx.trainMin)+' is '+(inside? 'inside' : 'outside')+' the window.');
      if(!inside){
        /* one step worse, but never from be careful to not a good fit on this alone */
        rows.forEach(r=>{ if((r.aim==='endure'||r.aim==='strong')&&LV_ORD[r.lv]<LV_ORD.care) r.lv=worse(r.lv,1); });
        cons.push({t:'Your usual session at '+minToHhmm(ctx.trainMin)+' falls outside the window, so you train fasted or after the fast. A meal beforehand helped long efforts and made no difference to short ones.',s:'Aird and colleagues, 2018, 46 studies'});
        steps.push('Open the window about two hours before you train, around '+minToHhmm(ctx.trainMin-120)+', or finish it after your session.');
      } else steps.push('Keep the session inside the window and put protein in the meal after it.');
    }
    /* last meal against bed */
    const endToBed=((ctx.bedMin-en)%1440+1440)%1440;
    if(endToBed<120&&endToBed>=0){ cons.push({t:'The window closes '+fmtH(endToBed)+' hours before your usual bed time. Large meals within two to three hours of bed make sleep worse.',s:'sleep research'}); steps.push('Finish eating two to three hours before bed, by '+minToHhmm(ctx.bedMin-150)+'.'); }
    /* where in the day */
    if(s>=14*60&&(has('lose')||has('hold'))&&kind!=='light') cons.push({t:'A late window did worse than an early one: about 1.2 kg less weight lost and higher fasting insulin across 41 trials.',s:'BMJ Medicine, 2026, mostly indirect evidence'});
    if(s<=10*60&&(has('lose')||has('hold'))) pros.push({t:'An early window, with your last meal before about 5pm, did better than a late one across 41 trials: about 1.2 kg more weight lost.',s:'BMJ Medicine, 2026'});
    /* the general pros and cons of a window */
    pros.push({t:'A clear rule: no grazing, fewer food decisions, and a defined end to the eating day.',s:''});
    if(has('lose')||has('hold')) pros.push({t:'Windows were easy to keep in trials: 66 to 99% of the schedule followed, generally better than a plain calorie limit.',s:'41 trials, 2026'});
    if(has('lose')&&kind!=='light') pros.push({t:'Added to a calorie deficit, windows gave about 2 kg more weight loss over 8 to 14 weeks in seven small trials. Low certainty, short trials.',s:'meta-analysis of 7 trials'});
    if(has('lose')&&kind!=='light') cons.push({t:'The best long trial found no extra loss from a window: 8.0 kg against 6.3 kg for a calorie limit alone at 12 months, a gap that could be chance.',s:'Liu and colleagues, 2022, 139 adults'});
    if(kind!=='light') cons.push({t:'A 12 week trial of 16:8 with no calorie advice lost no more weight than regular meals, and arm and leg lean mass fell more (0.64 kg against 0.17 kg, in a 50 person scan group).',s:'Lowe and colleagues, 2020'});
    if(eatsMuscle&&kind!=='light') pros.push({t:'Lifting while on a fasting pattern mostly kept lean mass in eight small studies, with fat loss in five of them.',s:'2020 systematic review, 4 to 8 weeks'});
    if(eatsMuscle&&kind!=='light') cons.push({t:'Those studies were short and none measured strength, so there is no good evidence a window helps a lift, and a short one makes protein and calories harder to hit.',s:''});
    if(kind==='tight'||kind==='one') cons.push({t:'Windows under 8 hours were linked to higher cardiovascular death in a preliminary 2024 American Heart Association abstract. It is early and unconfirmed, but worth knowing.',s:'AHA 2024 abstract'});
    if(kind==='one'){
      cons.push({t:'One meal a day for 11 days at maintenance calories lost weight, fat and also muscle and bone in an 11 person trial.',s:'Frontiers in Physiology, 2021'});
      cons.push({t:'A study of over 24,000 people over about 15 years linked one meal a day to higher death from any cause. That cannot show cause, but it is not a good sign.',s:'observational'}); }
    steps.push('Keep the day\'s protein at '+(ctx.protein? ctx.protein+' g' : 'your target')+', whatever the window. If you cannot, widen the window.');
    steps.push('Weigh in and watch your lifts. If either slides, or you feel flat, widen it.');
  } else {
    pros.push({t:'Nothing to plan: eat when you are hungry across the day. Protein spread over four or so meals has a small edge for muscle.',s:'Schoenfeld and Aragon, 2018'});
    cons.push({t:'Easier to graze, and no rule to stop it. If late snacking is where the calories go, a window can help with that.',s:''});
  }
  /* what each goal gets */
  const overall=rows.reduce((a,r)=>LV_ORD[r.lv]>LV_ORD[a]? r.lv : a,'good');
  rows.forEach(r=>{ r.why= kind==='reg'? '' : ((FIT_WHY[kind]&&(FIT_WHY[kind][r.aim]||FIT_WHY[kind]._))||''); });
  return {kind,rows,overall,pros,cons,numbers,steps};
}
/* the safety note, before anything past an overnight break */
const EAT_SAFETY=['Pregnant or breastfeeding',
  'A history of an eating disorder, or if skipping meals worries you',
  'Diabetes, or medicines that depend on when you eat',
  'Under 18, or older with memory problems',
  'Training hard and needing to fuel it'];
const eatNeedsAck=d=>d.id!=='regular'&&eatKind(d)!=='light';

/* ---------- the picker ---------- */
let ED=null;   /* the draft being looked at: {id,start,end,meals} */
const eatOnb=()=>{ try{ return !!(document.getElementById('onb')&&document.getElementById('onb').classList.contains('on')&&typeof onbDraft!=='undefined'&&onbDraft); }catch(e){ return false; } };
/* a sensible start for each pattern: shifted earlier if the window would run
   into the two and a half hours before bed */
function eatSuggest(id){
  const def=EAT_DEFS[id], wake=clockOf('wake'), bed=clockOf('bed');
  const rel=t=>((t-wake)%1440+1440)%1440;
  const base={'12-12':wake+60,'14-10':wake+180,'16-8':12*60,'18-6':13*60,'20-4':15*60,two:12*60+30,omad:18*60+30,custom:11*60}[id];
  let start=((base%1440)+1440)%1440, len=def.len? def.len*60 : (id==='omad'? 60 : (id==='two'? 6.5*60+60 : 9*60));
  if(id==='two') len=Math.round((19*60-start)+60);
  const bedRel=rel(bed)||960;
  if(rel(start)+len>bedRel-150&&id!=='two'){ start=((start-(rel(start)+len-(bedRel-150)))%1440+1440)%1440; start=Math.round(start/15)*15; }
  const meals=def.meals||3;
  return {id,start:minToHhmm(start),end:minToHhmm(start+len),meals};
}
function eatDraftFrom(id){
  if(id==='regular') return {id,start:'',end:'',meals:0};
  const cur=eatPat();
  if(cur&&cur.id===id) return {id,start:cur.start,end:cur.end,meals:cur.meals};
  return eatSuggest(id);
}
function eatSetTime(which,val){
  const m=hhmmToMin(val); if(m===null||!ED) return;
  const d=ED, def=EAT_DEFS[d.id], lenNow=((hhmmToMin(d.end)-hhmmToMin(d.start))%1440+1440)%1440;
  if(d.id==='two'){
    if(which==='start'){ const second=hhmmToMin(d.end)-60; d.start=minToHhmm(m); d.end=minToHhmm(second+60); }
    else d.end=minToHhmm(m+60);
  } else if(d.id==='omad'){ d.start=minToHhmm(m); d.end=minToHhmm(m+60); }
  else if(d.id==='custom'){ if(which==='start') d.start=minToHhmm(m); else d.end=minToHhmm(m); }
  else { if(which==='start'){ d.start=minToHhmm(m); d.end=minToHhmm(m+(def.len? def.len*60 : lenNow)); } }
}
function eatSecond(d){ return minToHhmm(hhmmToMin(d.end)-60); }
function eatValid(d){
  if(d.id==='regular') return true;
  const s=hhmmToMin(d.start), e=hhmmToMin(d.end); if(s===null||e===null) return false;
  const len=((e-s)%1440+1440)%1440;
  if(d.id==='two') return len>=120;
  return len>=30&&len<=1200;
}
function drawEatSheet(){
  if(!ED) return;
  const d=ED, ctx=eatCtx(), fit=eatFit(d,ctx), def=EAT_DEFS[d.id], cur=eatPatId(), curPat=eatPat();
  const sheet=document.getElementById('altSheet'), keep=sheet? sheet.scrollTop : 0;
  const same=curPat? (curPat.id===d.id&&curPat.start===d.start&&curPat.end===d.end&&curPat.meals===d.meals) : d.id==='regular';
  const ack=!!(S.profile&&S.profile.fastAck), needs=eatNeedsAck(d), okToUse=eatValid(d)&&(!needs||ack);
  const chip=id=>{ const dd=eatDraftFrom(id), f=eatFit(dd,ctx), on=id===d.id;
    return `<button class="rt-cuechip ep-chip ${on?'on':''}" data-eatpick="${id}" aria-pressed="${on}" aria-label="${EAT_DEFS[id].t}, ${LV_WORD[f.overall]}">
      <i class="ep-dot d-${LV_TONE[f.overall]}" aria-hidden="true"></i>${EAT_DEFS[id].chip}${cur===id? '<em>Now</em>' : ''}</button>`; };
  const time=(id,label,val,key)=>`<div class="nf"><label for="${id}">${label}</label><input id="${id}" type="time" step="900" value="${val}" data-eattime="${key}"></div>`;
  let ctl='';
  if(d.id==='two') ctl=`<div class="ep-pair">${time('epFirst','First meal at',d.start,'start')}${time('epSecond','Second meal at',eatSecond(d),'end')}</div>`;
  else if(d.id==='omad') ctl=time('epOnce','Your meal at',d.start,'start');
  else if(d.id==='custom') ctl=`<div class="ep-pair">${time('epStart','Window opens',d.start,'start')}${time('epEnd','Window closes',d.end,'end')}</div>`;
  else if(d.id!=='regular') ctl=time('epStartP','First meal at',d.start,'start');
  const stepper= (d.id!=='regular'&&d.id!=='omad'&&d.id!=='two')? `<div class="ep-meals"><span>Meals in the window</span>
      <button class="mini" data-eatmeals="-1" aria-label="One fewer meal"${d.meals<=1?' disabled':''}>−</button><b>${d.meals}</b>
      <button class="mini" data-eatmeals="1" aria-label="One more meal"${d.meals>=EAT_MEALS_MAX?' disabled':''}>+</button></div>` : '';
  const goals=fit.rows.map(r=>`<div class="ep-goal"><span class="ep-gw d-${LV_TONE[r.lv]}">${LV_WORD[r.lv]}</span><b>${aimOf(r.aim).t}</b>${r.why? `<span class="ep-gs">${escHabit(r.why)}</span>` : ''}</div>`).join('');
  const li=(arr,cls)=>arr.length? `<ul class="ep-list ${cls}">${arr.map(x=>`<li>${escHabit(x.t)}${x.s? ` <small>${escHabit(x.s)}</small>` : ''}</li>`).join('')}</ul>` : '';
  const regular=d.id==='regular';
  const stat=windowStats(7), adh= (!regular&&curPat&&curPat.id===d.id&&stat)? `<div class="note">Last 7 days: ${stat.inside} of ${stat.logged} logged days were entirely inside your window.</div>` : '';
  $('altTitle').textContent='Eating pattern';
  $('altSub').textContent='When you eat, not what. Your total calories still decide your weight.';
  $('altBody').innerHTML=`<div class="ep">
    <div class="ep-chips" role="group" aria-label="Eating pattern">${EAT_ORDER.map(chip).join('')}</div>
    <div class="ep-head"><b>${def.t}</b><span>${def.s}</span></div>
    ${regular? '' : `<div class="ep-ctl">${ctl}${stepper}</div>`}
    <div class="slab">For your goals</div>
    <div class="ep-goals">${goals}</div>
    ${regular? '' : `<div class="slab">What it would change</div>
    <ul class="ep-nums">${fit.numbers.map(x=>`<li>${escHabit(x)}</li>`).join('')}</ul>`}
    <div class="slab">The good</div>${li(fit.pros,'pro')}
    <div class="slab">The catch</div>${li(fit.cons,'con')}
    ${fit.steps.length? `<div class="slab">To make it work</div><ul class="ep-list">${fit.steps.map(x=>`<li>${escHabit(x)}</li>`).join('')}</ul>` : ''}
    ${adh}
    ${needs? `<div class="ep-safe"><b>Before you start: ask your doctor first if any of these are you</b>
      <ul>${EAT_SAFETY.map(x=>`<li>${x}</li>`).join('')}</ul>
      <button class="rt-cuechip ep-ack ${ack?'on':''}" data-eatack="1" aria-pressed="${ack}">${ack? 'Read, and none of that is me, or I have asked' : 'I have read this'}</button></div>` : ''}
    <button class="sheetcta ep-use" data-eatuse="1" style="margin:14px 0 6px;width:100%"${okToUse&&!same? '' : ' disabled'}>${same? (regular? 'This is your pattern now' : 'This is your pattern now') : (regular? 'Back to regular meals' : 'Use '+def.t)}</button>
    ${needs&&!ack? '<div class="note">Read the note above to turn this on.</div>' : ''}
    <div class="method"><b>Where this comes from</b><span>${EAT_EVIDENCE}</span></div>
  </div>`;
  openSheet('altSheet');
  const s2=document.getElementById('altSheet'); if(s2) s2.scrollTop=keep;
}
function openEatPattern(){
  if(!eatAdult()){ toast('Regular meals are what work while you are growing'); return; }
  const ob=eatOnb(), curOb=ob&&onbDraft.eat;
  ED= curOb? {id:onbDraft.eat.id,start:onbDraft.eat.start,end:onbDraft.eat.end,meals:onbDraft.eat.meals} : eatDraftFrom(eatPatId());
  drawEatSheet();
}
function eatCommit(){
  const d=ED; if(!d||!eatValid(d)) return false;
  if(eatNeedsAck(d)&&!(S.profile&&S.profile.fastAck)) return false;
  const regular=d.id==='regular';
  const val= regular? {id:'regular'} : {id:d.id,start:minToHhmm(hhmmToMin(d.start)),end:minToHhmm(hhmmToMin(d.end)),meals:d.meals};
  if(eatOnb()){ onbDraft.eat=val; closeSheets(); onbRender(); toast(regular? 'Regular meals' : EAT_DEFS[d.id].t+' noted. You can change it any time.'); return true; }
  const before=S.profile.eat? JSON.parse(JSON.stringify(S.profile.eat)) : null;
  S.profile.eat=val; save(); closeSheets(); renderAll();
  toast(regular? 'Back to regular meals' : (eatPat()? eatPat().label+', '+eatPat().start+' to '+eatPat().end : 'Saved'),'Undo',()=>{ if(before) S.profile.eat=before; else delete S.profile.eat; save(); renderAll(); });
  return true;
}
document.addEventListener('click',e=>{
  const op=e.target.closest('[data-eatopen]');
  if(op){ openEatPattern(); return; }
  const pk=e.target.closest('[data-eatpick]');
  if(pk&&ED){ ED=eatDraftFrom(pk.dataset.eatpick); drawEatSheet(); return; }
  const ms=e.target.closest('[data-eatmeals]');
  if(ms&&ED){ ED.meals=Math.max(1,Math.min(EAT_MEALS_MAX,(+ED.meals||1)+(+ms.dataset.eatmeals||0))); drawEatSheet(); return; }
  const ak=e.target.closest('[data-eatack]');
  if(ak){ S.profile.fastAck= S.profile.fastAck? null : todayKey(); save(); drawEatSheet(); return; }
  if(e.target.closest('[data-eatuse]')){ eatCommit(); return; }
});
document.addEventListener('change',e=>{
  const tt=e.target.closest&&e.target.closest('[data-eattime]');
  if(tt&&ED){ eatSetTime(tt.dataset.eattime,tt.value); drawEatSheet(); }
});

/* ---------- where it shows ---------- */
/* the top of Eat: the pattern, the clock, and a way to change it */
function fastStrip(){
  if(!eatAdult()) return '';
  const w=windowState();
  if(!w) return `<div class="fastrow"><span>Eating pattern: <b>Regular meals</b></span><button class="inlinebtn" data-eatopen="1">Change</button></div>`;
  const left= w.open? fmtLeft(w.leftMin)+' left in your window' : 'Fasting for '+fmtLeft(w.fastedMin)+', window opens at '+w.pat.start+' in '+fmtLeft(w.opensInMin);
  return `<section class="eatcard fastcard ${w.open?'open':'shut'}">
    <div class="fk"><span>${w.pat.label} · ${w.pat.start} to ${w.pat.end}</span><button class="inlinebtn" data-eatopen="1">Change</button></div>
    <div class="fs">${left}</div>
    <div class="fbar" role="img" aria-label="${w.open? 'Window' : 'Fast'} ${Math.round(w.frac*100)} percent through"><i style="width:${Math.round(Math.max(0,Math.min(1,w.frac))*100)}%"></i></div></section>`;
}
/* build 82: the fasting clock on Today. It used to sit as a small line inside
   the Meals card, below the session, where a person who is fasting could not
   see it without scrolling. Now it is its own slim card under the rings, and
   it follows the clock: fasting (how long, and when eating opens), the last
   hour before the window opens (a different colour and wording, it is the next
   thing), the window open (how long is left), and the last hour of the window.
   Nothing at all for regular meals or under 18, so it never takes a place for
   a person who is not fasting. Tap opens the eating pattern. */
function todayFast(at){
  if(!eatAdult()) return '';
  const w=windowState(typeof at==='number'? at : undefined); if(!w) return '';
  const p=w.pat, pct=Math.round(Math.max(0,Math.min(1,w.frac))*100);
  let cls, kick, big, sub, tone;
  if(w.open){
    const closing=w.leftMin<=60&&p.lenMin>=180; /* a one hour window is all closing, so it only says so for a longer one */
    cls= closing? 'open closing' : 'open'; tone= closing? 'amber' : 'green';
    kick= closing? 'Window closing' : 'Eating window';
    big= fmtLeft(w.leftMin)+' left';
    sub= 'Closes at '+p.end;
  } else {
    const soon=w.opensInMin<=60;
    cls= soon? 'shut soon' : 'shut'; tone='amber';
    kick= soon? 'Window opens soon' : 'Fasting';
    big= soon? 'Eat from '+p.start : fmtLeft(w.fastedMin);
    sub= soon? 'In '+fmtLeft(w.opensInMin) : 'Eat from '+p.start+', in '+fmtLeft(w.opensInMin);
  }
  return `<button class="todayfast pc tn-${tone} ${cls}" data-eatopen="1" aria-label="${kick}: ${big}. ${sub}. ${p.label}, ${p.start} to ${p.end}. Tap to change your eating pattern.">
    <span class="pk"><span>${kick}</span><span>${p.label} · ${p.start} to ${p.end}</span></span>
    <span class="pm"><b>${big}</b><span>${sub}</span></span>
    <span class="pbar" aria-hidden="true"><i style="width:${pct}%"></i></span></button>`;
}
function eatPatternLabel(){
  const p=eatPat(); if(!p) return 'Regular meals';
  if(p.id==='two'||p.id==='omad') return p.label+' · '+(p.id==='omad'? p.start : p.start+' and '+minToHhmm(p.e-60));
  return p.label+' · '+p.start+' to '+p.end;
}
if(window.__G){
  Object.assign(window.__G,{EAT_DEFS,EAT_ORDER,EAT_SAFETY,FIT,eatPat,eatPatId,eatPatternLabel,eatKind,eatFit,eatCtx,eatSuggest,eatDraftFrom,eatRolesIn,eatRoleOff,
    windowState,windowText,windowStats,todayFast,patternPlan,inWindowMin,firstMealMin,firstMealRole,firstMealWord,foodHorizon,windowStarted,openEatPattern,eatCommit,fastStrip,windowChip,eatSetTime,eatValid,drawEatSheet});
  Object.defineProperty(window.__G,'ED',{get:()=>ED,set:v=>{ED=v},configurable:true});
}
