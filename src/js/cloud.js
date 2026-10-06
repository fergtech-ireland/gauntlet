/* =====================================================================
   Accounts and the shared feed.
   Sign in is a 6-digit code emailed and typed into the app (build 52). A
   link would open in Safari on an iPhone, outside the home screen app, which
   keeps its own storage, so the person would end up signed in in the wrong
   place. No password to forget, none to leak.
   Your own logs stay private to your row, enforced by row level security in
   Postgres rather than by this file. Nothing is stored on the server until
   health data consent has been given, which the database also enforces.
   ===================================================================== */
/* ============================================================
   The projects this build talks to. Both keys are public by design: what
   protects people is row level security in the database, not secrecy.
   Never put the service role key here.
   live: the project real people use. test: gauntlet-test, where every
   database change is tried first. Opening the app with ?cloud=test points
   this device at the test project until ?cloud=live points it back.
   ============================================================ */
const CLOUD_PROJECTS={
  live:{url:'https://zerclmrlwniaogtxyngw.supabase.co', key:'sb_publishable_C5lUkvG-ZtESrhc_-71HOg_jejh2AJG'},
  test:{url:'https://cfrraitjazkcnxjjkgoj.supabase.co', key:'sb_publishable_0IaQo88S-EEkNBLR8dJ4Xg_3L8R88Nf'}
};
const CLOUD_CONFIG={url:CLOUD_PROJECTS.live.url, key:CLOUD_PROJECTS.live.key};
const cloudReady=()=>!!(CLOUD_CONFIG.url&&CLOUD_CONFIG.key);
const CLOUD_KEY='gauntlet.cloud';
function loadCloud(){
  try{ return Object.assign({url:'',key:'',session:null,auto:true,pending:false,error:null,lastPush:null},
    JSON.parse(localStorage.getItem(CLOUD_KEY)||'{}')); }
  catch(e){ return {url:'',key:'',session:null,auto:true,pending:false,error:null,lastPush:null}; }
}
let C=loadCloud();
function cloudTargetFromUrl(){
  try{ const m=/[?&]cloud=(test|live)(?:&|$)/.exec(location.search||''); return m? m[1] : null; }catch(e){ return null; }
}
/* A sign-in belongs to one project, so moving between them signs out of the old one. */
(function(){
  const wanted=cloudTargetFromUrl();
  if(wanted&&wanted!==(C.target||'live')){
    C.target=wanted; C.session=null; C.pending=false; C.error=null; C.lastPush=null; C.fromConfig=true; C.handleIssue=null;
  }
})();
const cloudTarget=()=>C.target==='test'?'test':'live';
/* the built in project wins unless someone has deliberately typed their own */
if(cloudReady() && (!C.url || C.fromConfig)){
  const pr=cloudTarget()==='test'? CLOUD_PROJECTS.test : CLOUD_CONFIG;
  C.url=pr.url; C.key=pr.key; C.fromConfig=true;
  try{ localStorage.setItem(CLOUD_KEY,JSON.stringify(C)); }catch(e){}
}
function saveCloud(){ try{ localStorage.setItem(CLOUD_KEY,JSON.stringify(C)); }catch(e){} }
const configured=()=>!!(C.url&&C.key);
const signedIn=()=>!!(C.session&&C.session.access_token&&C.session.user_id);
/* An anonymous account keeps its own data and nothing else: the database
   keeps it out of profiles, posts, follows and tries until an email is added. */
const isAnon=()=>!!(signedIn()&&C.session.anon);
const claimed=()=>signedIn()&&!C.session.anon;
const myId=()=>signedIn()? C.session.user_id : null;
const base=()=>C.url.replace(/\/+$/,'');
const authHeaders=()=>({apikey:C.key,Authorization:'Bearer '+((C.session&&C.session.access_token)||C.key),'Content-Type':'application/json'});

/* ---------- consent ----------
   Health data is a special category under GDPR, so it needs explicit consent,
   given separately from agreeing to how the app works, before any of it
   reaches the server. The database refuses settings or saved state from
   anyone who has not recorded both. */
/* The version of the privacy policy and terms someone agreed to. When either
   changes, this changes, and backing up stops until they have read what changed
   and agreed again (build 53). */
const TERMS_VERSION='2026-10-b54';
const hasConsent=()=>{ const c=S.profile&&S.profile.consent; return !!(c&&c.health&&c.terms&&c.version===TERMS_VERSION); };
/* agreed once, to words that have since changed */
const consentStale=()=>{ const c=S.profile&&S.profile.consent; return !!(c&&c.health&&c.terms&&c.version&&c.version!==TERMS_VERSION); };
function recordConsent(){
  const now=new Date().toISOString();
  S.profile.consent={health:now,terms:now,version:TERMS_VERSION};
  save();
}

/* ---------- auth ---------- */
const validEmail=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e||'').trim());
function authReason(status,d){
  const code=String((d&&(d.error_code||d.code||d.error))||''), msg=String((d&&(d.msg||d.message||d.error_description))||'');
  if(code==='email_exists'||code==='user_already_exists'||/already (been )?registered|already exists/i.test(msg))
    return {reason:'That email already has a Gauntlet account. Sign in with it instead.',exists:true};
  if(status===429||/rate_limit/.test(code)) return {reason:'Too many codes asked for. Wait a minute, then try again.'};
  if(code==='otp_expired'||code==='otp_disabled'||(status===403&&/token|otp|expired|invalid/i.test(code+msg)))
    return {reason:'That code is wrong or has run out. Ask for a new one.'};
  if(code==='anonymous_provider_disabled') return {reason:'Accounts without an email are not switched on for this project yet.'};
  if(code==='email_address_invalid'||status===422) return {reason:'That email was refused. Check it is spelled right.'};
  return {reason:'Supabase said '+status+'.'};
}
async function authCall(path,body,method,withToken){
  if(!configured()) return {ok:false,reason:'Set the project URL and key first.'};
  try{
    const res=await fetch(base()+'/auth/v1/'+path,{method:method||'POST',
      headers:withToken? authHeaders() : {apikey:C.key,'Content-Type':'application/json'},
      body:JSON.stringify(body||{})});
    let d=null; try{ d=await res.json(); }catch(e){}
    if(!res.ok) return Object.assign({ok:false,status:res.status},authReason(res.status,d));
    return {ok:true,status:res.status,data:d};
  }catch(e){ return {ok:false,reason:'No connection. Try again when you have signal.'}; }
}
/* any answer carrying tokens: a verified code, a new anonymous account, a refresh */
function takeSession(d){
  if(!d||!d.access_token) return false;
  const u=d.user||{};
  C.session={access_token:d.access_token, refresh_token:d.refresh_token||null,
    expires_at:Date.now()+((+d.expires_in||3600)*1000),
    user_id:u.id||(C.session&&C.session.user_id)||null, email:u.email||null, anon:!!u.is_anonymous};
  saveCloud(); return true;
}
/* First open, once consent is given. Same user id for life, so adding an
   email later copies nothing. */
