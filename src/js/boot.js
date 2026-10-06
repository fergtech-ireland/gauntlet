/* boot, once everything is defined */
if(S.profile.onboarded){ ME.n=S.profile.handle; ME.full=S.profile.handle.replace(/[._]/g,' '); }
if(typeof applyTheme==='function') applyTheme();
if(typeof scheduleNudge==='function') scheduleNudge();
S.week.forEach((d,i)=>{ d.today = i===dowIdx(); });
ensurePlan();
mountColophons();
renderAll();
if(!S.profile.onboarded) startOnboarding();
