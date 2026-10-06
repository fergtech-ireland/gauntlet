/* ---------- what the movement actually looks like ----------
   The library had coaching cues and nothing else. "Chest up, elbows inside the
   knees" is no use to anyone who has not already done the movement, and for a
   beginner that is an injury exposure as much as a usability one.
   Photographs of 252 movements is a different kind of project. What this does
   instead is honest about what it is: a figure moving between the start and the
   end of the pattern, drawn from the library's own p: field, so every movement
   in the app gets one without anybody drawing 252 pictures. It shows the SHAPE
   of the lift. It is not a form check and the sheet says so.
   Poses are joint positions in a 100 x 140 box: head, neck, pelvis, knee,
   ankle, elbow, wrist, and optionally a second leg for split stances. The two
   poses are interpolated by SVG's own animation, so there is nothing to load
   and nothing to run on a timer. */
const FIG_W=200, FIG_H=240, GROUND=224;
/* ---------- how a movement is drawn ----------
   The old figure was seven dots joined by lines, one generic pose per
   pattern, so a bench press and a press up came out identical and nothing
   looked like a person. This draws an articulated body: head with a jaw line,
   a torso that tapers from shoulders to hips, separate upper and lower arm,
   thigh and shin, hands and feet, and the equipment actually in use. Poses are
   per exercise where the movement is common enough to matter, and per pattern
   otherwise, so every one of the 252 movements still gets a figure.

   A pose is joint positions, in a 200 x 240 box, at the two ends of the
   movement. SVG animates between them, so there is nothing to download and it
   works offline, in both themes, at any size. Under prefers-reduced-motion it
   holds still at the start position.

   Joints: head, neck, chest, hip, then per side: shoulder, elbow, wrist,
   knee, ankle, toe. "near" is the side towards the viewer, drawn heavier;
   "far" is drawn lighter, which is what gives it depth. */
const FIG_JOINTS=['head','neck','chest','hip','shoulder','elbow','wrist','knee','ankle','toe'];

/* A neutral standing body, which every pose is written as a change from. */
const STAND={
  head:[100,34], neck:[100,56], chest:[100,86], hip:[100,126],
  shoulder:[100,62], elbow:[100,100], wrist:[100,138],
  knee:[100,172], ankle:[100,214], toe:[112,220]
};
/* side: x offsets applied to the far limb so it reads as behind */
function poseFrom(o){ return Object.assign({}, STAND, o||{}); }

/* ---------- the poses ----------
   Each entry: view, then the two ends of the movement. Written as the joints
   that differ from standing, which keeps them readable and consistent. */
