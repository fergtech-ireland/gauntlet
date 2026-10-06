/* ===================== onboarding: two steps ===================== */
let step=0, onbDraft=null;
const cloudAvailable=()=>{ try{ return typeof cloudReady==='function'? !!cloudReady() : !!(window.__CLOUD&&window.__CLOUD.cloudReady()); }catch(e){ return false; } };
const stepCount=()=>cloudAvailable()?6:5;
const sameKit=(a,b)=>!!a&&a.length===b.length&&b.every(x=>a.indexOf(x)>=0);
function startOnboarding(){ onbDraft={handle:S.profile.handle,aim:S.profile.aim,checkinDay:6,sex:'',cycle:false,lastPeriod:'',born:S.profile.birthYear||null,bday:S.profile.bday||null,age:ageFromBirth(S.profile.birthYear,S.profile.bday),height:null,weight:null,activity:'mod',kit:ALL_KIT.slice()}; step=0; $('onb').classList.add('on'); onbRender(); }
function onbRender(){
  const b=$('onbBody');
  $('onbDots').innerHTML=Array.from({length:stepCount()},(_,i)=>`<i class="${i<=step?'on':''}"></i>`).join('');
  $('onbBack').style.visibility=step===0?'hidden':'visible';
  if(step===0){
    b.innerHTML=`<h2>Pick a handle.</h2><p class="lead">That is the whole sign up. No email, no password, nothing to verify.</p>
      <div class="handle"><span>@</span><input id="handleIn" value="${onbDraft.handle}" placeholder="yourname" autocomplete="off" spellcheck="false"></div>
      <p class="lead" style="margin-top:14px">3 to 20 letters, numbers or underscores. It is the name that gets the credit when someone tries your session.</p>
      ${cloudAvailable()?`<button class="inlinebtn" id="onbSignIn" style="margin-top:6px">Already use Gauntlet on another phone? Sign in</button>`:''}`;
    const inp=$('handleIn');
    /* the same rule the database enforces (migration 0002): a dot or a space becomes an underscore */
    inp.addEventListener('input',()=>{ onbDraft.handle=inp.value.replace(/[.\s]/g,'_').replace(/[^a-z0-9_]/gi,'').toLowerCase().slice(0,20); inp.value=onbDraft.handle; onbCta(); });
  }
  if(step===1){
    const d=AIM_DEFAULTS[onbDraft.aim]||AIM_DEFAULTS.lose;
    if(onbDraft.liftDays===undefined||onbDraft.liftDays===null) onbDraft.liftDays=d.lift;
    if(onbDraft.cardioDays===undefined||onbDraft.cardioDays===null) onbDraft.cardioDays=d.cardio;
    const total=onbDraft.liftDays+onbDraft.cardioDays;
    b.innerHTML=`<h2>What are you after?</h2><p class="lead">This builds your first week. Every day in it can be changed, and it rebuilds itself from your check ins.</p>`+
      AIMS.map(a=>`<button class="opt ${onbDraft.aim===a.id?'on':''}" data-onbaim="${a.id}">
        <div class="txt"><div class="t">${a.t}</div><div class="s">${a.s}</div></div><div class="rad"></div></button>`).join('')+
      (()=>{ const f=LIFT_FOCUS[AIM_FOCUS[onbDraft.aim]||'muscle'];
        const heavy=f.rx.heavy, iso=f.rx.isolation;
        return `<div class="focusnote"><b>Your lifting: ${f.t.toLowerCase()}</b>
          <span>Big lifts ${heavy.repMin} to ${heavy.reps} reps, smaller ones ${iso.repMin} to ${iso.reps}. ${f.effort} You can change this any time.</span></div>`; })()+
      `<div class="slab">How you like to train</div>
       <div class="splitopts">${Object.keys(STYLES).map(id=>`<button class="splitopt ${(onbDraft.style||'gym')===id?'on':''}" data-onbstyle="${id}" aria-pressed="${(onbDraft.style||'gym')===id}">
         <b>${STYLES[id].t}</b><span>${STYLES[id].s}</span></button>`).join('')}</div>`+
      ((onbDraft.style||'gym')!=='gym'? `<div class="slab">Sessions a week</div>
       <div class="field" style="margin-bottom:12px"><div class="fl"><div class="k">Sessions</div><div class="v">${onbDraft.liftDays}</div></div>
         <div class="chips">${[2,3,4,5,6].map(n=>`<button class="${onbDraft.liftDays===n?'on':''}" data-onbsess="${n}">${n}</button>`).join('')}</div></div>
       ${onbDraft.style==='hybrid'&&onbDraft.liftDays>=2? `<div class="field" style="margin-bottom:12px"><div class="fl"><div class="k">HYROX days in the mix</div><div class="v">${hyroxMixDraft()} HYROX, ${onbDraft.liftDays-hyroxMixDraft()} CrossFit</div></div>
         <div class="chips">${Array.from({length:onbDraft.liftDays-1},(_,i)=>i+1).map(n=>`<button class="${hyroxMixDraft()===n?'on':''}" data-onbhx="${n}">${n}</button>`).join('')}</div></div>` : ''}
       ${onbDraft.style==='hifb'? `<div class="note" style="margin-bottom:14px">Four is the classic HIFB week: chest and triceps, back and biceps, a day off, shoulders and abs, legs. Every block ends with a 400m run, and every set and every run is logged. Movements are fitted to your equipment.</div>`
         : `<div class="note" style="margin-bottom:14px">A fresh set of sessions every week, fitted to the equipment you said you have. You can change any part of any session: the movement, the reps, the weight.</div>`}` : '')+
      ((onbDraft.style||'gym')==='gym'? `<div class="slab">How many days a week</div>
       <div class="field" style="margin-bottom:12px"><div class="fl"><div class="k">Lifting</div><div class="v">${onbDraft.liftDays}</div></div>
         <div class="chips">${[0,1,2,3,4,5,6].map(n=>`<button class="${onbDraft.liftDays===n?'on':''}" data-onblift="${n}">${n}</button>`).join('')}</div></div>
       <div class="field"><div class="fl"><div class="k">Cardio</div><div class="v">${onbDraft.cardioDays}</div></div>
         <div class="chips">${[0,1,2,3,4,5,6].map(n=>`<button class="${onbDraft.cardioDays===n?'on':''}" data-onbcardio="${n}">${n}</button>`).join('')}</div></div>
       ${onbDraft.liftDays>0? `<div class="slab">How you like to split it</div>
       <div class="splitopts">${Object.keys(SPLITS).filter(id=>id!=='pplul'||onbDraft.liftDays>=5).map(id=>`<button class="splitopt ${(onbDraft.split||'auto')===id?'on':''}" data-onbsplit="${id}">
         <b>${SPLITS[id].t}</b><span>${id==='auto'? 'For '+onbDraft.liftDays+' day'+(onbDraft.liftDays===1?'':'s')+': '+SPLITS[autoSplit(onbDraft.liftDays)].t.toLowerCase() : SPLITS[id].s}</span>
         ${id!=='auto'? `<small>${splitFit(id,onbDraft.liftDays)}</small>` : ''}</button>`).join('')}</div>
       <div class="note" style="margin-bottom:14px">Research finds full body and splits build strength and muscle equally when the weekly work is the same, so pick the one you will enjoy and stick to.</div>` : ''}` : '')+`
       <div class="slab">What have you got to train with?</div>
       <div class="chips" style="margin-bottom:10px">${KIT_PRESETS.map(pre=>`<button class="${sameKit(onbDraft.kit,pre.kit)?'on':''}" data-onbkitpre="${pre.id}">${pre.t}</button>`).join('')}</div>
       <div class="chips">${KIT.map(k=>`<button class="${(onbDraft.kit||ALL_KIT).indexOf(k.id)>=0?'on':''}" data-onbkit="${k.id}">${k.t}</button>`).join('')}</div>
       <div class="note" style="margin-bottom:14px">${(onbDraft.kit||ALL_KIT).length? 'Every movement in your week will be something you can actually do. You can change this later and the plan follows.' : 'Pick at least one, or there is nothing to build a week out of.'}</div>
       <div class="note">${total>6? 'That is '+total+' days into six slots, so the last ones will not fit. Drop one.'
         : (total===0? 'Nothing scheduled. You can still log whatever you do.'
         : 'Six days to fill, plus your check in. '+(6-total)+' left as rest.')}</div>`;
  }
  if(step===2){
    const sex=onbDraft.sex||'';
    if(onbDraft.steps===undefined) onbDraft.steps=DEFAULT_STEPS;
    const stepsOk=validSteps(onbDraft.steps);
    const p=Object.assign({},S.profile,{sex,age:onbDraft.age,height:onbDraft.height,
      weight:onbDraft.weight,stepTarget:stepsOk? +onbDraft.steps : DEFAULT_STEPS,
      bodyFat:validBodyFat(onbDraft.bf)? +onbDraft.bf : null,
      liftDays:(onbDraft.liftDays===undefined||onbDraft.liftDays===null)
        ? (AIM_DEFAULTS[onbDraft.aim]||AIM_DEFAULTS.lose).lift : onbDraft.liftDays,
      detailsSet:true,__preview:true});
    const entered=sex&&onbDraft.age&&onbDraft.height&&onbDraft.weight;
    const teen=isTeen({age:onbDraft.age});
    const ready=entered&&plausibleBody(p)&&!teen;
    const pt=ready? plannedTdee(p) : null;
    const kcal=pt? pt.kcal : null, pro=ready? proteinOf(p) : null;
    /* what the goal weight would mean, worked out the same way the app will */
    const goal=+onbDraft.goal||null;
    /* Onboarding is always the planned figure, built from the numbers on this
       screen, so the preview forces that one maintenance rather than letting
       any older logged data in. */
    const pm= pt? Object.assign({source:'planned',label:'resting burn plus your step target and the sessions in your plan'},pt) : null;
    const preview= !ready? null : withProfile(p,()=>{
      const dir= goal? (goal<+p.weight-0.2?'lose':(goal>+p.weight+0.2?'gain':'hold'))
        : (onbDraft.aim==='lose'?'lose':(onbDraft.aim==='build'?'gain':'hold'));
      const ct=calorieTarget({dir,m:pm});
      return ct? Object.assign(ct,{split:stepSplit(ct,pm,p)}) : null;
    },{fresh:true,target: goal? {kind:'weight',value:goal,by:null,from:+p.weight} : null});
    b.innerHTML=`<h2>Your numbers.</h2>
      <p class="lead">Used for one thing: working out roughly what you burn in a day, so the calorie and protein targets are yours rather than somebody else's. Skip any of it and fill it in later.</p>
      <div class="slab">Sex</div>
      <div class="pair" style="margin-bottom:8px">
        <button class="big-pick ${sex==='f'?'on':''}" data-onbsex="f">Female</button>
        <button class="big-pick ${sex==='m'?'on':''}" data-onbsex="m">Male</button></div>
      <button class="big-pick ${sex==='x'?'on':''}" data-onbsex="x" style="width:100%">Rather not say</button>
      <div class="note" style="margin-top:6px">The resting burn equation differs by about 166 kcal between the two. Rather not say uses the average, which is less precise.</div>
      <div class="slab">You</div>
      <div class="twoup" style="gap:10px">
        <div class="nf"><label>Year you were born</label><input id="onbBorn" type="number" inputmode="numeric" min="${new Date().getFullYear()-110}" max="${new Date().getFullYear()}" value="${onbDraft.born||''}" placeholder="1990"></div>
        <div class="nf"><label>Height, cm</label><input id="onbHeight" type="number" inputmode="numeric" value="${onbDraft.height||''}" placeholder="178"></div></div>
      ${birthdayMatters(onbDraft.born)? `<div class="field" style="margin-top:10px"><div class="fl"><div class="k">Had your birthday yet this year?</div></div>
        <div class="chips"><button class="${onbDraft.bday&&onbDraft.bday.passed===true?'on':''}" data-onbbday="1">Yes</button><button class="${onbDraft.bday&&onbDraft.bday.passed===false?'on':''}" data-onbbday="0">Not yet</button></div></div>` : ''}
      <div class="twoup" style="gap:10px;margin-top:10px">
        <div class="nf"><label>${isTeen({age:onbDraft.age})?'Weight, kg (optional)':'Weight now, kg'}</label><input id="onbWeight" type="number" inputmode="decimal" step="0.1" value="${onbDraft.weight||''}" placeholder="82"></div>
        <div class="nf" style="${isTeen({age:onbDraft.age})?'display:none':''}"><label>Goal weight, kg</label><input id="onbGoal" type="number" inputmode="decimal" step="0.1" value="${onbDraft.goal||''}" placeholder="optional"></div></div>
      <div class="nf" style="margin-top:10px;${isTeen({age:onbDraft.age})?'display:none':''}"><label>Body fat %, if you know it</label>
        <input id="onbBf" type="number" inputmode="decimal" step="0.1" value="${onbDraft.bf||''}" placeholder="optional, from a scan or scale"></div>
      ${onbDraft.bf&&!validBodyFat(onbDraft.bf)? `<div class="warn" style="margin-top:8px">Body fat should be between 3 and 70%. Leave it blank and it will be estimated.</div>`:''}
      ${onbDraft.born&&String(onbDraft.born).length>=4&&!validBirthYear(onbDraft.born)? `<div class="warn" style="margin-top:10px">That year does not look right. Four digits, like 1990.</div>` : ''}
      ${tooYoung(onbDraft.age)? `<div class="warn" style="margin-top:10px">Gauntlet is for people aged 13 and over. A parent, PE teacher or coach is the best person to help with being active at your age.</div>`
        : isTeen({age:onbDraft.age})? `<div class="teencard">
            <b>You are under 18, so Gauntlet works a bit differently for you.</b>
            <span>No calorie targets, no diets, no weight goals. The research on teenagers is clear that those do more harm than good while you are still growing. Instead your plan is built around moving, getting stronger with good technique, sleep, eating regularly, and how you feel.</span>
            <span>Weight is optional here. Leave it blank if you would rather.</span>
            ${onbDraft.aim==='lose'? `<span>You picked losing fat, so your plan will focus on getting fitter and feeling better instead. That is what actually helps.</span>`:''}
          </div>`
        : (entered&&!ready? `<div class="warn" style="margin-top:10px">One of those does not look like a real number yet. Keep going.</div>`:'')}
      <div class="slab">Daily step target</div>
      <div class="nf"><label>Steps a day you are aiming for</label>
        <input id="onbSteps" type="number" inputmode="numeric" step="500" min="1000" max="40000" value="${onbDraft.steps||''}" placeholder="8000"></div>
      <div class="chips" style="margin-top:8px">${STEP_BANDS.map(b=>`<button class="${+onbDraft.steps===b.n?'on':''}" data-onbsteps="${b.n}">${num(b.n)}</button>`).join('')}</div>
      <div class="note">${stepsOk
        ? (()=>{ const b=STEP_BANDS.slice().reverse().find(x=>+onbDraft.steps>=x.n);
            return (b? b.t+' ('+b.s+'), one of the standard descriptive bands, not a health threshold. ' : 'Under 5,000 is described as sedentary. ')
              +'Count everything your phone or watch would, runs included. This sets your calories, so aim for what you will actually do rather than what you would like to do.'; })()
        : 'Somewhere between 1,000 and 40,000.'}</div>
      ${ready? `<div class="revday" style="margin-top:14px"><div class="revhead">What that gives you <span>an estimate</span></div>
        <div class="revrow" style="pointer-events:none"><div class="txt"><div class="t">${num(kcal)} kcal a day to stay where you are</div>
          <div class="s">Resting burn ${num(pt.rmr)}${sex==='x'?' (midpoint of the male and female equations)':''}, a sedentary day ${num(pt.base)}, plus ${num(pt.walk)} for ${num(pt.steps)} steps${pt.cardio?', '+num(pt.cardio)+' for cardio a step count misses':''} and ${num(pt.lift)} for your lifting. Each 1,000 steps is about ${pt.per1000} kcal for you. Replaced by your own numbers once you have logged about three weeks.</div></div></div>
        ${preview&&preview.dir!=='hold'? `<div class="revrow" style="pointer-events:none"><div class="txt"><div class="t">${num(preview.kcal)} kcal a day to eat</div>
          <div class="s">${calorieLine(preview)}</div></div></div>`:''}
        ${preview&&preview.split? `<div class="revrow" id="onbSplit" style="pointer-events:none"><div class="txt"><div class="t">${preview.dir==='lose'&&preview.split.deficit>0?'Where the deficit comes from':'What your steps are worth'}</div>
          <div class="s">${splitText(preview.split)}</div></div></div>`:''}
        <div class="revrow" style="pointer-events:none"><div class="txt"><div class="t">${pro}g protein a day</div>
          <div class="s">1.8g per kilo, mid range of what the research supports.</div></div></div></div>`
        : `<div class="note" style="margin-top:14px">Fill those in and I will show you what they work out to.</div>`}
      ${sex==='f'? `<div class="revday" style="margin-top:12px">
        <div class="revhead">Cycle tracking <span>optional</span></div>
        <div class="revrow" style="pointer-events:none"><div class="txt"><div class="s">It widens the weight forecast where fluid retention peaks, about half a kilo on average, so water is not read as fat. It never changes your training on its own.</div></div></div>
        <div class="pair" style="padding:12px">
          <button class="big-pick ${onbDraft.cycle?'on':''}" data-onbcycle="on">Track it</button>
          <button class="big-pick ${!onbDraft.cycle?'on':''}" data-onbcycle="off">Not for now</button></div>
        ${onbDraft.cycle? `<div style="padding:0 12px 14px"><div class="nf"><label>First day of your last period</label>
          <input id="onbPeriod" type="date" value="${onbDraft.lastPeriod||''}"></div></div>`:''}
      </div>`:''}`;
  }
  if(step===3){
    const saved={aim:S.profile.aim,checkinDay:S.profile.checkinDay,liftDays:S.profile.liftDays,cardioDays:S.profile.cardioDays};
    S.profile=Object.assign({},S.profile,{aim:onbDraft.aim,checkinDay:onbDraft.checkinDay,
      liftDays:onbDraft.liftDays,cardioDays:onbDraft.cardioDays});
    const week=weekPattern();
    S.profile=Object.assign({},S.profile,saved);
    if(onbDraft.runSwaps) Object.keys(onbDraft.runSwaps).forEach(i=>{ week[+i]=onbDraft.runSwaps[i]; });
    b.innerHTML=`<h2>Here is your week.</h2>
      <p class="lead">This is a starting point, not a prescription. It is built from what tends to work, but nobody knows your week, your body or your gym better than you do. Change anything: the session on a day, the movements in it, the sets and reps, or take a day out entirely.</p>
      ${week.map((code,i)=>{
        const d=slotFor(code), t=d.templateId? (S.templates||[]).find(x=>x.id===d.templateId):null;
        const r=d.runId? runPlan(d.runId):null;
        return `<div class="revday">
          <div class="revhead">${DAYS[i]} · ${dayLabel(d)} <span>${d.mins?d.mins+' min':''}</span></div>
          ${t? `<button class="revrow" data-onbedit="${t.id}"><div class="txt"><div class="t">Edit sets, reps and rest</div>
            <div class="s">Or add and remove movements</div></div><span class="chg">Edit</span></button>`+
          t.ex.map(row=>`<button class="revrow" data-onbswap="${row.exId}">
              <div class="txt"><div class="t">${exOf(row.exId).n}</div>
                <div class="s">${repText(row)}${showTempo()?' · tempo '+(row.tempo||tempoOf(row.exId)):''} · rest ${row.rest}s</div>
                ${showTempo()&&tempoMatters(row.tempo||tempoOf(row.exId))?`<div class="s" style="color:var(--burnt)">${tempoWords(row.tempo||tempoOf(row.exId))}</div>`:''}</div>
              <span class="chg">Change</span></button>`).join('')
            : r? `<div class="revrow" style="pointer-events:none;background:var(--canvas)"><div class="txt"><div class="t">${r.sub}</div></div></div>
                ${r.steps.map(st=>`<div class="revrow" style="pointer-events:none">
                  <div class="txt"><div class="t">${st.n}</div><div class="s">${st.r}</div></div></div>`).join('')}
                <div class="revrow" style="background:var(--canvas)"><div class="txt"><div class="s">${r.why}</div></div></div>
                `
            : d.circuitId? `<div class="revrow" style="pointer-events:none;background:var(--canvas)"><div class="txt"><div class="t">${circuitOf(d.circuitId).sub}</div>
                  <div class="s">${circuitOf(d.circuitId).why}</div></div></div>
                ${(circuitOf(d.circuitId).items||[]).map(it=>`<div class="revrow" style="pointer-events:none">
                  <div class="txt"><div class="t">${it.label}</div><div class="s">${it.sub||it.t}</div></div></div>`).join('')}`
            : `<div class="revrow"><div class="txt"><div class="s">${
                code==='walk'? 'Counted by your tracker. Nothing to press.' :
                code==='cook'? 'Cook something with protein in it.' :
                code==='rest'? 'Nothing owed. Rest is part of it.' :
                'Two minutes. Next week is built from it.'}</div></div></div>`}
          ${code==='checkin'? '' : `<button class="revrow" data-onbrun="${i}:${code}"><div class="txt"><div class="t">Change this day</div>
              <div class="s">A different session, a walk, or nothing</div></div><span class="chg">Change</span></button>`}
        </div>`}).join('')}
      <button class="logrow" id="tempoHelp" style="border-top:1px solid var(--line-soft)">
        <div class="txt"><div class="t">What do the four numbers mean?</div>
          <div class="s">Tempo, and why it is there</div></div></button>
      ${((S.profile.excluded)||[]).length?`<div class="note">Taken out: ${S.profile.excluded.map(id=>exOf(id).n).join(', ')}. They will not appear in any day.</div>`:''}`;
  }
  if(step===4){
    b.innerHTML=`<h2>When suits for a check in?</h2><p class="lead">Once a week, two minutes, and it is what rebuilds your plan. Pick the day you are most likely to actually do it.</p>`+
      DAYS.map((d,i)=>`<button class="opt ${onbDraft.checkinDay===i?'on':''}" data-onbday="${i}">
        <div class="txt"><div class="t">${d}</div><div class="s">${i===5||i===6?'weekend, quieter':'midweek, before things slip'}</div></div><div class="rad"></div></button>`).join('');
  }
  if(step===5&&!canHaveAccount({age:onbDraft.age})){
    b.innerHTML=`<h2>Kept on this phone</h2><p class="lead">Under 16, an account needs a parent or guardian to agree to it, so everything you log stays on this phone and nowhere else. You can add an account when you turn 16, and nothing will be lost.</p>`;
    onbDraft.email=''; $('onbNext').textContent='Build my week';
    return;
  }
  /* The last step (build 53): back up without an email. Two separate,
     unticked consents, and an account is made silently once both are given.
     Skipping keeps everything on this phone, and the app works the same. An
     email comes later, prompted after the first logged session. */
  if(step===5){
    const CL=window.__CLOUD;
    if(!onbDraft.agree) onbDraft.agree={health:false,terms:false};
    if(CL&&CL.signedIn()&&CL.hasConsent()){
      b.innerHTML=`<h2>Already backed up.</h2><p class="lead">You signed in earlier, so everything you set up here is backed up already.</p>`;
    } else {
      b.innerHTML=`<h2>Keep it safe?</h2><p class="lead">Your week is on this phone. Back it up as well and it survives a lost phone or a cleared browser. No email, no password. You can add an email later to use it on another phone.</p>
        ${CL&&CL.consentHTML? CL.consentHTML('onb',onbDraft.agree) : ''}
        <button class="skipbtn" id="onbSkipBackup" style="margin-top:12px">Not now. Keep it on this phone only</button>`;
      b.querySelectorAll('#onbHealth,#onbTerms').forEach(x=>x.addEventListener('change',()=>{
        onbDraft.agree={health:!!($('onbHealth')||{}).checked,terms:!!($('onbTerms')||{}).checked}; onbCta(); }));
    }
  }
  $('onbNext').textContent = step===stepCount()-1
    ? (step===5? onbAccountLabel() : 'Build my week')
    : (step===0? 'Claim it' : (step===3? 'Looks good' : 'Next'));
  onbCta();
}
const onbBackedUp=()=>{ const CL=window.__CLOUD; return !!(CL&&CL.signedIn()&&CL.hasConsent()); };
const onbAccountLabel=()=>onbBackedUp()? 'Start' : 'Back up and start';
function onbCta(){
  $('onbNext').disabled = (step===0 && onbDraft.handle.length<3) || tooYoung(onbDraft.age);
  if(step===5&&canHaveAccount({age:onbDraft.age})){
    $('onbNext').textContent = onbAccountLabel();
    const ag=onbDraft.agree||{};
    $('onbNext').disabled = !onbBackedUp()&&!(ag.health&&ag.terms);
  }
  if(step===2) $('onbNext').disabled = (!onbDraft.sex&&!isTeen({age:onbDraft.age})) || tooYoung(onbDraft.age) || (!isTeen({age:onbDraft.age})&&!onbDraft.age)
    || (birthdayMatters(onbDraft.born)&&!(onbDraft.bday&&onbDraft.bday.y===new Date().getFullYear()));
  if(step===1) $('onbNext').disabled = (onbDraft.liftDays+onbDraft.cardioDays)>6
    || !(onbDraft.kit&&onbDraft.kit.length);
}
/* Grouped, because a list of nineteen sessions is no use. */
function cardioGroups(){
  const out=[];
  Object.keys(CARDIO_KINDS).forEach(k=>{
    const list=(S.runPlans||[]).filter(r=>(r.kind||'run')===k);
    if(list.length) out.push([CARDIO_KINDS[k],list]);
  });
  const rest=(S.runPlans||[]).filter(r=>!CARDIO_KINDS[r.kind||'run']);
  if(rest.length) out.push(['Other',rest]);
  return out;
}
function openRunSwap(dayIndex,current){
  const row=(id,title,sub)=>{
    const why=(typeof suggestFor==='function')? suggestFor(id) : '';
    return `<button class="logrow" data-runpick="${dayIndex}:${id}">
      <div class="txt"><div class="t">${title}${id===current?' · current':''}</div><div class="s">${sub}</div>
      ${why?`<div class="why-row">${why}</div>`:''}</div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#737373" stroke-width="2.2" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg></button>`;};
  document.getElementById('altTitle').textContent='What is on '+(DAYS[dayIndex]||'this day')+'?';
  document.getElementById('altSub').textContent='Anything can go on any day. Most of a running week should be easy, with one harder session and one longer one.';
  document.getElementById('altBody').innerHTML=
    `<div class="slab" style="padding:0 14px">Lifting</div>`+
    (S.templates||[]).map(t=>row(t.id,t.name+' day',t.ex.length+' movements')).join('')+
    cardioGroups().map(([label,list])=>`<div class="slab" style="padding:0 14px">${label}</div>`+
      list.map(r=>row(r.id,r.name,r.sub+' · about '+r.mins+' min')).join('')).join('')+
    ((S.circuits||[]).length? `<div class="slab" style="padding:0 14px">Circuits</div>`+
      (S.circuits||[]).map(c=>row(c.id,c.name,c.sub+' · about '+c.mins+' min')).join('') : '')+
    `<div class="slab" style="padding:0 14px">Or nothing much</div>`+
    row('walk','Walk','Counted by your tracker, nothing to press')+
    row('cook','Cook','Something with protein in it')+
    row('rest','Rest','Nothing owed that day');
  openSheet('altSheet');
}
document.addEventListener('click',e=>{
  const rp=e.target.closest('[data-runpick]'); if(!rp) return;
  const [i,code]=rp.dataset.runpick.split(':');
  if(S.plan&&S.plan.days[+i]) S.plan.days[+i]=Object.assign(slotFor(code),{dow:+i,checkin:!!S.plan.days[+i].checkin});
  if(onbDraft&&typeof onbDraft==='object'){ onbDraft.runSwaps=onbDraft.runSwaps||{}; onbDraft.runSwaps[i]=code; }
  save(); closeSheets();
  if(document.getElementById('onb').classList.contains('on')) onbRender(); else renderAll();
  toast(DAYS[+i]+' is now '+dayLabel(slotFor(code)));
});
/* Changing the kit later refits the templates and says what moved. */
function openKitSheet(){
  const cur=kitOf();
  document.getElementById('altTitle').textContent='What you train with';
  document.getElementById('altSub').textContent='Every movement in your plan will be something you can actually do with this.';
  document.getElementById('altBody').innerHTML=
    `<div style="padding:0 14px 6px">
      <div class="chips" style="margin-bottom:10px">${KIT_PRESETS.map(pre=>`<button class="${sameKit(cur,pre.kit)?'on':''}" data-kitpre="${pre.id}">${pre.t}</button>`).join('')}</div>
      ${KIT.map(k=>`<button class="opt ${cur.indexOf(k.id)>=0?'on':''}" data-kit="${k.id}">
        <div class="txt"><div class="t">${k.t}</div>${k.s?`<div class="s">${k.s}</div>`:''}</div><div class="rad"></div></button>`).join('')}
      <div class="note">Anything your templates use that this does not cover gets swapped for the nearest movement that trains the same pattern. Nothing is deleted.</div>
    </div>`;
  openSheet('altSheet');
}
document.addEventListener('click',e=>{
  if(e.target.closest('#kitBtn')) openKitSheet();
  const kp=e.target.closest('[data-kitpre]');
  if(kp){ const pre=KIT_PRESETS.find(x=>x.id===kp.dataset.kitpre);
    if(pre){ S.profile.kit=pre.kit.slice(); save(); applyKitChange(); } }
  const kb=e.target.closest('[data-kit]');
  if(kb){ const id=kb.dataset.kit, cur=kitOf().slice();
    const next = cur.indexOf(id)>=0? cur.filter(x=>x!==id) : cur.concat([id]);
    if(!next.length){ toast('Keep at least one, or there is nothing to build a week from'); return; }
    S.profile.kit=next; save(); applyKitChange(); }
});
function applyKitChange(){
  /* Refitting rewrites somebody's templates, so it is undoable in full. */
  const beforeKit=JSON.parse(JSON.stringify({templates:S.templates,plan:S.plan,goal:S.goal}));
  const swapped = typeof fitTemplatesToKit==='function'? fitTemplatesToKit() : [];
  buildPlan(); save(); openKitSheet(); renderAll();
  if(swapped.length) toast(
    swapped.length+' movement'+(swapped.length>1?'s':'')+' swapped, starting with '+swapped[0][0]+' to '+swapped[0][1],
    'Undo',()=>{ S.templates=beforeKit.templates; S.plan=beforeKit.plan; S.goal=beforeKit.goal;
      save(); renderAll(); toast('Templates put back'); });
}
function openDeloadSheet(){
  const every=+S.profile.deloadEvery||DELOAD_EVERY, off=S.profile.deload===false;
  const T=deloadTier(), depth=S.profile.deloadDepth||'auto';
  const weeks=deloadSchedule(10).filter(r=>r.wk>=mondayKey()).slice(0,10);
  const nx=nextDeload();
  document.getElementById('altTitle').textContent='Easy weeks';
  document.getElementById('altSub').textContent='A scheduled step back, so the hard weeks have somewhere to go.';
  document.getElementById('altBody').innerHTML=`
    <div style="padding:0 14px 6px">
      <div class="slab">The next ten weeks</div>
      <div class="note" style="margin-top:0">Tap a week to make it easy or put it back to normal. Changing one moves the ones after it, because the count starts again from your last easy week.</div>
      ${weeks.map(r=>{
        const isNow=r.wk===mondayKey();
        const label=r.kind==='deload'? (r.why==='added'?'easy, added by you':'easy, scheduled') : (r.why==='skipped'?'skipped, back to normal':'normal');
        return `<button class="dlweek" data-dlweek="${r.wk}">
          <div class="d"><b>${isNow?'This week':'Week of '+prettyDate(r.wk)}</b><span>${label}</span></div>
          <span class="tag ${r.kind==='deload'?'on':''}">${r.kind==='deload'?'Easy':'Normal'}</span></button>`;
      }).join('')}

      <div class="slab">How often</div>
      <div class="chips">${DELOAD_RANGE.map(n=>`<button class="${!off&&every===n?'on':''}" data-deload="${n}">Every ${n}${n===DELOAD_EVERY?' ·':''}</button>`).join('')}
        <button class="${off?'on':''}" data-deload="off">Only when I add one</button></div>
      <div class="note">${off? 'Nothing is scheduled. Any week you tap above still becomes an easy week.'
        : 'An easy week every '+every+' weeks'+(nx?', next on '+prettyDate(nx):'')+'.'}</div>

      <div class="slab">How easy</div>
      <div class="chips">
        <button class="${depth==='auto'?'on':''}" data-dldepth="auto">From my check in</button>
        ${Object.keys(DELOAD_TIERS).map(k=>`<button class="${depth===k?'on':''}" data-dldepth="${k}">${DELOAD_TIERS[k].t}</button>`).join('')}</div>
      <div class="note">${depth==='auto'? 'Right now that is '+T.t.toLowerCase()+': ' : ''}${T.band} less work than a normal week, about 10% lighter on the bar${T.dropAccessories?', and the accessory work comes out':''}.</div>

      <div class="slab">Where these numbers come from</div>
      <div class="method"><b>How often</b><span>Planned deloads usually sit every 4 to 8 weeks and last about a week (Bell and colleagues, Strength and Conditioning Journal, 2025). In a survey of 246 competitive strength and physique athletes the typical gap was about every five and a half weeks (Rogerson and colleagues, Sports Medicine Open, 2024). Six is the default here because it is the middle of that range and closest to what people who lift for sport actually do.</span></div>
      <div class="method"><b>Why not more often</b><span>In a 2024 trial, a week off at the midpoint of a nine-week block made no difference to muscle growth, but the group that trained straight through gained a little more strength (Coleman and colleagues, PeerJ). That week was no training at all rather than a lighter one, and the same researchers describe a planned deload as a checkpoint, not a compulsion. If you feel good when one comes round, skipping it is a reasonable call.</span></div>
      <div class="method"><b>What changes in the week</b><span>One step down at the start of the week. Same days, same movements. About 10% lighter, and 25 to 45%, 40 to 60% or 60 to 90% less work depending on how recovered you are. That is the 2025 recommendation, applied as written.</span></div>
      <div class="method"><b>What does not change</b><span>Your working weights. Easy-week sessions stay on your record, marked, but nothing uses them to decide what you lift next. The week after picks up from where the week before left off.</span></div>
    </div>`;
  openSheet('altSheet');
}
document.addEventListener('click',e=>{
  if(e.target.closest('#deloadBtn')||e.target.closest('#planDeload')) { openDeloadSheet(); return; }
  const dw=e.target.closest('[data-dlweek]');
  if(dw){
    const wk=dw.dataset.dlweek, now=deloadInfo(wk), marks=deloadMarks();
    const beforeMarks=JSON.parse(JSON.stringify(marks));
    /* flip the week: an easy week becomes a normal one and the other way round,
       and a mark that only restates what the schedule would do anyway is removed */
    if(now.kind==='deload'){ setDeloadMark(wk, now.why==='added'? null : 'skipped'); }
    else { setDeloadMark(wk, now.why==='skipped'? null : 'added'); }
    if(deloadInfo(wk).kind===now.kind) setDeloadMark(wk, now.kind==='deload'? 'skipped' : 'added');
    buildPlan(); save(); openDeloadSheet(); renderAll();
    toast((wk===mondayKey()?'This week':'Week of '+prettyDate(wk))+' is now '+(deloadDue(wk)?'an easy week':'a normal week'),
      'Undo',()=>{ S.deloadWeeks=beforeMarks; buildPlan(); save(); renderAll(); });
    return; }
  const dl=e.target.closest('[data-deload]');
  if(dl){ const v=dl.dataset.deload;
    if(v==='off') S.profile.deload=false; else { S.profile.deload=true; S.profile.deloadEvery=+v; }
    buildPlan(); save(); openDeloadSheet(); renderAll();
    toast(v==='off'? 'Only the easy weeks you add' : 'An easy week every '+v+' weeks'); return; }
  const dd=e.target.closest('[data-dldepth]');
  if(dd){ const v=dd.dataset.dldepth;
    S.profile.deloadDepth = v==='auto'? null : v;
    buildPlan(); save(); openDeloadSheet(); renderAll();
    toast(v==='auto'? 'Depth follows your check in' : DELOAD_TIERS[v].t+' easy weeks'); return; }
});
let targetDraft={kind:'weight',weeks:12,exId:null};
/* Works the target out exactly as saving it would, without saving it. */
function targetKcalPreview(){
  const el=document.getElementById('targetValue');
  const v=+(el&&el.value || (S.target&&S.target.kind==='weight'? S.target.value : 0));
  if(!v) return 'Put a weight in and this shows the calories it takes to get there.';
  const t={kind:'weight',value:v,by:addDays(todayKey(),targetDraft.weeks*7),hit:null};
  const kg=currentKg();
  const dir=v<kg-0.2?'lose':(v>kg+0.2?'gain':'hold');
  const ct=calorieTarget({dir,target:t});
  return ct? calorieLine(ct) : 'Add your age, height and weight in You first, so there is something to work from.';
}
function openTargetSheet(){
  const cur=S.target;
  targetDraft={kind:cur?cur.kind:(S.profile.aim==='endure'?'runkm':'weight'),
    weeks:12, exId:cur?cur.exId:null};
  drawTargetSheet(); openSheet('altSheet');
}
function drawTargetSheet(){
  const k=targetDraft.kind, now=(()=>{ const save_=S.target; S.target={kind:k,exId:targetDraft.exId};
    const v=targetNow(); S.target=save_; return v; })();
  const by=addDays(todayKey(),targetDraft.weeks*7);
  document.getElementById('altTitle').textContent='What are you actually after?';
  document.getElementById('altSub').textContent='A number and a date. Everything else in here already knows how to count.';
  document.getElementById('altBody').innerHTML=`
    <div style="padding:0 14px 6px">
      <div class="slab">What kind</div>
      <div class="chips">${Object.keys(TARGET_KINDS).map(id=>`<button class="${k===id?'on':''}" data-targetkind="${id}">${TARGET_KINDS[id].t}</button>`).join('')}</div>
      <div class="nf" style="margin:12px 0 10px"><label>${TARGET_KINDS[k].t} of</label>
        <input id="targetValue" type="number" inputmode="decimal" step="0.1"
          value="${S.target&&S.target.kind===k? S.target.value : ''}"
          placeholder="${now!==null? now : ''}"></div>
      <div class="slab">By when</div>
      <div class="chips">${[6,12,16,26,52].map(n=>`<button class="${targetDraft.weeks===n?'on':''}" data-targetweeks="${n}">${n} weeks</button>`).join('')}</div>
      <div class="note">${now!==null? 'Right now that reads '+now+' '+TARGET_KINDS[k].unit+'. ' : 'Nothing logged against this yet. '}That would put the date at ${prettyDate(by)}.</div>
      ${k==='weight'? `<div class="method" id="targetKcal"><b>What that means for food</b><span>${targetKcalPreview()}</span></div>` : ''}
      <button class="sheetcta" id="targetSave">Set it</button>
      ${S.target? `<button class="skipbtn" id="targetClear">Take the target off</button>`:''}
    </div>`;
}
/* One habit on its own: how it is going, tick or untick today, or remove it.
   Removing used to mean finding the picker and a button that said "Put this
   one down for now" without saying which one. */
