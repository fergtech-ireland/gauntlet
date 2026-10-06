/* =====================================================================
   Accounts and the shared feed.
   Sign in is a magic link: no password to forget, no password to leak.
   Your own logs stay private to your row, enforced by row level security
   in Postgres rather than by this file. The feed is shared with whoever
   else is signed in to the same project.
   ===================================================================== */
/* ============================================================
   PASTE YOUR PROJECT HERE BEFORE YOU UPLOAD, and nobody else has
   to type anything. Both values are public by design: what
   protects people is row level security in the database, not
   secrecy. Never put the service role key here.
   Supabase: Project Settings, API keys.
   ============================================================ */
const CLOUD_CONFIG={
  url: 'https://zerclmrlwniaogtxyngw.supabase.co',
  key: 'sb_publishable_C5lUkvG-ZtESrhc_-71HOg_jejh2AJG'
};
const cloudReady=()=>!!(CLOUD_CONFIG.url&&CLOUD_CONFIG.key);
const CLOUD_KEY='gauntlet.cloud';
function loadCloud(){
  try{ return Object.assign({url:'',key:'',session:null,auto:true,pending:false,error:null,lastPush:null},
    JSON.parse(localStorage.getItem(CLOUD_KEY)||'{}')); }
  catch(e){ return {url:'',key:'',session:null,auto:true,pending:false,error:null,lastPush:null}; }
}
let C=loadCloud();
/* the built in project wins unless someone has deliberately typed their own */
if(cloudReady() && (!C.url || C.fromConfig)){
  C.url=CLOUD_CONFIG.url; C.key=CLOUD_CONFIG.key; C.fromConfig=true;
  try{ localStorage.setItem(CLOUD_KEY,JSON.stringify(C)); }catch(e){}
}
function saveCloud(){ try{ localStorage.setItem(CLOUD_KEY,JSON.stringify(C)); }catch(e){} }
const configured=()=>!!(C.url&&C.key);
const signedIn=()=>!!(C.session&&C.session.access_token&&C.session.user_id);
const myId=()=>signedIn()? C.session.user_id : null;
const base=()=>C.url.replace(/\/+$/,'');
const authHeaders=()=>({apikey:C.key,Authorization:'Bearer '+((C.session&&C.session.access_token)||C.key),'Content-Type':'application/json'});

/* ---------- auth ---------- */
async function sendMagicLink(email){
  if(!configured()) return {ok:false,reason:'Set the project URL and key first.'};
  try{
    const res=await fetch(base()+'/auth/v1/otp',{method:'POST',
      headers:{apikey:C.key,'Content-Type':'application/json'},
      body:JSON.stringify({email,create_user:true,options:{email_redirect_to:location.href.split('#')[0]}})});
    if(!res.ok) return {ok:false,reason:res.status===422?'That email was refused. Check it is spelled right.':'Supabase said '+res.status+'.'};
    return {ok:true};
  }catch(e){ return {ok:false,reason:'No connection.'}; }
}
function readAuthHash(){
  const h=(location.hash||'').replace(/^#/,'');
  if(!h||h.indexOf('access_token=')<0) return false;
  const q={}; h.split('&').forEach(kv=>{ const [k,v]=kv.split('='); q[k]=decodeURIComponent(v||''); });
  if(!q.access_token) return false;
  C.session={access_token:q.access_token, refresh_token:q.refresh_token||null,
    expires_at: Date.now()+((+q.expires_in||3600)*1000), user_id:null, email:null};
  saveCloud();
  try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){}
  return true;
}
async function fetchUser(){
  if(!C.session) return null;
  try{
    const res=await fetch(base()+'/auth/v1/user',{headers:authHeaders()});
    if(!res.ok) return null;
    const u=await res.json();
    C.session.user_id=u.id; C.session.email=u.email; saveCloud();
    return u;
  }catch(e){ return null; }
}
async function refreshSession(){
  if(!C.session||!C.session.refresh_token) return false;
  try{
    const res=await fetch(base()+'/auth/v1/token?grant_type=refresh_token',{method:'POST',
      headers:{apikey:C.key,'Content-Type':'application/json'},
      body:JSON.stringify({refresh_token:C.session.refresh_token})});
    if(!res.ok){ return false; }
    const d=await res.json();
    C.session=Object.assign({},C.session,{access_token:d.access_token,refresh_token:d.refresh_token,
      expires_at:Date.now()+((d.expires_in||3600)*1000)});
    saveCloud(); return true;
  }catch(e){ return false; }
}
async function ensureSession(){
  if(!signedIn()&&C.session) await fetchUser();
  if(C.session&&C.session.expires_at&&C.session.expires_at-Date.now()<120000) await refreshSession();
  return signedIn();
}
function signOut(){ C.session=null; saveCloud(); renderAll(); toast('Signed out. Your week stays on this device.'); }

