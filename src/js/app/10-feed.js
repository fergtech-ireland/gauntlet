/* ===================== feed ===================== */
/* One resolver, used everywhere a name is printed. The two credit lines used to
   look people up locally, so anyone you had credited from the shared feed came
   back out as you. */
const who=id=>(typeof personFor==='function'? personFor(id) : null)||P[id]||ME;
function cardHTML(p){
  const u=who(p.by), light=p.kind==='meal';
  return `<article class="card">
    <div class="card-head">${av(u)}
      <div class="who"><div class="n">${u.n}</div><div class="s">${p.mine?(p.origin?'after @'+who(p.origin.by).n:'just now'):u.s}</div></div>
      <div class="kind ${p.kind}">${p.kind}</div></div>
    <div class="media ${light?'light':''}" data-play="${p.id}">${artFor(p)}
      <div class="chips">${p.chips.map(c=>`<div class="chip">${c}</div>`).join('')}</div>
      <div class="hero2"><div class="big">${p.title}</div><div class="sub">${p.unit}</div></div>
      <div class="playtag"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>${VERB[p.kind]}</div></div>
    <div class="acts">
      <button class="tryit ${p.mine?'again':''}" data-try="${p.id}">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2.5 21 6l-4 3.5"/><path d="M21 6H8a4 4 0 0 0-4 4v1"/><path d="M7 21.5 3 18l4-3.5"/><path d="M3 18h13a4 4 0 0 0 4-4v-1"/></svg>${p.mine?'Again':'Try it'}</button>
      <div class="tries">${num(triesOf(p))} tried this</div></div>
    <div class="body"><div class="cap"><b>${u.n}</b> ${p.cap}</div>
      ${p.mine&&p.origin?`<div class="credit">Picked up from <b>@${who(p.origin.by).n}</b></div>`:''}</div></article>`;
}
function renderFeed(){
  const mine=S.mine.slice();
  const signed=signedInSafe();
  $('feed').innerHTML= mine.length? mine.map(cardHTML).join('')
    : `<div class="empty">${signed
        ? 'Nothing here yet. Log a session and it appears, and follow someone from the person icon up top to see theirs.'
        : 'Nothing here yet. Log a session and it appears here. Make an account and you can see what the others are doing too.'}</div>`;
}
function renderPeople(){
  $('people').innerHTML=`<div class="empty">${signedInSafe()
    ? 'Nobody else has signed in yet. You are first.'
    : 'Make an account and anyone else using your copy of Gauntlet shows up here.'}</div>`;
}
function renderAll(){ renderToday(); renderPlan(); renderFeed(); renderPeople(); renderProgress();
  if(typeof renderEat==='function') renderEat();
  if(typeof mountColophons==='function') mountColophons(); }