/* Pick a focus, see exactly what it means, and choose whether your templates
   follow. Nothing changes silently: templates only move if asked, with Undo. */
function openFocusSheet(){
  const cur=liftFocus(), fromAim=!S.profile.liftFocus;
  const off=(S.templates||[]).reduce((a,t)=>a+t.ex.filter(r=>!rowMatches(r,cur)).length,0);
  document.getElementById('altTitle').textContent='Lifting focus';
  document.getElementById('altSub').textContent='How many reps, how heavy and how long to rest, set by what you are after.';
  document.getElementById('altBody').innerHTML=`<div style="padding:0 14px 6px">
    ${Object.keys(LIFT_FOCUS).map(k=>{ const f=LIFT_FOCUS[k];
      return `<button class="opt ${cur===k?'on':''}" data-focus="${k}">
        <div class="txt"><div class="t">${f.t}${AIM_FOCUS[S.profile.aim]===k?' <span class="cichip">your aim</span>':''}</div>
        <div class="s">${f.s}. Big lifts ${f.rx.heavy.repMin} to ${f.rx.heavy.reps}, smaller ones ${f.rx.isolation.repMin} to ${f.rx.isolation.reps}.</div></div><div class="rad"></div></button>`; }).join('')}
    ${fromAim? '' : `<button class="skipbtn" data-focus="aim">Follow my aim instead</button>`}
    ${off? `<div class="method" style="margin-top:10px"><b>${off} movement${off>1?'s':''} in your templates ${off>1?'are':'is'} set differently</b>
      <span>Either you changed them, or they were set before this focus. Your changes are kept unless you ask.</span></div>
      <button class="sheetcta" id="focusApply" style="margin:0;width:100%">Set my templates to ${LIFT_FOCUS[cur].t.toLowerCase()}</button>` 
      : `<div class="note" style="margin-top:10px">Your templates already match this focus.</div>`}
    <div class="note">${LIFT_FOCUS[cur].effort}</div>
  </div>`;
  openSheet('altSheet');
}
document.addEventListener('click',e=>{
  const fb=e.target.closest('[data-focus]');
  if(fb){ const v=fb.dataset.focus;
    S.profile.liftFocus= v==='aim'? null : v; save(); openFocusSheet(); renderAll();
    toast('Lifting focus: '+LIFT_FOCUS[liftFocus()].t.toLowerCase()); return; }
  if(e.target.closest('#focusApply')){
    const r=applyFocusToTemplates(liftFocus());
    buildPlan(); save(); closeSheets(); renderAll();
    toast(r.changed+' movement'+(r.changed===1?'':'s')+' updated','Undo',()=>{ S.templates=r.snap; buildPlan(); save(); renderAll(); });
    return; }
});
const hyroxMixDraft=()=>{ const n=onbDraft.liftDays||2, h=onbDraft.hyroxDays; return Math.max(1,Math.min(n-1,(h===undefined||h===null)? Math.ceil(n/2) : +h)); };
function openStyleSheet(){
  const cur=styleOf(), n=sessionsWanted(), h=hyroxDaysOf(n);
  document.getElementById('altTitle').textContent='Training style';
  document.getElementById('altSub').textContent='Changing it rebuilds this week from today. Your history carries across.';
  document.getElementById('altBody').innerHTML=`<div style="padding:0 14px 10px">
    ${Object.keys(STYLES).map(id=>`<button class="opt ${cur===id?'on':''}" data-setstyle="${id}"><div class="txt"><div class="t">${STYLES[id].t}</div><div class="s">${STYLES[id].s}</div></div><div class="rad"></div></button>`).join('')}
    ${cur==='hifb'? `<button class="inlinebtn" data-hifbwhy="1" style="margin-top:8px">How HIFB works, and the evidence</button>` : ''}
    ${cur==='hybrid'&&n>=2? `<div class="field" style="margin-top:10px"><div class="fl"><div class="k">HYROX days in the mix</div><div class="v">${h} HYROX, ${n-h} CrossFit</div></div>
      <div class="chips">${Array.from({length:n-1},(_,i)=>i+1).map(k=>`<button class="${h===k?'on':''}" data-sethx="${k}">${k}</button>`).join('')}</div></div>` : ''}
  </div>`;
  openSheet('altSheet');
}
document.addEventListener('click',e=>{
  const s=e.target.closest('[data-setstyle]');
  if(s){ S.profile.style=s.dataset.setstyle; if(S.profile.style!=='gym'&&sessionsWanted()<2){ S.profile.liftDays=3; }
    if(S.profile.style==='hifb'&&!S.profile.hifbSet){ S.profile.liftDays=4; S.profile.cardioDays=0; S.profile.hifbSet=true; }
    S.styleWeek=null; S.plan=buildPlan(); save(); renderAll();
    if(S.profile.style==='hybrid') openStyleSheet(); else closeSheets();
    toast('Training style: '+STYLES[styleOf()].t+'. This week has been rebuilt.'); return; }
  const hx=e.target.closest('[data-sethx]');
  if(hx){ S.profile.hyroxDays=+hx.dataset.sethx; S.styleWeek=null; S.plan=buildPlan(); save(); renderAll(); openStyleSheet();
    toast(hyroxDaysOf(sessionsWanted())+' HYROX and '+(sessionsWanted()-hyroxDaysOf(sessionsWanted()))+' CrossFit this week'); }
});
function openSplitSheet(){
  const days=dayCounts().lift, cur=(S.profile&&S.profile.split)||null;
  document.getElementById('altTitle').textContent='Training split';
  document.getElementById('altSub').textContent='Full body and splits build strength and muscle equally when the weekly work matches (Ramos-Campo and colleagues, 2024). Pick the one you will stick to.';
  document.getElementById('altBody').innerHTML=`<div style="padding:0 14px 10px">${Object.keys(SPLITS).map(id=>`
    <button class="opt ${cur===id?'on':''}" data-split="${id}"><div class="txt"><div class="t">${SPLITS[id].t}</div>
      <div class="s">${id==='auto'? 'For your '+days+' day'+(days===1?'':'s')+': '+SPLITS[autoSplit(days)].t.toLowerCase() : SPLITS[id].s+'. '+splitFit(id,days)}</div></div><div class="rad"></div></button>`).join('')}
    <div class="note">Changing it rebuilds this week from today. Your history and weights carry across, because progress is tracked per movement.</div></div>`;
  openSheet('altSheet');
}
document.addEventListener('click',e=>{
  const sb=e.target.closest('[data-split]'); if(!sb) return;
  S.profile.split=sb.dataset.split; S.plan=buildPlan(); save(); closeSheets(); renderAll();
  toast('Split: '+SPLITS[sb.dataset.split].t+'. This week has been rebuilt.');
});
/* The pace is theirs to choose, inside the range the research supports. Each
   option says what it means and who the evidence came from. */