/* ---------- rest helpers ---------- */
async function api(path,opts){
  if(!configured()) return {ok:false,reason:'not set up'};
  await ensureSession();
  try{
    const res=await fetch(base()+'/rest/v1/'+path,Object.assign({headers:authHeaders()},opts||{}));
    if(!res.ok){
      const reason = res.status===401||res.status===403? 'Signed out, or the group has not been given access.'
        : (res.status===404? 'That table is missing. Run the setup SQL.' : 'Supabase said '+res.status+'.');
      return {ok:false,status:res.status,reason};
    }
    const text=await res.text();
    return {ok:true,data:text? JSON.parse(text):null};
  }catch(e){ return {ok:false,reason:'offline'}; }
}
const upsert=(table,body,conflict)=>api(table+(conflict?'?on_conflict='+conflict:''),
  {method:'POST',headers:Object.assign(authHeaders(),{Prefer:'resolution=merge-duplicates,return=representation'}),
   body:JSON.stringify(body)});

/* ---------- your private state ---------- */
async function pushState(){
  if(!signedIn()) return {ok:false,reason:'not signed in'};
  const r=await upsert('state',{user_id:myId(),rev:S.rev||0,payload:S,updated_at:new Date().toISOString()},'user_id');
  if(r.ok){ C.pending=false; C.error=null; C.lastPush=Date.now(); }
  else { C.pending=true; C.error=r.reason; }
  saveCloud(); return r;
}
async function pullState(){
  if(!signedIn()) return {ok:false,reason:'not signed in'};
  const r=await api('state?user_id=eq.'+myId()+'&select=rev,payload');
  if(!r.ok) return r;
  const row=r.data&&r.data[0];
  if(!row) return {ok:true,applied:false,reason:'nothing up there yet'};
  const inbound = row.payload && row.payload.v!==4 ? migrate(row.payload) : row.payload;
  if(inbound && (row.rev||0)>(S.rev||0)){
    S=normalise(inbound); ensurePlan(); save(); renderAll();
    return {ok:true,applied:true};
  }
  return {ok:true,applied:false,reason:'this device is the newer one'};
}
let pushTimer=null;
function queuePush(){
  if(!signedIn()||!C.auto) return;
  clearTimeout(pushTimer);
  pushTimer=setTimeout(()=>{ pushState().then(renderCloudPanel); },4000);
}
const _save=save;
save=function(){ S.rev=(S.rev||0)+1; const r=_save(); queuePush(); return r; };
window.addEventListener('online',()=>{ if(C.pending) pushState().then(renderCloudPanel); });

