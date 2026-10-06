/* ---------- the coach ----------
   coachBrief() has been the most valuable function in this app since the first
   version and the least used: a structured, portable, longitudinal record of one
   person's training, eating, sleeping and moods, in plain English. Everything
   before this point exists to make sure the record is true. This is what it is
   for.
   Two deliberate constraints:
   1. There is no API key in this file, and there never will be. A key shipped in
      a static page is a key anybody can read and spend. The app posts to an
      endpoint YOU run, which holds the key and talks to whichever model you
      choose. Until you set one, this sheet does what it always did: shows the
      brief and lets you copy it into whatever you already use.
   2. The model gets the record and the app's own reasoning, and it is told
      plainly what it may not do: invent numbers, diagnose, or override the
      forecast's own uncertainty. The whole point of the brief is that it does
      not make things up, and handing it to something that does would undo the
      lot. */
const COACH_SYS = [
'0. If the brief says the person is under 18, never suggest calorie targets, deficits, dieting, meal skipping, weight goals or weighing. Talk about moving, strength with good technique, sleep, eating regularly and how they feel, and point to Childline (1800 66 66 66) or Text About It (text HELLO to 50808) if they sound low.',
'You are reading a training record produced by an app called Gauntlet, for the person who wrote it. Talk to them directly, as a coach would.',
'',
'What the app is: it builds one week of training at a time, rebuilds it from a weekly check in, forecasts bodyweight from calorie balance, and then scores its own forecasts against what happened and widens its own error bars when it gets things wrong. It shows its workings for every number. It does not count food for people and it does not pretend to certainty it has not got.',
'',
'Rules, in order of importance:',
'1. Never invent a number. If the record does not contain something, say it is not in the record. Do not estimate body fat, one rep maxes, or calories that are not there.',
'2. The record marks which figures were reported by the person and which the app derived from their logs. Keep that distinction when you talk about them.',
'3. Do not diagnose anything, and do not give medical advice. Pain that persists is a physiotherapist or a doctor, and say so plainly rather than working around it.',
'4. The forecast comes with a range for a reason. Do not narrow it, do not promise an outcome, and do not treat the midpoint as the answer.',
'5. Nothing about weight loss rate, restriction, or appearance that you would not say to someone who might be unwell. No calorie targets below what the record already sets.',
'6. Be short. Lead with the answer. Two or three things at most, the most important first. No preamble and no summary of what they just told you.',
'7. If the honest answer is that the plan is fine and they should do another week of it, say that. Most weeks that is the answer.'
].join('\n');

const coachCfg=()=>Object.assign({endpoint:'',model:'',on:false},S.coach||{});
const coachReady=()=>{ const c=coachCfg(); return !!(c.on&&c.endpoint); };
function setCoach(patch){ S.coach=Object.assign(coachCfg(),patch); save(); }

const COACH_ASKS=[
  'What should I change this week, if anything?',
  'Is the weight coming off at a sensible rate?',
  'Am I doing too much, or not enough?',
  'What is the one thing holding me back?',
  'Read my last four weeks and tell me what I am not seeing.'
];

