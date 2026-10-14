/* ---------- what's new (build 74) ----------
   Feargal: a release note when someone opens a new version, with only the
   notes that affect them. So:
   - RELEASE_NOTES holds a short, plain entry per build that changed something
     a person can see or do. Builds that only fixed tests, plumbing or the
     server get no entry, and opening them shows nothing.
   - On opening, everything newer than the last version this person saw is
     shown once, newest first, at most three builds (older ones are one tap
     away). It waits until nothing else is on screen: never over onboarding, a
     sheet, the week in review or a session in progress.
   - Notes that only make sense for adults (calories, weight) carry adult:true
     and are left out for under 18s; a build whose notes are all left out
     shows nothing.
   - Someone new never gets a pop-up: finishing onboarding marks the current
     version as seen. Someone who used the app before this existed is taken
     as having seen build 72, so their first pop-up is builds 73 and 74.
   - You, settings, "What's new" shows every note any time.
   Writing a note: what changed for the person, in their words, one line of
   why it matters if needed, no internal names. Bump APP_VERSION with it. */
const RELEASE_NOTES=[
  {v:'75', date:'2026-10-14', items:[
    {t:'Adding food, rebuilt', d:'Tap any food to open it: pick grams, ml, eggs, slices or spoons, type the amount on the keypad and see the calories and macros as you go. + still adds in one tap, with what you had last time.'},
    {t:'Change or remove in one tap', d:'Tap anything you logged, on Eat or in a meal, to change how much, move it to another meal or remove it.'}]},
  {v:'74', date:'2026-10-14', items:[
    {t:'What is new, when it is new', d:'After an update, Gauntlet now tells you what changed, once. You can see every change any time in You, settings, What\'s new.'}]},
  {v:'73', date:'2026-10-14', items:[
    {t:'Thousands more foods', d:'Over 2,800 foods from the USDA\'s laboratory tested nutrition database sit behind your everyday list. Search finds them, and each one says where its numbers come from.', go:'eat', goLabel:'Open Eat'},
    {t:'Log to the gram or millilitre', d:'Tap g or ml on any food, or tap the amount on your plate, and type exactly what you had. Plus and minus now move in half portions, so 100g then 150g is one tap.'},
    {t:'Drinks in ml', d:'Milk, juice, beer and other drinks are measured in ml, with glass, can and pint sizes one tap away.'}]},
  {v:'72', date:'2026-10-13', items:[
    {t:'Nothing in sign up is chosen for you', d:'Each step says what is still to answer and takes you to it, so nothing gets skipped by accident.'}]},
  {v:'71', date:'2026-10-13', items:[
    {t:'Programmes for every kind of training', d:'Bodybuilding, powerlifting, Olympic lifting, CrossFit, HYROX, calisthenics, hybrid and more, in Plan, Programme. Pick your own training days, or fix a day every week.', go:'plan', goLabel:'Open Plan'}]},
  {v:'70', date:'2026-10-13', items:[
    {t:'Fixed: last week\'s session showing as done', d:'A day now counts as done only from what you logged on that date.'}]},
  {v:'69', date:'2026-10-12', items:[
    {t:'Your routine', d:'The bottom of Today is now your habits on your own day\'s clock, with strength instead of streaks, rest days and smaller versions for harder days.', go:'today', goLabel:'See Today'}]},
  {v:'68', date:'2026-10-12', items:[
    {t:'Week in review', d:'After your weekly check in, see what each of your numbers did last week and where they lead if they carry on.', adult:true},
    {t:'Help when protein keeps falling short', d:'Weeks of missing it bring a smaller step to aim for, and the meals where the gap is.', adult:true}]},
  {v:'67', date:'2026-10-12', items:[
    {t:'Your workout sits above your meals', d:'And Today says what is coming next, and when.'}]}
];
const WN_BASELINE='72', WN_MAX=3;
const vnum=v=>parseInt(v,10)||0;
function seenVersion(){ return (S.profile&&S.profile.seenVersion) || WN_BASELINE; }
function markSeen(){ if(S.profile&&S.profile.seenVersion!==APP_VERSION){ S.profile.seenVersion=APP_VERSION; save(); } }
function notesFor(n){ const teen=isTeen(); return (n.items||[]).filter(it=>!(teen&&it.adult)); }
/* the builds this person has not seen, newest first, with anything left for them */
function unseenNotes(){
  const seen=vnum(seenVersion()), now=vnum(APP_VERSION);
  return RELEASE_NOTES.filter(n=>vnum(n.v)>seen&&vnum(n.v)<=now&&notesFor(n).length)
    .sort((a,b)=>vnum(b.v)-vnum(a.v));
}
const wnDate=d=>{ try{ return dateOf(d).toLocaleDateString('en-IE',{day:'numeric',month:'long'}); }catch(e){ return d; } };
function wnHtml(list,all){
  const shown=all? list : list.slice(0,WN_MAX), more=all? 0 : list.length-shown.length;
  return `<div class="wnlist">${shown.map((n,i)=>`<section class="wnbuild">
      ${shown.length>1||all? `<div class="wnwhen">${i===0&&!all? 'This update' : 'Build '+n.v} · ${wnDate(n.date)}</div>` : ''}
      ${notesFor(n).map(it=>`<div class="wnitem"><b>${escHabit(it.t)}</b><span>${escHabit(it.d)}</span>
        ${it.go? `<button class="inlinebtn" data-wngo="${it.go}">${escHabit(it.goLabel||'Show me')}</button>` : ''}</div>`).join('')}
    </section>`).join('')}</div>
    ${more? `<button class="skipbtn" data-wnall>And ${more} earlier update${more===1?'':'s'}</button>` : ''}
    <button class="sheetcta" data-wnok>Got it</button>`;
}
function openWhatsNew(all){
  const list= all? RELEASE_NOTES.filter(n=>vnum(n.v)<=vnum(APP_VERSION)&&notesFor(n).length).sort((a,b)=>vnum(b.v)-vnum(a.v)) : unseenNotes();
  markSeen();
  if(!list.length) return false;
  $('altTitle').textContent= all? 'What\'s new' : 'What\'s new in Gauntlet';
  $('altSub').textContent= all? 'Every change that affects you, newest first. You are on build '+APP_VERSION+'.' : 'Since you last opened it. Build '+APP_VERSION+'.';
  $('altBody').innerHTML=wnHtml(list,all);
  openSheet('altSheet');
  return true;
}
/* on opening: wait until the screen is clear, then show it once */
function busyForNotes(){
  if(!S.profile||!S.profile.onboarded) return true;
  if(document.querySelector('.sheet.on')) return true;
  const onb=document.getElementById('onb'); if(onb&&onb.classList.contains('on')) return true;
  const rv=document.getElementById('review'); if(rv&&rv.classList.contains('on')) return true;
  const gym=document.getElementById('gym'); if(gym&&gym.classList.contains('on')) return true;
  const legal=document.getElementById('legal'); if(legal&&legal.classList.contains('on')) return true;
  return false;
}
function maybeWhatsNew(tries){
  if(!S.profile||!S.profile.onboarded) return false;
  if(!unseenNotes().length){ markSeen(); return false; }
  if(busyForNotes()){ if((tries||0)<20) setTimeout(()=>maybeWhatsNew((tries||0)+1),3000); return false; }
  return openWhatsNew(false);
}
document.addEventListener('click',e=>{
  if(e.target.closest('[data-setting="whatsnew"]')){ openWhatsNew(true); return; }
  if(e.target.closest('[data-wnok]')){ closeSheets(); return; }
  if(e.target.closest('[data-wnall]')){ $('altBody').innerHTML=wnHtml(RELEASE_NOTES.filter(n=>vnum(n.v)<=vnum(APP_VERSION)&&notesFor(n).length).sort((a,b)=>vnum(b.v)-vnum(a.v)),true); return; }
  const g=e.target.closest('[data-wngo]');
  if(g){ closeSheets(); go(g.dataset.wngo); return; }
});
setTimeout(()=>maybeWhatsNew(0),1200);
try{ Object.assign(window.__G,{RELEASE_NOTES,unseenNotes,openWhatsNew,maybeWhatsNew,seenVersion,busyForNotes}); }catch(e){}
