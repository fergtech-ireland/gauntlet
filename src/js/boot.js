/* boot, once everything is defined */
if(S.profile.onboarded){ ME.n=S.profile.handle; ME.full=S.profile.handle.replace(/[._]/g,' '); }
if(typeof applyTheme==='function') applyTheme();
if(typeof scheduleNudge==='function') scheduleNudge();
syncWeek();
ensurePlan();
mountColophons();
renderAll();
/* build 59: a session left going before a reload comes back */
if(S.profile.onboarded&&typeof restoreLive==='function') restoreLive();
if(!S.profile.onboarded) startOnboarding();