function openPaceSheet(){
  const cur=(S.profile&&S.profile.pace)||'standard', dir=goalDirection();
  const rows=[
    ['gentle','Gentle', dir==='gain'? '0.25% of your weight a week' : '0.5% of your weight a week', 'Easiest to keep up, and the most muscle kept.'],
    ['standard','Standard', dir==='gain'? 'about 0.375% a week' : '0.75% a week', 'The middle of the range.'],
    ['faster','Faster', dir==='gain'? '0.5% a week' : '1% a week', 'Quicker, and harder to sustain. Worth it for a short, fixed stretch.']];
  document.getElementById('altTitle').textContent='Pace';
  document.getElementById('altSub').textContent= dir==='gain'
    ? 'These come from research on bodybuilders in the off-season. They are sensible defaults, not rules for everyone.'
    : 'These come from research on natural bodybuilders preparing for competition. They are sensible defaults, not rules for everyone, and there is still a deficit cap and a calorie floor underneath.';
  document.getElementById('altBody').innerHTML=`<div style="padding:0 14px 8px">${rows.map(([id,t,rate,why])=>`
    <button class="opt ${cur===id?'on':''}" data-pace="${id}"><div class="txt"><div class="t">${t} · ${rate}</div><div class="s">${why}</div></div><div class="rad"></div></button>`).join('')}</div>`;
  openSheet('altSheet');
}
document.addEventListener('click',e=>{
  const pc=e.target.closest('[data-pace]');
  if(pc){ S.profile.pace=pc.dataset.pace; S.targets=ownTargets(); save(); closeSheets(); renderAll();
    toast('Pace: '+PACE[pc.dataset.pace].label+'. Your calorie target has been updated.'); }
});
/* ---------- pain (Review P1-11) ----------
   The pain-monitoring model (Silbernagel and colleagues, 2007, a randomised
   trial in Achilles tendon pain) let people keep training with pain up to 5
   out of 10 during and after, provided it settled by the next morning and did
   not climb week to week; they did as well as those who rested. Physios use
   it widely as a guide for training with an ache, though it was tested in
   tendon pain, and the app says so. Red flags are not monitored: they stop
   the movement and point to a GP or physio. Nothing here diagnoses. */
