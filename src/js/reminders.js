/* ===================== Habit due times and reminders (build 81) =====================
   Feargal: "I keep forgetting to log my habits." Habits sat at the bottom of
   Today with a tick and nothing ever asked for it. He wants them brought to
   his attention, a time asked for when a habit is added, and daily habits that
   need the day to be over (a stop habit, "no phone in bed") to be loggable at
   the end of the day, around 9pm.

   What the research says, and so what this does:
   - A when and a where help. Plans in the form "when X happens I will do Y"
     raised goal attainment across 94 independent tests, d = 0.65, a medium to
     large effect (Gollwitzer and Sheeran, 2006). So a habit gets a time to be
     done by, asked for in one tap when it is added.
   - A prompt at the moment helps but does not make a habit automatic: apps
     that only remind get the thing done and do little for automaticity
     (Stawarz, Cox and Blandford, 2015). The habits keep their cue (a meal,
     waking, bed) and the time sits beside it, it does not replace it.
   - People do not mind a daily prompt. In a small 2017 trial of a stress app
     (77 people, exploratory), daily notifications were viewed and acted on
     more than occasional ones and did not drive people away (Morrison and
     colleagues, 2017). It is a small, early study; the prompts here are one
     card at a time, only for a habit that is open, and can be turned off.
   - A miss is not a failure: after a broken run people tend to drop off, and
     messages pointing at it do not bring them back (Silverman and Barasch,
     2023). So nothing here says "missed" or "lost": a late habit says "still
     open today", and a habit from yesterday can be logged until midday.
   - Habits take a median of 66 days to become automatic (Lally and
     colleagues, 2010), so the point of a reminder is to carry it until then.

   What a web app can and cannot do, said plainly in the app:
   - A reminder that arrives with the app closed needs a server to push it
     (Web Push) and an account on it. This app is local first and has no such
     server for habits, so the phone reminder here is set by the app itself and
     arrives while Gauntlet is open or still running in the background. On an
     iPhone it also needs Gauntlet on the Home Screen.
   - The reliable closed-app reminder is the phone's own calendar: each habit
     can be exported as a daily event with an alert at its time (.ics).
   - Badges (the number on the icon) work for an installed app where the phone
     allows them, and are cleared when the habits are done.
   - The prompts on Today and the end of day card work for everyone.
   The 21:00 end of day, the hour before as "soon" and the 8 hours after waking
   for yesterday's catch-up are this app's own rules of thumb. */

const REMIND_EVIDENCE=`A plan that says when you will do something raised goal achievement across 94 independent tests, d = 0.65, a medium to large effect (Gollwitzer and Sheeran, 2006). Reminders alone get a habit done but do little for making it automatic, which is why each habit keeps its cue and the time sits beside it (Stawarz and colleagues, 2015). In a small exploratory trial of 77 people, daily prompts were viewed and acted on more than occasional ones and did not put people off (Morrison and colleagues, 2017). A habit takes a median of 66 days to become automatic (Lally and colleagues, 2010). Nothing here calls a late habit missed: a habit from yesterday can be logged until midday. The 21:00 end of day, the hour of notice and the eight hours of catch-up are this app's rules of thumb.`;
const EOD_DEFAULT='21:00';
const SOON_MIN=60;          /* "by" turns to "due soon" this long before */
const CATCH_HOURS=8;        /* yesterday can be logged this long after waking */
const WD_ICS=['SU','MO','TU','WE','TH','FR','SA'];
const hhmmOk=t=>hhmmToMin(t)!==null;
const q15=m=>Math.round(((m%1440)+1440)%1440/15)*15%1440;

/* ---------- settings, all on by default except phone reminders ---------- */
const hrOn=key=>{ const p=S.profile||{}; return key==='notes'? !!p.habitNotes : p['habit_'+key]!==false; };
const eodTime=()=>{ const t=S.profile&&S.profile.eodTime; return hhmmOk(t)? t : EOD_DEFAULT; };

/* ---------- when each habit is due ----------
   h.due is a clock time the person chose; h.eod says it is an end of day habit
   (logged once the day is done). With neither, the habit gets a time from its
   cue so nobody has to set anything up: a stop habit is judged at the end of
   the day, another one an hour after its moment in the day. */