async function signInAnonymously(){
  if(signedIn()) return {ok:true,already:true};
  if(!hasConsent()) return {ok:false,reason:'consent'};
  const r=await authCall('signup',{data:{}});
  if(!r.ok) return r;
  return takeSession(r.data)? {ok:true} : {ok:false,reason:'Supabase sent no session back.'};
}
/* Backing up without an email (build 53): the person has agreed, so an
   account is made for them without asking for anything, and their week goes
   up. C.autoAnon remembers that they chose this, so a phone that was offline,
   or a project that was not ready, tries again later on its own. Signing out
   or switching to another account turns it off, so a fresh account is never
   made behind someone's back. Under 16 there is no account at all. */
async function startBackup(){
  if(!configured()) return {ok:false,reason:'This copy of the app has no project behind it.'};
  if(!hasConsent()) return {ok:false,reason:'consent'};
  if(!canHaveAccount(S.profile)) return {ok:false,reason:'Under 16, everything stays on this phone.'};
  C.autoAnon=true; saveCloud();
  if(!signedIn()){
    const r=await signInAnonymously();
    if(!r.ok){ C.pending=true; C.error= r.reason==='consent'? null : r.reason; saveCloud(); return r; }
  }
  C.error=null; saveCloud();
  const p=await pushState();
  return p.ok? {ok:true} : p;
}
const backupWaiting=()=>!signedIn()&&!!C.autoAnon&&hasConsent()&&configured();
/* Email a code. An anonymous account adds the email to itself (the claim);
   anyone else gets a sign-in code, which also makes the account if it is new. */
async function sendCode(email){
  email=String(email||'').trim().toLowerCase();
  if(!validEmail(email)) return {ok:false,reason:'That does not look like an email address.'};
  if(isAnon()){
    await ensureSession();
    const r=await authCall('user',{email},'PUT',true);
    return r.ok? {ok:true,mode:'email_change',email} : Object.assign(r,{mode:'email_change'});
  }
  const r=await authCall('otp',{email,create_user:true,options:{email_redirect_to:location.href.split('#')[0].split('?')[0]}});
  return r.ok? {ok:true,mode:'email',email} : Object.assign(r,{mode:'email'});
}
async function verifyCode(email,code,mode){
  email=String(email||'').trim().toLowerCase();
  code=String(code||'').replace(/\D/g,'');
  if(!/^\d{6,10}$/.test(code)) return {ok:false,reason:'Type the code from the email. It is 6 digits.'};
  const r=await authCall('verify',{type:mode==='email_change'?'email_change':'email',email,token:code},'POST',mode==='email_change');
  if(!r.ok) return r;
  if(!takeSession(r.data)){
    /* some versions confirm an email change without new tokens: same session, now with an email */
    const u=await fetchUser(); if(!u) return {ok:false,reason:'Signed in, but the account could not be read back. Try again.'};
  }
  if(C.session){ C.session.anon=false; if(!C.session.email) C.session.email=email; saveCloud(); }
  return {ok:true};
}
/* A link from an older email still works on a computer, where it opens in the same browser. */
function readAuthHash(){
  const h=(location.hash||'').replace(/^#/,'');
  if(!h||h.indexOf('access_token=')<0) return false;
  const q={}; h.split('&').forEach(kv=>{ const [k,v]=kv.split('='); q[k]=decodeURIComponent(v||''); });
  if(!q.access_token) return false;
  C.session={access_token:q.access_token, refresh_token:q.refresh_token||null,
    expires_at: Date.now()+((+q.expires_in||3600)*1000), user_id:null, email:null, anon:false};
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
    C.session.user_id=u.id; C.session.email=u.email||null; C.session.anon=!!u.is_anonymous; saveCloud();
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
    if(d.user){ C.session.email=d.user.email||C.session.email||null; C.session.anon=!!d.user.is_anonymous; }
    saveCloud(); return true;
  }catch(e){ return false; }
}
async function ensureSession(){
  if(!signedIn()&&C.session) await fetchUser();
  if(C.session&&C.session.expires_at&&C.session.expires_at-Date.now()<120000) await refreshSession();
  return signedIn();
}
function signOut(){ C.session=null; C.handleIssue=null; C.autoAnon=false; saveCloud(); renderAll(); toast('Signed out. Your week stays on this device.'); }

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

/* ---------- your settings ----------
   One private row: the profile (body details, aim, kit, style, split), goal,
   targets, year of birth and the two consents. The whole saved state still
   travels as well until phase 2 moves it into tables; this row is what other
   devices and, later, friends' features read without opening everything. */