const PAIN_FLAGS=[['sharp','Sharp or sudden pain, or a pop'],['swell','Swelling or bruising'],
  ['nerve','Numbness, tingling or weakness'],['knock','It started with a fall, knock or twist'],
  ['rest','It hurts at rest or wakes you at night']];
let painDraft=null;
function painAdvice(level,flags){
  if(flags&&flags.length) return {code:'check',t:'Stop this movement today, and get it checked',
    s:'With '+(flags.length>1?'those':'that')+', this is one for a GP or physio before you load it again, rather than something to train through.'};
  if(level>=6) return {code:'swap',t:'Stop this one for today',
    s:'Above 5 out of 10 is past what the pain-monitoring guidance allows. Swap to something that does not hurt, or leave it out.'};
  if(level>=4) return {code:'ease',t:'You can carry on, lighter',
    s:'Up to 5 out of 10 is generally fine to train with if it settles by tomorrow morning and does not build week to week. Drop the weight a step, and stop if it climbs.'};
  return {code:'ok',t:'Carry on',s:'Mild and steady is usually fine. Keep an eye on it, and stop if it climbs.'};
}
function openPainCheck(i){
  const e=GYM.ex[i]; if(!e) return;
  painDraft={i,exId:e.exId,level:null,flags:[]};
  const alt=painAlternative(exOf(e.exId).n);
  document.getElementById('altTitle').textContent=exOf(e.exId).n+' hurts';
  document.getElementById('altSub').textContent='How bad is it right now, and do any of these apply?';
  document.getElementById('altBody').innerHTML=`<div style="padding:0 14px 10px">
    <div class="field"><div class="fl"><div class="k">Pain, 0 to 10</div><div class="v" id="painOut">not answered</div></div>
      <input type="range" min="0" max="10" step="1" value="3" class="unset" id="painRange" aria-label="Pain from 0 to 10"></div>
    <div class="slab" style="margin-top:10px">Any of these?</div>
    ${PAIN_FLAGS.map(([k,l])=>`<label class="flagrow"><input type="checkbox" data-painflag="${k}"> <span>${l}</span></label>`).join('')}
    <div id="painResult" class="painresult" role="status"></div>
    <div class="note">The 0 to 10 guide comes from research on training with tendon pain. It is a guide, not a diagnosis.</div>
  </div>`;
  drawPainResult(alt);
  openSheet('altSheet');
}
function drawPainResult(alt){
  const box=document.getElementById('painResult'); if(!box||!painDraft) return;
  if(painDraft.level===null&&!painDraft.flags.length){ box.innerHTML=''; return; }
  const a=painAdvice(painDraft.level||0,painDraft.flags);
  const x=exOf(painDraft.exId), al=alt||painAlternative(x.n);
  box.className='painresult pr-'+a.code;
  box.innerHTML=`<b>${a.t}</b><span>${a.s}</span>
    <div class="painbtns">
      ${a.code==='ease'? `<button class="mini go" data-painact="lighter">Carry on lighter</button>` : ''}
      ${a.code==='ok'? `<button class="mini go" data-painact="carry">Carry on</button>` : ''}
      ${(a.code==='swap'||a.code==='ease')&&al? `<button class="mini" data-painact="swap">Swap to ${escHabit(al.n)}</button>` : ''}
      ${a.code!=='ok'? `<button class="mini" data-painact="drop">Take it out of today</button>` : ''}
    </div>
    ${(a.code==='swap'||a.code==='ease')&&al? `<div class="note" style="margin-top:6px">${escHabit(al.n)} works the same muscles a different way. That often avoids the ache, but it is not a guarantee for an injury.</div>` : ''}`;
}
function recordPain(outcome){
  S.painLog=Array.isArray(S.painLog)? S.painLog : [];
  S.painLog.unshift({exId:painDraft.exId,d:todayKey(),during:painDraft.level||0,flags:painDraft.flags.slice(),outcome,morning:null});
  S.painLog=S.painLog.slice(0,60); save();
}
document.addEventListener('input',e=>{
  if(e.target.id==='painRange'&&painDraft){ painDraft.level=+e.target.value; e.target.classList.remove('unset');
    document.getElementById('painOut').textContent=painDraft.level+' / 10'; drawPainResult(); }
});
document.addEventListener('change',e=>{
  const f=e.target.closest&&e.target.closest('[data-painflag]');
  if(f&&painDraft){ const k=f.dataset.painflag; painDraft.flags=painDraft.flags.filter(x=>x!==k); if(f.checked) painDraft.flags.push(k); drawPainResult(); }
  if(e.target.id==='painRange'&&painDraft&&painDraft.level===null){ painDraft.level=+e.target.value; e.target.classList.remove('unset');
    document.getElementById('painOut').textContent=painDraft.level+' / 10'; drawPainResult(); }
});
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-painact]'); if(!b||!painDraft||!GYM) return;
  const act=b.dataset.painact, i=painDraft.i, ex=GYM.ex[i];
  recordPain(act);
  if(act==='lighter'){ const inc=incrementFor(ex.exId)||2.5;
    ex.sets.forEach(s=>{ if(!s.done&&!s.warm&&+s.kg) s.kg=Math.max(0,+(+s.kg-inc).toFixed(2)); }); }
  if(act==='swap'){ const al=painAlternative(exOf(ex.exId).n);
    if(al){ const fresh=newExEntry({exId:al.id,sets:ex.sets.filter(s=>!s.warm).length||3,reps:ex.reps,repMin:ex.repMin,rest:ex.rest,group:ex.group});
      GYM.ex[i]=fresh; } }
  if(act==='drop'){ GYM.ex.splice(i,1); normaliseGroups(GYM.ex); }
  const name=exOf(painDraft.exId).n; painDraft=null;
  closeSheets(); drawGym();
  toast(act==='carry'? 'Noted. You will be asked how it feels tomorrow morning.' : (act==='lighter'? 'Lighter for the rest of this one. You will be asked tomorrow morning.' : (act==='swap'? name+' swapped for today' : name+' taken out of today')));
});
/* the morning after */
function painMorningDue(){
  const y=addDays(todayKey(),-1), t2=addDays(todayKey(),-2);
  return (S.painLog||[]).map((p,idx)=>Object.assign({idx},p)).filter(p=>(p.d===y||p.d===t2)&&p.morning===null&&!(p.flags&&p.flags.length));
}
function painPattern(exId){
  const recent=(S.painLog||[]).filter(p=>p.exId===exId&&gapDays(p.d)<=21);
  const unsettled=recent.filter(p=>p.morning==='worse'||p.morning==='still');
  return {count:recent.length,unsettled:unsettled.length};
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-painmorning]'); if(!b) return;
  const [idx,state]=b.dataset.painmorning.split(':'); const p=(S.painLog||[])[+idx]; if(!p) return;
  p.morning=state; save(); renderAll();
  const pat=painPattern(p.exId), name=exOf(p.exId).n;
  toast(state==='settled'? 'Good. Carry on as normal.' : (pat.unsettled>=2? name+' has not settled twice now. Worth seeing a physio.' : 'Not settled, so go lighter or swap it next time.'));
});
function openHabitOne(slot){
  const h=currentHabit(slot); if(!h) return;
  const meta=habitOf(h.id), week=habitWeek(slot), today=week[week.length-1], stop=meta.kind==='stop';
  const streak=habitStreak(slot), kept=Object.keys(h.days||{}).length;
  document.getElementById('altTitle').textContent=(stop?'Stop: ':'')+meta.t;
  document.getElementById('altSub').textContent='Since '+prettyDate(h.started)+'. '
    +(stop? streak+' day'+(streak===1?'':'s')+' without in a row, '+kept+' in all.'
          : streak+' day'+(streak===1?'':'s')+' running, '+kept+' in all.');
  document.getElementById('altBody').innerHTML=`<div style="padding:0 14px 6px">
    ${today.off? `<div class="note">Today is not one of its days.</div>`
      : `<button class="sheetcta" data-habittoggle="${slot}" style="margin:0 0 10px;width:100%">${today.done? 'Untick today' : (stop? 'Mark today: went without' : 'Mark today done')}</button>`}
    <button class="sheetcta" data-habitretire="${slot}" style="margin:0 0 10px;width:100%;background:var(--oxblood-bg)">Remove this habit</button>
    <div class="note">Removing it keeps nothing hidden: the days you kept stay in your history, and Undo brings it straight back.</div>
  </div>`;
  openSheet('altSheet');
}
function openHabitSheet(){
  const s=suggestHabit();
  document.getElementById('altTitle').textContent='Habits';
  document.getElementById('altSub').textContent='Up to three at once. Doing one or two until they are boring beats doing five badly.';
  const section=(kind,title)=>{
    const cur=currentHabit(kind), list=HABITS.filter(h=>h.kind===kind);
    const tags=[...new Set(list.map(h=>h.tag))];
    return `<div class="slab" style="font-size:13px;color:var(--ink)">${title}</div>
      ${cur? `<div class="method"><b>Now: ${escHabit(habitOf(cur.id).t)}</b><span>Since ${prettyDate(cur.started)}. ${habitStreak(kind)? habitStreak(kind)+(kind==='stop'?' days without in a row.':' days running.') : ''} Choosing another resets the count.</span></div>
        <button class="skipbtn" data-habitretire="${kind}">Remove ${escHabit(habitOf(cur.id).t)}</button>` : ''}
      ${tags.map(tag=>`<div class="slab">${HABIT_TAGS[tag]||tag}</div>`
        +list.filter(h=>h.tag===tag).map(h=>`<button class="opt ${cur&&cur.id===h.id?'on':''}" data-habitchoose="${h.id}">
          <div class="txt"><div class="t">${escHabit(h.t)}${kind==='start'&&s&&s.id===h.id&&!cur?' <span class="cichip">suggested</span>':''}</div>
          <div class="s">${h.s}${h.days? ' · counts '+h.days.map(d=>DAY_NAMES[d].slice(0,3)).join(', ') : ''}</div></div><div class="rad"></div></button>`).join('')).join('')}
      <div class="slab">Your own</div>
      ${ownHabits().filter(h=>h.kind===kind).map(h=>`<button class="opt ${cur&&cur.id===h.id?'on':''}" data-habitchoose="${h.id}">
          <div class="txt"><div class="t">${escHabit(h.t)}</div><div class="s">Your own</div></div><div class="rad"></div></button>`).join('')}
      <div class="ownrow">
        <input id="own_${kind}" type="text" maxlength="${OWN_MAX}" autocomplete="off"
          placeholder="${kind==='stop'?'Something you want to stop':'Something you want to start'}"
          aria-label="${kind==='stop'?'A habit of your own to stop':'A habit of your own to start'}">
        <button class="mini go" data-habitown="${kind}">${kind==='stop'?'Stop this':'Start this'}</button>
      </div>
      <div class="note" id="ownmsg_${kind}" role="status"></div>`;
  };
  document.getElementById('altBody').innerHTML=`
    <div style="padding:0 14px 6px">
      ${section('start','Start something')}
      ${section('stop','Stop something')}
      <div class="method" style="margin-top:14px"><b>How long it takes</b><span>In the best-known study, a new habit took a median of 66 days to become automatic, anywhere from 18 to 254, and missing a single day did not undo it (Lally and colleagues, 2010). A miss is a miss, not a reset.</span></div>
    </div>`;
  openSheet('altSheet');
}
function openTempoHelp(){
  document.getElementById('altTitle').textContent='Tempo';
  document.getElementById('altSub').textContent='Four numbers, in seconds, in this order.';
  document.getElementById('altBody').innerHTML=`
    <div style="padding:0 14px 6px">
      <div class="method"><b>3 0 1 0, read left to right</b><span>Three seconds lowering, no pause at the bottom, lift with intent, no pause at the top.</span></div>
      <div class="method"><b>Why it is there</b><span>Not for growth. It is here so your sets are repeatable: if a rep takes two seconds one week and five the next, 90kg for ten does not mean the same thing twice, and the progress you are reading is partly noise. The pauses are for position, so you are not bouncing out of a stretch.</span></div>
      <div class="method"><b>How much it matters for muscle</b><span>Very little. Schoenfeld, Ogborn and Krieger pooled the controlled trials and found much the same growth anywhere from half a second to eight seconds a rep, provided the set is taken near failure. Past ten seconds it gets worse, because you lose reps. Load, effort and how much you do matter far more than tempo does.</span></div>
      <div class="method"><b>Hold</b><span>Some movements, like a plank, have no reps. Those say hold, and you go by time.</span></div>
      <div class="method"><b>Where you will see it</b><span>The four digits sit beside your sets and reps. The plain English line only shows on movements where a pause is doing real work, a split squat or a Romanian deadlift, rather than under every row.</span></div>
      <div class="pair" style="margin-top:14px">
        <button class="big-pick ${showTempoSafe()?'on':''}" data-tempotoggle="on">Show tempo</button>
        <button class="big-pick ${!showTempoSafe()?'on':''}" data-tempotoggle="off">Hide it</button></div>
      <div class="note">Hiding it changes nothing about your programme. The tempos stay in the templates, they just stop being printed.</div>
    </div>`;
  openSheet('altSheet');
}
document.addEventListener('click',e=>{
  const tt=e.target.closest('[data-tempotoggle]');
  if(tt){ S.profile.showTempo = tt.dataset.tempotoggle==='on'; save();
    if(document.getElementById('altSheet').classList.contains('on')) openTempoHelp();
    if(document.getElementById('onb').classList.contains('on')) onbRender();
    if(GYM) drawGym();
    renderProgress();
    toast(showTempo()?'Tempo shown':'Tempo hidden'); }
  const a=e.target.closest('[data-onbaim]');
  if(a){ onbDraft.aim=a.dataset.onbaim;
    const d=AIM_DEFAULTS[onbDraft.aim]||AIM_DEFAULTS.lose;
    onbDraft.liftDays=d.lift; onbDraft.cardioDays=d.cardio; onbRender(); }
  const ac=e.target.closest('[data-onbact]');
  if(ac){ onbDraft.activity=ac.dataset.onbact; onbRender(); }
  const sc=e.target.closest('[data-onbsteps]');
  if(sc){ onbDraft.steps=+sc.dataset.onbsteps; onbRender(); }
  const sx=e.target.closest('[data-onbsex]');
  if(sx){ onbDraft.sex=sx.dataset.onbsex; if(onbDraft.sex!=='f') onbDraft.cycle=false; onbRender(); }
  const cy=e.target.closest('[data-onbcycle]');
  if(cy){ onbDraft.cycle=cy.dataset.onbcycle==='on'; onbRender(); }
  const rr=e.target.closest('[data-onbrun]');
  if(rr){ const [i,code]=rr.dataset.onbrun.split(':'); openRunSwap(+i,code); }
  const kp=e.target.closest('[data-onbkitpre]');
  if(kp){ const pre=KIT_PRESETS.find(x=>x.id===kp.dataset.onbkitpre);
    if(pre){ onbDraft.kit=pre.kit.slice(); onbRender(); } }
  const kk=e.target.closest('[data-onbkit]');
  if(kk){ const id=kk.dataset.onbkit, cur=(onbDraft.kit||ALL_KIT).slice();
    onbDraft.kit = cur.indexOf(id)>=0? cur.filter(x=>x!==id) : cur.concat([id]);
    onbRender(); }
  const osp=e.target.closest('[data-onbsplit]');
  if(osp){ onbDraft.split=osp.dataset.onbsplit; onbRender(); return; }
  const ostyle=e.target.closest('[data-onbstyle]');
  if(ostyle){ onbDraft.style=ostyle.dataset.onbstyle; if(onbDraft.style!=='gym'){ onbDraft.liftDays=onbDraft.style==='hifb'? 4 : Math.max(2,Math.min(6,(onbDraft.liftDays||0)+(onbDraft.cardioDays||0)||4)); onbDraft.cardioDays=0; } onbRender(); return; }
  const ons=e.target.closest('[data-onbsess]');
  if(ons){ onbDraft.liftDays=+ons.dataset.onbsess; onbDraft.cardioDays=0; if(onbDraft.hyroxDays>=onbDraft.liftDays) onbDraft.hyroxDays=null; onbRender(); return; }
  const ohx=e.target.closest('[data-onbhx]');
  if(ohx){ onbDraft.hyroxDays=+ohx.dataset.onbhx; onbRender(); return; }
  const ld=e.target.closest('[data-onblift]');
  if(ld){ onbDraft.liftDays=+ld.dataset.onblift; onbRender(); }
  const cd=e.target.closest('[data-onbcardio]');
  if(cd){ onbDraft.cardioDays=+cd.dataset.onbcardio; onbRender(); }
  const ob=e.target.closest('[data-onbbday]');
  if(ob){ onbDraft.bday={y:new Date().getFullYear(),passed:ob.dataset.onbbday==='1'}; onbDraft.age=ageFromBirth(onbDraft.born,onbDraft.bday); onbRender(); return; }
  const dd=e.target.closest('[data-onbday]');
  if(dd){ onbDraft.checkinDay=+dd.dataset.onbday; onbRender(); }
  const os=e.target.closest('[data-onbswap]');
  if(os){ openAlternatives(os.dataset.onbswap,{onboarding:true}); }
  const oe=e.target.closest('[data-onbedit]');
  if(oe){ openTplEdit(oe.dataset.onbedit); }
  if(e.target.closest('#tempoHelp')) openTempoHelp();
  if(e.target.closest('#onbSkipBackup')){ $('onb').classList.remove('on'); go('today'); renderAll();
    toast('Your week is ready, @'+S.profile.handle+'. It stays on this phone. Back up any time from Progress.'); }
});
$('onbNext').addEventListener('click',async()=>{
  if($('onbNext').disabled) return;
  if(step===4&&cloudAvailable()){ finishOnboarding(true); step=5; $('onb').classList.add('on'); onbRender(); return; }
  if(step<stepCount()-1){ step++; onbRender(); return; }
  if(step===5){
    const CL=window.__CLOUD, ag=onbDraft.agree||{};
    $('onb').classList.remove('on'); go('today'); renderAll();
    if(CL&&canHaveAccount({age:onbDraft.age})&&!onbBackedUp()&&ag.health&&ag.terms){
      CL.recordConsent();
      toast('Your week is ready. Backing it up now.');
      const r=await CL.startBackup(); CL.renderCloudPanel();
      toast(r.ok? 'Backed up. Add your email any time from Progress.' : 'Saved on this phone. It backs up on its own as soon as it can.');
    }
    return;
  }
  finishOnboarding();
});
$('onbBack').addEventListener('click',()=>{
  if(step>0){ step--; onbRender(); } });