function habitDue(h,meta){
  const stop=meta&&meta.kind==='stop';
  if(h&&hhmmOk(h.due)) return {t:h.due,min:hhmmToMin(h.due),set:true,eod:!!h.eod};
  if(h&&h.eod) return {t:eodTime(),min:hhmmToMin(eodTime()),set:false,eod:true};
  if(stop) return {t:eodTime(),min:hhmmToMin(eodTime()),set:false,eod:true};
  const cue=cueOf(h,meta), at=cueTimes()[cue];
  const w=clockOf('wake'), rel=m=>((m-w)%1440+1440)%1440, bed=rel(clockOf('bed'))||960;
  let r= at===null? rel(hhmmToMin(eodTime())-60) : rel(at)+60;
  r=Math.min(r,bed-60);
  const m=q15(w+r);
  return {t:minToHhmm(m),min:m,set:false,eod:false};
}
/* where the clock is against a habit's time, in minutes: positive is still to come */
function dueDelta(d,at){
  const w=clockOf('wake'), rel=m=>((m-w)%1440+1440)%1440;
  const now=typeof at==='number'? at : nowMins();
  return rel(d.min)-rel(now);
}
/* the open habits today, each with how pressing it is */
function habitsToLog(at){
  const k=todayKey(), out=[];
  activeHabits().forEach(x=>{
    const h=habitSlots()[x.slot], meta=habitOf(h.id); if(!meta) return;
    if(!habitApplies(meta,k)||k<h.started) return;
    const L=habitLedger(h,meta), today=L.days[L.days.length-1]||{st:'open'};
    if(today.st!=='open') return;
    const d=habitDue(h,meta), delta=dueDelta(d,at);
    const state= delta>SOON_MIN? 'later' : (delta>0? 'soon' : 'due');
    out.push({slot:x.slot,h,meta,due:d,delta,state,stop:meta.kind==='stop',tiny:tinyOf(h,meta)});
  });
  return out.sort((a,b)=>a.delta-b.delta);
}
/* yesterday's open ends: not logged, and the morning is not over yet */
function habitCatchUp(at){
  const c=dayClock(at); if(c.n>=CATCH_HOURS*60) return [];
  const y=addDays(todayKey(),-1), out=[];
  activeHabits().forEach(x=>{
    const h=habitSlots()[x.slot], meta=habitOf(h.id); if(!meta||y<h.started) return;
    if(!habitApplies(meta,y)||h.skipCatch===y) return;
    const L=habitLedger(h,meta), yd=L.days.find(d=>d.k===y);
    if(yd&&(yd.st==='miss'||yd.st==='rest')) out.push({slot:x.slot,h,meta,k:y,stop:meta.kind==='stop'});
  });
  return out;
}
const dueWord=(it)=> it.due.eod? 'end of day' : 'by '+it.due.t;
const pressing=a=>a.filter(x=>x.state==='due'||x.state==='soon');