function settingsRow(){
  const c=S.profile.consent||{};
  return {user_id:myId(),
    body:{profile:S.profile, goal:S.goal||null, target:S.target||null, targets:S.targets||null},
    birth_year: validBirthYear(S.profile.birthYear)? +S.profile.birthYear : null,
    health_consent_at:c.health||null, terms_version:c.version||null, terms_accepted_at:c.terms||null,
    rev:S.rev||0, updated_at:new Date().toISOString()};
}
async function pushSettings(){
  if(!signedIn()) return {ok:false,reason:'not signed in'};
  if(!hasConsent()) return {ok:false,reason:'consent'};
  const r=await upsert('settings',settingsRow(),'user_id');
  /* a project without the settings table yet (before migration 0002) is not an error */
  if(!r.ok&&r.status===404) return {ok:true,skipped:true};
  return r;
}
async function pullSettings(){
  if(!signedIn()) return {ok:false,reason:'not signed in'};
  const r=await api('settings?user_id=eq.'+myId()+'&select=body,rev,birth_year,health_consent_at,terms_version,terms_accepted_at');
  if(!r.ok) return r.status===404? {ok:true,applied:false,reason:'no settings table'} : r;
  const row=r.data&&r.data[0];
  if(!row||!row.body||!row.body.profile) return {ok:true,applied:false,reason:'nothing up there yet'};
  if((row.rev||0)<=(S.rev||0)) return {ok:true,applied:false,reason:'this device is the newer one'};
  const b=row.body;
  S.profile=Object.assign({},S.profile,b.profile);
  if(b.goal) S.goal=Object.assign({},S.goal,b.goal);
  if(b.target!==undefined) S.target=b.target;
  if(b.targets) S.targets=b.targets;
  if(validBirthYear(row.birth_year)) S.profile.birthYear=row.birth_year;
  syncAge(S.profile);
  S.rev=row.rev; _save(); renderAll();
  return {ok:true,applied:true};
}

/* ---------- your private state ---------- */
async function pushState(){
  if(!signedIn()) return {ok:false,reason:'not signed in'};
  if(!hasConsent()){ C.pending=false; C.error=null; saveCloud(); return {ok:false,reason:'consent'}; }
  const st=await pushSettings();
  if(!st.ok){ C.pending=true; C.error=st.reason; saveCloud(); return st; }
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
    S=normalise(inbound); syncAge(S.profile); ensurePlan(); save(); renderAll();
    return {ok:true,applied:true};
  }
  return {ok:true,applied:false,reason:'this device is the newer one'};
}
let pushTimer=null;
function queuePush(){
  if(!signedIn()||!C.auto||!hasConsent()) return;
  clearTimeout(pushTimer);
  pushTimer=setTimeout(()=>{ pushState().then(renderCloudPanel); },4000);
}
const _save=save;
save=function(){ S.rev=(S.rev||0)+1; const r=_save(); queuePush(); return r; };
window.addEventListener('online',()=>{
  if(backupWaiting()) startBackup().then(renderCloudPanel);
  else if(C.pending&&signedIn()) pushState().then(renderCloudPanel); });

/* ---------- the shared side ---------- */
let REMOTE={profiles:{},posts:[],follows:[],loaded:false};
const colorFor=h=>['var(--cyan-text)','var(--coral-text)','var(--amber-text)','var(--green-text)','var(--ink)','var(--sub)'][(h||'x').charCodeAt(0)%6];
/* Handles follow the database's rules (migration 0002): 3 to 20 lowercase
   letters, numbers or underscores, unique, not on the blocklist, changed at
   most once a month. A handle from before the rules is kept on this device,
   and the panel says why it is not up there yet. */
const HANDLE_RE=/^[a-z0-9_]{3,20}$/;
async function ensureProfile(){
  if(!claimed()||!S.profile.handle) return null;
  const h=String(S.profile.handle).toLowerCase();
  if(!HANDLE_RE.test(h)){ C.handleIssue='format'; saveCloud(); return {ok:false,reason:'handle'}; }
  const r=await upsert('profiles',{user_id:myId(),handle:h,aim:S.profile.aim},'user_id');
  C.handleIssue = r.ok? null : (r.status===409? 'taken' : (r.status===400? 'refused' : C.handleIssue||null));
  saveCloud();
  return r;
}
async function loadRemote(){
  if(!claimed()) return {ok:false};
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
  if(!claimed()) return {ok:false,reason:'not signed in'};
  await ensureProfile();
  const body={user_id:myId(),kind:post.kind,title:post.title,unit:post.unit,
    chips:post.chips||[],caption:post.cap||'',session:post.session||null};
  if(post.origin&&post.origin.remoteId) body.origin_post=post.origin.remoteId;
  const r=await api('posts',{method:'POST',headers:Object.assign(authHeaders(),{Prefer:'return=representation'}),body:JSON.stringify(body)});
  if(r.ok) loadRemote();
  return r;
}
async function recordTry(remoteId){
  if(!claimed()||!remoteId) return {ok:false};
  await api('tries',{method:'POST',headers:authHeaders(),body:JSON.stringify({user_id:myId(),post_id:remoteId})});
  return api('rpc/increment_try',{method:'POST',headers:authHeaders(),body:JSON.stringify({p_post:remoteId})});
}
async function toggleRemoteFollow(userId){
  if(!claimed()) return {ok:false};
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
  if(!claimed()||!REMOTE.loaded) return _renderFeed();
  const visible=REMOTE.posts.filter(p=>p.mine||REMOTE.follows.includes(p.by));
  document.getElementById('feed').innerHTML = visible.length? visible.map(cardHTML).join('')
    : `<div class="empty">Nobody you follow has posted yet. Tap the person icon up top to find the others.</div>`;
};
const _renderPeople=renderPeople;
renderPeople=function(){
  if(!claimed()||!REMOTE.loaded) return _renderPeople();
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
  if(claimed()&&res&&res.post){
    const src=sess.fromPost? REMOTE.posts.find(p=>p.id===sess.fromPost) : null;
    if(src) res.post.origin=Object.assign({},res.post.origin,{remoteId:src.remoteId});
    publishPost(res.post);
    if(src) recordTry(src.remoteId);
  }
  if(claimDue()) setTimeout(showClaimCard,0);
  return res;
};
/* After the first logged session, once (build 53): an account without an
   email is safe on the server, but lost with the phone, so this is the
   moment to ask. It sits on the finish screen, where the session has just
   been saved, rather than interrupting it. Required before adding a friend,
   which arrives in phase 3. */