const MOVE_POSES={
  /* ===== squat pattern ===== */
  'squat':{view:'side',bar:'back',
    a:poseFrom({wrist:[86,60],elbow:[88,78],shoulder:[98,62]}),
    b:poseFrom({head:[92,52],neck:[94,72],chest:[96,100],hip:[86,152],
      knee:[112,178],ankle:[100,214],toe:[114,220],
      shoulder:[92,78],elbow:[80,94],wrist:[80,76]})},
  'goblet':{view:'side',bar:'db-chest',
    a:poseFrom({elbow:[92,96],wrist:[100,84]}),
    b:poseFrom({head:[94,54],neck:[96,74],chest:[98,102],hip:[88,154],
      knee:[114,180],elbow:[94,112],wrist:[102,100]})},
  /* ===== hinge ===== */
  'hinge':{view:'side',bar:'hands',
    a:poseFrom({wrist:[100,140],elbow:[100,100]}),
    b:poseFrom({head:[70,74],neck:[76,84],chest:[84,98],hip:[108,128],
      knee:[104,172],elbow:[86,120],wrist:[88,150],ankle:[100,214]})},
  'deadlift':{view:'side',bar:'hands',
    a:poseFrom({head:[86,72],neck:[90,84],chest:[94,100],hip:[110,138],
      knee:[108,172],elbow:[92,130],wrist:[92,164]}),
    b:poseFrom({elbow:[100,104],wrist:[100,142]})},
  /* ===== horizontal push ===== */
  'bench':{view:'lie-bench',bar:'hands',
    a:poseFrom({head:[52,118],neck:[66,118],chest:[86,118],hip:[118,120],
      shoulder:[70,114],elbow:[62,98],wrist:[78,102],
      knee:[146,140],ankle:[150,186],toe:[164,192]}),
    b:poseFrom({head:[52,118],neck:[66,118],chest:[86,118],hip:[118,120],
      shoulder:[70,114],elbow:[74,86],wrist:[78,60],
      knee:[146,140],ankle:[150,186],toe:[164,192]})},
  'pushup':{view:'side',bar:'floor-hands',
    a:poseFrom({head:[56,120],neck:[70,124],chest:[90,130],hip:[124,140],
      shoulder:[72,122],elbow:[66,152],wrist:[68,188],
      knee:[156,166],ankle:[184,196],toe:[192,200]}),
    b:poseFrom({head:[56,152],neck:[70,156],chest:[90,160],hip:[124,166],
      shoulder:[72,154],elbow:[54,176],wrist:[68,188],
      knee:[156,182],ankle:[184,200],toe:[192,204]})},
  /* ===== vertical push ===== */
  'ohp':{view:'side',bar:'hands',
    a:poseFrom({shoulder:[98,62],elbow:[84,84],wrist:[92,62]}),
    b:poseFrom({shoulder:[100,60],elbow:[96,42],wrist:[100,20]})},
  /* ===== horizontal pull ===== */
  'row':{view:'side',bar:'hands',
    a:poseFrom({head:[70,80],neck:[78,88],chest:[88,100],hip:[112,128],
      knee:[110,172],shoulder:[80,92],elbow:[80,126],wrist:[82,158]}),
    b:poseFrom({head:[70,80],neck:[78,88],chest:[88,100],hip:[112,128],
      knee:[110,172],shoulder:[80,92],elbow:[98,114],wrist:[86,116]})},
  /* ===== vertical pull ===== */
  'chin':{view:'side',bar:'overhead',
    a:poseFrom({head:[100,84],neck:[100,104],chest:[100,130],hip:[100,168],
      shoulder:[100,108],elbow:[98,72],wrist:[100,38],
      knee:[108,208],ankle:[96,232],toe:[108,236]}),
    b:poseFrom({head:[100,56],neck:[100,74],chest:[100,100],hip:[100,140],
      shoulder:[100,78],elbow:[84,64],wrist:[100,38],
      knee:[112,180],ankle:[98,206],toe:[110,210]})},
  'pulldown':{view:'side',bar:'overhead-cable',
    a:poseFrom({chest:[100,90],shoulder:[100,64],elbow:[92,40],wrist:[100,16]}),
    b:poseFrom({chest:[100,90],shoulder:[100,64],elbow:[78,64],wrist:[100,50]})},
  /* ===== lunge ===== */
  'lunge':{view:'side',bar:'db-sides',split:true,
    a:poseFrom({wrist:[100,142],elbow:[100,102]}),
    b:poseFrom({head:[98,44],neck:[98,66],chest:[98,96],hip:[98,146],
      knee:[128,176],ankle:[130,214],toe:[144,220],
      elbow:[98,112],wrist:[98,152]})},
  /* ===== isolation ===== */
  'curl':{view:'front',mirror:true,bar:'db-hands',
    a:poseFrom({shoulder:[84,64],elbow:[80,104],wrist:[80,142]}),
    b:poseFrom({shoulder:[84,64],elbow:[80,104],wrist:[90,74]})},
  'lateral':{view:'front',mirror:true,bar:'db-hands',
    a:poseFrom({shoulder:[84,64],elbow:[80,102],wrist:[78,140]}),
    b:poseFrom({shoulder:[84,64],elbow:[48,68],wrist:[24,62]})},
  'pushdown':{view:'side',bar:'cable-high',
    a:poseFrom({elbow:[96,100],wrist:[92,74]}),
    b:poseFrom({elbow:[96,100],wrist:[96,136]})},
  'fly':{view:'lie-bench',bar:'db-hands',
    a:poseFrom({head:[52,118],neck:[66,118],chest:[86,118],hip:[118,120],
      shoulder:[70,114],elbow:[52,96],wrist:[38,84],
      knee:[146,140],ankle:[150,186],toe:[164,192]}),
    b:poseFrom({head:[52,118],neck:[66,118],chest:[86,118],hip:[118,120],
      shoulder:[70,114],elbow:[66,84],wrist:[72,62],
      knee:[146,140],ankle:[150,186],toe:[164,192]})},
  'calf':{view:'side',bar:'none',
    a:poseFrom({ankle:[100,214],toe:[116,220]}),
    b:poseFrom({head:[100,24],neck:[100,46],chest:[100,76],hip:[100,116],
      shoulder:[100,52],elbow:[100,90],wrist:[100,128],
      knee:[100,162],ankle:[100,200],toe:[116,220]})},
  'legext':{view:'side-seated',bar:'machine',
    a:poseFrom({head:[86,60],neck:[88,80],chest:[92,106],hip:[96,142],
      knee:[136,146],ankle:[140,192],toe:[152,198],
      shoulder:[90,84],elbow:[86,112],wrist:[96,132]}),
    b:poseFrom({head:[86,60],neck:[88,80],chest:[92,106],hip:[96,142],
      knee:[136,146],ankle:[182,140],toe:[192,150],
      shoulder:[90,84],elbow:[86,112],wrist:[96,132]})},
  'hamcurl':{view:'side',bar:'machine',
    a:poseFrom({head:[52,150],neck:[68,152],chest:[90,156],hip:[124,160],
      knee:[160,164],ankle:[194,168],toe:[198,180],
      shoulder:[70,150],elbow:[56,168],wrist:[44,182]}),
    b:poseFrom({head:[52,150],neck:[68,152],chest:[90,156],hip:[124,160],
      knee:[160,164],ankle:[168,122],toe:[180,116],
      shoulder:[70,150],elbow:[56,168],wrist:[44,182]})},
  'hipthrust':{view:'side',bar:'lap',
    a:poseFrom({head:[52,110],neck:[66,114],chest:[86,124],hip:[118,176],
      knee:[156,150],ankle:[162,212],toe:[176,218],
      shoulder:[70,114],elbow:[62,136],wrist:[80,150]}),
    b:poseFrom({head:[52,110],neck:[66,114],chest:[86,120],hip:[122,134],
      knee:[158,138],ankle:[162,212],toe:[176,218],
      shoulder:[70,114],elbow:[64,124],wrist:[84,124]})},
  /* ===== trunk ===== */
  'crunch':{view:'lie-floor',bar:'none',
    a:poseFrom({head:[44,176],neck:[58,178],chest:[80,182],hip:[112,188],
      knee:[146,158],ankle:[152,212],toe:[166,218],
      shoulder:[62,176],elbow:[54,158],wrist:[56,168]}),
    b:poseFrom({head:[66,148],neck:[74,160],chest:[88,174],hip:[112,188],
      knee:[146,158],ankle:[152,212],toe:[166,218],
      shoulder:[76,158],elbow:[66,146],wrist:[70,152]})},
  'plank':{view:'side',bar:'none',
    a:poseFrom({head:[52,140],neck:[68,144],chest:[90,150],hip:[126,156],
      knee:[158,176],ankle:[188,196],toe:[196,200],
      shoulder:[70,142],elbow:[66,172],wrist:[86,180]}),
    b:poseFrom({head:[52,142],neck:[68,146],chest:[90,152],hip:[126,157],
      knee:[158,178],ankle:[188,198],toe:[196,202],
      shoulder:[70,144],elbow:[66,174],wrist:[86,182]})},
  'hanging':{view:'side',bar:'overhead',
    a:poseFrom({head:[100,72],neck:[100,92],chest:[100,118],hip:[100,158],
      shoulder:[100,96],elbow:[100,66],wrist:[100,34],
      knee:[100,198],ankle:[100,232],toe:[112,236]}),
    b:poseFrom({head:[100,72],neck:[100,92],chest:[100,118],hip:[104,156],
      shoulder:[100,96],elbow:[100,66],wrist:[100,34],
      knee:[142,132],ankle:[152,96],toe:[164,92]})},
  'paloff':{view:'front',bar:'cable-side',
    a:poseFrom({elbow:[86,96],wrist:[94,88]}),
    b:poseFrom({elbow:[92,92],wrist:[92,64]})},
  /* ===== carries, cardio, mobility ===== */
  'carry':{view:'side',mirror:true,bar:'db-sides',split:true,
    a:poseFrom({wrist:[100,142]}),
    b:poseFrom({head:[98,32],neck:[98,54],chest:[98,84],hip:[98,124],
      knee:[86,170],ankle:[78,212],toe:[92,218],wrist:[98,140]})},
  'run':{view:'side',bar:'none',split:true,
    a:poseFrom({head:[98,32],neck:[98,54],chest:[98,84],hip:[100,124],
      knee:[126,158],ankle:[140,192],toe:[152,196],
      shoulder:[98,60],elbow:[78,88],wrist:[72,112]}),
    b:poseFrom({head:[98,32],neck:[98,54],chest:[98,84],hip:[100,124],
      knee:[74,164],ankle:[58,196],toe:[48,200],
      shoulder:[98,60],elbow:[120,88],wrist:[128,110]})},
  'mobility':{view:'side',bar:'none',
    a:poseFrom({head:[44,124],neck:[60,128],chest:[86,134],hip:[124,132],
      knee:[128,180],ankle:[128,216],toe:[142,220],
      shoulder:[64,128],elbow:[58,158],wrist:[54,190]}),
    b:poseFrom({head:[48,142],neck:[62,142],chest:[86,120],hip:[124,116],
      knee:[128,170],ankle:[128,212],toe:[142,216],
      shoulder:[66,140],elbow:[58,166],wrist:[54,192]})}
};
/* Which drawing a movement uses: its own if it has one, then its pattern. */
const PATTERN_POSE={
  'squat':'squat','hinge':'hinge','lunge':'lunge',
  'horizontal push':'bench','vertical push':'ohp',
  'horizontal pull':'row','vertical pull':'chin',
  'chest isolation':'fly','shoulder isolation':'lateral',
  'elbow flexion':'curl','elbow extension':'pushdown',
  'knee isolation':'legext','hip isolation':'hipthrust','calf':'calf',
  'trunk flexion':'crunch','anti-extension':'plank','anti-rotation':'paloff',
  'carry':'carry','grip':'carry','cardio':'run','mobility':'mobility','full body':'squat'
};
/* Movements whose own drawing differs from the pattern default. */
const EX_POSE={
  bench:'bench', dbbench:'bench', incline:'bench', pushup:'pushup', dip:'pushup',
  squat:'squat', frontsquat:'squat', hack:'squat', legpress:'squat', goblet:'goblet',
  bss:'lunge', lunge:'lunge', stepup:'lunge', splitsq:'lunge',
  dead:'deadlift', deadlift:'deadlift', rdl:'hinge', goodmorning:'hinge', hipthrust:'hipthrust',
  bbrow:'row', dbrow:'row', csrow:'row', facepull:'pulldown', pulldown:'pulldown',
  chin:'chin', pullup:'chin', hanging:'hanging', legraise:'hanging',
  ohp:'ohp', dbpress:'ohp', arnold:'ohp', lateral:'lateral', hammer:'curl', curl:'curl',
  pushdown:'pushdown', skull:'pushdown', calf:'calf', hamcurl:'hamcurl', legext:'legext',
  plank:'plank', sidplank:'plank', deadbug:'crunch', crunch:'crunch', paloff:'paloff',
  catcow:'mobility', '90_90':'mobility', carry:'carry', farmers:'carry'
};
function poseKeyFor(exId){
  if(MOVE_POSES[exId]) return exId;
  if(EX_POSE[exId]&&MOVE_POSES[EX_POSE[exId]]) return EX_POSE[exId];
  const x=(typeof exOf==='function')? exOf(exId) : null;
  const byPattern=x&&PATTERN_POSE[x.p];
  if(byPattern&&MOVE_POSES[byPattern]) return byPattern;
  /* nothing matched: the movement's group decides, so it is never blank */
  const g=(x&&x.g)||'';
  if(/leg|glute|quad|ham/i.test(g)) return 'squat';
  if(/back/i.test(g)) return 'row';
  if(/chest/i.test(g)) return 'bench';
  if(/shoulder/i.test(g)) return 'lateral';
  if(/arm|bicep|tricep/i.test(g)) return 'curl';
  if(/core/i.test(g)) return 'plank';
  return 'squat';
}
function poseFor(exId){ return MOVE_POSES[poseKeyFor(exId)]; }