/* ---------- Up next ---------- */
function habitCandidates(at){
  if(!hrOn('prompts')) return [];
  const out=[], c=dayClock(at);
  const list=pressing(habitsToLog(at)), eodNow=list.filter(x=>x.state==='due'&&x.due.eod);
  const act=it=>`<button class="mini go" data-habittoggle="${it.slot}">${escHabit(it.stop? 'Went without' : 'Done')}</button>`+
    (it.tiny&&!it.stop? `<button class="mini" data-habittiny="${it.slot}">Tiny version</button>` : '');
  if(list.length===1){
    const it=list[0], eod=it.due.eod, late=it.state==='due';
    out.push({score: eod&&late? 95 : (late? 91 : 76), cand:{id:'habit',tone:'green',
      kick: late? (eod? 'End of the day' : 'Due, '+dueWord(it)) : 'Coming up, '+dueWord(it),
      title: (it.stop? 'Stop: ' : '')+escHabit(it.meta.t),
      why: late? (eod? 'This one is judged once the day is done. Log it now, a second.' : 'Still open today. Log it now, a second, or open it for the tiny version.')
        : 'Due '+dueWord(it)+', in about '+fmtIn(it.delta)+'.',
      act:act(it)}});
  } else if(list.length>1){
    const late=list.some(x=>x.state==='due'), eod=eodNow.length>0;
    out.push({score: eod? 95 : (late? 91 : 76), cand:{id:'habit',tone:'green',
      kick: eod? 'End of the day' : (late? 'Due' : 'Coming up'),
      title: eod? 'Close the day: your habits' : 'Habits to log',
      why: eod? 'Tap each one you kept today. Anything you leave stays open until the day ends.' : 'Tap each one as you do it.',
      act:list.map(it=>`<button class="mini ${it.state==='due'?'go':''}" data-habittoggle="${it.slot}" aria-label="${escHabit((it.stop?'Went without ':'Done: ')+it.meta.t)}">${escHabit((it.stop?'Stop: ':'')+it.meta.t)}</button>`).join('')}});
  }
  const cu=habitCatchUp(at)[0];
  if(cu) out.push({score:78,cand:{id:'habitcatch',tone:'amber',kick:'Yesterday',
    title:(cu.stop? 'Did you go without ' : 'Did you do ')+escHabit(cu.meta.t)+' yesterday?',
    why:'It was not logged. Log it now if you did, and it counts.',
    act:`<button class="mini go" data-habitcatch="${cu.slot}|${cu.k}">Yes, I did</button><button class="mini" data-habitcatch="${cu.slot}|${cu.k}|no">No</button>`}});
  return out;
}
/* the later-today list and the "Then" line */
function habitLater(at){
  if(!hrOn('prompts')) return [];
  const c=dayClock(at);
  /* a habit that is due still shows after the card, so the evening check in
     does not hide it */
  return habitsToLog(at).map(it=>{
    const m=((it.due.min%1440)+1440)%1440, rel=c.rel(m);
    return {id:'habit',rel,time:minToHhmm(m),title:(it.stop?'Stop: ':'')+it.meta.t+(it.due.eod? ' (end of day)' : ''),role:null,due:rel<=c.n};
  });
}

/* ---------- the number on the icon ---------- */
function habitBadgeCount(){ return pressing(habitsToLog()).filter(x=>x.state==='due').length; }
let badgeNow=null;
function updateBadge(){
  const n=hrOn('badge')&&hrOn('prompts')? habitBadgeCount() : 0;
  if(n===badgeNow) return; badgeNow=n;
  try{
    if(n>0&&navigator.setAppBadge) navigator.setAppBadge(n).catch(()=>{});
    else if(navigator.clearAppBadge) navigator.clearAppBadge().catch(()=>{});
  }catch(e){}
}