/* ---------- the shared side ---------- */
let REMOTE={profiles:{},posts:[],follows:[],loaded:false};
const colorFor=h=>['#1e3a6e','#6e1f2e','#a8552a','#1b4a3c','#2f5d6e','#5c6b2f','#8a6a2f','#161618'][(h||'x').charCodeAt(0)%8];
async function ensureProfile(){
  if(!signedIn()||!S.profile.handle) return null;
  return upsert('profiles',{user_id:myId(),handle:S.profile.handle,aim:S.profile.aim},'user_id');
}
async function loadRemote(){
  if(!signedIn()) return {ok:false};
  const [pr,po,fo]=await Promise.all([
    api('profiles?select=user_id,handle,aim'),
    api('posts?select=id,user_id,kind,title,unit,chips,caption,session,origin_post,try_count,created_at&order=created_at.desc&limit=60'),
    api('follows?follower=eq.'+myId()+'&select=followee')
  ]);
  if(!pr.ok||!po.ok) return pr.ok? po : pr;
  REMOTE.profiles={}; (pr.data||[]).forEach(p=>{ REMOTE.profiles[p.user_id]={id:p.user_id,n:p.handle,full:p.handle,c:colorFor(p.handle),s:p.aim?('aiming to '+p.aim):'on Gauntlet'}; });
  REMOTE.follows=(fo.data||[]).map(f=>f.followee);
  REMOTE.posts=(po.data||[]).map(r=>({
    id:'r'+r.id, remoteId:r.id, by:r.user_id, kind:r.kind, title:r.title, unit:r.unit||'',
    chips:Array.isArray(r.chips)?r.chips:[], cap:r.caption||'', session:r.session||{title:r.title,type:r.kind,adds:1,steps:[]},
    baseTries:r.try_count||0, mine:r.user_id===myId(), origin:r.origin_post?{by:null,postId:r.origin_post}:null,
    d:(r.created_at||'').slice(0,10), when:'recently'}));
  REMOTE.loaded=true;
  renderFeed(); renderPeople();
  return {ok:true,posts:REMOTE.posts.length,people:Object.keys(REMOTE.profiles).length};
}
async function publishPost(post){
  if(!signedIn()) return {ok:false,reason:'not signed in'};
  await ensureProfile();
  const body={user_id:myId(),kind:post.kind,title:post.title,unit:post.unit,
    chips:post.chips||[],caption:post.cap||'',session:post.session||null};
  if(post.origin&&post.origin.remoteId) body.origin_post=post.origin.remoteId;
  const r=await api('posts',{method:'POST',headers:Object.assign(authHeaders(),{Prefer:'return=representation'}),body:JSON.stringify(body)});
  if(r.ok) loadRemote();
  return r;
}
async function recordTry(remoteId){
  if(!signedIn()||!remoteId) return {ok:false};
  await api('tries',{method:'POST',headers:authHeaders(),body:JSON.stringify({user_id:myId(),post_id:remoteId})});
  return api('rpc/increment_try',{method:'POST',headers:authHeaders(),body:JSON.stringify({p_post:remoteId})});
}
async function toggleRemoteFollow(userId){
  if(!signedIn()) return {ok:false};
  const on=REMOTE.follows.includes(userId);
  const r = on
    ? await api('follows?follower=eq.'+myId()+'&followee=eq.'+userId,{method:'DELETE',headers:authHeaders()})
    : await api('follows',{method:'POST',headers:authHeaders(),body:JSON.stringify({follower:myId(),followee:userId})});
  if(r.ok){ REMOTE.follows = on? REMOTE.follows.filter(x=>x!==userId) : REMOTE.follows.concat([userId]); renderFeed(); renderPeople(); }
  return r;
}
/* the feed, the people list and the try button all switch to the real thing once signed in */
const _renderFeed=renderFeed;
renderFeed=function(){
  if(!signedIn()||!REMOTE.loaded) return _renderFeed();
  const visible=REMOTE.posts.filter(p=>p.mine||REMOTE.follows.includes(p.by));
  document.getElementById('feed').innerHTML = visible.length? visible.map(cardHTML).join('')
    : `<div class="empty">Nobody you follow has posted yet. Tap the person icon up top to find the others.</div>`;
};
const _renderPeople=renderPeople;
renderPeople=function(){
  if(!signedIn()||!REMOTE.loaded) return _renderPeople();
  const rows=Object.values(REMOTE.profiles).filter(p=>p.id!==myId());
  document.getElementById('people').innerHTML = rows.length? rows.map(p=>`<div class="prow">${av(p)}
    <div class="txt"><div class="n">${p.n}</div><div class="s">${p.s}</div></div>
    <button class="follow ${REMOTE.follows.includes(p.id)?'on':''}" data-rfollow="${p.id}">${REMOTE.follows.includes(p.id)?'Following':'Follow'}</button></div>`).join('')
    : `<div class="empty">Nobody else has signed in yet. You are first.</div>`;
};
const _P=P;
function personFor(id){ return REMOTE.profiles[id] || _P[id] || ME; }
document.addEventListener('click',async e=>{
  const rf=e.target.closest('[data-rfollow]');
  if(rf) toggleRemoteFollow(rf.dataset.rfollow);
});
/* when you finish something, it goes up as a post and credits whoever you took it from */
const _logSession=logSession;
logSession=function(sess){
  const res=_logSession(sess);
  if(signedIn()&&res&&res.post){
    const src=sess.fromPost? REMOTE.posts.find(p=>p.id===sess.fromPost) : null;
    if(src) res.post.origin=Object.assign({},res.post.origin,{remoteId:src.remoteId});
    publishPost(res.post);
    if(src) recordTry(src.remoteId);
  }
  return res;
};