let coachThread=[];
async function askCoach(question){
  const c=coachCfg();
  if(!coachReady()) throw new Error('no endpoint');
  const body={model:c.model||undefined, system:COACH_SYS,
    messages:coachThread.concat([{role:'user',
      content:'Here is my record.\n\n'+coachBrief()+'\n\nMy question: '+question}])};
  const r=await fetch(c.endpoint,{method:'POST',
    headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
  if(!r.ok) throw new Error('the endpoint returned '+r.status);
  const data=await r.json();
  /* Accept the two shapes anybody's proxy is likely to hand back. */
  const text = typeof data==='string'? data
    : (Array.isArray(data.content)? data.content.filter(x=>x.type==='text').map(x=>x.text).join('\n')
    : (data.text || data.reply || (data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content) || ''));
  if(!text) throw new Error('the endpoint sent nothing readable back');
  coachThread=coachThread.concat([{role:'user',content:question},{role:'assistant',content:text}]);
  return text;
}

let coachBusy=false, coachLast='', coachErr='';
function openCoach(){ coachErr=''; drawCoach(); openSheet('coachSheet'); }
function drawCoach(){
  const c=coachCfg(), ready=coachReady();
  document.getElementById('coachBody').innerHTML=`
    ${ready? `
      <div class="slab">Ask it something</div>
      <div class="chips" style="margin-bottom:10px">${COACH_ASKS.map((q,i)=>`<button data-coachask="${i}">${q}</button>`).join('')}</div>
      <textarea class="ta" id="coachQ" placeholder="Or your own question. It has your whole record already."></textarea>
      <button class="sheetcta" id="coachGo" ${coachBusy?'disabled':''}>${coachBusy?'Reading your record...':'Ask'}</button>
      ${coachErr? `<div class="warn" style="margin-top:12px">${coachErr}</div>`:''}
      ${coachLast? `<div class="slab">What it said</div><div class="coachout">${coachLast.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>')}</div>
        <div class="note">It only knows what is in the brief below. It cannot see your form, your life, or anything you have not logged.</div>`:''}
      ${coachThread.length? `<button class="skipbtn" id="coachClear">Start a fresh conversation</button>`:''}
    ` : `
      <div class="method"><b>Nothing is connected</b><span>The brief below is the whole record in plain English. Copy it into whatever you already use, or point this at an endpoint of your own and ask questions here instead.</span></div>
      <div class="method"><b>Why there is no key in the app</b><span>This page is a single file that anybody who has it can read. A key in it is a key they can spend. So the app posts to a URL you run, that URL holds the key, and it talks to whichever model you like.</span></div>
      <div class="method"><b>What your endpoint receives</b><span>A JSON POST with <code>system</code>, <code>messages</code> and optionally <code>model</code>. Send back either the provider's own response, or <code>{"text": "..."}</code>. Both are handled.</span></div>
      <button class="sheetcta" id="coachSetup">Point it at an endpoint</button>
    `}
    <div class="slab">The brief itself</div>
    <div class="note" style="margin-bottom:8px">Everything that would be sent. Nothing else leaves the app.</div>
    <pre class="brief" id="coachBriefText">${coachBrief().replace(/&/g,'&amp;').replace(/</g,'&lt;')}</pre>
    <button class="mini" id="coachCopy">Copy the brief</button>`;
}
function drawCoachSetup(){
  const c=coachCfg();
  document.getElementById('coachBody').innerHTML=`
    <div class="nf" style="margin-bottom:10px"><label>Your endpoint</label>
      <input id="coachUrl" value="${(c.endpoint||'').replace(/"/g,'&quot;')}"
        placeholder="https://something-you-run.example/coach"
        style="font-family:var(--font-ui);font-size:14px;font-weight:600"></div>
    <div class="nf" style="margin-bottom:10px"><label>Model, if your endpoint wants one</label>
      <input id="coachModel" value="${(c.model||'').replace(/"/g,'&quot;')}" placeholder="optional"
        style="font-family:var(--font-ui);font-size:14px;font-weight:600"></div>
    <div class="method"><b>What it has to do</b><span>Accept a JSON POST of <code>{system, messages, model}</code>, add your API key, call the model, and return the response. Twenty lines of anything. It must send CORS headers back to this origin or the browser will refuse the reply.</span></div>
    <div class="method"><b>What goes over the wire</b><span>Your brief: weights, sessions, check ins, habits, target, and any lines you wrote about your days. Send it somewhere you trust, and nowhere else.</span></div>
    <button class="sheetcta" id="coachSave">Save it</button>
    <button class="skipbtn" id="coachBack">Back</button>`;
}
document.addEventListener('click',async e=>{
  if(e.target.closest('#coachBtn')||e.target.closest('#briefBtn')){ openCoach(); return; }
  if(e.target.closest('#coachSetup')){ drawCoachSetup(); return; }
  if(e.target.closest('#coachBack')){ drawCoach(); return; }
  if(e.target.closest('#coachSave')){
    const url=(document.getElementById('coachUrl')||{}).value||'';
    const model=(document.getElementById('coachModel')||{}).value||'';
    if(url&&!/^https:\/\//.test(url.trim())){ toast('It has to be an https address'); return; }
    setCoach({endpoint:url.trim(),model:model.trim(),on:!!url.trim()});
    drawCoach(); renderAll(); toast(url.trim()? 'Connected' : 'Endpoint cleared'); return; }
  if(e.target.closest('#coachClear')){ coachThread=[]; coachLast=''; coachErr=''; drawCoach(); return; }
  if(e.target.closest('#coachCopy')){
    const text=coachBrief();
    try{ await navigator.clipboard.writeText(text); toast('Brief copied'); }
    catch(err){ toast('Select it and copy by hand'); }
    return; }
  const qa=e.target.closest('[data-coachask]');
  if(qa){ const box=document.getElementById('coachQ'); if(box){ box.value=COACH_ASKS[+qa.dataset.coachask]; box.focus(); } return; }
  if(e.target.closest('#coachGo')){
    const box=document.getElementById('coachQ');
    const q=(box&&box.value||'').trim();
    if(!q){ toast('Ask it something first'); return; }
    coachBusy=true; coachErr=''; drawCoach();
    try{ coachLast=await askCoach(q); }
    catch(err){ coachErr='That did not come back: '+(err&&err.message||'no connection')+'. The brief is still below, and copying it still works.'; }
    coachBusy=false; drawCoach();
    return; }
});
Object.assign(window.__G||{},{COACH_SYS,coachCfg,coachReady,setCoach,askCoach,openCoach,COACH_ASKS,ownTargets,targetKcalPreview,openFocusSheet,openTplEdit});