/* ---------- phone reminders, set by the app itself ---------- */
const HNOTE_KEY='gauntlet.habitnote';
let hnTimers=[];
function clearHabitNotes(){ hnTimers.forEach(clearTimeout); hnTimers=[]; }
function habitNoteState(){
  if(!canNudge()) return 'unsupported';
  if(Notification.permission==='denied') return 'blocked';
  if(!hrOn('notes')) return 'off';
  return Notification.permission==='granted'? 'on' : 'pending';
}
async function enableHabitNotes(){
  if(!canNudge()){ toast(onIOS()&&!installed()? 'Add Gauntlet to your Home Screen first, then turn phone reminders on' : 'This browser cannot do reminders'); return false; }
  let perm=Notification.permission;
  if(perm==='default'){ try{ perm=await Notification.requestPermission(); }catch(e){ perm='denied'; } }
  if(perm!=='granted'){ toast('Reminders are blocked in your browser settings'); return false; }
  S.profile.habitNotes=true; save(); scheduleHabitNotes();
  toast('Phone reminders on. They arrive while Gauntlet is open or running in the background.');
  return true;
}
function disableHabitNotes(){ S.profile.habitNotes=false; save(); clearHabitNotes(); toast('Phone reminders off'); }
async function fireHabitNote(slot){
  if(habitNoteState()!=='on') return false;
  const h=currentHabit(slot), meta=h&&habitOf(h.id); if(!meta||h.remind===false) return false;
  const it=habitsToLog().find(x=>x.slot===slot); if(!it) return false;   /* already logged: say nothing */
  let seen={}; try{ seen=JSON.parse(localStorage.getItem(HNOTE_KEY)||'{}'); }catch(e){}
  const key=todayKey()+':'+slot;
  if(seen[key]) return false;
  const title=(it.stop? 'Stop: ' : '')+meta.t;
  const opts={body: it.due.eod? 'End of the day. Tap to log it.' : 'Due '+it.due.t+'. A second to log.', tag:'gauntlet-habit-'+slot, data:{url:'./?go=today'}};
  let sent=false;
  try{
    if('serviceWorker' in navigator&&navigator.serviceWorker.getRegistration){
      const reg=await navigator.serviceWorker.getRegistration();
      if(reg&&reg.showNotification){ await reg.showNotification(title,opts); sent=true; }
    }
  }catch(e){}
  if(!sent){ try{ new Notification(title,opts); sent=true; }catch(e){} }
  if(sent){ seen[key]=1; Object.keys(seen).forEach(k=>{ if(k.slice(0,10)<addDays(todayKey(),-3)) delete seen[k]; });
    try{ localStorage.setItem(HNOTE_KEY,JSON.stringify(seen)); }catch(e){} }
  return sent;
}
function scheduleHabitNotes(){
  clearHabitNotes();
  if(habitNoteState()!=='on') return;
  activeHabits().forEach(x=>{
    const h=habitSlots()[x.slot], meta=habitOf(h.id); if(!meta||h.remind===false) return;
    const d=habitDue(h,meta), now=new Date();
    const at=new Date(now.getFullYear(),now.getMonth(),now.getDate(),Math.floor(d.min/60),d.min%60,0);
    if(at.getTime()<=Date.now()) at.setDate(at.getDate()+1);
    /* a long timer drifts: it re-arms in steps of up to six hours */
    const ms=Math.min(at.getTime()-Date.now(),6*3600e3);
    hnTimers.push(setTimeout(()=>{
      if(Date.now()>=at.getTime()-60e3) fireHabitNote(x.slot);
      scheduleHabitNotes();
    },Math.max(1000,ms)));
  });
}

/* ---------- a calendar file: the one reminder that arrives with the app closed ---------- */
const icsEsc=t=>String(t).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
function icsStamp(d){ const p=n=>String(n).padStart(2,'0'); return d.getUTCFullYear()+p(d.getUTCMonth()+1)+p(d.getUTCDate())+'T'+p(d.getUTCHours())+p(d.getUTCMinutes())+p(d.getUTCSeconds())+'Z'; }
function habitIcs(slot){
  const h=currentHabit(slot), meta=h&&habitOf(h.id); if(!meta) return '';
  const d=habitDue(h,meta), now=new Date(), p=n=>String(n).padStart(2,'0');
  const day=now.getFullYear()+p(now.getMonth()+1)+p(now.getDate());
  const start=day+'T'+p(Math.floor(d.min/60))+p(d.min%60)+'00', endM=(d.min+15)%1440;
  const end=day+'T'+p(Math.floor(endM/60))+p(endM%60)+'00';
  const days=meta.days&&meta.days.length&&meta.days.length<7? ';BYDAY='+meta.days.map(n=>WD_ICS[n]).join(',') : '';
  const name=(meta.kind==='stop'? 'Stop: ' : '')+meta.t;
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Gauntlet//Habits//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',
    'UID:habit-'+h.id+'-'+(h.started||day)+'@gauntlet',
    'DTSTAMP:'+icsStamp(now),
    'DTSTART:'+start,'DTEND:'+end,'RRULE:FREQ=DAILY'+days,
    'SUMMARY:'+icsEsc(name),
    'DESCRIPTION:'+icsEsc('Open Gauntlet and tick it off. '+(d.eod? 'End of the day habit.' : 'Do it by '+d.t+'.')),
    'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsEsc(name),'TRIGGER:PT0M','END:VALARM',
    'END:VEVENT','END:VCALENDAR'].join('\r\n')+'\r\n';
}
function downloadIcs(slot){
  const txt=habitIcs(slot); if(!txt) return false;
  try{
    const blob=new Blob([txt],{type:'text/calendar;charset=utf-8'}), url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='gauntlet-habit.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>{ try{ URL.revokeObjectURL(url); }catch(e){} },4000);
    return true;
  }catch(e){ return false; }
}

