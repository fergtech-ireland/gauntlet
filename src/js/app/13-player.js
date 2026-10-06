/* ===================== player ===================== */
const player=$('player');
let SESSION=null, tick=null;
function stageArt(type){
  const c=HUE[type].deep;
  if(type==='run') return `<svg class="bgart" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice"><rect width="400" height="400" fill="${c}"/>
    <path d="M-20 300 C 80 250,120 340,220 280 S 360 220,420 270" fill="none" stroke="${MARIGOLD}" stroke-width="3" opacity=".5"/>
    <path d="M-20 334 C 90 292,140 372,240 312 S 380 250,420 302" fill="none" stroke="${MARIGOLD}" stroke-width="2" opacity=".28"/></svg>`;
  if(type==='meal') return `<svg class="bgart" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice"><rect width="400" height="400" fill="${c}"/>
    <circle cx="200" cy="200" r="150" fill="none" stroke="${CLAY}" stroke-width="2" opacity=".3"/></svg>`;
  if(type==='fast') return `<svg class="bgart" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice"><rect width="400" height="400" fill="${c}"/>
    <circle cx="200" cy="200" r="160" fill="none" stroke="${CLAY}" stroke-width="1.5" opacity=".25"/></svg>`;
  return `<svg class="bgart" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice"><rect width="400" height="400" fill="${c}"/>
    <g fill="none" stroke="#f3e7e9" stroke-width="2" opacity=".22">${Array.from({length:9},(_,i)=>`<circle cx="200" cy="200" r="${40+i*26}"/>`).join('')}</g></svg>`;
}
function startSession(sess){
  if(!sess) return null;
  closeSheets();
  SESSION={sess,i:0,left:sess.steps[0].sec,running:true,done:false,total:0};
  player.style.background=HUE[sess.type].deep;
  $('playerTitle').textContent=sess.title;
  $('stage').innerHTML=stageArt(sess.type)+
    `<div class="clock"><div class="num" id="clockNum">00:00</div><div class="lbl" id="clockLbl"></div>
     <div class="cue" id="cue">Auto-advances. Tap anywhere to pause.</div></div>`;
  $('stage').onclick=togglePlay;
  drawList(); drawCtl(); paint(); player.classList.add('on');
  clearInterval(tick);
  tick=setInterval(()=>{ if(!SESSION||!SESSION.running||SESSION.done) return;
    SESSION.left--; SESSION.total++; if(SESSION.left<=0) nextStep(); paint(); },1000);
  return SESSION;
}
const drawList=()=>$('plist').innerHTML=SESSION.sess.steps.map((s,i)=>
  `<div class="pitem ${i===SESSION.i?'now':(i<SESSION.i?'past':'')}"><div class="i">${String(i+1).padStart(2,'0')}</div>
   <div class="n">${s.n}</div><div class="r">${s.r}</div></div>`).join('');
const drawCtl=()=>$('pctl').innerHTML=SESSION.done
  ? `<button class="b main" id="postBtn">Post it</button><button class="b" id="afterBtn">See your week</button>`
  : `<button class="b" id="prevBtn">Back</button><button class="b main" id="playBtn">${SESSION.running?'Pause':'Resume'}</button><button class="b" id="nextBtn">Next</button>`;
function paint(){
  if(!SESSION||SESSION.done) return;
  const n=$('clockNum'); if(!n) return;
  n.textContent=String(Math.floor(SESSION.left/60)).padStart(2,'0')+':'+String(SESSION.left%60).padStart(2,'0');
  $('clockLbl').textContent=SESSION.sess.steps[SESSION.i].n+' · '+SESSION.sess.steps[SESSION.i].r;
}
function togglePlay(){ if(!SESSION||SESSION.done) return; SESSION.running=!SESSION.running; drawCtl();
  const c=$('cue'); if(c) c.textContent=SESSION.running?'Auto-advances. Tap anywhere to pause.':'Paused'; }
function nextStep(){ if(SESSION.i<SESSION.sess.steps.length-1){SESSION.i++;SESSION.left=SESSION.sess.steps[SESSION.i].sec;drawList();paint();} else finishSession(); }
function prevStep(){ if(SESSION.i>0){SESSION.i--;SESSION.left=SESSION.sess.steps[SESSION.i].sec;drawList();paint();} }
function finishSession(){
  if(!SESSION||SESSION.done) return;
  SESSION.done=true; SESSION.running=false; clearInterval(tick);
  const res=logSession(SESSION.sess), g=res.goal, mins=Math.max(1,Math.round(SESSION.total/60*9));
  const credit=res.credited? `<p style="margin:10px 0 0;font-size:13px;color:${MARIGOLD}">Credited to @${res.credited.n}</p>`:'';
  const left=Math.max(0,+(g.target-g.now).toFixed(1));
  const gblock=res.added? `<div class="g"><div class="t">${g.label}</div><div class="v">${fmt(g.now)} / ${g.target}</div>
      <div class="bar"><i style="width:${pct(g)}%;background:${MARIGOLD}"></i></div>
      <div class="t" style="margin-top:9px">${left>0? fmt(left)+' to go':'That is the week done.'}</div></div>` : '';
  $('stage').innerHTML=stageArt(SESSION.sess.type)+
    `<div class="finish"><div class="n">Done.</div>
     <p style="opacity:.7;margin:8px 0 0;font-size:13.5px">${SESSION.sess.title} · ${mins} min · ${SESSION.sess.steps.length} parts</p>${credit}${gblock}</div>`;
  $('stage').onclick=null; drawList(); drawCtl();
}
function closePlayer(){ player.classList.remove('on'); clearInterval(tick); }
$('closePlayer').addEventListener('click',closePlayer);
document.addEventListener('click',e=>{
  if(e.target.closest('#playBtn')) return togglePlay();
  if(e.target.closest('#nextBtn')) return nextStep();
  if(e.target.closest('#prevBtn')) return prevStep();
  if(e.target.closest('#postBtn')){ closePlayer(); go('feed'); toast('Posted to your feed'); return; }
  if(e.target.closest('#afterBtn')){ closePlayer(); go('progress'); return; }
});