const claimDue=()=>isAnon()&&hasConsent()&&!S.profile.claimAsked;
function showClaimCard(){
  if(!claimDue()) return;
  const host=document.querySelector('#gym.on #gymBody .summary')||document.querySelector('#player.on #stage .finish');
  if(!host||document.getElementById('claimCard')) return;
  host.insertAdjacentHTML('beforeend',`<div class="claimcard" id="claimCard" role="status">
    <b>Keep this safe</b><span>Your sessions are backed up, but without an email. Add one and you can get everything back on a new phone. We email you a code, no password.</span>
    <div class="claimbtns"><button class="mini go" id="claimGo">Add your email</button><button class="mini quiet" id="claimLater">Later</button></div></div>`);
  S.profile.claimAsked=todayKey(); save();
}
document.addEventListener('click',e=>{
  if(e.target.closest('#claimGo')){ e.stopPropagation(); const c=document.getElementById('claimCard'); if(c) c.remove(); openSignIn(); }
  if(e.target.closest('#claimLater')){ e.stopPropagation(); const c=document.getElementById('claimCard'); if(c) c.remove();
    toast('Any time from Progress, under Account.'); }
},true);

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
   writes to five tables: state (their saved data), settings (profile and
   consents, from build 52), profiles (handle and aim), posts (the feed) and
   follows (both directions). The first version only cleared two of them.
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
  ['your saved data','state','user_id'],
  ['your settings','settings','user_id']];
