/* ===================== progress ===================== */
function sparkline(points){
  if(points.length<2) return '';
  const w=300,h=60,pad=6, ys=points.map(p=>p.kg), min=Math.min(...ys), max=Math.max(...ys), span=(max-min)||1;
  const xs=i=>pad+i*(w-pad*2)/(points.length-1), yy=v=>pad+(1-(v-min)/span)*(h-pad*2);
  const line=points.map((p,i)=>`${i?'L':'M'}${xs(i).toFixed(1)} ${yy(p.kg).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <path d="${line} L${xs(points.length-1).toFixed(1)} ${h} L${pad} ${h} Z" fill="rgba(30,58,110,.10)"/>
    <path d="${line}" fill="none" stroke="var(--green-text)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${xs(points.length-1).toFixed(1)}" cy="${yy(points[points.length-1].kg).toFixed(1)}" r="4" fill="var(--green-text)"/></svg>`;
}
function renderProgress(){
  const p=S.profile, g=S.goal, imp=p.units==='imperial', st=weekStats();
  $('profHandle').textContent=p.onboarded? '@'+p.handle : 'your progress';
  $('profAv').textContent=(p.handle||'you').slice(0,2).toUpperCase();
  /* "tried" and "picked up" counted other people's sessions, which read as
     three zeros to anyone using this on their own. */
  $('stSessions').textContent=S.sessions;
  const wk=mondayKey();
  const planned=S.plan? S.plan.days.filter(x=>x.type&&x.slot!=='walk').length : 0;
  const doneThisWeek=(S.workouts||[]).filter(x=>x.d>=wk).length
    +(S.mine||[]).filter(p=>p.d>=wk&&(p.kind==='run'||p.kind==='fast')).length;
  $('stWeek').textContent=planned? doneThisWeek+'/'+planned : String(doneThisWeek);
  const since=addDays(todayKey(),-29);
  $('stLogged').textContent=Object.keys(S.days||{}).filter(k=>k>=since&&Object.keys(S.days[k]||{}).length).length;
  const first=S.weights[0], last=S.weights[S.weights.length-1];
  const diff=first&&last? +(last.kg-first.kg).toFixed(1):0;
  const ripples=S.tries.map(t=>({u:P[t.from]||ME,at:t.at,t:`You tried <b>${t.title}</b> from <b>@${(P[t.from]||ME).n}</b>`}))
    .concat(S.pickups.map(k=>({u:P[k.by]||ME,at:k.at,t:`<b>@${(P[k.by]||ME).n}</b> tried your <b>${k.title}</b>`})))
    .sort((a,b)=>b.at-a.at).slice(0,3);

  if(typeof renderTrends==='function') renderTrends();
  else $('dash').innerHTML=`<div class="panel"><div class="bigrow"><div class="n">${fmt(g.now)}<small> of ${g.target}</small></div></div></div>`;

  $('dashBody').innerHTML=`
  <div class="panel">
    <div class="ph"><h3>Weight</h3><button data-weigh="1">Weigh in</button></div>
    ${S.weights.length? `<div class="bigrow"><div class="n">${showW(last.kg,imp).split(' ')[0]}<small> ${imp?'lb':'kg'}</small></div>
      ${S.weights.length>1?`<div class="side" style="color:${diff<0?'var(--green-text)':(diff>0?'var(--amber-text)':'var(--mute)')}">${diff>0?'+':''}${imp?Math.round(diff*2.20462)+' lb':diff+' kg'} since you started</div>`:''}</div>
      ${S.weights.length>1? sparkline(S.weights):'<div class="note">Weigh in again next week and the line starts here.</div>'}`
      : `<div class="note" style="margin:0">Nothing logged yet. Once a week is plenty.</div>`}
  </div>
  <div class="panel">
    <div class="ph"><h3>From your tracker</h3>${healthOn()?`<button id="disconnectBtn">Disconnect</button>`:''}</div>
    ${healthOn()
      ? `<div class="numline"><div>Steps <b>${st.steps!==null?num(Math.round(st.steps)):'-'}</b> a day</div>
          <div>Sleep <b>${st.sleep!==null?st.sleep.toFixed(1):'-'}</b> h</div></div>
         <div class="note">Standing in for ${sourceName()}. A browser cannot read Apple Health or Health Connect, so these figures are generated to show how it behaves. Real ones need the phone app.</div>`
      : `<button class="mini" id="connectBtn2">Connect a tracker</button>
         <div class="note">Steps and sleep come from your watch or phone. Until then they are simply missing, not zero.</div>`}
  </div>
  <div class="panel">
    <div class="ph"><h3>Your numbers</h3>${p.detailsSet?`<button id="detailsBtn">Edit</button>`:''}</div>
    ${p.detailsSet
      ? `${(()=>{ const ct=calorieTarget(); return ct? `<div class="numline"><div>Maintenance <b>${num(ct.maintenance)}</b> kcal</div><div>Eat <b>${num(ct.kcal)}</b> kcal</div><div>Steps <b>${num(stepTarget())}</b></div></div>
        <div class="note" style="margin:4px 0 10px">${ct.source==='observed'?'Maintenance ':'Maintenance is '}${ct.sourceLabel}. ${calorieLine(ct)}</div>` : ''; })()}
        <div class="numline"><div>Protein <b>${proteinOf(p)}g</b>${proteinBasis(p).adjusted?' *':''}</div>
          <div>${showH(p.height,imp)}</div><div>${p.age} years</div></div>
         <div class="note">A rough reference. If you log food, your own targets on the Today screen are what the app works from.${proteinBasis(p).adjusted?' * Protein is worked from an adjusted reference weight rather than the scale, because fat mass has no protein requirement.':''}</div>`
      : `<button class="mini" id="detailsBtn">Work out my maintenance</button>
         <div class="note">One number, shown once. No dial, no deficit, no reminders.</div>`}
  </div>
  <div class="panel">
    <div class="ph"><h3>Shared</h3><button data-go="feed">Feed</button></div>
    <div class="twoup">
      <div><div class="n">${S.tries.length}</div><div class="l">sessions you took<br>from other people</div></div>
      <div><div class="n">${S.pickups.length}</div><div class="l">times someone<br>took one of yours</div></div></div>
    ${ripples.length? ripples.map(r=>`<div class="actrow">${av(r.u)}<div class="txt"><div class="t">${r.t}</div>
      <div class="w">${ago(r.at)}</div></div></div>`).join('')
      : `<div class="note" style="margin:0">Try someone's session from the feed and it shows here, with their name on it.</div>`}
  </div>`;

  /* each tile is a button that opens the session. They used to be plain boxes
     with nothing listening, so tapping one did nothing at all. */
  const cells=S.mine.slice(0,12);
  $('grid').innerHTML= cells.length
    ? cells.map(m=>{ const k=m.kind, hue=HUE[k]||HUE.any;
        return `<button class="gcell" data-sess="${m.id}" aria-label="${(m.title||'Session').replace(/"/g,'&quot;')}, ${prettyDateSafe(m.d)}"
          style="background:${hue.deep}">${m.title}<small>${(m.unit||'').split(',')[0]}</small></button>`; }).join('')
    : `<div class="empty">Your sessions show up here once you have done a few.</div>`;
  const all=document.getElementById('allSess');
  if(all) all.style.display= S.mine.length? '' : 'none';
  updateBadge();
}
/* Progress used to be three screens hiding behind a segmented control, with the
   coach steer appended to one of them and the account panel injected into
   another. It is one screen now: the trends, and the sessions. Lifting sits on
   Plan beside the templates it comes from, and everything about you and your
   settings is one sheet away. */
let progSeg='week';
function showSeg(){ /* the switch is gone; kept so old callers do nothing */ }
function openYou(){ renderProgress(); openSheet('youSheet'); }
const prettyDateSafe=k=>{ try{ return typeof prettyDate==='function'&&k? prettyDate(k) : (k||''); }catch(e){ return k||''; } };
document.addEventListener('click',e=>{
  if(e.target.closest('#youBtn')||e.target.closest('#profAv')) openYou();
});
function showTempoSafe(){ return !(S.profile&&S.profile.showTempo===false); }
function signedInSafe(){ try{ return !!(window.__CLOUD&&window.__CLOUD.signedIn()); }catch(e){ return false; } }
function updateBadge(){
  const unseen=S.pickups.filter(k=>!k.seen).length;
  const b=$('youBadge'); b.textContent=unseen; b.style.display=unseen?'grid':'none';
}