function finishOnboarding(keepOpen){
  if(isTeen({age:onbDraft.age})){ if(onbDraft.aim==='lose') onbDraft.aim='hold'; onbDraft.goal=null; onbDraft.bf=null; }
  S.profile=Object.assign({},S.profile,{style:onbDraft.style||'gym',hyroxDays:onbDraft.style==='hybrid'? hyroxMixDraft() : null,split:onbDraft.split||'auto',handle:onbDraft.handle,aim:onbDraft.aim,checkinDay:onbDraft.checkinDay,
    sex:onbDraft.sex||S.profile.sex,
    liftDays:onbDraft.liftDays, cardioDays:onbDraft.cardioDays,
    kit: (onbDraft.kit&&onbDraft.kit.length)? onbDraft.kit.slice() : ALL_KIT.slice(),
    sexAnswered:!!onbDraft.sex,
    age:onbDraft.age||S.profile.age, height:onbDraft.height||S.profile.height,
    birthYear: validBirthYear(onbDraft.born)? +onbDraft.born : (S.profile.birthYear||null),
    bday: validBirthYear(onbDraft.born)? (onbDraft.bday||null) : (S.profile.bday||null),
    weight:onbDraft.weight||S.profile.weight, activity:onbDraft.activity||S.profile.activity,
    stepTarget: validSteps(onbDraft.steps)? Math.round(+onbDraft.steps) : (S.profile.stepTarget||DEFAULT_STEPS),
    bodyFat: validBodyFat(onbDraft.bf)? +onbDraft.bf : (validBodyFat(S.profile.bodyFat)? S.profile.bodyFat : null),
    detailsSet: !!(onbDraft.sex&&onbDraft.age&&onbDraft.height&&onbDraft.weight
      &&plausibleBody({age:onbDraft.age,height:onbDraft.height,weight:onbDraft.weight})) || S.profile.detailsSet,
    excluded:S.profile.excluded||[],onboarded:true,
    firstWeek:S.profile.firstWeek||mondayKey()});
  /* the goal weight becomes a weight target, dated by the healthy rate */
  if(+onbDraft.goal&&S.profile.detailsSet){
    if(!S.weights.length) S.weights.push({d:todayKey(),kg:+S.profile.weight});
    const g=+onbDraft.goal, kg=+S.profile.weight;
    S.target={kind:'weight',value:g,by:null,exId:null,set:todayKey(),hit:null,from:kg,autoDated:true};
    const ct=calorieTarget();
    if(ct&&ct.eta) S.target.by=ct.eta;
  }
  if(typeof ownTargets==='function') S.targets=ownTargets();
  if(onbDraft.cycle){ S.cycle=Object.assign({},S.cycle,{tracking:true,lastPeriod:onbDraft.lastPeriod||S.cycle.lastPeriod}); }
  /* The seeded templates are built to the focus the aim implies. */
  if(typeof applyFocusToTemplates==='function') applyFocusToTemplates(liftFocus());
  /* Fit the templates to the room before the week is built from them. */
  const swapped = typeof fitTemplatesToKit==='function'? fitTemplatesToKit() : [];
  buildPlan(onbDraft.runSwaps);
  ME.n=onbDraft.handle; ME.full=onbDraft.handle.replace(/[._]/g,' ');
  save(); renderAll();
  if(!keepOpen){ $('onb').classList.remove('on'); go('today');
    toast(swapped.length
      ? swapped.length+' movement'+(swapped.length>1?'s':'')+' swapped for the kit you have'
      : 'Your week is ready, @'+onbDraft.handle); }
}