/* ---------- the "do it by" sheet ---------- */
let dueSlot=null;
function dueChoices(slot){
  const h=currentHabit(slot), meta=h&&habitOf(h.id), times=cueTimes(), w=clockOf('wake'), bed=clockOf('bed');
  const out=[];
  const rel=m=>((m-w)%1440+1440)%1440, bedR=rel(bed)||960;
  const morning=q15(w+120), lunch=times.lunch!==null? q15(times.lunch) : null, eve=q15(w+Math.max(600,bedR-300));
  out.push({t:'Morning',time:minToHhmm(morning),eod:false});
  if(lunch!==null) out.push({t:'Lunch',time:minToHhmm(lunch),eod:false});
  out.push({t:'Evening',time:minToHhmm(eve),eod:false});
  out.push({t:'End of day',time:eodTime(),eod:true});
  return out;
}
function openHabitDue(slot,fresh){
  const h=currentHabit(slot); if(!h) return;
  const meta=habitOf(h.id), stop=meta.kind==='stop', d=habitDue(h,meta);
  dueSlot=slot;
  const ch=dueChoices(slot);
  /* a stop habit can only be judged once the day is done, so it starts there */
  const cur=d.set||h.eod? d : (stop? {t:eodTime(),eod:true,set:false} : null);
  const noteState=habitNoteState(), noteOn=noteState==='on'&&h.remind!==false;
  document.getElementById('altTitle').textContent= fresh? 'Do it by when?' : 'Do it by';
  document.getElementById('altSub').textContent=(stop? 'Stop: ' : '')+meta.t;
  document.getElementById('altBody').innerHTML=`<div class="due" style="padding:0 14px 8px">
    <div class="note">${stop? 'This one can only be judged once the day is over, so end of day is the natural time.'
      : 'A time to do it by is what makes it happen: a when beats a maybe. Tap one and it is saved.'}</div>
    <div class="ep-chips due-chips" role="group" aria-label="Do it by">${ch.map(c=>{ const on=cur&&cur.t===c.time&&!!cur.eod===c.eod;
      return `<button class="rt-cuechip ep-chip ${on?'on':''}" data-duepick="${slot}|${c.time}|${c.eod?1:0}" aria-pressed="${on}">${c.t} <small>${c.time}</small></button>`; }).join('')}</div>
    <div class="nf"><label for="dueTime">Or pick a time</label>
      <div class="ownrow"><input id="dueTime" type="time" step="900" value="${d.t}" aria-label="Time to do it by">
        <button class="mini go" data-duesave="${slot}">Save</button></div></div>
    ${d.set||h.eod? `<div class="note">Now: ${d.eod? 'end of day, '+d.t : 'by '+d.t}. ${hrOn('prompts')? 'It comes up on Today when it is due, and stays there until it is ticked.' : 'Prompts on Today are off in your settings.'}</div>` : `<div class="note">Not set yet. Until you pick one, it is asked about ${stop? 'at '+d.t : 'at '+d.t+', an hour after its moment in your day'}.</div>`}
    <div class="slab">Reminders</div>
    <button class="rt-cuechip ep-chip ${noteOn?'on':''}" data-dueremind="${slot}" aria-pressed="${noteOn}" ${noteState==='unsupported'?'disabled':''}>Phone reminder at this time: ${noteOn? 'On' : 'Off'}</button>
    <div class="note">${noteState==='unsupported'? 'This browser cannot do reminders. The prompt on Today still works.'
      : (noteState==='blocked'? 'Reminders are blocked in your browser settings. The prompt on Today still works.'
      : (onIOS()&&!installed()? 'On iPhone and iPad this needs Gauntlet on your Home Screen: tap Share, then Add to Home Screen. '
        : '')+'This reminder comes from the app itself, not a server, so it arrives while Gauntlet is open or running in the background. If it is closed, the habit waits for you on Today.')}</div>
    <button class="sheetcta" data-dueics="${slot}" style="margin:10px 0 6px;width:100%">Add to my phone's calendar</button>
    <div class="note">A daily event with an alert at ${d.t}, from your own calendar app. That one arrives even when Gauntlet is closed. Add it once; if you change the time here, add it again and delete the old one.</div>
    <div class="method"><b>Where this comes from</b><span>${REMIND_EVIDENCE}</span></div>
  </div>`;
  openSheet('altSheet');
}
function setDue(slot,time,eod,quiet){
  const h=currentHabit(slot); if(!h||!hhmmOk(time)) return false;
  const before={due:h.due,eod:h.eod};
  h.due=minToHhmm(hhmmToMin(time)); h.eod=!!eod; save();
  if(!quiet){ closeSheets(); renderAll(); scheduleHabitNotes();
    const meta=habitOf(h.id);
    toast((meta.kind==='stop'? 'Stop: ' : '')+meta.t+': '+(eod? 'end of day, ' : 'by ')+h.due,'Undo',()=>{
      if(before.due===undefined) delete h.due; else h.due=before.due;
      if(before.eod===undefined) delete h.eod; else h.eod=before.eod;
      save(); renderAll(); scheduleHabitNotes(); }); }
  return true;
}

