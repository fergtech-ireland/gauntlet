/* ---------- You, build 58 (design/redesign/Final-You.dc.html) ----------
   The top of You answers "how am I doing" before any chart: the weight goal
   as a bar, this week as a grid of readiness, food and training by day, and
   readiness over the last 30 days as counts of better, usual and lower. Every
   panel that was here before stays underneath, unchanged, and Appearance (Day,
   Night, Match phone) sits at the end. Nothing here is a new calculation:
   readiness is readiness() for each day, food is what the Food ring uses, and
   training is what was logged. */

/* A day's readiness, worked against that day's own last four weeks. */
function readinessOn(k){ try{ return readiness(k).level; }catch(e){ return 'building'; } }

/* What happened with food on a day, in the Food ring's own colours: under
   target green, over target but under maintenance amber, past maintenance
   coral. Teens: meals logged, never calories. */
function foodStateOn(k){
  const items=dayFood(k);
  if(!items.length) return 'none';
  if(isTeen()){ const meals=new Set(items.map(x=>x.meal||'s')).size; return meals>=3? 'ok' : 'some'; }
  const t=S.targets||{}, eaten=Math.round(foodTotals(k).kcal||0), target=+t.kcal||0, maint=+t.maintenance||0;
  if(!target||eaten<=target) return 'ok';
  return (!maint||eaten>maint)? 'past' : 'over';
}
/* Anything logged as training that day: a lifting session, or a run or
   circuit from the timed player. */
function trainedOn(k){
  return (S.workouts||[]).some(w=>w.d===k)
    || (S.mine||[]).some(p=>p.d===k&&['run','circuit','workout','hifb'].indexOf(p.kind)>=0);
}
const READY_WORD={better:'better',usual:'about usual',lower:'lower',building:'not enough logged'};
const FOOD_WORD={ok:'on target',over:'over target, under maintenance',past:'over maintenance',none:'nothing logged',some:'some meals logged'};

function weightGoalCard(){
  if(isTeen()) return '';
  const imp=S.profile.units==='imperial', ws=S.weights||[];
  if(!ws.length) return `<section class="ycard" id="yWeight"><div class="ych"><b>Weight</b></div>
    <p class="ynote">Nothing logged yet. Once a week is plenty.</p>
    <button class="mini go" data-weigh="1">Weigh in</button></section>`;
  const now=currentKg(), first=ws[0], tg=S.target&&S.target.kind==='weight'? S.target : null;
  const big=showW(now,imp).split(' ');
  const change=+(now-first.kg).toFixed(1), weeks=Math.round(gapDaysBetween(first.d,todayKey())/7);
  const moved= ws.length<2||Math.abs(change)<0.1? (ws.length<2? 'one weigh in so far' : 'level so far')
    : (change<0? 'down ' : 'up ')+showW(Math.abs(change),imp).split(' ')[0]+(weeks>=1? ' in '+weeks+' week'+(weeks===1?'':'s') : ' so far');
  let right='', bar='';
  if(tg&&tg.hit){
    right=`Goal met ${prettyDateSafe(tg.hit)}`;
    bar=`<div class="ybar"><i style="width:100%"></i></div>`;
  } else if(tg){
    const from=+(tg.from||first.kg), goal=+tg.value, span=from-goal;
    const f= Math.abs(span)<0.05? 1 : Math.max(0,Math.min(1,(from-now)/span));
    right=`${showW(Math.abs(now-goal),imp)} to go`;
    bar=`<div class="ybar" role="img" aria-label="${Math.round(f*100)}% of the way from ${showW(from,imp)} to ${showW(goal,imp)}"><i style="width:${Math.round(f*100)}%"></i></div>
      <div class="yends"><span>Start ${showW(from,imp).split(' ')[0]}</span><span>Goal ${showW(goal,imp).split(' ')[0]}</span></div>`;
  }
  return `<section class="ycard" id="yWeight">
    <div class="ych"><b>Weight</b>${right? `<span>${right}</span>` : `<button class="ylink" data-setting="goal">Set a goal</button>`}</div>
    <div class="ybig"><span class="num">${big[0]}</span> <span>${big[1]}, ${moved}</span></div>
    ${bar}</section>`;
}
function gapDaysBetween(a,b){ return Math.round((dateOf(b)-dateOf(a))/864e5); }