const reduced=()=>{ try{ return window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };

/* one animated value, between the two ends of the movement */
function anim(name,from,to,dur){
  if(reduced()) return '';
  return `<animate attributeName="${name}" dur="${dur}s" repeatCount="indefinite"
    values="${from};${to};${from}" keyTimes="0;0.5;1" calcMode="spline"
    keySplines="0.42 0 0.2 1;0.42 0 0.2 1"/>`;
}
function bone(A,B,j1,j2,dur,dx,cls){
  const f=(P,j,i)=>+(P[j][i]+(i===0?(dx||0):0)).toFixed(1);
  return `<line class="${cls||''}" x1="${f(A,j1,0)}" y1="${f(A,j1,1)}" x2="${f(A,j2,0)}" y2="${f(A,j2,1)}">
    ${anim('x1',f(A,j1,0),f(B,j1,0),dur)}${anim('y1',f(A,j1,1),f(B,j1,1),dur)}
    ${anim('x2',f(A,j2,0),f(B,j2,0),dur)}${anim('y2',f(A,j2,1),f(B,j2,1),dur)}</line>`;
}
function blob(A,B,j,r,dur,dx,cls){
  const f=(P,i)=>+(P[j][i]+(i===0?(dx||0):0)).toFixed(1);
  return `<circle class="${cls||''}" cx="${f(A,0)}" cy="${f(A,1)}" r="${r}">
    ${anim('cx',f(A,0),f(B,0),dur)}${anim('cy',f(A,1),f(B,1),dur)}</circle>`;
}
/* the torso, as a shape rather than a line: shoulders to hips, tapered */
function torso(A,B,dur){
  const path=P=>{ const [sx,sy]=P.neck,[cx,cy]=P.chest,[hx,hy]=P.hip;
    const w1=13,w2=9;
    const ang=Math.atan2(hy-sy,hx-sx)+Math.PI/2;
    const ox=Math.cos(ang),oy=Math.sin(ang);
    return `M${(sx+ox*w1).toFixed(1)} ${(sy+oy*w1).toFixed(1)}
      L${(cx+ox*w2).toFixed(1)} ${(cy+oy*w2).toFixed(1)}
      L${(hx+ox*w2*0.9).toFixed(1)} ${(hy+oy*w2*0.9).toFixed(1)}
      L${(hx-ox*w2*0.9).toFixed(1)} ${(hy-oy*w2*0.9).toFixed(1)}
      L${(cx-ox*w2).toFixed(1)} ${(cy-oy*w2).toFixed(1)}
      L${(sx-ox*w1).toFixed(1)} ${(sy-oy*w1).toFixed(1)} Z`.replace(/\s+/g,' '); };
  const pa=path(A), pb=path(B);
  return `<path class="trunk" d="${pa}">${reduced()?'':`<animate attributeName="d" dur="${dur}s"
    repeatCount="indefinite" values="${pa};${pb};${pa}" keyTimes="0;0.5;1" calcMode="spline"
    keySplines="0.42 0 0.2 1;0.42 0 0.2 1"/>`}</path>`;
}
/* what is in their hands or under them */
function kit(A,B,kind,dur){
  const w=(P)=>P.wrist, plate=13;
  const at=(P,i)=>+w(P)[i].toFixed(1);
  const pair=(name,fa,fb)=>anim(name,fa,fb,dur);
  switch(kind){
    case 'back': case 'lap': case 'hands': case 'overhead': {
      /* a barbell, seen end on: a bar across the hands with a plate */
      return `<g class="kit"><circle cx="${at(A,0)}" cy="${at(A,1)}" r="${plate}" fill="none" stroke-width="4">
        ${pair('cx',at(A,0),at(B,0))}${pair('cy',at(A,1),at(B,1))}</circle>
        <circle cx="${at(A,0)}" cy="${at(A,1)}" r="3">${pair('cx',at(A,0),at(B,0))}${pair('cy',at(A,1),at(B,1))}</circle></g>`;
    }
    case 'db-hands': case 'db-sides': case 'db-chest': {
      return `<g class="kit"><rect x="${at(A,0)-9}" y="${at(A,1)-5}" width="18" height="10" rx="3">
        ${pair('x',at(A,0)-9,at(B,0)-9)}${pair('y',at(A,1)-5,at(B,1)-5)}</rect></g>`;
    }
    case 'cable-high': case 'overhead-cable': {
      const top=kind==='cable-high'? 18 : 10;
      return `<g class="kit"><rect x="150" y="${top}" width="26" height="54" rx="3" fill="none" stroke-width="3"/>
        <line x1="163" y1="${top+54}" x2="${at(A,0)}" y2="${at(A,1)}" stroke-width="2">
        ${pair('x2',at(A,0),at(B,0))}${pair('y2',at(A,1),at(B,1))}</line></g>`;
    }
    case 'cable-side': {
      return `<g class="kit"><rect x="164" y="70" width="24" height="60" rx="3" fill="none" stroke-width="3"/>
        <line x1="164" y1="96" x2="${at(A,0)}" y2="${at(A,1)}" stroke-width="2">
        ${pair('x2',at(A,0),at(B,0))}${pair('y2',at(A,1),at(B,1))}</line></g>`;
    }
    case 'machine':
      return `<g class="kit"><rect x="150" y="96" width="28" height="86" rx="4" fill="none" stroke-width="3"/></g>`;
    default: return '';
  }
}
/* the ground, a bench, or a bar overhead: whatever the movement happens on */
function setting(pose){
  const v=pose.view, k=pose.bar;
  let out=`<line class="floor" x1="10" y1="${GROUND+6}" x2="190" y2="${GROUND+6}" stroke-width="3"/>`;
  if(v==='lie-bench') out+=`<rect class="bench" x="36" y="126" width="104" height="12" rx="4"/>
    <line class="bench" x1="46" y1="138" x2="46" y2="176" stroke-width="5"/>
    <line class="bench" x1="130" y1="138" x2="130" y2="176" stroke-width="5"/>`;
  if(v==='side-seated') out+=`<rect class="bench" x="58" y="140" width="72" height="12" rx="4"/>`;
  if(k==='overhead') out+=`<line class="bench" x1="52" y1="30" x2="148" y2="30" stroke-width="6"/>`;
  if(pose===MOVE_POSES.hipthrust) out+=`<rect class="bench" x="30" y="122" width="72" height="12" rx="4"/>`;
  return out;
}
function figureSVG(exId,opts){
  const o=opts||{}, pose=poseFor(exId), dur=o.dur||3.0;
  const x=(typeof exOf==='function')? exOf(exId) : {};
  const A=pose.a, B=pose.b;
  const far=pose.split? 14 : 6;   /* how far the back limb sits behind */
  const limbs=(dx,cls)=>bone(A,B,'shoulder','elbow',dur,dx,cls)+bone(A,B,'elbow','wrist',dur,dx,cls)
    +bone(A,B,'hip','knee',dur,dx,cls)+bone(A,B,'knee','ankle',dur,dx,cls)+bone(A,B,'ankle','toe',dur,dx,cls);
  return `<svg class="fig" viewBox="0 0 ${FIG_W} ${FIG_H}" role="img"
    aria-label="A figure moving through ${escHabit((x.n||'the movement').toLowerCase())}"
    xmlns="http://www.w3.org/2000/svg">
    ${setting(pose)}
    <g class="far" fill="none" stroke-linecap="round" stroke-linejoin="round">${limbs(-far,'')}</g>
    ${torso(A,B,dur)}
    <g class="body" fill="none" stroke-linecap="round" stroke-linejoin="round">
      ${bone(A,B,'neck','head',dur,0,'neckline')}
      ${limbs(0,'')}
      ${blob(A,B,'head',15,dur,0,'skull')}
      ${blob(A,B,'wrist',4,dur,0,'hand')}
      ${blob(A,B,'toe',0.1,dur,0,'')}
    </g>
    ${kit(A,B,pose.bar,dur)}
  </svg>`;
}
function openMove(exId){
  const x=exOf(exId);
  const el=document.getElementById('altBody');
  document.getElementById('altTitle').textContent=x.n;
  document.getElementById('altSub').textContent=
    [x.g,x.eq&&x.eq!=='bodyweight'? EQUIP[x.eq]||x.eq : 'Bodyweight', DIFF[x.d||1]].filter(Boolean).join(' · ');
  const cues=x.c||'';
  el.innerHTML=`
    <div style="padding:0 14px 6px">
      <div class="figwrap">${figureSVG(exId)}</div>
      <div class="note" style="margin-top:0">This shows the shape of the movement, start to finish. It is not a form check, and it will not tell you if your own is safe. If something hurts, that is a physio question rather than an app one.</div>
      ${cues? `<div class="slab">What to hold onto</div><div class="method"><span>${cues}</span></div>`:''}
      ${typeof exBlurb==='function'&&exBlurb(x)? `<div class="slab">Where it lands</div><div class="method"><span>${exBlurb(x)}${x.s?'. Also asks something of: '+x.s.toLowerCase():''}</span></div>`:''}
      <div class="slab">How it would be prescribed</div>
      <div class="method"><span>${(()=>{ const r=(typeof rxOf==='function'&&typeof rxClass==='function')? rxOf(rxClass(exId)) : null;
        return r? `${r.sets} sets of ${r.repMin} to ${r.reps}, about ${r.rest} seconds between them. That is the ${rxClass(exId)} range, not a rule for you.` : 'Sets and reps come from the template.'; })()}</span></div>
      ${(typeof similarTo==='function')? `<div class="slab">Trains much the same thing</div>
        ${similarTo(exId,3).map(o=>`<button class="opt" data-showmove="${o.id}">
          <div class="txt"><div class="t">${o.n}</div><div class="s">${EQUIP[o.eq]||o.eq||''}</div></div>
          <div class="rad"></div></button>`).join('')}`:''}
    </div>`;
  openSheet('altSheet');
}
document.addEventListener('click',e=>{
  const sm=e.target.closest('[data-showmove]');
  if(sm){ openMove(sm.dataset.showmove); }
});
Object.assign(window.__G||{},{figureSVG,openMove,MOVE_POSES,PATTERN_POSE,EX_POSE,poseFor,poseKeyFor,STAND});
