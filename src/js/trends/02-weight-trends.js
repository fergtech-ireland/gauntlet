/* ---------- the weight panel, rebuilt ----------
   Seen in a real browser at phone size, the old one failed on every count:
   labels printed over each other, two legends that disagreed, two axis labels
   at odd values like 96.6 and 83.9, text at nine pixels, and a paragraph
   under it quoting a different forecast from the one on the chart.
   Now, the way the apps people trust do it:
     the numbers first, as text: where you are, how far you have come, how fast
     a range to look at: one, three or six months, or everything
     one chart: the scale as faint dots, the trend as the line, whole-kilo
       gridlines, three dates, today marked, the next four weeks as a range,
       your goal if it is near enough to be useful
     tap anywhere on it to read that day
     one legend, and one sentence about where it is heading */
let weightRange='3m';
const W_RANGES=[['1m','1 month',30],['3m','3 months',90],['6m','6 months',182],['all','All',100000]];
const W_FWD=28;
/* Never look further ahead than the weigh ins behind it: nine days of data
   earns a nine day guess, not a four week one. One to four weeks. */
function wHorizon(pts){
  if(!pts||pts.length<2) return 7;
  const span=Math.round((dateOf(pts[pts.length-1].d)-dateOf(pts[0].d))/864e5);
  return Math.max(7,Math.min(W_FWD,span));
}
function wSeriesFor(range){
  const days=(W_RANGES.find(r=>r[0]===range)||W_RANGES[1])[2];
  const all=(S.weights||[]).filter(p=>p&&typeof p.kg==='number'&&p.d).slice().sort((a,b)=>a.d<b.d?-1:1);
  const cut=addDays(todayKey(),-days);
  const pts=all.filter(p=>p.d>=cut);
  return pts.length>=2? pts : all.slice(-Math.max(2,Math.min(all.length,12)));
}
/* round numbers for the gridlines: 0.5, 1, 2 or 5 kg apart, three to six of them */
function niceTicks(lo,hi){
  const span=hi-lo;
  const step=[0.5,1,2,5,10].find(s=>span/s<=5)||10;
  const out=[]; for(let v=Math.ceil(lo/step)*step; v<=hi+1e-9; v+=step) out.push(+v.toFixed(1));
  return {ticks:out,step};
}
const shortDate=k=>{ const d=dateOf(k); return d.getDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]; };
function weightChart(){
  const pts=wSeriesFor(weightRange);
  if(pts.length<2){
    const r=forecastReadiness();
    return `<div class="chartempty">
      <div class="ce-h">${pts.length? 'One weigh in so far' : 'No weigh ins yet'}</div>
      <div class="ce-s">A line needs two points and a direction needs three. ${r.line}</div>
      <button class="mini go" data-glance="weigh">Weigh in</button></div>`;
  }
  const tr=weightTrend(pts);
  const smoothAll=(typeof trendSeries==='function')? trendSeries() : [];
  const byDay={}; smoothAll.forEach(sp=>{ byDay[sp.d]=sp.kg; });
  const t0=dateOf(pts[0].d).getTime();
  const dayOf=k=>(dateOf(k).getTime()-t0)/864e5;
  const todayX=dayOf(todayKey()), lastX=dayOf(pts[pts.length-1].d);
  const smooth=pts.map(p=>({x:dayOf(p.d), kg: byDay[p.d]!==undefined? byDay[p.d] : p.kg, raw:p.kg, d:p.d}));
  const nowKg=smooth[smooth.length-1].kg;
  const fwd=wHorizon(pts);
  const endX=Math.max(todayX,lastX)+fwd;
  const projEnd=nowKg+tr.perDay*(endX-lastX);
  const band=(typeof bandFor==='function')? bandFor(mondayKey()) : 0.5;

  /* the vertical range: the data, the forecast, and the goal only if it is close */
  const goal=S.target&&S.target.kind==='weight'? +S.target.value : null;
  let lo=Math.min(...pts.map(p=>p.kg),projEnd-band), hi=Math.max(...pts.map(p=>p.kg),projEnd+band);
  const near=goal!==null&&goal>=lo-Math.max(2,(hi-lo)*0.6)&&goal<=hi+Math.max(2,(hi-lo)*0.6);
  if(near){ lo=Math.min(lo,goal); hi=Math.max(hi,goal); }
  const padKg=Math.max(0.3,(hi-lo)*0.08); lo-=padKg; hi+=padKg;
  const {ticks,step}=niceTicks(lo,hi);
  lo=Math.min(lo,ticks[0]); hi=Math.max(hi,ticks[ticks.length-1]);

  const W=360,H=236,L=38,R=14,T=14,B=30;
  const x=d=>L+(d/endX)*(W-L-R), y=v=>T+(1-(v-lo)/(hi-lo))*(H-T-B);
  const f=n=>n.toFixed(1);

  const grid=ticks.map(v=>`<line class="wgrid" x1="${L}" x2="${W-R}" y1="${f(y(v))}" y2="${f(y(v))}"/>
    <text class="wlab" x="${L-6}" y="${f(y(v)+4)}" text-anchor="end">${step<1? v.toFixed(1) : Math.round(v)}</text>`).join('');
  const midX=Math.round(todayX/2);
  const dates=`<text class="wlab" x="${L}" y="${H-9}">${shortDate(pts[0].d)}</text>
    ${todayX>20? `<text class="wlab" x="${f(x(midX))}" y="${H-9}" text-anchor="middle">${shortDate(addDays(pts[0].d,midX))}</text>`:''}
    <text class="wlab strong" x="${f(x(todayX))}" y="${H-9}" text-anchor="middle">Today</text>`;
  /* a goal close enough is a line; a goal far off is named at the edge it is
     beyond, so it is never lost and never squashes the chart flat */
  const goalLine= goal===null? '' : (near
    ? `<line class="wgoal" x1="${L}" x2="${W-R}" y1="${f(y(goal))}" y2="${f(y(goal))}"/>
       <text class="wlab goal" x="${L+4}" y="${f(y(goal)-5)}">Goal ${goal} kg</text>`
    : `<text class="wlab goal" x="${L+4}" y="${goal<lo? H-B-6 : T+12}">Goal ${goal} kg, ${Math.abs(goal-nowKg).toFixed(1)} kg ${goal<lo?'below':'above'} this</text>`);
  const dots=smooth.map(p=>`<circle class="raw" cx="${f(x(p.x))}" cy="${f(y(p.raw))}" r="2.4"/>`).join('');
  const line=smooth.map((p,i)=>`${i?'L':'M'}${f(x(p.x))} ${f(y(p.kg))}`).join(' ');
  const xn=x(lastX), yn=y(nowKg), xe=x(endX), ye=y(projEnd);
  const bandPath=`M${f(xn)} ${f(yn)} L${f(xe)} ${f(y(projEnd+band))} L${f(xe)} ${f(y(projEnd-band))} Z`;
  /* the forecast label sits beside its end point, above or below whichever is
     clear, and never past the edge */
  /* The line runs from today to the end point, so a label to the left of the
     end point sits clear of it on the side the line is not: below when the
     line falls, above when it rises. If that would hit the edge or the goal
     label, it moves to the other side. */
  /* The label goes on the side of the line the line is not: below a falling
     line, above a rising one. The only other thing it can hit is the goal
     line, which runs the full width, so if that passes through the label it
     moves just past the goal line, and it always stays inside the frame. */
  const falling=ye>=yn;
  let ly=falling? ye+19 : ye-11;
  if(goal!==null&&near){
    const gy=y(goal);
    if(gy>=ly-13&&gy<=ly+4) ly= falling? gy+16 : gy-6;
  }
  ly=Math.min(H-B-4,Math.max(T+12,ly));
  const flab=`<text class="wlab fc" x="${f(xe)}" y="${f(ly)}" text-anchor="end">${projEnd.toFixed(1)} kg by ${shortDate(addDays(todayKey(),fwd))}</text>`;
  const pointsJson=escHabit(JSON.stringify(smooth.map(p=>[p.d,+p.raw.toFixed(1),+p.kg.toFixed(1),+f(x(p.x))])));
  const words=`Weighed ${pts.length} times over ${Math.round(lastX)} days: trend ${nowKg.toFixed(1)} kg, `
    +(tr.perWeek<0? 'down ':'up ')+Math.abs(tr.perWeek).toFixed(2)+' kg a week. About '+projEnd.toFixed(1)+' kg in '+fwd+' days at this rate.';

  return `<svg viewBox="0 0 ${W} ${H}" class="chart wchart" role="img" aria-label="${escHabit(words)}" data-points="${pointsJson}">
    ${grid}
    <line class="wtoday" x1="${f(x(todayX))}" x2="${f(x(todayX))}" y1="${T}" y2="${H-B}"/>
    ${goalLine}
    <path d="${bandPath}" class="wband"/>
    <path d="M${f(xn)} ${f(yn)} L${f(xe)} ${f(ye)}" class="wfc"/>
    <circle cx="${f(xe)}" cy="${f(ye)}" r="3.6" class="wfcdot"/>
    ${dots}
    <path d="${line}" class="wtrend"/>
    <circle cx="${f(xn)}" cy="${f(yn)}" r="5" class="wnow"/>
    ${flab}
    ${dates}
    <line class="wcursor" x1="0" x2="0" y1="${T}" y2="${H-B}" style="display:none"/>
    <rect class="wtouch" x="${L}" y="${T}" width="${W-L-R}" height="${H-T-B}" fill="transparent"/>
  </svg>`;
}
/* The whole panel: numbers, range, chart, legend, one sentence. */
function weightPanel(){
  const pts=wSeriesFor(weightRange);
  const head=(()=>{
    if(pts.length<2) return '';
    const tr=weightTrend(pts);
    const smooth=trendSeries();
    const now=smooth.length? smooth[smooth.length-1].kg : pts[pts.length-1].kg;
    const firstTrend=(smooth.find(s=>s.d>=pts[0].d)||{kg:pts[0].kg}).kg;
    const change=now-firstTrend, last=S.weights[S.weights.length-1];
    const dir=change<0? 'down' : 'up';
    return `<div class="whead" id="wHead">
      <div class="wbig"><b>${now.toFixed(1)}</b><span>kg trend</span></div>
      <div class="wstats">
        <span class="wpill ${Math.abs(change)<0.2?'':dir}">${change<0?'−':'+'}${Math.abs(change).toFixed(1)} kg since ${shortDate(pts[0].d)}</span>
        <span class="wsub">${tr.perWeek<0?'Down':'Up'} ${Math.abs(tr.perWeek).toFixed(2)} kg a week</span>
        <span class="wsub">Scale said ${last.kg} kg ${last.d===todayKey()?'today':shortDate(last.d)}</span>
      </div></div>`;
  })();
  const ranges=`<div class="wranges" role="tablist" aria-label="How far back">${W_RANGES.map(([id,label])=>
    `<button role="tab" aria-selected="${weightRange===id}" class="${weightRange===id?'on':''}" data-wrange="${id}">${label}</button>`).join('')}</div>`;
  const legend=pts.length<2? '' : `<div class="wkey">
    <span><i class="k-dot"></i>Scale</span><span><i class="k-line"></i>Trend</span>
    <span><i class="k-fc"></i>Where it is heading</span>${S.target&&S.target.kind==='weight'?'<span><i class="k-goal"></i>Goal</span>':''}</div>`;
  /* one sentence about where it is heading. If the calorie forecast disagrees
     with the weigh ins by more than a few hundred grams, say so plainly rather
     than printing a second number without explanation. */
  const sentence=(()=>{
    if(pts.length<3) return '';
    const tr=weightTrend(pts), smooth=trendSeries(), now=smooth[smooth.length-1].kg;
    const fwd=wHorizon(pts), end=now+tr.perDay*fwd;
    let s=`At this rate, about <b>${end.toFixed(1)} kg</b> by ${shortDate(addDays(todayKey(),fwd))}.`;
    const proj=(typeof projectWeeks==='function')? projectWeeks(4) : null;
    if(fwd<W_FWD) s+=` That only looks ${fwd} days ahead, because that is how much there is to go on.`;
    else if(proj&&proj[3]&&Math.abs(proj[3].kg-end)>=0.3)
      s+=` Your logged calories point to ${(+proj[3].kg).toFixed(1)} kg, so ${proj[3].kg<end? 'the food suggests a little faster than the scale is showing' : 'the scale is moving a little faster than the food suggests'}; the two usually meet after a couple more weeks of logging.`;
    else if(proj&&proj[3]) s+=' Your logged calories point to the same place.';
    return `<div class="note wsentence">${s}</div>`;
  })();
  return `${head}${ranges}${weightChart()}${legend}${sentence}${forecastNote()}`;
}
/* tap or drag on the chart to read a day */
function wInspect(svg,clientX){
  let pts; try{ pts=JSON.parse(svg.dataset.points); }catch(e){ return; }
  if(!pts||!pts.length) return;
  const r=svg.getBoundingClientRect(), vb=svg.viewBox.baseVal;
  const vx=(clientX-r.left)/r.width*vb.width;
  let best=pts[0]; pts.forEach(p=>{ if(Math.abs(p[3]-vx)<Math.abs(best[3]-vx)) best=p; });
  const cur=svg.querySelector('.wcursor');
  if(cur){ cur.setAttribute('x1',best[3]); cur.setAttribute('x2',best[3]); cur.style.display=''; }
  const head=document.getElementById('wHead');
  if(head) head.innerHTML=`<div class="wbig"><b>${best[1].toFixed(1)}</b><span>kg on ${shortDate(best[0])}</span></div>
    <div class="wstats"><span class="wpill">trend ${best[2].toFixed(1)} kg</span>
    <span class="wsub">tap outside to close</span></div>`;
}
document.addEventListener('pointerdown',e=>{
  const svg=e.target.closest&&e.target.closest('svg.wchart');
  if(svg){ wInspect(svg,e.clientX); return; }
  if(document.getElementById('wHead')&&document.querySelector('svg.wchart .wcursor[style=""]')){ renderProgress(); }
});
document.addEventListener('pointermove',e=>{
  if(!(e.buttons&1)) return;
  const svg=e.target.closest&&e.target.closest('svg.wchart'); if(svg) wInspect(svg,e.clientX);
});
document.addEventListener('click',e=>{
  const wr=e.target.closest('[data-wrange]');
  if(wr){ weightRange=wr.dataset.wrange; renderProgress(); }
});
function projectionLine(){
  const pts=weightSeries();
  if(pts.length<3) return null;
  const tr=weightTrend(pts);
  if(!isFinite(tr.perWeek)) return null;
  if(Math.abs(tr.perWeek)<0.05) return 'Holding steady. At this rate you are the same weight in a month.';
  const last=pts[pts.length-1].kg;
  const in4=+(last+tr.perWeek*4).toFixed(1);
  return `${tr.perWeek<0?'Down':'Up'} about <b>${Math.abs(tr.perWeek).toFixed(2)} kg a week</b>. At this rate, about <b>${in4} kg</b> by ${prettyDate(addDays(todayKey(),28))}.`;
}
function consistencyChart(){
  const hist=weeklyHistory(8).reverse();
  const planned=S.plan? S.plan.days.filter(d=>d.type&&d.slot!=='walk').length : 4;
  const maxV=Math.max(planned,...hist.map(w=>w.sessions),1);
  return `<div class="bars">${hist.map((w,i)=>`<div class="barcol">
      <div class="col"><i style="height:${Math.round((w.sessions/maxV)*100)}%;background:${i===hist.length-1?'var(--ink)':'var(--line)'}"></i></div>
      <div class="bl">${w.sessions}</div></div>`).join('')}</div>
    <div class="note">Sessions a week, last eight. The target is ${planned}.</div>`;
}
function cycleStrip(){
  const p=phaseOn(todayKey());
  if(!p) return '';
  const len=p.len, day=p.day;
  return `<div class="panel">
    <div class="ph"><h3>Cycle</h3><button id="cycleBtn">Adjust</button></div>
    <div class="cyc">${Array.from({length:len},(_,i)=>{
      const ph=(()=>{const c=S.cycle,per=c.periodLen||5,ov=len-14,d=i+1;
        if(d<=per) return PHASES.menstrual; if(d<ov-1) return PHASES.follicular;
        if(d<=ov+1) return PHASES.ovulation; if(d>len-5) return PHASES.lateLuteal; return PHASES.luteal;})();
      return `<i class="${i+1===day?'now':''}" style="background:${ph.c}"></i>`;}).join('')}</div>
    <div class="bigrow" style="margin-top:10px"><div class="n" style="font-size:20px">${p.n}<small> · day ${p.day}</small></div></div>
    <div class="note">${p.note}</div>
  </div>`;
}

