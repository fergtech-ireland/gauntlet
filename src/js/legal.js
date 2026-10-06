/* =====================================================================
   Privacy policy and terms (build 53).
   Plain English, written to say what the app actually does, and checked
   against the code: what is stored, where, who can read it, how long it is
   kept, and how to get it or delete it. It is a draft for a solicitor to
   review before anyone outside the test group is invited.
   When either text changes, TERMS_VERSION in cloud.js changes with it, and
   everyone who backs up is asked to read it and agree again.
   ===================================================================== */
/* The email for data protection requests (build 54). A separate address for
   Gauntlet, not anyone's personal one. If it is ever emptied, the policy says
   a contact is coming rather than inventing one. */
const LEGAL_CONTACT='gauntlet.privacy@gmail.com';
const contactLine=()=>LEGAL_CONTACT
  ? 'For anything the app cannot do for you, or any question about your data, email <a class="inlinebtn" href="mailto:'+escHabit(LEGAL_CONTACT)+'">'+escHabit(LEGAL_CONTACT)+'</a>. You will get an answer within a month, which is what the law requires.'
  : 'A contact email for anything the app cannot do for you is added here before anyone outside the test group is invited. Until then, everything below can be done in the app itself.';
const LEGAL={
  privacy:{title:'Privacy policy', sections:()=>[
    ['The short version','Gauntlet keeps your training, food and body numbers so it can plan your week. They stay on your phone unless you choose to back them up. If you do, a copy is kept on a server in Ireland that only your account can read. No advertising, no selling, no third party analytics or tracking. You can download everything, or delete everything, at any time from Your data.'],
    ['Who is responsible','Gauntlet is a small independent app made in Ireland. Its maker decides what is collected and why, which makes them the controller under the GDPR. '+contactLine()],
    ['What is kept on your phone','Everything you put in: your profile (handle, aim, sex, year of birth, height, weight, steps target, equipment), your week, weigh ins, food, sleep, workouts and runs, check ins, pain notes, and your cycle if you track it. It lives in this browser\'s own storage on this device. Nothing leaves the phone unless you back up.'],
    ['What is kept on the server, if you back up','A copy of the same data, plus your settings and the date and version of what you agreed to. If you add an email, your email address too, used only to send you sign-in codes. If you have an email on your account, your handle, your aim and anything you post to the feed can be seen by other people using Gauntlet with an email. Nothing else of yours can.'],
    ['Health information','Weight, body measurements, food, sleep, training, check ins, pain notes and your cycle count as health data, which the law protects more strongly. It is only kept on the server if you tick the box agreeing to it, separately from the terms, and you can take that back at any time: Your data, Withdraw consent. That deletes it from the server, checks it is gone, and leaves your phone as it is.'],
    ['Why it is used, and the legal basis','Only to run the app for you: to plan your week, work out your targets, keep your copy safe and put it on your other phones. Health information is kept on the basis of your explicit consent (GDPR Article 9(2)(a)). The rest is kept because it is needed to give you the app you asked for (Article 6(1)(b)). Nothing is used to train AI models, profile you for anyone else, or decide anything about you without you.'],
    ['Where it is kept, and who helps','The server is Supabase, in the EU (Ireland, eu-west-1). Supabase stores and serves the data for Gauntlet and may not use it for anything else. The app itself is served by GitHub Pages, and its typeface by Google Fonts. Like any website, those see your internet address when your phone loads the app; they never see what you log.'],
    ['Who can read it','Only you. The database enforces it, not just the app: every private row can be read only by the account it belongs to, and that is tested automatically before every release. The maker of Gauntlet can reach the database in order to keep it running. Everything travels over encrypted connections.'],
    ['The coach, if you set it up','The coach sends nothing anywhere until you give it an endpoint of your own. Then it sends your brief (weights, sessions, check ins, habits, your target and the notes you wrote) to that address and nowhere else. What happens to it there is between you and whoever runs it.'],
    ['How long it is kept','On your phone, until you delete it. On the server, until you withdraw consent, delete everything, or delete your account, which removes every row and the sign-in itself.'],
    ['Your rights','You can see all of it (Your data, Download everything: one plain file), correct it (edit anything in the app), move it (that file works anywhere), delete it (Delete everything), and withdraw consent (Withdraw consent). You can also object to how it is used or ask for it to be restricted. If you are unhappy with how your data is handled, you can complain to the Data Protection Commission at dataprotection.ie.'+(LEGAL_CONTACT? ' Any of these can also be asked for by email at '+escHabit(LEGAL_CONTACT)+'.' : '')],
    ['Age','You need to be 16 or over to back up, because that is the age of digital consent in Ireland. Under 16, Gauntlet works fully but nothing leaves the phone. Gauntlet is not for children under 13.'],
    ['Changes','When this policy changes, the app shows it, says what changed, and asks you to agree again before anything more is backed up.']]},
  terms:{title:'Terms', sections:()=>[
    ['What Gauntlet is','A training and nutrition log that plans your week and makes suggestions. It is free, and it is offered as it is, while it is being built.'],
    ['It is not medical advice','Calories, protein, forecasts and training suggestions are estimates from published research, labelled as such. They are not a diagnosis or a prescription, and they are no substitute for a GP, physio or dietitian. If you have a medical condition, are pregnant, are returning from an injury or are unsure, check with a professional first. Stop and get help for chest pain, faintness, or pain that is sharp, sudden or does not settle.'],
    ['You are in charge of your training','Pick weights you can lift with good form, and change anything the app suggests if it does not suit you. You train at your own risk.'],
    ['Your account','Backing up needs you to be 16 or over. An account is for one person. If you add an email, keep it yours: a code sent to it is how you get back in.'],
    ['What you share','Your handle and anything you post can be seen by other people with an email account. Be decent: nothing hateful, sexual, threatening or unlawful, nothing that pretends to be someone else, and nothing private about other people. Handles and posts that break this can be removed.'],
    ['If things go wrong','Gauntlet tries hard not to lose anything, but keep your own copy (Your data, Download everything). The app can change, pause or stop; if it ever stops, you will be told in the app first, with time to download your data. Nothing here takes away your rights under Irish and EU consumer law.'],
    ['Ending it','You can stop at any time: Delete everything removes all of it, here and on the server.'],
    ['The law','These terms are governed by Irish law.'],
    ['Changes','When these terms change, the app shows them and asks you to agree again before anything more is backed up.']]}
};
const legalVersion=()=>(window.__CLOUD&&window.__CLOUD.TERMS_VERSION)||'';
function openLegal(kind){
  const L=LEGAL[kind]; if(!L) return;
  let el=document.getElementById('legal');
  if(!el){ el=document.createElement('div'); el.id='legal'; el.className='legal'; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true');
    document.body.appendChild(el); }
  const other=kind==='privacy'? 'terms' : 'privacy';
  el.setAttribute('aria-label',L.title);
  el.innerHTML=`<div class="legal-top"><button class="legal-back" id="legalBack" aria-label="Back">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m15 5-7 7 7 7"/></svg> Back</button></div>
    <div class="legal-body"><h2>${L.title}</h2>
      <p class="legal-ver">Version ${escHabit(legalVersion())}. A plain English draft, to be checked by a solicitor before testers are invited.</p>
      ${L.sections().map(([h,t])=>`<h4>${h}</h4><p>${t}</p>`).join('')}
      <button class="inlinebtn" data-legal="${other}" style="margin:8px 0 24px">Read the ${LEGAL[other].title.toLowerCase()}</button></div>`;
  legalReturn=legalReturn||document.activeElement;
  el.classList.add('on'); el.scrollTop=0;
  const body=el.querySelector('.legal-body'); if(body) body.scrollTop=0;
  setTimeout(()=>{ const b=document.getElementById('legalBack'); if(b) try{ b.focus({preventScroll:true}); }catch(e){} },30);
}
let legalReturn=null;
function closeLegal(){
  const el=document.getElementById('legal'); if(!el||!el.classList.contains('on')) return false;
  el.classList.remove('on');
  if(legalReturn&&document.contains(legalReturn)) try{ legalReturn.focus({preventScroll:true}); }catch(e){}
  legalReturn=null; return true;
}
/* capture, so a link inside a consent box never ticks the box, and Escape
   closes the page without closing the sheet underneath it */
document.addEventListener('click',e=>{
  const l=e.target.closest('[data-legal]');
  if(l){ e.preventDefault(); e.stopPropagation(); openLegal(l.dataset.legal); return; }
  if(e.target.closest('#legalBack')){ e.stopPropagation(); closeLegal(); }
},true);
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&closeLegal()){ e.preventDefault(); e.stopPropagation(); } },true);
Object.assign(window.__G,{LEGAL,LEGAL_CONTACT,openLegal,closeLegal,ageFromBirth,syncAge,birthdayMatters,validBirthYear,AGE_LINES});