/* ---------- your data, and getting it back out ----------
   An app that keeps a record of somebody's body, their food and their moods owes
   them three things: the whole record in a form they can read, a way to destroy
   it, and a plain account of what is held where. None of this was here. */
function exportPayload(){
  return {app:'Gauntlet', version:APP_VERSION, exported:new Date().toISOString(),
    note:'Everything Gauntlet holds about you. Plain JSON, yours to keep, import or delete.',
    profile:S.profile, plan:S.plan, goal:S.goal, days:S.days, weights:S.weights,
    checkins:S.checkins, lifts:S.lifts, workouts:S.workouts, templates:S.templates,
    circuits:S.circuits, runPlans:S.runPlans, customFoods:S.customFoods, savedMeals:S.savedMeals,
    cycle:S.cycle, forecasts:S.forecasts, health:S.health, posts:S.mine,
    account: signedIn()? {email:(C.session&&C.session.email)||null, id:myId()} : null,
    /* the fields above are for reading; this is everything, for restoring.
       Habits, targets and easy weeks used to be missing, so "everything" was
       not true. */
    state: JSON.parse(JSON.stringify(S))};
}
/* ---------- restoring from a download (Review P2-04) ----------
   Takes a Gauntlet download, says what is in it, and only replaces this
   phone's data after a second tap. The data it replaces is kept aside, so the
   restore can be undone. Older downloads, from before the full copy was
   included, are rebuilt from their readable fields. */