function weekGridCard(){
  const k0=todayKey(), keys=[]; for(let i=6;i>=0;i--) keys.push(addDays(k0,-i));
  const L=['M','T','W','T','F','S','S'], dowOf=k=>(dateOf(k).getDay()+6)%7;
  const teen=isTeen(), plan=ensurePlan();
  const cell=(cls,label,today)=>`<span class="yc ${cls}${today?' now':''}" role="img" aria-label="${label}"></span>`;
  const head=keys.map(k=>`<span class="yd${k===k0?' now':''}" aria-hidden="true">${L[dowOf(k)]}</span>`).join('');
  const ready=keys.map(k=>{ const l=readinessOn(k); return cell('r-'+l,DAYS[dowOf(k)]+': readiness '+READY_WORD[l],k===k0); }).join('');
  const food=keys.map(k=>{ const f=foodStateOn(k); return cell('f-'+f,DAYS[dowOf(k)]+': food '+FOOD_WORD[f],false); }).join('');
  const train=keys.map(k=>{ const did=trainedOn(k), pd=k===k0? plan.days[dowIdx()] : null;
    const due=!did&&pd&&pd.type&&pd.slot!=='walk'&&pd.slot!=='rest';
    return cell(did? 't-done' : (due? 't-due' : 't-none'),DAYS[dowOf(k)]+': '+(did? 'trained' : (due? 'session still to do' : 'no session logged')),false); }).join('');
  const fs=keys.map(foodStateOn), logged=fs.filter(x=>x!=='none').length;
  const overDays=keys.filter((k,i)=>fs[i]==='over'||fs[i]==='past').map(k=>DAYS[dowOf(k)]);
  const foodLine= !logged? 'No food logged in the last seven days.'
    : teen? `Meals logged on ${logged} of the last 7 days.`
    : `Food on target ${fs.filter(x=>x==='ok').length} of ${logged} day${logged===1?'':'s'} logged.${overDays.length? ' Over on '+overDays.join(', ')+'.' : ''}`;
  return `<section class="ycard" id="yWeek">
    <div class="ych"><b>This week</b><span>readiness, food, training</span></div>
    <div class="ygrid"><span></span>${head}
      <span class="yl">Ready</span>${ready}
      <span class="yl">Food</span>${food}
      <span class="yl">Train</span>${train}</div>
    <div class="ykey"><span><i class="yc r-better"></i>Better</span><span><i class="yc r-usual"></i>Usual</span><span><i class="yc r-lower"></i>Lower</span>${teen? '' : `<span><i class="yc f-past"></i>Over</span>`}<span><i class="yc t-done"></i>Trained</span></div>
    <p class="ynote">${foodLine}</p></section>`;
}

/* Readiness is a word, never a number: the bars are only pictures of the
   word, at the same heights the Ready ring uses. */
function readinessHistoryCard(){
  const k0=todayKey(), levels=[]; for(let i=29;i>=0;i--) levels.push(readinessOn(addDays(k0,-i)));
  const c={better:0,usual:0,lower:0,building:0}; levels.forEach(l=>c[l]++);
  const known=30-c.building;
  const text= !known? 'Building your baseline: it needs about a week of sleep and how your days went before any day can be compared.'
    : `Last 30 days: ${c.better} better, ${c.usual} usual, ${c.lower} lower.${c.building? ' '+c.building+' day'+(c.building===1?'':'s')+' without enough logged to compare.' : ''}`;
  return `<section class="ycard" id="yReady">
    <div class="ych"><b>Readiness against your usual</b></div>
    <div class="ybars" role="img" aria-label="${text}">${levels.map(l=>`<i class="b-${l}"></i>`).join('')}</div>
    <p class="ynote">${text}</p></section>`;
}

function appearanceCard(){
  const cur=themeOf();
  const opt=(id,label)=>`<button class="ytheme ${cur===id?'on':''}" data-themepick="${id}" aria-pressed="${cur===id}">
    <span class="sw sw-${id}" aria-hidden="true"><i></i></span><b>${label}</b></button>`;
  return `<section class="ycard" id="yLook"><div class="ych"><b>Appearance</b></div>
    <div class="ythemes">${opt('day','Day')}${opt('night','Night')}${opt('auto','Match phone')}</div>
    <p class="ynote">Match phone is the default: light by day, dark at night, whatever your phone is set to.</p></section>`;
}

const _renderProgressTop=renderProgress;
renderProgress=function(){
  _renderProgressTop();
  const dash=document.getElementById('dash'); if(!dash) return;
  const h=document.getElementById('youHandle'); if(h) h.textContent=S.profile&&S.profile.onboarded&&S.profile.handle? '@'+S.profile.handle : '';
  ['yTop','yLook'].forEach(id=>{ const old=document.getElementById(id); if(old) old.remove(); });
  dash.insertAdjacentHTML('afterbegin',`<div id="yTop">${weightGoalCard()}${weekGridCard()}${readinessHistoryCard()}</div>`);
  dash.insertAdjacentHTML('beforeend',appearanceCard());
};
try{ Object.assign(window.__G,{readinessOn,foodStateOn,trainedOn,weightGoalCard,weekGridCard,readinessHistoryCard,appearanceCard}); }catch(e){}
renderProgress();