/* ---------- the trends view ---------- */
/* One line under the chart saying where the forecast stands. */
function forecastNote(){
  const r=forecastReadiness();
  const tone=r.stage==='none'? 'warn' : 'note';
  return `<div class="${tone}" style="margin:8px 14px 0">${r.line}</div>`;
}
function renderTrends(){
  const f=ensureForecast(), g=S.goal;
  const lastWeek=addDays(mondayKey(),-7);
  const rev=reviewWeek(lastWeek);
  const p=f.predicted;
  const conf={none:'', low:'Rough, and based on your weigh ins alone.',
    fair:'Based on what you ate and what the scale did.',
    good:'Tuned against how my last few forecasts actually turned out.'}[f.confidence];
  let hero;
  if(rev&&rev.matched!==null){
    hero=`<div class="hero-card ${rev.matched?'good':'off'}">
      <div class="hk">How last week went</div>
      <div class="hn">${rev.a.weight>0?'+':''}${rev.a.weight} kg</div>
      <div class="hs">I forecast ${rev.f.predicted.weight>0?'+':''}${rev.f.predicted.weight}, give or take ${rev.f.band}.
        ${rev.matched? 'That landed inside the margin.' : ''}</div>
      ${!rev.matched? `<div class="hwhy">${rev.lines.join(' ')}<ul>${rev.misses.map(m=>`<li>${m}</li>`).join('')}</ul></div>`:''}
      <button class="howbtn" id="howBtn">How this is worked out</button></div>`;
  } else if(f.method==='none'){
    hero=`<div class="hero-card">
      <div class="hk">This week</div>
      <div class="hn" style="font-size:26px">Not enough to forecast yet</div>
      <div class="hs">I will not guess at your weight. Two or three weigh ins gives me a trend to work from, and a week of food logs lets me do it properly from energy balance.</div>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="mini go" data-weigh="1">Weigh in</button>
        <button class="mini" id="howBtn">How it will work</button></div></div>`;
  } else {
    hero=`<div class="hero-card">
      <div class="hk">This week, forecast</div>
      <div class="hn">${p.weight>0?'+':''}${p.weight} kg</div>
      <div class="hs">Give or take ${f.band} kg${f.cycle&&waterWindow(addDays(mondayKey(),5))?', wider than usual because you are in the water retention window':''}.
        ${f.method==='balance'? `Worked out from ${num(p.intake)} kcal a day in against ${num(p.tdee)} out.` : 'Worked out from your own weight trend.'}</div>
      <div class="hmeta">${conf}${f.earlyDays?' Early weeks move faster than the maths says, because the first kilo is mostly water.':''}</div>
      <button class="howbtn" id="howBtn">How this is worked out</button></div>`;
  }
  const hist=weeklyHistory(2);
  const dRow=(label,now,prev,unit,dp)=>{
    if(now===null||now===undefined) return `<div><div class="n">-</div><div class="l">${label}</div></div>`;
    const d=(prev===null||prev===undefined)? null : now-prev;
    const arrow= d===null? '' : (Math.abs(d)<(unit==='h'?0.2:(unit==='g'?5:200))? '·' : (d>0?'↑':'↓'));
    return `<div><div class="n">${dp? now.toFixed(dp):num(Math.round(now))}<small>${unit==='h'?' h':(unit==='g'?' g':'')}</small></div>
      <div class="l">${label} ${arrow?`<span class="delta ${d>0?'up':'down'}">${arrow}</span>`:''}</div></div>`;
  };
  const proj=projectWeeks(4);
  $('dash').innerHTML=`
  ${hero}
  <div class="panel">
    ${isTeen()? `<div class="ph"><h3>Growing</h3></div>
      <div class="note" style="margin:0">Weight is not tracked while you are under 18. Bodies change a lot while you are growing, and research on teenagers finds that focusing on weight does more harm than good. What you do each day is what counts, and that is all here: moving, getting stronger, sleep, food and how you feel.</div>`
    : `<div class="ph"><h3>Weight</h3><button data-weigh="1">Weigh in</button></div>
    ${weightPanel()}`}
    ${waterWindow(todayKey())? `<div class="note" style="color:var(--amber-text)">Fluid retention is typically highest around now, averaging about half a kilo in the study that measured it. Read the line, not today's number.</div>`:''}
  </div>
  <div class="panel">
    <div class="ph"><h3>Consistency</h3><button data-go="plan">The plan</button></div>
    <div class="bigrow"><div class="n">${fmt(g.now)}<small> of ${g.target} this week</small></div></div>
    ${consistencyChart()}
  </div>
  <div class="panel">
    <div class="ph"><h3>Averages, and which way they are going</h3></div>
    <div class="tgrid">
      ${dRow('steps a day',hist[0].steps,hist[1].steps,'',0)}
      ${dRow('sleep',hist[0].sleep,hist[1].sleep,'h',1)}
      ${dRow('protein',hist[0].protein,hist[1].protein,'g',0)}
      ${dRow('kg lifted',hist[0].volume||null,hist[1].volume||null,'',0)}
      ${dRow('sessions',hist[0].sessions,hist[1].sessions,'',0)}
      ${dRow('calories',hist[0].kcal,hist[1].kcal,'',0)}
    </div>
    <div class="note">Against the week before. A dot means it barely moved, which is usually fine.</div>
  </div>
  ${readinessPanel()}
  ${(()=>{ const st=sleepStats(), c=confidence('sleep');
    return `<div class="panel"><div class="ph"><h3>Sleep</h3><button data-opensleep="1">Open</button></div>
      <div class="bigrow"><div class="n">${st.avg!==null? st.avg.toFixed(1)+'<small> h a night</small>' : '–'}</div></div>
      <div class="note" style="margin:0">Aim ${st.target.t}. ${confChip(c)}</div></div>`; })()}
  ${cycleStrip()}
  ${isTeen()? supportCard() : ''}`;
}
function openHow(){
  const f=ensureForecast(), obs=tdeeObserved(21);
  $('howBody').innerHTML=`
    <div class="method"><b>Right now</b><span>${f.method==='none'? 'No forecast. Not enough logged.' :
      (f.method==='balance'? `Energy balance: ${num(f.predicted.intake)} kcal a day in, ${num(f.predicted.tdee)} out, so ${f.predicted.weight>0?'+':''}${f.predicted.weight} kg over seven days.`
        : `Your own weight trend, extrapolated one week.`)}</span></div>
    <div class="method"><b>Resting burn</b><span>Mifflin St Jeor, 1990. The equation most clinical tools use. An estimate rather than a measurement: for an individual it can be out by a couple of hundred calories either way, which is why it is replaced by your own numbers as soon as there are enough of them.</span></div>
    <div class="method"><b>Movement</b><span>ACSM: kcal per minute = METs × 3.5 × kg ÷ 200. Walking is taken at 3 METs, since 100 steps a minute is the established threshold for moderate intensity. Lifting at 4 METs. Both counted net of resting burn so it is not double counted.</span></div>
    <div class="method"><b>Your expenditure</b><span>${obs? `Measured, not guessed: over the last ${obs.days} days you averaged ${num(obs.intake)} kcal and your trend weight moved, so your expenditure works out at about ${num(obs.tdee)} kcal a day. This is the intake balance method, which agrees with doubly labelled water to within roughly 200 kcal a day across a group. For one person it can be further out.` : 'Estimated from your details and your tracker until there are ten days of food logs and two weigh ins, at which point it gets measured from your own data instead. That measurement, the intake balance method, agrees with doubly labelled water to within roughly 200 kcal a day across a group, and can be further out for one person.'}</span></div>
    <div class="method"><b>Protein</b><span>1.8 g per kilo. The meta-analysis on protein and resistance training supports roughly 1.6 to 2.2 g/kg, so this sits in the middle, and eating more of it while losing weight helps hold onto muscle. ${(()=>{const b=proteinBasis(S.profile); return b.adjusted? `Above a BMI of about 30 the kilo is an adjusted reference weight, ${b.kg} kg in your case rather than ${S.profile.weight} kg, because fat mass carries no protein requirement and total bodyweight would overshoot.` : 'Above a BMI of about 30 it is taken from an adjusted reference weight instead, since fat mass carries no protein requirement.';})()} The 1.8 figure, the BMI 30 cut off and the reference weight at a BMI of 27.5 are this app's choices within that evidence, not fixed rules.</span></div>
    <div class="method"><b>Maintenance</b><span>One figure, from the best evidence the app has. To start: resting burn by Mifflin St Jeor, times 1.2 for a sedentary day, plus your step target and the lifting in your plan. Walking is 3 METs for every 100 steps a minute, net of rest, counted above 2,500 a day because a sedentary day already contains those (under 2,500 is what Tudor-Locke and colleagues class as basal activity; using it as the baseline is a judgement). Lifting is 4 METs for as long as your templates take. Once a tracker is connected, your real steps replace the target. Once you have about three weeks of food and weigh ins, what you actually ate minus what the scale says you stored replaces both, and that is the most accurate of the three. Running is counted as steps, which under-counts it a little; physical work a step count cannot see is missed; the three-week figure catches both.</span></div>
    <div class="method"><b>If you are under 18</b><span>You get a version built for teenagers. No calorie targets, no diets and no weight goals: the American Academy of Pediatrics (Golden and colleagues, 2016, reaffirmed 2022) finds that dieting, weight talk and skipping meals are linked to both obesity and eating disorders in teenagers, and that what helps is regular meals, being active, sleep and feeling good about your body. Activity follows the World Health Organization's guidance for 5 to 17 year olds (2020): about an hour a day, with muscle and bone strengthening three days a week. Sleep aims at 8 to 10 hours (American Academy of Sleep Medicine, 2016). Lifting is technique first, fewer sets and more reps, which is safe and useful when supervised (Lloyd and colleagues, 2014). Under 16, everything stays on your phone, because an account needs a parent or guardian's consent in Ireland.</span></div>
    <div class="method"><b>Your calorie target</b><span>Losing: you choose the pace, gentle, standard or faster, which is 0.5, 0.75 or 1% of your bodyweight a week. That range comes from research on natural bodybuilders preparing for competition (Helms and colleagues, 2014), so treat it as a sensible default rather than a rule for everyone. Underneath it, the deficit is capped at 750 kcal a day, from clinical guidance for adults with overweight or obesity (AHA/ACC/TOS, 2013), and about 69 kcal a day per kilo of body fat, a theoretical ceiling (Alpert, 2005). Gaining: 0.25 to 0.5% a week, from bodybuilding off-season research (Iraki and colleagues, 2019), again your choice of pace. The app will not set below 1,500 kcal for men or 1,200 for women, a common clinical minimum for adults, and never above maintenance while losing. Reaching your goal weight takes the target back to maintenance. All of this is for adults: the resting burn equation was derived in adults aged 19 to 78.</span></div>
    <div class="method"><b>How many reps</b><span>Set by your lifting focus. Strength: heavy loads of roughly 1 to 5 reps at 80 to 100% of your max build maximal strength best, so the main lifts sit at 3 to 6 (Schoenfeld and colleagues, 2021). Muscle: similar growth comes from a wide range of loads down to about 30% of your max, as long as sets finish close to failure, so the big lifts sit at 6 to 12 and smaller ones higher. Losing fat: keep lifting heavy enough to hold on to muscle, mostly 6 to 12 reps at 70 to 80% of max with 1 to 3 minutes rest, and no grinding to failure on heavy lifts (Helms and colleagues, 2015). Endurance: 15 reps and up, with short rests. Every range is a starting point you can change.</span></div>
    <div class="method"><b>When the forecast starts</b><span>A trend line needs two weigh ins and a direction needs three. A forecast starts at three weigh ins, or four days of food logged. It is working from an estimate of what you burn until you have ten days of food inside three weeks along with three weigh ins, at which point it works your burn out from your own weight and intake instead. After three weeks of forecasts it scores itself, and the range you see comes from how wrong it has actually been rather than a default. The note under the chart always says which of those you are at.</span></div>
    <div class="method"><b>Why the line is smoothed</b><span>Bodyweight swings a kilo or two a day on water and gut contents, so the dots are what the scale said and the line is the trend underneath them, smoothed exponentially the way Libra and the Hacker's Diet do it. The forecast, your maintenance calories and your rate of loss are all worked from that trend rather than your last reading, which is why the number on the chart is not the number you saw on the scale this morning.</span></div>
    <div class="method"><b>Cardio</b><span>Nineteen sessions across running, the bike, the rower, the pool, the machines, skipping, walking and whatever you play. What each one costs comes from the Compendium of Physical Activities (Ainsworth and colleagues, 2011), net of what you would burn sitting still. Running and walking are not added to your maintenance because their steps are already counted; a bike, a rower, a pool or a class are, because no step count can see them.</span></div>
    <div class="method"><b>Meals and timing</b><span>Total protein for the day matters most, so that is what the home screen leads with. Spreading it helps on top: about 0.4 g per kg of bodyweight a meal across at least four meals (Schoenfeld and Aragon, 2018), though the difference is modest once the total is matched. The meal times come from when you wake, train and sleep. Nothing extra is asked of you: each food you log already records the time, which is how the app knows which meal it belongs to and, over a week, how many meals reached the mark and how long before bed you last ate. Timing does not change how many calories you burn, so it never touches your targets.</span></div>
    <div class="method"><b>The food list</b><span>Typical values for the portion named, for ${FOODS.length} foods people here actually eat. Composition figures in Ireland come from McCance and Widdowson's Composition of Foods Integrated Dataset, which the Food Safety Authority of Ireland names as the accepted source. Brands vary, so anything with a label on it is better taken from the label: "Something not on the list" saves it for good. Alcohol carries about 7 kcal a gram, which is why a pint's calories are mostly not protein, carbs or fat.</span></div>
    <div class="method"><b>What your steps are worth</b><span>Steps are part of what you burn, so they are already inside your maintenance. The deficit splits into the part food makes, eating less than you burn without walking, and the part the steps make, and the two add up to the whole. That is why skipping the steps at the same food slows the loss by exactly what they were burning.</span></div>
    <div class="method"><b>Sleep</b><span>The aim is 7 hours or more a night for adults, the joint recommendation of the American Academy of Sleep Medicine and the Sleep Research Society (2015), which also notes that individual need varies; 8 to 10 hours for teenagers. How regular sleep is may matter as much as how long it is (Windred and colleagues, 2024, from UK Biobank), but that needs bed and wake times, which only a connected tracker supplies here.</span></div>
    <div class="method"><b>Training splits</b><span>Full body, upper and lower, push pull legs, or a body part split: a 2024 meta-analysis of 14 trials (Ramos-Campo and colleagues) found no difference in strength or muscle growth between them when the weekly work is matched, so the right one is the one you will stick to. Weekly sets per muscle are what drive growth (Pelland and colleagues, 2025), which is why full body suits two or three days and a body part split needs about five. With fewer days than a split has sessions, the week rolls on from where it stopped, so nothing is left out.</span></div>
    <div class="method"><b>Meal times and skipped meals</b><span>Each meal records when you ate it, not when you logged it, and you can mark a meal as skipped. The American Heart Association's statement on meal timing (St-Onge and colleagues, 2017) notes that irregular eating patterns appear less favourable for heart and metabolic health, and a randomised trial found regular meal times lowered glucose responses and hunger (Alhussain and colleagues, 2016). Much of that evidence is observational, so the app shows the pattern back to you rather than setting rules.</span></div>
    <div class="method"><b>HYROX</b><span>A HYROX race is eight 1 km runs, each followed by a station in a fixed order: SkiErg 1,000 m, sled push 50 m, sled pull 50 m, burpee broad jumps 80 m, row 1,000 m, farmers carry 200 m, sandbag lunges 100 m, and 100 wall balls. Weights default to the Open division (men: 152 kg push, 103 kg pull, 2 × 24 kg carry, 20 kg sandbag, 6 kg ball; women: 102, 78, 2 × 16, 10 and 4 kg). HYROX can change weights between seasons, so check the current standards with HYROX before a race, and change any weight here. Each week mixes running under fatigue, a running engine session and station strength, building towards a full simulation; without a sled, SkiErg or rower, each station is swapped for the closest thing your equipment allows, and the session says what it stands in for.</span></div>
    <div class="method"><b>CrossFit</b><span>Varied workouts in three formats: for time, AMRAP (as many rounds as possible) and EMOM (every minute on the minute), with benchmark workouts that come round again so you can compare, and some days a strength piece first. Weights default to the standard prescribed loads; scale any of them, or swap a movement, and it is kept for next time. Injury rates in CrossFit are similar to weightlifting, powerlifting and gymnastics (Klimek and colleagues, 2018), and scaling is how that stays true for you.</span></div>
    <div class="method"><b>Readiness</b><span>Built only from what you log, sleep, stress and how your day went, compared with your own last four weeks, never a universal score. A systematic review of 56 studies (Saw and colleagues, 2016) found that self-reported measures like these track the response to training more sensitively than objective markers such as heart rate; those studies were in athletes. It says better, about usual or lower, and what is driving it, rather than a number more precise than it can be.</span></div>
    <div class="method"><b>Coming back after a break</b><span>Strength largely holds for about three weeks off, with real losses appearing between the third and fourth week and growing with time (Bosquet and colleagues, 2013), and it comes back faster than it was first built. Anything you have not done for two weeks starts 5% lighter, four weeks 10%, eight weeks or more 20%. Those steps are this app's rule of thumb built on that timeline; the research says when losses start, not an exact load to return at.</span></div>
    <div class="method"><b>When something hurts</b><span>In a session, "This one hurts" asks for a 0 to 10 rating and a few warning signs. It follows the pain-monitoring model from a randomised trial in Achilles tendon pain (Silbernagel and colleagues, 2007): up to 5 out of 10 is generally fine to train with if it settles by the next morning and does not build week to week, and people who trained that way did as well as those who rested. It was tested in tendon pain, so treat it as a guide. Sharp or sudden pain, swelling, numbness or weakness, pain after a knock, or pain at rest are not for monitoring: stop, and see a GP or physio. The app asks how it is the next morning, and says so plainly if something keeps not settling.</span></div>
    <div class="method"><b>What matters today</b><span>At most three things, ranked, each saying what changed and why. It only raises sleep once there are three nights logged in a week, food once you have been logging it, and always says how much it has to go on: nothing yet, building your baseline, or based on so many of the last fourteen days.</span></div>
    <div class="method"><b>When the plan suggests easing off</b><span>Sleep under 6.5 hours, recovery of 5 or less, or stress of 7 or more are this app's rules of thumb for suggesting an easier day or week. They are prompts to check in with yourself, not validated predictions of injury or burnout, and how you actually feel matters more than the number.</span></div>
    <div class="method"><b>Easy weeks</b><span>Every ${+S.profile.deloadEvery||DELOAD_EVERY} weeks by default, from the 4 to 8 week range in Bell and colleagues' 2025 recommendations and the roughly five and a half week gap reported by 246 competitive lifters (Rogerson and colleagues, 2024). About 10% lighter and 25 to 90% less work depending on recovery. Easy-week sessions never set your next weights. It is a sensible rule of thumb, not a requirement: you can change how often, move them, or add one early, and how you feel should win over the calendar.</span></div>
    <div class="method"><b>Fat and carbohydrate</b><span>Fat at 28% of your calories, which sits inside the 20 to 35% the dietary guidelines give, and carbohydrate is simply what is left once protein and fat are paid for. Neither is a finding: protein and total calories are the two that have evidence behind them, and the split of the rest is largely preference. Move it if you train better on more of one.</span></div>
    <div class="method"><b>Energy per kilo</b><span>7700 kcal per kg. A long run average. Early weight change is mostly water and carries far less energy, so the first fortnight usually moves faster than the maths.</span></div>
    <div class="method"><b>Beyond this week</b><span>Recalculated week by week with your new weight rather than drawn in a straight line. A lighter body burns less, and the old 3500 kcal rule overestimates because it ignores that.</span></div>
    <div class="method"><b>The margin</b><span>${pastErrors().length>=3? `From the spread of my own last ${pastErrors().length} forecasts against what actually happened.` : 'A default until I have three forecasts of yours to score myself against.'} Even the NIH Body Weight Planner, the best validated tool of this type, spans about -6% to +4% on an individual, so a single number with no margin would be overselling it.</span></div>
    <div class="method"><b>Limits</b><span>Never predicts faster than 1% of bodyweight a week. Says nothing at all when there is nothing to work from.</span></div>`;
  openSheet('howSheet');
}
document.addEventListener('click',e=>{ if(e.target.closest('#howBtn')) openHow(); });

/* ---------- cycle setup ---------- */
function openCycle(){
  const c=S.cycle;
  $('cycleBody').innerHTML=`
    <div class="field"><div class="fl"><div class="k">Track my cycle</div>
      <div class="v" id="outcyc">${c.tracking?'On':'Off'}</div></div>
      <div class="pair" style="margin:8px 0 0">
        <button class="big-pick ${c.tracking?'on':''}" data-cyc="on">On</button>
        <button class="big-pick ${!c.tracking?'on':''}" data-cyc="off">Off</button></div></div>
    <div class="field"><div class="fl"><div class="k">First day of your last period</div></div>
      <input type="date" id="cycDate" value="${c.lastPeriod||''}" style="border:1px solid var(--line);border-radius:8px;padding:10px;width:100%;font-weight:600"></div>
    <div class="field"><div class="fl"><div class="k">Usual cycle length</div><div class="v" id="outlen">${c.length||28} days</div></div>
      <input type="range" min="21" max="35" value="${c.length||28}" data-cycrange="length" aria-label="Cycle length"></div>
    <div class="note">Used for two things only: widening the weight forecast where fluid retention peaks, and saying so on the day. The measured average is about half a kilo, from one study of 42 women, so treat it as a reason not to panic rather than a precise prediction. It never changes your training on its own, because the evidence on phase based training is genuinely mixed.</div>
    <div class="note">It may not apply to you. Cycles vary a lot from person to person, and irregular cycles, hormonal contraception, pregnancy, breastfeeding and perimenopause can all change the pattern or remove it. If your weight does not follow it, trust your own trend over this, and you can switch it off at any time.</div>`;
  openSheet('cycleSheet');
}
document.addEventListener('click',e=>{
  if(e.target.closest('#cycleBtn')||e.target.closest('#cycleBtn2')) openCycle();
  const cy=e.target.closest('[data-cyc]');
  if(cy){ S.cycle.tracking=cy.dataset.cyc==='on'; save(); openCycle(); }
  if(e.target.closest('#saveCycle')){
    const d=$('cycDate'); if(d&&d.value) S.cycle.lastPeriod=d.value;
    if(S.cycle.tracking&&!S.cycle.lastPeriod){ toast('Set the first day of your last period'); return; }
    buildForecast(mondayKey()); save(); closeSheets(); renderProgress(); toast(S.cycle.tracking?'Cycle tracking on':'Cycle tracking off');
  }
});
document.addEventListener('input',e=>{
  const r=e.target.closest('[data-cycrange]');
  if(r){ S.cycle.length=+r.value; const o=$('outlen'); if(o) o.textContent=S.cycle.length+' days'; }
});

Object.assign(window.__G,{prettyDate,weightSeries,weightTrend,weightChart,projectionLine,weightPanel,wSeriesFor,wHorizon,niceTicks,W_RANGES,forecastReadiness,trendSeries,trendNow,forecastNote,bandFor,tdeeObserved,pastErrors,weeklyHistory,buildForecast,ensureForecast,reviewWeek,actualsFor,renderTrends,
  SCI,openHow,weightSlopePerDay,walkKcal,liftKcal,tdeeEstimate,tdeeObserved,trendSeries,trendNow,trendRatePerWeek,recentIntake,projectWeeks,bandFor,pastErrors,
  phaseOn,cycleDay,waterWindow,openCycle,weightChart,projectionLine,consistencyChart,weekOfDate,addDays,PHASES});