document.addEventListener('click',e=>{
  const dp=e.target.closest('[data-duepick]');
  if(dp){ const [slot,time,eod]=dp.dataset.duepick.split('|'); setDue(slot,time,eod==='1'); return; }
  const ds=e.target.closest('[data-duesave]');
  if(ds){ const inp=document.getElementById('dueTime'), v=inp&&inp.value;
    if(!hhmmOk(v)){ toast('Pick a time first'); return; }
    /* a time at or after the end of day time is an end of day habit */
    setDue(ds.dataset.duesave,v,hhmmToMin(v)>=hhmmToMin(eodTime())); return; }
  const dr=e.target.closest('[data-dueremind]');
  if(dr){ const slot=dr.dataset.dueremind, h=currentHabit(slot); if(!h) return;
    const on=habitNoteState()==='on'&&h.remind!==false;
    if(on){ h.remind=false; save(); }
    else { h.remind=true; save(); }
    (async()=>{ if(!on&&habitNoteState()!=='on') await enableHabitNotes(); else if(!on) toast('Phone reminder on for this habit'); else toast('Phone reminder off for this habit');
      scheduleHabitNotes(); if(dueSlot===slot&&document.getElementById('altSheet').classList.contains('on')) openHabitDue(slot,false); })();
    return; }
  const di=e.target.closest('[data-dueics]');
  if(di){ const ok=downloadIcs(di.dataset.dueics);
    toast(ok? 'Open the file to add it to your calendar' : 'Could not make the calendar file here'); return; }
  const de=e.target.closest('[data-dueedit]');
  if(de){ openHabitDue(de.dataset.dueedit,false); return; }
  const hc=e.target.closest('[data-habitcatch]');
  if(hc){ const [slot,k,no]=hc.dataset.habitcatch.split('|'), h=currentHabit(slot); if(!h) return;
    if(no==='no'){ h.skipCatch=k; save(); renderAll(); return; }
    h.days=h.days||{}; const was=h.days[k]; h.days[k]=true; save(); renderAll();
    toast('Logged for yesterday','Undo',()=>{ if(was===undefined) delete h.days[k]; else h.days[k]=was; save(); renderAll(); }); return; }
  const hs=e.target.closest('[data-hrset]');
  if(hs){ const key=hs.dataset.hrset;
    if(key==='notes'){ (async()=>{ if(hrOn('notes')) disableHabitNotes(); else await enableHabitNotes(); openHabitReminders(); })(); return; }
    S.profile['habit_'+key]= !hrOn(key); save(); updateBadge(); renderAll(); openHabitReminders(); return; }
  const et=e.target.closest('[data-hreod]');
  if(et){ const v=et.dataset.hreod; if(hhmmOk(v)){ S.profile.eodTime=v; save(); renderAll(); openHabitReminders(); toast('End of day is '+v); } return; }
});
document.addEventListener('change',e=>{
  const t=e.target.closest&&e.target.closest('#hrEod');
  if(t&&hhmmOk(t.value)){ S.profile.eodTime=t.value; save(); renderAll(); toast('End of day is '+t.value); }
});