const RESTORE_BACKUP='gauntlet.beforeRestore';
let restorePending=null;
function stateFromExport(x){
  if(!x||typeof x!=='object') throw new Error('That file is not a Gauntlet download.');
  if(x.app!=='Gauntlet') throw new Error('That file is not a Gauntlet download.');
  let st;
  if(x.state&&typeof x.state==='object') st=x.state;
  else {
    st=freshState();
    ['profile','plan','goal','days','weights','checkins','lifts','workouts','templates','circuits','runPlans',
     'customFoods','savedMeals','cycle','forecasts','health'].forEach(k=>{ if(x[k]!==undefined) st[k]=x[k]; });
    if(Array.isArray(x.posts)) st.mine=x.posts;
  }
  if(!st.profile||typeof st.profile!=='object') throw new Error('That download has no profile in it.');
  ['weights','checkins','workouts'].forEach(k=>{ if(st[k]!==undefined&&!Array.isArray(st[k])) throw new Error('That download looks damaged.'); });
  if(st.days&&typeof st.days!=='object') throw new Error('That download looks damaged.');
  return st;
}
function restoreSummary(st,x){
  const w=(st.weights||[]).length, d=Object.keys(st.days||{}).length, s=(st.workouts||[]).length;
  const when=x&&x.exported? new Date(x.exported) : null;
  return (when&&!isNaN(when)? 'Downloaded '+when.getDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][when.getMonth()]+' '+when.getFullYear()+'. ' : '')
    +w+' weigh in'+(w===1?'':'s')+', '+d+' day'+(d===1?'':'s')+' logged, '+s+' workout'+(s===1?'':'s')+'.';
}
function applyRestore(st){
  try{ localStorage.setItem(RESTORE_BACKUP,JSON.stringify(S)); localStorage.setItem(STORE_KEY,JSON.stringify(st)); }
  catch(e){ return false; }
  reloadApp(); return true;
}
function undoRestore(){
  let back=null; try{ back=localStorage.getItem(RESTORE_BACKUP); }catch(e){}
  if(!back) return false;
  try{ localStorage.setItem(STORE_KEY,back); localStorage.removeItem(RESTORE_BACKUP); }catch(e){ return false; }
  reloadApp(); return true;
}
document.addEventListener('change',e=>{
  if(e.target.id!=='restoreFile') return;
  const f=e.target.files&&e.target.files[0], note=document.getElementById('restoreNote'); if(!f) return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const x=JSON.parse(String(r.result)); const st=stateFromExport(x);
      restorePending=st;
      note.innerHTML=escHabit(restoreSummary(st,x))+' <button class="inlinebtn" id="restoreGo">Replace this phone\'s data with it</button>';
    }catch(err){ restorePending=null; note.textContent=err.message||'That file could not be read.'; }
  };
  r.readAsText(f);
});
document.addEventListener('click',e=>{
  if(e.target.closest('#restoreBtn')){ const i=document.getElementById('restoreFile'); if(i) i.click(); return; }
  const go=e.target.closest('#restoreGo');
  if(go&&restorePending){
    if(!go.dataset.armed){ go.dataset.armed='1'; go.textContent='Tap again to replace it. You can undo this.'; return; }
    applyRestore(restorePending); return; }
  if(e.target.closest('#restoreUndo')){ undoRestore(); }
});
function downloadData(){
  try{
    const blob=new Blob([JSON.stringify(exportPayload(),null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download='gauntlet-'+todayKey()+'.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
    toast('Downloaded. That is everything.');
  }catch(err){ toast('Could not save the file here'); }
}
/* Everything this person put in the database, not just some of it. The app
   writes to four tables: state (their saved data), profiles (handle and aim),
   posts (the feed) and follows (both directions). The first version only
   cleared two of them.
   Two rules make this honest:
   1. A delete the database's rules refuse still answers 204 with nothing
      removed, so every table is checked afterwards rather than trusted.
   2. If anything is left in the database, nothing is removed from this device
      either. Wiping the device first would sign them out and leave them with no
      way to retry, holding data they had asked to be destroyed. */
const ERASE_TABLES=[
  ['your feed posts','posts','user_id'],
  ['who you follow','follows','follower'],
  ['who follows you','follows','followee'],
  ['your profile','profiles','user_id'],
  ['your saved data','state','user_id']];
async function eraseRemote(){
  if(!signedIn()) return {done:true,left:[]};
  const me=encodeURIComponent(myId()), left=[];
  for(const [label,table,col] of ERASE_TABLES){
    const q=table+'?'+col+'=eq.'+me;
    try{
      await fetch(base()+'/rest/v1/'+q,{method:'DELETE',headers:authHeaders()});
      const chk=await fetch(base()+'/rest/v1/'+q+'&select='+col+'&limit=1',{headers:authHeaders()});
      const rows=chk.ok? await chk.json() : null;
      if(!Array.isArray(rows)) left.push(label+' (could not be checked)');
      else if(rows.length) left.push(label);
    }catch(e){ left.push(label+' (no connection)'); }
  }
  /* Last, once the data is gone: the sign-in account itself, through a
     database function that only ever deletes the caller. If the function has
     not been set up yet this says so, and the device is kept, the same as any
     other refusal. (Review P0 05.) */
  if(!left.length){
    try{
      const res=await fetch(base()+'/rest/v1/rpc/delete_my_account',{method:'POST',headers:authHeaders(),body:'{}'});
      if(!res.ok) left.push('your sign-in account (the database is not set up to remove it yet)');
    }catch(e){ left.push('your sign-in account (no connection)'); }
  }
  return {done:!left.length,left};
}
function eraseLocal(){
  try{ localStorage.removeItem(STORE_KEY); localStorage.removeItem(CLOUD_KEY);
    ['gauntlet.v3','gauntlet.v2','gauntlet.v1',NUDGE_KEY].forEach(k=>localStorage.removeItem(k)); }catch(e){}
}
async function eraseEverything(){
  const r=await eraseRemote();
  if(!r.done) return {ok:false,left:r.left};
  eraseLocal();
  return {ok:true,left:[]};
}
function openData(){
  const signed=signedIn();
  document.getElementById('cloudBody').innerHTML=`
    <div class="method"><b>What is held, and where</b><span>Your week, your weigh ins, your food, your lifts and your check ins live in this browser's own storage on this device.${signed? ' Because you are signed in, a copy is also kept in the project database so it reaches your other devices. That copy is readable only by you, which the database enforces, not this page. Your handle, your aim and anything you post to the feed are different: other people using the app can see those, because that is what the feed is.' : ' Nothing leaves this device unless you make an account.'}</span></div>
    <div class="method"><b>What is never held</b><span>No advertising identifiers, no third party analytics, no location. The only thing that leaves this device on its own is the request that fetches the typeface.</span></div>
    <div class="method"><b>Take it with you</b><span>One file, plain JSON, everything in it. Readable in any text editor and not locked to this app.</span></div>
    <button class="sheetcta" id="dlData">Download everything</button>
    <button class="sheetcta" id="restoreBtn" style="background:var(--grey-btn);color:var(--ink);margin-top:8px">Restore from a download</button>
    <input type="file" id="restoreFile" accept="application/json,.json" style="display:none" aria-label="Choose a Gauntlet download">
    <div class="note" id="restoreNote">${(()=>{ try{ return localStorage.getItem(RESTORE_BACKUP)? 'This phone was restored from a download. <button class="inlinebtn" id="restoreUndo">Undo the restore</button>' : 'For a new phone, or to go back to an earlier copy. It shows what is in the file before replacing anything.'; }catch(e){ return ''; } })()}</div>
    <div class="method" style="margin-top:14px"><b>Delete it all</b><span>${signed
      ? 'Deletes your saved data, profile, feed posts and follows from the database, checks each one is really gone, then wipes this device and starts you again from the first screen. Last, it removes your sign-in account itself. If the database refuses any of it, nothing is wiped here, so you can try again.'
      : 'Wipes this device and starts you again from the first screen.'} It cannot be undone, so take the download first if you want a copy.</span></div>
    <button class="sheetcta" id="wipeData" style="background:var(--oxblood)">Delete everything</button>
    <div class="note" id="wipeNote"></div>`;
  openSheet('cloudSheet');
}
document.addEventListener('click',async e=>{
  if(e.target.closest('#dataBtn')) openData();
  if(e.target.closest('#dlData')) downloadData();
  if(e.target.closest('#wipeLocalOnly')){ eraseLocal(); location.reload(); return; }
  if(e.target.closest('#wipeData')){
    const b=e.target.closest('#wipeData'), note=document.getElementById('wipeNote');
    if(b.dataset.armed!=='1'){
      b.dataset.armed='1'; b.textContent='Tap again to delete everything';
      if(note) note.textContent='Last chance. This is not recoverable.';
      setTimeout(()=>{ if(b&&b.dataset){ b.dataset.armed=''; b.textContent='Delete everything';
        if(note) note.textContent=''; } },6000);
      return;
    }
    if(note) note.textContent='Deleting...';
    b.disabled=true;
    const r=await eraseEverything();
    if(r.ok){
      if(note) note.textContent='Everything is gone. Starting again.';
      setTimeout(()=>location.reload(),1200);
    } else {
      b.disabled=false; b.dataset.armed=''; b.textContent='Try again';
      if(note) note.innerHTML='Still in the database: '+r.left.join(', ')+'. Nothing has been removed from this device, so you can try again. '
        +'If it keeps failing, the database is not set up to allow deletion yet, which the person running the project needs to fix. '
        +'<button class="inlinebtn" id="wipeLocalOnly">Wipe this device only</button>';
    }
  }
});

/* ---------- the account panel ---------- */
function cloudStatus(){
  if(!configured()) return 'No account needed. Everything stays on this device.';
  if(!signedIn()) return 'No account yet. Make one and your week is backed up, works on a second device, and you can see the others.';
  if(C.pending) return 'Signed in. Waiting for a connection to back up.';
  if(C.error) return C.error;
  return 'Signed in as '+(C.session.email||'you')+(C.lastPush?', backed up '+ago(C.lastPush)+'.':'.');
}
function renderCloudPanel(){
  const el=document.getElementById('cloudPanel'); if(!el) return;
  el.innerHTML=`<div class="ph"><h3>Account and sharing</h3>${signedIn()?`<button id="cloudSync">Sync now</button>`:''}</div>
    <div class="note" style="margin:0 0 10px">${cloudStatus()}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${!signedIn()&&configured()?`<button class="mini go" id="cloudSignIn">Create an account or sign in</button>`:''}
      ${signedIn()?`<button class="mini quiet" id="cloudOut">Sign out</button>`:''}
      <button class="mini" id="dataBtn">Your data</button>
      ${cloudReady()?'':`<button class="mini" id="cloudSetup">${configured()?'Connection':'Connect a project'}</button>`}</div>
    ${!configured()?`<div class="note">This copy of the app has no project behind it, so there is nothing to sign in to. Everything stays on this device.</div>`:''}`;
}
function openCloudSetup(){
  document.getElementById('cloudBody').innerHTML=`
    <div class="nf" style="margin-bottom:10px"><label>Project URL</label>
      <input id="cUrl" value="${C.url}" placeholder="https://xxxx.supabase.co" style="font-family:Archivo;font-size:14px;font-weight:600"></div>
    <div class="nf" style="margin-bottom:10px"><label>Publishable key</label>
      <input id="cKey" value="${C.key}" placeholder="sb_publishable_..." style="font-family:Archivo;font-size:13px;font-weight:600"></div>
    <div class="note">Both of these are safe to share with your testers. They are public by design: the protection is row level security in the database, not secrecy of the key. Never paste the service role key here.</div>
    <button class="sheetcta" id="cSave">Save</button>`;
  openSheet('cloudSheet');
}
function openSignIn(){
  document.getElementById('cloudBody').innerHTML=`
    <div class="nf" style="margin-bottom:10px"><label>Email</label>
      <input id="cEmail" type="email" inputmode="email" placeholder="you@example.com" style="font-family:Archivo;font-size:15px;font-weight:600"></div>
    <div class="note">Type your email and tap the link that arrives. That makes the account and signs you in, on this device and any other. There is no password to set and none to forget.</div>
    <button class="sheetcta" id="cLink">Send me a link</button>
    <div class="note" id="cResult" style="padding:0 0 8px"></div>`;
  openSheet('cloudSheet');
}
document.addEventListener('click',async e=>{
  if(e.target.closest('#cloudSetup')) openCloudSetup();
  if(e.target.closest('#cloudSignIn')) openSignIn();
  if(e.target.closest('#cloudOut')) signOut();
  if(e.target.closest('#cloudSync')){ const r=await pushState(); await loadRemote(); renderCloudPanel(); toast(r.ok?'Backed up':(r.reason||'Could not back up')); }
  if(e.target.closest('#cSave')){
    C.url=document.getElementById('cUrl').value.trim();
    C.key=document.getElementById('cKey').value.trim();
    saveCloud(); closeSheets(); renderCloudPanel(); toast('Project saved. Sign in next.');
  }
  if(e.target.closest('#cLink')){
    const out=document.getElementById('cResult');
    out.textContent='Sending...';
    const r=await sendMagicLink(document.getElementById('cEmail').value.trim());
    out.textContent = r.ok? 'Check your email and tap the link on this device.' : r.reason;
  }
});
const _renderProgressCloud=renderProgress;
renderProgress=function(){
  _renderProgressCloud();
  const el=document.getElementById('dashBody');
  if(el&&!document.getElementById('cloudPanel')) el.insertAdjacentHTML('beforeend','<div class="panel" id="cloudPanel"></div>');
  renderCloudPanel();
};

/* ---------- boot ---------- */
(async function(){
  /* onboarding renders before this script exists, so if it is on screen the step
     count needs recalculating now that we know whether there is a project */
  const onb=document.getElementById('onb');
  if(onb&&onb.classList.contains('on')&&typeof onbRender==='function') onbRender();
  if(readAuthHash()){ await fetchUser(); }
  if(signedIn()){
    await ensureSession(); await ensureProfile();
    const p=await pullState(); if(p&&p.applied) toast('Pulled your week down');
    await loadRemote(); renderAll();
  }
})();
Object.assign(window.__G,{renderFeed,renderPeople,logSession,renderProgress,exportPayload,downloadData,eraseEverything,eraseRemote,eraseLocal,ERASE_TABLES,openData,stateFromExport,restoreSummary,applyRestore,undoRestore,RESTORE_BACKUP,cardHTML:typeof cardHTML==='function'?cardHTML:undefined});
/* onboarding may already be on screen from the boot script above, and it rendered
   before this file existed, so give it the chance to recount its steps */
(function(){ const onb=document.getElementById('onb');
  if(onb&&onb.classList.contains('on')&&typeof onbRender==='function') onbRender(); })();
function setBuildConfig(url,key){ CLOUD_CONFIG.url=url; CLOUD_CONFIG.key=key;
  C.url=url; C.key=key; C.fromConfig=true; saveCloud(); renderCloudPanel(); }
window.__CLOUD={get C(){return C},set C(v){C=v}, CLOUD_CONFIG, cloudReady, setBuildConfig,get REMOTE(){return REMOTE},set REMOTE(v){REMOTE=v},
  loadCloud,saveCloud,configured,signedIn,myId,base,authHeaders,sendMagicLink,readAuthHash,fetchUser,
  refreshSession,ensureSession,signOut,api,upsert,pushState,pullState,loadRemote,publishPost,recordTry,
  toggleRemoteFollow,ensureProfile,cloudStatus,renderCloudPanel,personFor,CLOUD_KEY,
  exportPayload,downloadData,eraseEverything,eraseRemote,eraseLocal,ERASE_TABLES,openData,stateFromExport,restoreSummary,applyRestore,undoRestore,RESTORE_BACKUP};