async function eraseRemote(){
  if(!signedIn()) return {done:true,left:[]};
  const me=encodeURIComponent(myId()), left=[];
  for(const [label,table,col] of ERASE_TABLES){
    const q=table+'?'+col+'=eq.'+me;
    try{
      await fetch(base()+'/rest/v1/'+q,{method:'DELETE',headers:authHeaders()});
      const chk=await fetch(base()+'/rest/v1/'+q+'&select='+col+'&limit=1',{headers:authHeaders()});
      /* a table this project does not have yet holds nothing of theirs */
      if(chk.status===404) continue;
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
/* Withdrawing health data consent: the saved data and settings come off the
   server, each checked, and this device stops backing up and signs out. What
   is on this device stays. If anything is left up there, consent is kept on
   record, because the data it covers is still held. */
async function withdrawConsent(){
  if(!signedIn()){ if(S.profile.consent){ delete S.profile.consent; save(); } C.autoAnon=false; C.pending=false; C.error=null; saveCloud(); return {ok:true,left:[]}; }
  const me=encodeURIComponent(myId()), left=[];
  for(const [label,table] of [['your saved data','state'],['your settings','settings']]){
    const q=table+'?user_id=eq.'+me;
    try{
      await fetch(base()+'/rest/v1/'+q,{method:'DELETE',headers:authHeaders()});
      const chk=await fetch(base()+'/rest/v1/'+q+'&select=user_id&limit=1',{headers:authHeaders()});
      if(chk.status===404) continue;
      const rows=chk.ok? await chk.json() : null;
      if(!Array.isArray(rows)) left.push(label+' (could not be checked)');
      else if(rows.length) left.push(label);
    }catch(e){ left.push(label+' (no connection)'); }
  }
  if(left.length) return {ok:false,left};
  delete S.profile.consent; _save();
  C.session=null; C.pending=false; C.error=null; C.lastPush=null; C.autoAnon=false; saveCloud();
  return {ok:true,left:[]};
}
function eraseLocal(){
  try{ localStorage.removeItem(STORE_KEY); localStorage.removeItem(CLOUD_KEY);
    ['gauntlet.v3','gauntlet.v2','gauntlet.v1',NUDGE_KEY,THEME_KEY].forEach(k=>localStorage.removeItem(k)); }catch(e){}
}
async function eraseEverything(){
  const r=await eraseRemote();
  if(!r.done) return {ok:false,left:r.left};
  eraseLocal();
  return {ok:true,left:[]};
}
/* One account of what is held, used here and next to the consent boxes. */
function heldText(signed){
  return 'Your week, your weigh ins, your food, your lifts and your check ins live in this browser\'s own storage on this device.'
    +(signed
      ? ' Because you are signed in, a copy is also kept in the project database, on Supabase\'s servers in Ireland (EU), so it reaches your other devices. That copy is readable only by you, which the database enforces, not this page.'
        +(claimed()? ' Your handle, your aim and anything you post to the feed are different: other people using the app can see those, because that is what the feed is.' : ' Until you add an email, nobody else can see anything of yours, not even your handle.')
      : ' Nothing leaves this device unless you agree to it being backed up.');
}
function openData(){
  const signed=signedIn();
  document.getElementById('cloudBody').innerHTML=`
    <div class="method"><b>What is held, and where</b><span>${heldText(signed)}</span></div>
    <div class="method"><b>What is never held</b><span>No advertising identifiers, no third party analytics, no location. The only thing that leaves this device on its own is the request that fetches the typeface.</span></div>
    <div class="method"><b>Take it with you</b><span>One file, plain JSON, everything in it. Readable in any text editor and not locked to this app.</span></div>
    <button class="sheetcta" id="dlData">Download everything</button>
    <button class="sheetcta" id="restoreBtn" style="background:var(--track);color:var(--ink);margin-top:8px">Restore from a download</button>
    <input type="file" id="restoreFile" accept="application/json,.json" style="display:none" aria-label="Choose a Gauntlet download">
    <div class="note" id="restoreNote">${(()=>{ try{ return localStorage.getItem(RESTORE_BACKUP)? 'This phone was restored from a download. <button class="inlinebtn" id="restoreUndo">Undo the restore</button>' : 'For a new phone, or to go back to an earlier copy. It shows what is in the file before replacing anything.'; }catch(e){ return ''; } })()}</div>
    ${(signed||backupWaiting())&&(hasConsent()||consentStale())?`<div class="method" style="margin-top:14px"><b>Stop backing up</b><span>Withdraws your consent to Gauntlet holding your health information. Your saved data and settings are deleted from the server and checked, then this device signs out. Everything on this device stays.</span></div>
    <button class="sheetcta" id="withdrawBtn" style="background:var(--track);color:var(--ink)">Withdraw consent</button>
    <div class="note" id="withdrawNote"></div>`:''}
    <div class="method" style="margin-top:14px"><b>Delete it all</b><span>${signed
      ? 'Deletes your saved data, profile, feed posts and follows from the database, checks each one is really gone, then wipes this device and starts you again from the first screen. Last, it removes your sign-in account itself. If the database refuses any of it, nothing is wiped here, so you can try again.'
      : 'Wipes this device and starts you again from the first screen.'} It cannot be undone, so take the download first if you want a copy.</span></div>
    <button class="sheetcta" id="wipeData" style="background:var(--coral-text)">Delete everything</button>
    <div class="note" id="wipeNote"></div>`;
  openSheet('cloudSheet');
}
document.addEventListener('click',async e=>{
  if(e.target.closest('#dataBtn')) openData();
  if(e.target.closest('#dlData')) downloadData();
  if(e.target.closest('#withdrawBtn')){
    const b=e.target.closest('#withdrawBtn'), note=document.getElementById('withdrawNote');
    if(b.dataset.armed!=='1'){ b.dataset.armed='1'; b.textContent='Tap again to withdraw'; if(note) note.textContent='Your saved data comes off the server. This device keeps everything.'; return; }
    b.disabled=true; if(note) note.textContent='Removing...';
    const r=await withdrawConsent();
    if(r.ok){ closeSheets(); renderAll(); toast('Consent withdrawn. Nothing of yours is on the server now.'); }
    else { b.disabled=false; b.dataset.armed=''; b.textContent='Try again';
      if(note) note.textContent='Still on the server: '+r.left.join(', ')+'. Your consent stays on record until it is gone, so you can try again.'; }
  }
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
const HANDLE_ISSUES={
  format:h=>'Your handle @'+h+' is kept on this device but not shared yet: handles are now 3 to 20 letters, numbers or underscores. Pick a new one below.',
  taken:h=>'Someone else already has @'+h+', so it is not shared yet. Pick another below.',
  refused:h=>'@'+h+' was refused, either because it is not allowed or because a handle can only change once a month.'
};
function cloudStatus(){
  if(!configured()) return 'No account needed. Everything stays on this device.';
  if(!signedIn()&&!canHaveAccount(S.profile)) return 'Under 16, everything stays on this phone. You can back up when you turn 16, and nothing is lost.';
  if(backupWaiting()) return 'Not backed up yet. It goes up on its own as soon as it can.'+(C.error? ' Last try: '+C.error : '');
  if(!signedIn()) return 'Only on this phone. Back up and your week is safe if you lose it, and you can add an email later to use it on another phone.';
  if(consentStale()) return 'The privacy policy or terms have changed since you agreed, so backing up has paused until you have read them.';
  if(!hasConsent()) return 'Signed in, but nothing is backed up until you agree to it.';
  if(C.pending) return (isAnon()?'Backed up without an email.':'Signed in.')+' Waiting for a connection to back up.';
  if(C.error) return C.error;
  if(isAnon()) return 'Backed up'+(C.lastPush?' '+ago(C.lastPush):'')+', but without an email. Add one so you can get it back on a new phone, and to see the others.';
  return 'Signed in as '+(C.session.email||'you')+(C.lastPush?', backed up '+ago(C.lastPush)+'.':'.');
}
function renderCloudPanel(){
  const el=document.getElementById('cloudPanel'); if(!el) return;
  const h=String(S.profile.handle||'');
  el.innerHTML=`<div class="ph"><h3>Account and sharing</h3>${signedIn()&&hasConsent()?`<button id="cloudSync">Sync now</button>`:''}</div>
    <div class="note" style="margin:0 0 10px">${escHabit(cloudStatus())}</div>
    ${claimed()&&C.handleIssue&&HANDLE_ISSUES[C.handleIssue]?`<div class="note" style="margin:-4px 0 10px">${escHabit(HANDLE_ISSUES[C.handleIssue](h))}</div>`:''}
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${!signedIn()&&configured()&&canHaveAccount(S.profile)&&!backupWaiting()?`<button class="mini go" id="cloudBackup">Back up</button><button class="mini" id="cloudSignIn">Sign in with email</button>`:''}
      ${backupWaiting()?`<button class="mini go" id="cloudBackup">Try now</button><button class="mini" id="cloudSignIn">Sign in with email</button>`:''}
      ${signedIn()&&!hasConsent()?`<button class="mini go" id="cloudSignIn">${consentStale()?'Read what changed':'Agree and back up'}</button>`:''}
      ${isAnon()&&hasConsent()?`<button class="mini go" id="cloudSignIn">Add your email</button>`:''}
      ${claimed()?`<button class="mini${C.handleIssue?' go':''}" id="handlePick">${C.handleIssue?'Pick a handle':'@'+escHabit(h)+' · change'}</button>`:''}
      ${claimed()?`<button class="mini quiet" id="cloudOut">Sign out</button>`:''}
      <button class="mini" id="dataBtn">Your data</button>
      <button class="mini quiet" data-legal="privacy">Privacy</button>
      ${cloudReady()?'':`<button class="mini" id="cloudSetup">${configured()?'Connection':'Connect a project'}</button>`}</div>
    ${cloudTarget()==='test'?`<div class="note">Connected to the test project. Open the app with ?cloud=live to go back to the real one.</div>`:''}
    ${!configured()?`<div class="note">This copy of the app has no project behind it, so there is nothing to sign in to. Everything stays on this device.</div>`:''}`;
}
function openCloudSetup(){
  document.getElementById('cloudBody').innerHTML=`
    <div class="nf" style="margin-bottom:10px"><label>Project URL</label>
      <input id="cUrl" value="${C.url}" placeholder="https://xxxx.supabase.co" style="font-family:var(--font-ui);font-size:14px;font-weight:600"></div>
    <div class="nf" style="margin-bottom:10px"><label>Publishable key</label>
      <input id="cKey" value="${C.key}" placeholder="sb_publishable_..." style="font-family:var(--font-ui);font-size:13px;font-weight:600"></div>
    <div class="note">Both of these are safe to share with your testers. They are public by design: the protection is row level security in the database, not secrecy of the key. Never paste the service role key here.</div>
    <button class="sheetcta" id="cSave">Save</button>`;
  openSheet('cloudSheet');
}

/* ---------- consent and the code ----------
   Two separate boxes, because GDPR wants health data consent given on its
   own, not folded into agreeing to everything else. Neither is ticked for
   the person. */
const CONSENT_HEALTH='Back up my health information: weight and body measurements, food, sleep, training, check ins, pain notes and cycle if I track it. It is kept on Supabase\'s servers in Ireland, readable only by me, and I can withdraw this at any time in Your data, which deletes it from the server.';
const CONSENT_TERMS='I have read what Gauntlet holds and where, and agree to it being used only to run the app for me. No advertising, no selling, no third party analytics.';
function consentHTML(pre,on){
  return `<label class="consent"><input type="checkbox" id="${pre}Health" ${on&&on.health?'checked':''}><span>${CONSENT_HEALTH}</span></label>
    <label class="consent"><input type="checkbox" id="${pre}Terms" ${on&&on.terms?'checked':''}><span>${CONSENT_TERMS}</span></label>
    <details class="consentmore"><summary>What Gauntlet holds, and where</summary><p>${heldText(true)}</p></details>
    <div class="legallinks">Read the <button class="inlinebtn" data-legal="privacy">privacy policy</button> and the <button class="inlinebtn" data-legal="terms">terms</button>.</div>`;
}
const consentTicked=pre=>{ const a=document.getElementById(pre+'Health'), b=document.getElementById(pre+'Terms'); return !!(a&&a.checked&&b&&b.checked); };
const codeInputHTML=id=>`<input id="${id}" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="123456" aria-label="The code from the email" style="font-family:var(--font-ui);font-size:22px;font-weight:700;letter-spacing:.3em;text-align:center">`;

/* The sign-in sheet: a small state machine, so every screen it can show is
   one of these and the tests can walk them all. */
let SIGN={step:'email',email:'',mode:'email',fromOnb:false,agree:{health:false,terms:false}};
function drawSignIn(){
  const body=document.getElementById('cloudBody'); if(!body) return;
  const needConsent=!hasConsent();
  if(SIGN.step==='backup'){
    body.innerHTML=`<div class="note" style="padding-top:0">Your week goes up to the server and is safe if this phone is lost or its browser is cleared. No email or password: you can add an email later to use it on another phone.</div>
      ${consentHTML('sg',SIGN.agree)}
      <button class="sheetcta" id="sgBackup" ${SIGN.agree.health&&SIGN.agree.terms?'':'disabled'}>Back up</button>
      <div style="text-align:center;margin-top:8px"><button class="inlinebtn" id="sgOther">Already have an account? Sign in with your email</button></div>
      <div class="note" id="sgResult" role="status"></div>`;
    return;
  }
  if(SIGN.step==='handle'){
    body.innerHTML=`<div class="note" style="padding-top:0">Your handle is how friends find you. 3 to 20 letters, numbers or underscores, and it can change once a month.</div>
      <div class="handle"><span>@</span><input id="sgHandle" value="${escHabit(SIGN.handle||'')}" placeholder="yourname" autocomplete="off" spellcheck="false" autocapitalize="off" aria-label="Handle"></div>
      <div class="note" id="sgHandleNote" role="status">${escHabit(handleNoteText(SIGN.check))}</div>
      <button class="sheetcta" id="sgHandleSave" ${SIGN.check&&SIGN.check.v==='ok'&&SIGN.check.h===SIGN.handle?'':'disabled'}>Use this handle</button>
      <div class="note" id="sgResult" role="status"></div>`;
    return;
  }
  if(SIGN.step==='consent'){
    body.innerHTML=`<div class="note" style="padding-top:0">${consentStale()
        ? 'The privacy policy or terms have changed since you agreed. Have a read, and agree again to keep backing up. Until then nothing new goes up.'
        : 'Nothing has been backed up yet. Agree to it below and your week goes up straight away.'}</div>
      ${consentHTML('sg',SIGN.agree)}
      <button class="sheetcta" id="sgAgree" ${SIGN.agree.health&&SIGN.agree.terms?'':'disabled'}>Agree and back up</button>
      <div class="note" id="sgResult" role="status"></div>`;
    return;
  }
  if(SIGN.step==='code'){
    body.innerHTML=`<div class="note" style="padding-top:0">We emailed a code to <b>${escHabit(SIGN.email)}</b>. Type it here. It runs out after a while, so a new one is a tap away.</div>
      <div class="nf" style="margin-bottom:10px"><label>Code</label>${codeInputHTML('sgCode')}</div>
      <button class="sheetcta" id="sgVerify">${SIGN.mode==='email_change'?'Add this email':'Sign in'}</button>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:8px">
        <button class="inlinebtn" id="sgResend">Send a new code</button>
        <button class="inlinebtn" id="sgOther">Use a different email</button></div>
      <div class="note" id="sgResult" role="status"></div>`;
    return;
  }
  const claiming=isAnon();
  body.innerHTML=`<div class="note" style="padding-top:0">${claiming
      ? 'Add your email and this account becomes yours to keep: same account, nothing copied, and you can sign in on a new phone. We email you a code to type in here.'
      : 'Type your email and we send you a 6-digit code to type in here. It makes the account if you are new, and signs you in if you are not. No password to set or forget.'}</div>
    <div class="nf" style="margin-bottom:10px"><label>Email</label>
      <input id="sgEmail" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" value="${escHabit(SIGN.email)}" style="font-family:var(--font-ui);font-size:15px;font-weight:600"></div>
    ${needConsent? consentHTML('sg',SIGN.agree) : ''}
    <button class="sheetcta" id="sgSend" ${(validEmail(SIGN.email)&&(!needConsent||(SIGN.agree.health&&SIGN.agree.terms)))?'':'disabled'}>Send me a code</button>
    <div class="note" id="sgResult" role="status"></div>`;
}
function openSignIn(opts){
  const o=opts||{};
  SIGN={step: o.step || (signedIn()&&!hasConsent()? 'consent' : 'email'), email:'', mode:'email', fromOnb:!!o.fromOnb,
    agree:{health:false,terms:false}, handle:o.handle||'', check:null};
  drawSignIn();
  openSheet('cloudSheet');
}
/* ---------- picking a handle (build 53) ----------
   Checked against the database while typing, by the same rules it enforces
   when the handle is saved: format, the blocklist, and whether someone else
   has it. Only accounts with an email can check, because only they can have
   a handle. */
const HANDLE_VERDICTS={ok:h=>'@'+h+' is free.', taken:h=>'Someone already has @'+h+'.', blocked:h=>'@'+h+' is not allowed. Try another.',
  format:()=>'3 to 20 letters, numbers or underscores.', checking:h=>'Checking @'+h+'...', unknown:()=>'Could not check just now. It is checked again when it is saved.',
  same:h=>'@'+h+' is already yours.'};
function handleNoteText(c){ return c&&HANDLE_VERDICTS[c.v]? HANDLE_VERDICTS[c.v](c.h) : HANDLE_VERDICTS.format(); }
const cleanHandle=v=>String(v||'').replace(/[.\s]/g,'_').replace(/[^a-z0-9_]/gi,'').toLowerCase().slice(0,20);
async function checkHandle(h){
  h=cleanHandle(h);
  if(!HANDLE_RE.test(h)) return 'format';
  if(!claimed()) return 'unknown';
  const r=await api('rpc/handle_available',{method:'POST',headers:authHeaders(),body:JSON.stringify({h})});
  return r.ok&&typeof r.data==='string'&&HANDLE_VERDICTS[r.data]? r.data : 'unknown';
}
let handleTimer=null;
function queueHandleCheck(){
  clearTimeout(handleTimer);
  const h=SIGN.handle;
  const paint=()=>{ const n=document.getElementById('sgHandleNote'); if(n) n.textContent=handleNoteText(SIGN.check);
    const b=document.getElementById('sgHandleSave'); if(b) b.disabled=!(SIGN.check&&(SIGN.check.v==='ok'||SIGN.check.v==='unknown')&&SIGN.check.h===SIGN.handle); };
  if(!HANDLE_RE.test(h)){ SIGN.check={h,v:'format'}; paint(); return; }
  if(h===String(S.profile.handle||'')&&!C.handleIssue){ SIGN.check={h,v:'same'}; paint(); return; }
  SIGN.check={h,v:'checking'}; paint();
  handleTimer=setTimeout(async()=>{ const v=await checkHandle(h); if(SIGN.handle===h){ SIGN.check={h,v}; paint(); } },350);
}
async function saveHandle(h){
  h=cleanHandle(h);
  if(!HANDLE_RE.test(h)) return {ok:false,reason:HANDLE_VERDICTS.format()};
  const before=S.profile.handle, issueBefore=C.handleIssue;
  S.profile.handle=h; save();
  const r=await ensureProfile();
  if(r&&r.ok){ if(typeof ME!=='undefined'){ ME.n=h; ME.full=h.replace(/[._]/g,' '); } return {ok:true}; }
  /* the database said no, so the phone goes back to what it had */
  S.profile.handle=before; save();
  const why=C.handleIssue==='taken'? HANDLE_VERDICTS.taken(h) : (C.handleIssue==='refused'? 'That was refused. A handle can only change once a month, and some words are not allowed.' : ((r&&r.reason)||'That did not save. Try again when you have signal.'));
  C.handleIssue=issueBefore; saveCloud();
  return {ok:false,reason:why};
}
function signNote(t){ const n=document.getElementById('sgResult'); if(n) n.textContent=t; }
/* After a code is accepted or consent is given: consent first, then settings
   and state up, then whatever is newer comes down. */
async function afterSignIn(agree){
  const ag=agree||SIGN.agree||{};
  if(ag.health&&ag.terms&&!hasConsent()) recordConsent();
  if(claimed()) await ensureProfile();
  const pulled=await pullState();
  let applied=!!(pulled&&pulled.applied);
  if(!applied){ const ps=await pullSettings(); applied=!!(ps&&ps.applied); }
  if(hasConsent()) await pushState();
  if(claimed()) await loadRemote();
  return applied;
}
async function finishSignIn(){
  const applied=await afterSignIn();
  const fromOnb=SIGN.fromOnb;
  closeSheets();
  if(fromOnb&&S.profile.onboarded){
    const onb=document.getElementById('onb'); if(onb) onb.classList.remove('on');
    go('today');
  }
  renderAll();
  toast(applied? 'Signed in. Your week came down from the cloud.' : (hasConsent()? 'Signed in and backed up' : 'Signed in'));
}
document.addEventListener('input',e=>{
  if(!document.getElementById('cloudSheet')||!e.target.closest('#cloudBody')) return;
  if(e.target.id==='sgEmail'){ SIGN.email=e.target.value.trim(); }
  if(e.target.id==='sgCode'){ const v=e.target.value.replace(/\D/g,''); if(v!==e.target.value) e.target.value=v; }
  if(e.target.id==='sgHandle'){ const v=cleanHandle(e.target.value); if(v!==e.target.value) e.target.value=v; SIGN.handle=v; queueHandleCheck(); return; }
  const send=document.getElementById('sgSend'); if(send) send.disabled=!(validEmail(SIGN.email)&&(hasConsent()||consentTicked('sg')));
});
document.addEventListener('change',e=>{
  if(e.target.id!=='sgHealth'&&e.target.id!=='sgTerms') return;
  SIGN.agree={health:!!(document.getElementById('sgHealth')||{}).checked, terms:!!(document.getElementById('sgTerms')||{}).checked};
  const send=document.getElementById('sgSend'); if(send) send.disabled=!(validEmail(SIGN.email)&&consentTicked('sg'));
  const agree=document.getElementById('sgAgree'); if(agree) agree.disabled=!consentTicked('sg');
  const bk=document.getElementById('sgBackup'); if(bk) bk.disabled=!consentTicked('sg');
});
async function sendFromSheet(){
  signNote('Sending...');
  const r=await sendCode(SIGN.email);
  if(r.ok){ SIGN.mode=r.mode; SIGN.email=r.email; SIGN.step='code'; drawSignIn();
    const c=document.getElementById('sgCode'); if(c) try{ c.focus(); }catch(e){}
    return r; }
  signNote(r.reason||'That did not work.');
  if(r.exists&&r.mode==='email_change'){
    const n=document.getElementById('sgResult');
    if(n) n.insertAdjacentHTML('beforeend',' <button class="inlinebtn" id="sgUseExisting">Sign in to that account</button>');
  }
  return r;
}
document.addEventListener('click',async e=>{
  if(e.target.closest('#cloudSetup')) openCloudSetup();
  if(e.target.closest('#cloudSignIn')) openSignIn();
  if(e.target.closest('#cloudBackup')){
    if(hasConsent()){ const r=await startBackup(); renderCloudPanel(); toast(r.ok? 'Backed up' : 'Not backed up yet. It tries again on its own.'); }
    else openSignIn({step:'backup'});
    return; }
  if(e.target.closest('#handlePick')){ openSignIn({step:'handle',handle:String(S.profile.handle||'')}); queueHandleCheck(); return; }
  if(e.target.closest('#sgBackup')){
    const b=e.target.closest('#sgBackup'); if(b.disabled) return;
    recordConsent(); b.disabled=true; signNote('Backing up...');
    const r=await startBackup();
    closeSheets(); renderAll();
    toast(r.ok? 'Backed up. Add your email any time from Progress.' : 'Saved on this phone. It backs up on its own as soon as it can.');
    return; }
  if(e.target.closest('#sgHandleSave')){
    const b=e.target.closest('#sgHandleSave'); if(b.disabled) return;
    b.disabled=true; signNote('Saving...');
    const r=await saveHandle(SIGN.handle);
    if(r.ok){ closeSheets(); renderAll(); toast('You are @'+S.profile.handle); }
    else { b.disabled=false; signNote(r.reason); }
    return; }
  if(e.target.closest('#onbSignIn')) openSignIn({fromOnb:true});
  if(e.target.closest('#cloudOut')) signOut();
  if(e.target.closest('#cloudSync')){ const r=await pushState(); await loadRemote(); renderCloudPanel(); toast(r.ok?'Backed up':(r.reason||'Could not back up')); }
  if(e.target.closest('#cSave')){
    C.url=document.getElementById('cUrl').value.trim();
    C.key=document.getElementById('cKey').value.trim();
    saveCloud(); closeSheets(); renderCloudPanel(); toast('Project saved. Sign in next.');
  }
  if(e.target.closest('#sgSend')){ if(!e.target.closest('#sgSend').disabled) await sendFromSheet(); return; }
  if(e.target.closest('#sgResend')){ SIGN.step='email'; drawSignIn(); await sendFromSheet(); return; }
  if(e.target.closest('#sgOther')){ SIGN.step='email'; drawSignIn(); return; }
  if(e.target.closest('#sgUseExisting')){
    /* This phone's account without an email is removed from the server, so no
       health data is left behind that nobody can reach. What is on the phone
       is kept, and the newer copy wins when the other account's week comes down. */
    signNote('Tidying up this phone\'s old account...');
    const er=await eraseRemote();
    if(!er.done){ signNote('This phone\'s old account could not be removed yet ('+er.left.join(', ')+'). Try again when you have signal.'); return; }
    C.session=null; C.autoAnon=false; saveCloud(); SIGN.mode='email'; await sendFromSheet(); return;
  }
  if(e.target.closest('#sgVerify')){
    const b=e.target.closest('#sgVerify'); if(b.disabled) return;
    b.disabled=true; signNote('Checking...');
    const r=await verifyCode(SIGN.email,(document.getElementById('sgCode')||{}).value,SIGN.mode);
    if(!r.ok){ b.disabled=false; signNote(r.reason); return; }
    await finishSignIn(); return;
  }
  if(e.target.closest('#sgAgree')){
    const b=e.target.closest('#sgAgree'); if(b.disabled) return;
    recordConsent(); b.disabled=true; signNote('Backing up...');
    const r=await pushState();
    if(claimed()) await ensureProfile();
    closeSheets(); renderAll(); toast(r.ok?'Backed up':(r.reason||'Could not back up yet. It will try again.'));
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
  /* agreed to back up, but the account could not be made at the time */
  if(backupWaiting()){ await startBackup(); renderCloudPanel(); }
  if(signedIn()){
    await ensureSession();
    if(claimed()) await ensureProfile();
    const p=await pullState();
    const ps=(p&&p.applied)? null : await pullSettings();
    if((p&&p.applied)||(ps&&ps.applied)) toast('Pulled your week down');
    if(claimed()) await loadRemote();
    renderAll();
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
  loadCloud,saveCloud,configured,signedIn,isAnon,claimed,myId,base,authHeaders,readAuthHash,fetchUser,
  CLOUD_PROJECTS,cloudTarget,cloudTargetFromUrl,TERMS_VERSION,hasConsent,recordConsent,validEmail,authReason,authCall,takeSession,
  signInAnonymously,startBackup,backupWaiting,consentStale,claimDue,showClaimCard,checkHandle,saveHandle,cleanHandle,queueHandleCheck,HANDLE_VERDICTS,
  sendCode,verifyCode,settingsRow,pushSettings,pullSettings,validBirthYear,HANDLE_RE,withdrawConsent,
  openSignIn,drawSignIn,afterSignIn,get SIGN(){return SIGN},set SIGN(v){SIGN=v},consentHTML,CONSENT_HEALTH,CONSENT_TERMS,heldText,
  refreshSession,ensureSession,signOut,api,upsert,pushState,pullState,loadRemote,publishPost,recordTry,
  toggleRemoteFollow,ensureProfile,cloudStatus,renderCloudPanel,personFor,CLOUD_KEY,
  exportPayload,downloadData,eraseEverything,eraseRemote,eraseLocal,ERASE_TABLES,openData,stateFromExport,restoreSummary,applyRestore,undoRestore,RESTORE_BACKUP};