/* ---------- the settings sheet ---------- */
function habitRemindersLabel(){
  const bits=[hrOn('prompts')? 'Prompts on Today' : 'Prompts off'];
  const ns=habitNoteState(); bits.push(ns==='on'? 'phone reminders on' : 'phone reminders off');
  return bits.join(' · ');
}
function openHabitReminders(){
  const ns=habitNoteState(), tg=(key,label,sub)=>`<button class="ysrow" data-hrset="${key}" aria-pressed="${hrOn(key)}" style="width:100%">
      <span class="ysd"><b>${label}</b><span>${sub}</span></span><span class="ysv">${hrOn(key)? 'On' : 'Off'}</span></button>`;
  document.getElementById('altTitle').textContent='Habit reminders';
  document.getElementById('altSub').textContent='How your habits are brought to your attention.';
  document.getElementById('altBody').innerHTML=`<div style="padding:0 14px 8px">
    ${tg('prompts','Prompts on Today','The Up next card asks for a habit when it is due, and again at the end of the day until it is ticked.')}
    ${tg('badge','Number on the app icon','How many habits are due. Only where your phone allows it, and cleared when they are done.')}
    <button class="ysrow" data-hrset="notes" aria-pressed="${ns==='on'}" style="width:100%" ${ns==='unsupported'?'disabled':''}>
      <span class="ysd"><b>Phone reminders</b><span>${ns==='unsupported'? 'This browser cannot do reminders.' : (ns==='blocked'? 'Blocked in your browser settings.' : 'A notification at each habit\'s time. Set by the app itself, not a server, so it arrives while Gauntlet is open or running in the background.')}</span></span>
      <span class="ysv">${ns==='on'? 'On' : 'Off'}</span></button>
    <div class="nf" style="margin-top:12px"><label for="hrEod">End of day is</label><input id="hrEod" type="time" step="900" value="${eodTime()}"></div>
    <div class="note">The time a stop habit, or one set to end of day, comes up. It starts at ${EOD_DEFAULT}.</div>
    ${onIOS()&&!installed()? '<div class="note">On iPhone and iPad, reminders and the badge only work once Gauntlet is on your Home Screen: tap Share, then Add to Home Screen.</div>' : ''}
    <div class="note">For a reminder that always arrives, even with Gauntlet closed, open a habit and add it to your phone's calendar.</div>
  </div>`;
  openSheet('altSheet');
}

/* ---------- keep it current ---------- */
let hrSig='';
function hrTick(){
  updateBadge();
  /* the Up next card follows the clock: redraw Today only when what it would
     say has changed, and never under an open sheet or a typing cursor */
  const sig=habitsToLog().map(x=>x.slot+x.state).join(',')+'|'+habitCatchUp().length;
  if(sig!==hrSig){ const was=hrSig; hrSig=sig;
    if(was!==''&&document.body.dataset.screen==='today'&&!document.querySelector('.sheet.on')
       &&!(document.activeElement&&/INPUT|TEXTAREA/.test(document.activeElement.tagName))) { try{ renderToday(); }catch(e){} } }
}
setInterval(hrTick,60e3);
document.addEventListener('visibilitychange',()=>{ if(!document.hidden){ hrTick(); scheduleHabitNotes(); } });
if(typeof window!=='undefined') window.addEventListener('load',()=>{ setTimeout(()=>{ hrTick(); scheduleHabitNotes(); },1500); });

if(window.__G) Object.assign(window.__G,{habitDue,dueDelta,habitsToLog,habitCatchUp,habitCandidates,habitLater,habitBadgeCount,habitIcs,openHabitDue,setDue,
  habitNoteState,fireHabitNote,scheduleHabitNotes,openHabitReminders,habitRemindersLabel,hrOn,eodTime,hrTick,updateBadge,EOD_DEFAULT});
