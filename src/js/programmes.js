/* =====================================================================
   Programmes (build 71)
   The named weekly structures people actually follow, across every way of
   training: bodybuilding splits, powerlifting, powerbuilding, Olympic
   lifting, CrossFit, HYROX, calisthenics, general fitness, lifting with
   running, and sport. Each one is a week shape (which session on which day),
   the sessions themselves (templates, runs or this week's circuits), and how
   it bends to fewer or more days. Picking one never takes anything away:
   every session is an ordinary template, run or circuit that can be edited,
   any day can still be changed, the days can be moved, and any day can be
   fixed to repeat every week. People who never pick one keep exactly the week
   they had.

   What the evidence says, said plainly in the app:
   - With the weekly work matched, full body and split routines build the same
     strength and muscle (Ramos-Campo and colleagues, 2024, 14 trials), and
     training a muscle twice a week did better than once when the work was not
     matched (Schoenfeld, Ogborn and Krieger, 2016). So the structure is a
     matter of preference and schedule; the weekly sets are what matter.
   - Periodised programmes gave a little more strength than non-periodised
     ones with the work matched, and no difference in muscle size (Moesgaard
     and colleagues, 2022). Daily undulating and linear periodisation came out
     much the same for muscle (Grgic and colleagues, 2017) and for strength
     (Harries, Lubans and Callister, 2015).
   - 5/3/1, the Westside conjugate method, PHAT and PHUL are coaches' methods.
     No trial has tested them as written, so they are offered as methods with
     a sound basis (heavy work, enough weekly volume, progression), not as
     proven better than anything else.
   - Olympic lifting improved jump height in sportspeople more than other
     training did in a meta-analysis (Hackett and colleagues, 2016).
   - Progressive bodyweight training built strength comparable to the bench
     press when it was progressed (Kikuchi and Nakazato, 2017; Kotarsky and
     colleagues, 2018).
   - Plyometrics improve jump height (de Villarreal and colleagues, 2009), and
     heavy strength training improved running economy in distance runners
     (Blagrove and colleagues, 2018).
   - Adding endurance work to lifting did not reduce muscle growth or maximal
     strength but did blunt explosive strength (Schumann and colleagues,
     2022).
   - The WHO (2020) advises muscle strengthening on two or more days a week
     for adults, and balance and strength on three or more days from 65.
   - HYROX and CrossFit programme structures are the sports' own conventions;
     no trial compares them.
   ===================================================================== */

/* the families shown first, in the order people look for them */
const DISCIPLINES=[
  {id:'gym',t:'Bodybuilding',s:'Muscle first: full body to six-day splits',style:'gym'},
  {id:'strength',t:'Powerlifting',s:'Squat, bench and deadlift, by percentages',style:'gym'},
  {id:'power',t:'Powerbuilding',s:'Heavy days and muscle days in one week',style:'gym'},
  {id:'oly',t:'Olympic lifting',s:'Snatch, clean and jerk',style:'gym'},
  {id:'cals',t:'Calisthenics',s:'Bodyweight strength and skills',style:'gym'},
  {id:'general',t:'General fitness',s:'Health first, two to four days',style:'gym'},
  {id:'hyrox',t:'HYROX',s:'Running and the eight stations',style:'hyrox'},
  {id:'crossfit',t:'CrossFit',s:'Varied workouts against the clock',style:'crossfit'},
  {id:'mixed',t:'HYROX and CrossFit',s:'A mix of both',style:'hybrid'},
  {id:'hifb',t:'HIFB',s:'Bodybuilding blocks with a run after each',style:'hifb'},
  {id:'hybrid',t:'Lifting and running',s:'Strength with an engine',style:'gym'},
  {id:'athletic',t:'Sport and athletic',s:'Speed, jumps and power',style:'gym'}];
const discById=id=>DISCIPLINES.find(d=>d.id===id)||DISCIPLINES[0];

/* ---------- writing sessions compactly ---------- */
/* '5@65 5@75 5+@85 | 3@70 3@80 3+@90' : weeks split by |, each set reps@percent,
   + for as many good reps as you can, 6x3@75 for six sets of three */
function parseScheme(str,of){
  const weeks=String(str).split('|').map(w=>{ const out=[];
    w.trim().split(/\s+/).forEach(tok=>{ const m=tok.match(/^(?:(\d+)x)?(\d+)(\+?)@([\d.]+)$/); if(!m) return;
      for(let i=0;i<(+m[1]||1);i++) out.push({r:+m[2],p:+m[4]/100,plus:m[3]==='+'||undefined}); });
    return out; }).filter(w=>w.length);
  return {of:of||'max',weeks};
}
const pRow=(exId,sets,lo,hi,rest,note,extra)=>prescribe(exId,Object.assign({sets,repMin:lo,reps:hi,rest,note:note||''},extra||{}));
function pSch(exId,str,of,rest,note,extra){
  const sc=parseScheme(str,of), w0=sc.weeks[0], rs=w0.map(s=>s.r);
  return prescribe(exId,Object.assign({sets:w0.length,repMin:Math.min(...rs),reps:Math.max(...rs),rest,note:note||'',scheme:sc},extra||{}));
}
const pTpl=(id,name,prog,rows,why)=>({id,name,seeded:true,prog,method:true,why:why||'',ex:rows});
const pair=(rows,a,b,g)=>{ rows[a].group=g; rows[b].group=g; return rows; };

/* ---------- the sessions each programme brings ---------- */
const PROG_TPLS={
  /* powerlifting: daily undulating. The same lifts three times a week at a
     different weight and rep count each time, edging up over three weeks. */
  pl_dup:()=>[
    pTpl('t_dup_hyp','DUP hypertrophy: squat and bench','pl_dup',[
      pSch('squat','4x8@67.5 | 4x8@70 | 4x8@72.5','max',150,'Controlled down, strong up.'),
      pSch('bench','4x8@67.5 | 4x8@70 | 4x8@72.5','max',150,'Touch and press, same groove every rep.'),
      pRow('bbrow',3,8,12,90,'Torso at forty five degrees.'),pRow('pulldown',3,10,12,75),pRow('facepull',3,12,15,60,'Rope to the forehead, elbows high.')]),
    pTpl('t_dup_pow','DUP power: squat and bench','pl_dup',[
      pSch('squat','6x3@72.5 | 6x3@75 | 6x3@77.5','max',150,'Every rep as fast as you can. Stop the set if the speed goes.'),
      pSch('bench','6x3@72.5 | 6x3@75 | 6x3@77.5','max',150,'Fast off the chest.'),
      pRow('chin',3,6,10,120,'Control over swing.'),pRow('plank',3,30,45,45)]),
    pTpl('t_dup_str','DUP strength: squat, bench, deadlift','pl_dup',[
      pSch('squat','5x4@80 | 5x4@82.5 | 5x3@85','max',210,'Brace hard before every rep.'),
      pSch('bench','5x4@80 | 5x4@82.5 | 5x3@85','max',210,'Pause briefly on the chest.'),
      pSch('deadlift','3x3@82.5 | 3x3@85 | 3x2@87.5','max',240,'Push the floor away. Reset between reps.')]),
    pTpl('t_dup_gpp','Accessories and conditioning','pl_dup',[
      pRow('pausebench',3,5,8,150,'A still second on the chest.'),pRow('deficit',3,5,6,180,'Only if your positions are solid.'),
      pRow('bss',3,8,10,90),pRow('hamcurl',3,10,12,60),pRow('facepull',3,12,15,60),pRow('hanging',3,8,12,60)])],
  /* Westside conjugate: a heavy single or triple on a variation that changes
     each week, and light, fast sets on the competition lifts */
  pl_conj:()=>[
    pTpl('t_cj_meu','Max effort upper','pl_conj',[
      pSch('boardpress','5@60 3@75 2@85 1@92.5 1@97.5','max',240,'Work up to a heavy single. The variation changes every week.',{rot:['boardpress','floorpress','closegrip']}),
      pRow('skull',4,8,12,90,'Elbows still.'),pRow('bbrow',4,8,10,90),pRow('facepull',3,12,15,60),pRow('lateral',3,12,15,60)]),
    pTpl('t_cj_mel','Max effort lower','pl_conj',[
      pSch('boxsquat','5@60 3@75 2@85 1@92.5 1@97.5','max',240,'Work up to a heavy single. The variation changes every week.',{rot:['boxsquat','rackpull','goodmorning']}),
      pRow('reverse_hyper',3,10,15,75),pRow('nordic',3,4,8,120,'Lower as slowly as you can.'),pRow('abwheel',3,8,12,60)]),
    pTpl('t_cj_deu','Dynamic effort upper','pl_conj',[
      pSch('speedbench','9x3@50 | 9x3@55 | 9x3@60','max',60,'Light and fast. Change your grip every three sets.'),
      pRow('dbpress',4,10,12,75),pRow('pulldown',4,10,12,75),pRow('pushdown',4,12,15,60)]),
    pTpl('t_cj_del','Dynamic effort lower','pl_conj',[
      pSch('speedsquat','10x2@50 | 10x2@55 | 10x2@60','max',60,'Sit to the box, then explode. Bands or chains if you have them.'),
      pSch('deadlift','6x1@65','max',60,'Speed pulls: snap it off the floor.'),
      pRow('reverse_hyper',3,10,15,75),pRow('plank',3,30,60,45)])],
  /* 5/3/1 Boring But Big: three working weeks of a training max wave, the
     fourth light, then a 5x10 on the opposite lift */
  pl_531:()=>{ const W='5@65 5@75 5+@85 | 3@70 3@80 3+@90 | 5@75 3@85 1+@95 | 5@40 5@50 5@60';
    const B='5x10@50 | 5x10@55 | 5x10@60 | 3x10@40';
    return [
      pTpl('t_531_bench','5/3/1 bench','pl_531',[pSch('bench',W,'tm',180,'The last set is as many good reps as you can. Leave one in hand.'),
        pSch('ohp',B,'tm',90,'Boring but big: five sets of ten.'),pRow('chin',5,5,10,90),pRow('dbrow',3,10,12,60)]),
      pTpl('t_531_dl','5/3/1 deadlift','pl_531',[pSch('deadlift',W,'tm',210,'The last set is as many good reps as you can. Reset each rep.'),
        pSch('squat',B,'tm',120,'Boring but big: five sets of ten.'),pRow('hanging',5,10,15,60)]),
      pTpl('t_531_ohp','5/3/1 press','pl_531',[pSch('ohp',W,'tm',180,'The last set is as many good reps as you can.'),
        pSch('bench',B,'tm',90,'Boring but big: five sets of ten.'),pRow('chin',5,5,10,90),pRow('facepull',3,15,20,60)]),
      pTpl('t_531_squat','5/3/1 squat','pl_531',[pSch('squat',W,'tm',210,'The last set is as many good reps as you can.'),
        pSch('deadlift',B,'tm',120,'Boring but big: five sets of ten.'),pRow('hanging',5,10,15,60)])]; },
  /* powerbuilding: PHUL, four days; PHAT, five */
  pb_phul:()=>[
    pTpl('t_phul_up','Upper power','pb_phul',[pRow('bench',4,3,5,180),pRow('bbrow',4,3,5,180),pRow('ohp',3,5,8,150),
      pRow('pulldown',3,6,10,90),pRow('skull',2,6,10,75),pRow('ezcurl',2,6,10,75)]),
    pTpl('t_phul_lp','Lower power','pb_phul',[pRow('squat',4,3,5,210),pRow('deadlift',3,3,5,210),pRow('legpress',4,10,15,90),
      pRow('hamcurl',3,6,10,75),pRow('calf',4,6,10,60)]),
    pTpl('t_phul_uh','Upper hypertrophy','pb_phul',[pRow('dbincline',4,8,12,90),pRow('fly',3,12,15,60),pRow('csrow',4,8,12,90),
      pRow('closepulldown',4,8,12,75),pRow('lateral',4,10,15,60),pRow('inclinecurl',3,8,12,60),pRow('ropepush',3,8,12,60)]),
    pTpl('t_phul_lh','Lower hypertrophy','pb_phul',[pRow('frontsquat',4,8,12,120),pRow('rdl',3,8,12,120),pRow('lunge',3,8,12,90),
      pRow('legext',4,10,15,60),pRow('seatedham',4,10,15,60),pRow('seatedcalf',4,8,12,60)])],
  pb_phat:()=>[
    pTpl('t_phat_up','Upper power','pb_phat',[pRow('bbrow',3,3,5,180),pRow('pullup',2,6,10,120,'Add weight once 10 is easy.'),
      pRow('bench',3,3,5,180),pRow('dip',2,6,10,90),pRow('ohp',3,6,10,120),pRow('ezcurl',2,6,10,75),pRow('skull',2,6,10,75)]),
    pTpl('t_phat_lp','Lower power','pb_phat',[pRow('squat',3,3,5,210),pRow('hack',2,6,10,120),pRow('legext',2,6,10,75),
      pRow('stifleg',3,5,8,150),pRow('hamcurl',2,6,10,75),pRow('calf',3,6,10,60)]),
    pTpl('t_phat_bs','Back and shoulders hypertrophy','pb_phat',[pSch('pendlay','6x3@65','max',75,'Speed work: fast and crisp, short rests.'),
      pRow('chin',3,8,12,90),pRow('cablerow',3,8,12,75),pRow('dbshrug',2,12,15,60),pRow('dbohp',3,8,12,90),pRow('lateral',3,12,20,60)]),
    pTpl('t_phat_lh','Lower hypertrophy','pb_phat',[pSch('speedsquat','6x3@65','max',75,'Speed work: sit to the box, then explode.'),
      pRow('hack',3,8,12,120),pRow('legpress',2,12,15,90),pRow('legext',3,12,15,60),pRow('rdl',3,8,12,120),pRow('seatedham',2,12,15,60),pRow('seatedcalf',4,10,15,60)]),
    pTpl('t_phat_ca','Chest and arms hypertrophy','pb_phat',[pSch('speedbench','6x3@65','max',75,'Speed work: fast off the chest.'),
      pRow('dbincline',3,8,12,90),pRow('machpress',3,12,15,75),pRow('fly',2,15,20,60),pRow('preacher',3,8,12,60),
      pRow('inclinecurl',2,12,15,60),pRow('ropeoh',3,8,12,60),pRow('pushdown',2,12,15,60)])],
  /* Olympic weightlifting: percentages of each lift's own best, a three week
     wave, then a heavier block */
  oly_4:()=>[
    pTpl('t_oly_sn','Snatch','oly_4',[
      pSch('bbsnatch','2@70 2@75 2@75 2@80 2@80 | 2@72.5 2@77.5 2@80 2@82.5 2@82.5 | 1@75 1@80 1@85 1@87.5 1@90','max',120,'Bar close, finish the pull, then get under it.'),
      pSch('snatchpull','4x3@85 | 4x3@90 | 4x3@95','max',120,'Same positions as the snatch, stop tall.'),
      pRow('snatchbal',3,2,3,120),pSch('squat','4x5@70 | 4x5@75 | 4x4@80','max',150)]),
    pTpl('t_oly_cj','Clean and jerk','oly_4',[
      pSch('bbcleanjerk','2@70 2@75 2@75 2@80 2@80 | 2@72.5 2@77.5 2@80 2@82.5 2@82.5 | 1@75 1@80 1@85 1@87.5 1@90','max',150,'One clean and one jerk is a rep. Two means two of each.'),
      pSch('cleanpull','4x3@85 | 4x3@90 | 4x3@95','max',120),
      pSch('frontsquat','4x3@75 | 4x3@80 | 4x2@85','max',150,'Elbows high.'),pRow('pushpress',3,3,5,120)]),
    pTpl('t_oly_pow','Power variations','oly_4',[
      pSch('powersnatch','5x2@70 | 5x2@75 | 5x2@80','max',90,'Caught above parallel.'),
      pSch('clean','5x2@70 | 5x2@75 | 5x2@80','max',90,'Caught above parallel, elbows fast.'),
      pSch('pushjerk','4x2@75 | 4x2@80 | 4x2@82.5','max',120),pRow('hollow',3,20,40,45)]),
    pTpl('t_oly_max','Heavy singles and complexes','oly_4',[
      pSch('bbsnatch','1@75 1@80 1@85 1@90 1@92.5','max',150,'Work up to a heavy single. Miss twice and stop there.'),
      pSch('bbcleanjerk','1@75 1@80 1@85 1@90 1@92.5','max',180,'Work up to a heavy single.'),
      pSch('squat','3@75 2@82.5 1@90','max',180)])],
  oly_6:()=>[
    pTpl('t_oly6_snsq','Snatch and squat','oly_6',[
      pSch('hangsnatch','5x2@70 | 5x2@75 | 5x2@80','max',120,'From just above the knee.'),
      pSch('bbsnatch','3x2@75 | 3x2@80 | 3x1@85','max',120),pSch('squat','5x3@75 | 5x3@80 | 5x2@85','max',180)]),
    pTpl('t_oly6_cj','Clean and jerk','oly_6',[
      pSch('blockclean','5x2@70 | 5x2@75 | 5x2@80','max',120,'From blocks at the knee.'),
      pSch('bbcleanjerk','4x1@75 | 4x1@80 | 4x1@85','max',150)]),
    pTpl('t_oly6_acc','Accessories and mobility','oly_6',[pRow('snatchbal',3,2,3,120),pRow('ohsquat',3,3,5,120),
      pRow('backext',3,10,15,60),pRow('hollow',3,20,40,45),pRow('thoracic',2,8,10,30),pRow('ankle',2,8,10,30)]),
    pTpl('t_oly6_pp','Powers and pulls','oly_6',[
      pSch('powersnatch','5x2@72.5 | 5x2@77.5 | 5x2@80','max',90),pSch('clean','5x2@72.5 | 5x2@77.5 | 5x2@80','max',90),
      pSch('snatchpull','4x3@90 | 4x3@95 | 4x3@100','max',120),pSch('cleanpull','4x3@90 | 4x3@95 | 4x3@100','max',120)]),
    pTpl('t_oly6_fsj','Heavy front squat and jerk','oly_6',[
      pSch('frontsquat','5x3@80 | 5x2@85 | 3x2@90','max',180,'Elbows high.'),pSch('splitjerk','5x2@75 | 5x2@80 | 5x1@85','max',120)]),
    pTpl('t_oly6_max','Max singles','oly_6',[
      pSch('bbsnatch','1@75 1@80 1@85 1@90 1@92.5 1@95','max',150,'Work up to a heavy single. Miss twice and stop.'),
      pSch('bbcleanjerk','1@75 1@80 1@85 1@90 1@92.5 1@95','max',180,'Work up to a heavy single.')])],
  /* calisthenics: holds in seconds, reps climbing towards the top of the range
     before the next progression or added weight */
  cal_ul:()=>[
    pTpl('t_cal_us','Upper skill and strength','cal_ul',[pRow('handstand',4,20,40,90,'Chest to the wall while you learn it.'),pRow('hspu',4,3,6,150,'Pike press ups until these come.'),
      pRow('pullup',4,5,8,150),pRow('tuckfl',4,10,20,90),pRow('dip',3,6,10,120),pRow('hollow',3,20,40,45)]),
    pTpl('t_cal_bl','Bodyweight lower','cal_ul',[pRow('pistol',4,5,8,120,'Each leg. Hold a counterweight to learn it.'),pRow('shrimp',3,5,8,90,'Each leg.'),
      pRow('nordic',3,3,6,120,'Lower as slowly as you can.'),pRow('sissy',3,8,12,90),pRow('singleglute',3,10,15,60)]),
    pTpl('t_cal_uv','Upper volume','cal_ul',[pRow('pushupdecline',4,10,20,75),pRow('chin',4,8,12,90),pRow('ringdip',3,8,12,90),
      pRow('invrow',3,10,15,75),pRow('pikepush',3,8,12,75),pRow('lsit',3,10,20,60)]),
    pTpl('t_cal_lc','Lower body and core','cal_ul',[pRow('bwsquat',3,20,30,60),pRow('cossack',3,6,10,75,'Each side.'),
      pRow('hanging',4,8,12,75),pRow('copenhagen',3,15,30,45),pRow('hollowrock',3,20,40,45)])],
  cal_ppl:()=>[
    pTpl('t_calp_pushA','Push A','cal_ppl',[pRow('planchelean',4,15,30,90),pRow('ringdip',4,6,10,120),pRow('pppushup',3,6,10,90),pRow('pikepush',3,8,12,75)]),
    pTpl('t_calp_pullA','Pull A','cal_ppl',[pRow('tuckfl',4,10,20,90),pRow('pullup',4,5,8,150),pRow('invrow',3,10,15,75),pRow('hollow',3,20,40,45)]),
    pTpl('t_calp_legsA','Legs A','cal_ppl',[pRow('pistol',4,5,8,120,'Each leg.'),pRow('nordic',3,3,6,120),pRow('bwsquat',3,20,30,60),pRow('hollowrock',3,20,40,45)]),
    pTpl('t_calp_pushB','Push B','cal_ppl',[pRow('handstand',4,20,40,90),pRow('hspu',4,3,6,150),pRow('dip',3,8,12,90),pRow('pushupdecline',3,10,20,75)]),
    pTpl('t_calp_pullB','Pull B','cal_ppl',[pRow('muscleup',5,1,3,150,'Bands to learn it.'),pRow('chin',4,6,10,120),pRow('invrow',3,10,15,75),pRow('lsit',3,10,20,60)]),
    pTpl('t_calp_legsB','Legs B','cal_ppl',[pRow('shrimp',4,5,8,120,'Each leg.'),pRow('sissy',3,8,12,90),pRow('singleglute',3,10,15,60),pRow('copenhagen',3,15,30,45)])],
  cal_wt:()=>[
    pTpl('t_calw_push','Weighted push','cal_wt',[pRow('dip',4,4,8,180,'Add weight with a belt once 8 is easy.'),pRow('ringdip',3,6,10,120),pRow('hspu',3,4,8,150),pRow('pushupdecline',2,10,20,75)]),
    pTpl('t_calw_pull','Weighted pull','cal_wt',[pRow('pullup',4,4,8,180,'Add weight with a belt once 8 is easy.'),pRow('chin',3,6,10,120),pRow('invrow',3,8,12,90),pRow('facepull',3,12,15,60)]),
    pTpl('t_calw_skill','Bodyweight skills','cal_wt',[pRow('muscleup',5,1,3,150),pRow('handstand',5,20,40,90),pRow('lsit',4,10,20,60),pRow('tuckfl',4,10,20,90)]),
    pTpl('t_calw_lower','Lower body strength','cal_wt',[pRow('squat',4,4,6,180),pRow('rdl',3,6,10,150),pRow('pistol',3,5,8,90,'Each leg.'),pRow('hanging',3,8,12,60)])],
  cal_home:()=>[
    pTpl('t_home_a','No kit A','cal_home',[pRow('pushup',3,8,15,75),pRow('bwsquat',3,15,25,60),pRow('invrow',3,8,12,75,'A sturdy table edge works.'),
      pRow('gluteBridge',3,12,20,60),pRow('plank',3,20,45,45)]),
    pTpl('t_home_b','No kit B','cal_home',[pRow('pikepush',3,6,12,75),pRow('splitsquat',3,8,12,60,'Each leg. No weight needed.'),pRow('backext',3,10,15,60),
      pRow('diamond',3,6,12,75),pRow('sidplank',3,20,40,45)])],
  /* general fitness: strength and balance, for later life or coming back */
  gen_sb:()=>[
    pTpl('t_gen_sbA','Strength and balance A','gen_sb',[pRow('goblet',2,8,12,90,'To a box or bench you can sit on.'),pRow('stepup',2,8,12,75,'Each leg. A step you trust.'),
      pRow('dbrow',2,10,12,75),pRow('pushupincline',2,8,12,75),pRow('suitcase',2,20,30,60,'Each side. Walk tall.'),pRow('birddog',2,8,10,45)]),
    pTpl('t_gen_sbB','Strength and balance B','gen_sb',[pRow('dbrdl',2,8,12,90),pRow('splitsquat',2,8,12,75,'Hold a rail if you need it.'),
      pRow('dbpress',2,10,12,75),pRow('cablerow',2,10,12,75),pRow('slrdl',2,6,8,60,'Each leg, slowly. Fingertips on a wall is fine.'),pRow('sidplank',2,15,30,45)])],
  /* lifting and running */
  hyb_tac:()=>[
    pTpl('t_tac_str','Heavy compound strength','hyb_tac',[pRow('trapbar',5,3,5,180),pRow('pullup',4,4,6,150,'Add weight once 6 is easy.'),
      pRow('pushpress',4,4,6,150),pRow('farmers',3,30,45,90)]),
    pTpl('t_tac_ana','Anaerobic conditioning','hyb_tac',[pRow('kbswing',5,15,20,45),pRow('burpee',5,10,15,45),
      pRow('sandbagcarry',4,30,45,60),pRow('medslam',4,10,12,45),pRow('shuttle',6,20,30,60,'Seconds of shuttles, then walk back.')]),
    pTpl('t_tac_hwc','Hypertrophy and work capacity','hyb_tac',[pRow('dbpress',3,8,12,75),pRow('chestrow',3,8,12,75),pRow('bss',3,8,12,75),
      pRow('pushup',3,15,25,60),pRow('dbrdl',3,10,12,75),pRow('plank',3,30,60,45)])],
  hyb_ultra:()=>[
    pTpl('t_hyb_lower','Heavy lower, then a short run','hyb_ultra',[pRow('squat',4,3,5,180),pRow('rdl',3,5,8,150),pRow('bss',3,6,8,90),
      pRow('calf',3,8,12,60,'',{run:{m:2000,pace:'Easy'}})],'Lift first, then an easy 2km: legs that run tired.'),
    pTpl('t_hyb_upper','Heavy upper','hyb_ultra',[pRow('bench',4,3,5,180),pRow('pullup',4,4,6,150),pRow('ohp',3,5,8,120),pRow('bbrow',3,6,8,120)]),
    pTpl('t_hyb_acc','Full body accessories','hyb_ultra',[pRow('stepup',3,8,12,75),pRow('slrdl',3,8,10,75),pRow('chestrow',3,10,12,60),
      pRow('lateral',3,12,15,60),pRow('copenhagen',3,15,30,45),pRow('plank',3,30,60,45)])],
  hyb_run:()=>[
    pTpl('t_runstr_a','Strength for runners A','hyb_run',[pRow('squat',3,4,6,150,'Heavy and few: this is what helps running economy.'),
      pRow('slrdl',3,6,8,75),pRow('stepup',3,6,8,75),pRow('calf',3,8,12,60),pRow('plank',2,30,45,45)]),
    pTpl('t_runstr_b','Strength for runners B','hyb_run',[pRow('trapbar',3,3,5,150),pRow('bss',3,6,8,75),pRow('nordic',3,4,6,90),
      pRow('boxjump',3,5,5,75,'Step down every time.'),pRow('copenhagen',2,15,30,45)])],
  /* sport: speed, change of direction, contrast pairs (heavy then fast) */
  ath_4:()=>[
    pTpl('t_ath_lin','Linear speed and power','ath_4',[pRow('sprint',6,10,15,90,'Seconds of sprinting, full walk back.'),pRow('hangclean',4,3,3,120),
      pRow('broadjump',4,3,5,90),pRow('trapbar',4,3,5,150),pRow('nordic',3,4,6,90)]),
    pTpl('t_ath_lat','Lateral agility and force','ath_4',[pRow('latbound',4,4,6,75,'Each side. Stick every landing.'),pRow('cossack',3,6,8,75),
      pRow('medthrow',4,5,6,60,'Each side.'),pRow('bss',3,6,8,90),pRow('copenhagen',3,15,30,45)]),
    pTpl('t_ath_con','Contrast power','ath_4',pair(pair([pRow('squat',4,3,5,60,'Heavy, then straight to the jumps.'),pRow('boxjump',4,3,5,120),
      pRow('bench',4,3,5,60),pRow('medslam',4,5,6,120,'Explosive.'),pRow('trapjump',3,3,5,120)],0,1,'c1'),2,3,'c2')),
    pTpl('t_ath_cond','Structural conditioning','ath_4',[pRow('kbswing',4,12,15,60),pRow('farmers',4,30,45,60),pRow('sandbagcarry',3,30,45,60),
      pRow('paloff',3,10,12,45),pRow('backext',3,10,15,60),pRow('shuttle',6,20,30,60,'Seconds of shuttles.')])]
};

/* ---------- the programmes ----------
   order: the sessions in the order they come round. pos: where they sit in a
   Monday-first week for each number of days. split: the gym splits that were
   already here. circ: kinds of circuit for HYROX and CrossFit weeks. cycle: a
   days-on, day-off rhythm that ignores the calendar week. */
const PROGRAMMES={
  /* bodybuilding */
  bb_ppl6:{disc:'gym',t:'Push, pull, legs',s:'High volume, each muscle twice a week',level:'Intermediate',split:'pplab',days:[3,6],def:6,
    pos:{3:[0,2,4],4:[0,1,3,4],5:[0,1,2,4,5],6:[0,1,2,3,4,5]},why:'Six days of push, pull and legs, an A and a B of each. At fewer days it rolls on through the week, so each muscle comes round less often.'},
  bb_ul4:{disc:'gym',t:'Upper and lower',s:'Balanced frequency and recovery',level:'Intermediate',split:'ul',days:[2,4],def:4,
    pos:{2:[0,3],3:[0,2,4],4:[0,1,3,4]},why:'Upper, lower, a day off, upper, lower. Every muscle twice a week with room to recover.'},
  bb_arnold:{disc:'gym',t:'Arnold split',s:'Chest and back supersets, then shoulders and arms, then legs',level:'Advanced',split:'arnold',days:[3,6],def:6,
    pos:{3:[0,2,4],6:[0,1,2,3,4,5]},why:'Chest and back paired as supersets for the pump, then shoulders and arms, then legs, twice through the week.'},
  bb_bro:{disc:'gym',t:'Body part split',s:'One muscle group a day, lots of sets each',level:'Intermediate',split:'bro',days:[5,5],def:5,
    pos:{5:[0,1,2,3,4]},why:'Chest, back, shoulders, legs, arms. Each muscle once a week with plenty of sets that day, and the weekend off.'},
  bb_pplul:{disc:'gym',t:'Push, pull, legs, upper, lower',s:'High volume first half, heavier second half',level:'Intermediate',split:'pplul',days:[5,5],def:5,
    pos:{5:[0,1,2,4,5]},why:'Push, pull, legs, a day off, then upper and lower: each muscle twice in five days.'},
  bb_pp4:{disc:'gym',t:'Push and pull',s:'No separate leg day: legs live in both',level:'Intermediate',split:'pp',days:[2,4],def:4,
    pos:{2:[0,3],4:[0,1,3,4]},why:'Push days lead with squats (quads, chest, shoulders, triceps); pull days lead with hinges (hamstrings, back, biceps).'},
  /* general fitness */
  gen_full3:{disc:'general',t:'Full body, three days',s:'Efficient and simple, for health and fitness',level:'Beginner',split:'full',days:[2,3],def:3,
    pos:{2:[1,4],3:[0,2,4]},why:'Three different full body sessions with a day between each.'},
  gen_full2:{disc:'general',t:'Full body, two days',s:'For busy weeks: keep the muscle you have',level:'Beginner',split:'full',days:[2,2],def:2,
    pos:{2:[1,5]},why:'Two full body sessions, Tuesday and Saturday by default. Enough to keep strength and muscle, and to build some when new to it.'},
  gen_sb:{disc:'general',t:'Strength and balance',s:'For later life, or coming back to it',level:'Beginner',order:['t_gen_sbA','walk','t_gen_sbB','walk'],days:[2,4],def:4,
    pos:{2:[0,3],3:[0,2,4],4:[0,1,3,5]},why:'Two strength sessions with balance built in, and brisk walks between. The WHO advises muscle strengthening on two or more days a week, and balance on three or more from 65.'},
  /* powerlifting */
  pl_dup:{disc:'strength',t:'Daily undulating',s:'Squat and bench three ways a week, deadlift heavy once',level:'Intermediate',adult:true,kit:['barbell'],
    order:['t_dup_hyp','t_dup_pow','t_dup_str','t_dup_gpp'],days:[3,4],def:4,pos:{3:[0,2,4],4:[0,2,4,5]},
    why:'A volume day, a speed day and a heavy day, each a percentage of your best estimated single, edging up over three weeks. Periodised training gave a little more strength than unvaried training in a 2022 meta-analysis.'},
  pl_conj:{disc:'strength',t:'Westside conjugate',s:'Max effort and dynamic effort, upper and lower',level:'Advanced',adult:true,kit:['barbell'],
    order:['t_cj_meu','t_cj_mel','t_cj_deu','t_cj_del'],days:[4,4],def:4,pos:{4:[0,2,4,5]},
    why:'Work up to a heavy single on a variation that changes each week, and move light weights fast on the speed days. A coach\'s method: no trial has tested it as written.'},
  pl_531:{disc:'strength',t:'5/3/1 Boring But Big',s:'A training max wave, then five sets of ten',level:'Intermediate',adult:true,kit:['barbell'],ownDeload:true,
    order:['t_531_bench','t_531_dl','t_531_ohp','t_531_squat'],days:[3,4],def:4,pos:{3:[0,2,4],4:[0,1,3,4]},
    why:'Weeks of fives, threes and five-three-one at a training max (90% of your best estimated single), then a light fourth week. The last set is as many good reps as you can, and that moves the numbers. A coach\'s method, widely used.'},
  pl_start:{disc:'strength',t:'Beginner strength',s:'Three days, the big lifts, a little heavier each time',level:'Beginner',kit:['barbell'],days:[2,3],def:3,
    order:['t_lin_a','t_lin_b'],pos:{2:[0,3],3:[0,2,4]},
    why:'Two sessions, A and B, alternating three days a week. Sets of five on the big lifts; when every set gets five, the weight goes up. Beginners can add weight most sessions for months.'},
  /* powerbuilding */
  pb_phul:{disc:'power',t:'PHUL',s:'Power upper and lower, then hypertrophy upper and lower',level:'Intermediate',kit:['barbell'],
    order:['t_phul_up','t_phul_lp','t_phul_uh','t_phul_lh'],days:[4,4],def:4,pos:{4:[0,1,3,4]},
    why:'Two heavy days of three to five reps, two muscle days of eight to fifteen. Every muscle twice a week.'},
  pb_phat:{disc:'power',t:'PHAT',s:'Two power days, three hypertrophy days with speed work',level:'Advanced',adult:true,kit:['barbell'],
    order:['t_phat_up','t_phat_lp','t_phat_bs','t_phat_lh','t_phat_ca'],days:[5,5],def:5,pos:{5:[0,1,3,4,5]},
    why:'Heavy upper and lower days early in the week, then three body-part hypertrophy days, each opening with fast sets at 65%.'},
  /* Olympic weightlifting */
  oly_4:{disc:'oly',t:'Weightlifting, four days',s:'Snatch day, clean and jerk day, powers, heavy singles',level:'Intermediate',kit:['barbell'],
    order:['t_oly_sn','t_oly_cj','t_oly_pow','t_oly_max'],days:[3,4],def:4,pos:{3:[0,2,4],4:[0,1,3,4]},
    why:'Percentages of each lift\'s own best, in three-week waves. Technique first: a coach watching is worth more than any programme.'},
  oly_6:{disc:'oly',t:'Weightlifting, advanced',s:'Six days: more technical volume, heavy pulls and squats',level:'Advanced',adult:true,kit:['barbell'],
    order:['t_oly6_snsq','t_oly6_cj','t_oly6_acc','t_oly6_pp','t_oly6_fsj','t_oly6_max'],days:[5,6],def:6,pos:{5:[0,1,3,4,5],6:[0,1,2,3,4,5]},
    why:'A day each for the snatch with squats, the clean and jerk, accessories and mobility, powers and pulls, heavy front squats and jerks, and max singles.'},
  /* calisthenics */
  cal_ul:{disc:'cals',t:'Upper and lower, bodyweight',s:'Relative strength and control',level:'Intermediate',kit:['pullup'],
    order:['t_cal_us','t_cal_bl','t_cal_uv','t_cal_lc'],days:[3,4],def:4,pos:{3:[0,2,4],4:[0,1,3,4]},
    why:'A skill and strength upper day, a lower day, a volume upper day, then legs and core. Holds are in seconds; when the top of the range comes easily, move to the next progression.'},
  cal_ppl:{disc:'cals',t:'Push, pull, legs, gymnastics',s:'Static holds and dynamic work, six days',level:'Advanced',kit:['pullup'],
    order:['t_calp_pushA','t_calp_pullA','t_calp_legsA','t_calp_pushB','t_calp_pullB','t_calp_legsB'],days:[3,6],def:6,pos:{3:[0,2,4],6:[0,1,2,3,4,5]},
    why:'Planche, front lever and handstand work spread through push, pull and leg days, an A and a B of each.'},
  cal_wt:{disc:'cals',t:'Weighted calisthenics',s:'Bodyweight skills with load added',level:'Advanced',kit:['pullup'],
    order:['t_calw_push','t_calw_pull','t_calw_skill','t_calw_lower'],days:[4,4],def:4,pos:{4:[0,1,3,4]},
    why:'Weighted dips and pull-ups for strength, a skills day, and a barbell lower day.'},
  cal_home:{disc:'cals',t:'At home, no kit',s:'Three full body sessions with nothing at all',level:'Beginner',
    order:['t_home_a','t_home_b'],days:[2,3],def:3,pos:{2:[0,3],3:[0,2,4]},
    why:'Two sessions alternating, nothing needed but the floor and a sturdy table. Progressed bodyweight training builds strength comparable to the bench press.'},
  /* HYROX */
  hx_4:{disc:'hyrox',t:'HYROX race simulation',s:'Running intervals, station strength, compromised runs, a weekend simulation',level:'Intermediate',style:'hyrox',
    circ:['engine','strength','comp','mini'],days:[4,4],def:4,pos:{4:[0,1,3,5]},
    why:'Four sessions: race-pace running, heavy stations, run-into-station circuits and a half simulation on Saturday, the full race every fourth week.'},
  hx_3:{disc:'hyrox',t:'HYROX, three days',s:'Time-efficient: upper and running, lower and stations, a long engine',level:'Beginner',style:'hyrox',
    circ:['upperrun','lowerst','long'],days:[3,3],def:3,pos:{3:[0,1,3]},
    why:'Three sessions that cover the race: upper body stations with running, the leg-heavy stations, and a long steady simulation.'},
  /* CrossFit */
  cf_3on1:{disc:'crossfit',t:'Three on, one off',s:'The classic CrossFit rhythm',level:'Intermediate',style:'crossfit',circ:['cf'],cycle:4,
    why:'Three days of varied workouts, then a day off, on a four-day rhythm that moves through the week. Five or six sessions most weeks.'},
  cf_comp5:{disc:'crossfit',t:'Competitor engine and strength',s:'Strength, gymnastics, weightlifting, engine and a long one',level:'Advanced',adult:true,style:'crossfit',
    circ:['strmet','gymeng','wlmet','walk','hyeng','cflong'],days:[6,6],def:6,pos:{6:[0,1,2,3,4,5]},
    why:'Five training days and one easy active recovery day, each with its own job: strength, gymnastics, weightlifting, a mixed engine piece and a long workout.'},
  /* lifting and running */
  hyb_tac:{disc:'hybrid',t:'Tactical athlete',s:'Strength, conditioning, work capacity and a long easy run',level:'Intermediate',
    order:['t_tac_str','t_tac_ana','t_tac_hwc','r_long'],days:[4,4],def:4,pos:{4:[0,1,3,4]},
    why:'Heavy compound strength, a hard conditioning day, a muscle and work-capacity day, and a long run at an easy pace.'},
  hyb_ultra:{disc:'hybrid',t:'Hybrid athlete',s:'Barbell strength alongside real running mileage',level:'Advanced',
    order:['t_hyb_lower','t_hyb_upper','r_easy','t_hyb_acc','r_long'],days:[5,5],def:5,pos:{5:[0,1,2,3,5]},
    why:'Heavy lower then a short run, heavy upper, a mid-distance easy run, accessories, and a long run at the weekend. Endurance work alongside lifting did not reduce muscle or maximal strength in a 43-study meta-analysis.'},
  hyb_run:{disc:'hybrid',t:'Strength for runners',s:'Three runs and two short, heavy strength sessions',level:'Beginner',
    order:['r_easy','t_runstr_a','r_intervals','t_runstr_b','r_long'],days:[3,5],def:5,pos:{3:[0,2,5],4:[0,1,3,5],5:[0,1,2,3,5]},
    why:'Heavy strength training improved running economy in distance runners in a meta-analysis (Blagrove and colleagues, 2018), so the lifting is short and heavy, not long and light.'},
  /* sport */
  ath_4:{disc:'athletic',t:'Power and agility',s:'Speed, change of direction, contrast power, conditioning',level:'Intermediate',
    order:['t_ath_lin','t_ath_lat','t_ath_con','t_ath_cond'],days:[3,4],def:4,pos:{3:[0,2,4],4:[0,1,3,4]},
    why:'A linear speed day, a lateral day, a contrast day (heavy set, then straight into jumps or throws) and a conditioning day. Jumps and throws are done fresh and fast.'}
};
/* the beginner strength sessions: sets of five on the big lifts, weight up when every set gets five */
PROG_TPLS.pl_start=()=>[
  pTpl('t_lin_a','Strength A','pl_start',[pRow('squat',3,5,5,180,'When all three sets get five, add weight.'),pRow('bench',3,5,5,180),pRow('bbrow',3,5,5,150),pRow('plank',2,30,45,45)]),
  pTpl('t_lin_b','Strength B','pl_start',[pRow('squat',3,5,5,180,'When all three sets get five, add weight.'),pRow('ohp',3,5,5,150),pRow('deadlift',1,5,5,210,'One heavy set of five.'),pRow('chin',3,5,8,120)])];
/* the classic weeks for the four styles that already build their own, shown
   alongside the named programmes */
const STYLE_PROGS={hyrox:'Gauntlet HYROX week',crossfit:'Gauntlet CrossFit week',hybrid:'Gauntlet HYROX and CrossFit mix',hifb:'HIFB, four days'};

const progById=id=>(id&&PROGRAMMES[id])? Object.assign({id},PROGRAMMES[id]) : null;
function activeProg(){ const p=S.profile||{}; return progById(p.programme); }
const progIsAdultOnly=P=>!!(P&&P.adult);
function progsFor(disc){
  const teen=typeof isTeen==='function'&&isTeen();
  return Object.keys(PROGRAMMES).filter(id=>PROGRAMMES[id].disc===disc&&!(teen&&PROGRAMMES[id].adult)).map(progById);
}
/* the family the person is in: their programme's, else their style's */
function discOf(){
  const p=S.profile||{}, P=activeProg();
  if(P) return P.disc;
  if(p.disc&&DISCIPLINES.some(d=>d.id===p.disc)) return p.disc;
  const st=styleOf();
  return st==='hyrox'? 'hyrox' : st==='crossfit'? 'crossfit' : st==='hybrid'? 'mixed' : st==='hifb'? 'hifb' : 'gym';
}
function progDays(P){
  if(!P) return 0;
  if(P.cycle) return cycleOn().length;
  const want=+(S.profile&&S.profile.progDays)||P.def;
  return Math.max(P.days[0],Math.min(P.days[1],want));
}
/* a days-on, day-off rhythm counted from the day the programme started, so
   it carries on across weeks rather than restarting every Monday */
function cycleOn(){
  const P=activeProg(); if(!P||!P.cycle) return [];
  const st=(S.profile.progStart&&/^\d{4}-\d{2}-\d{2}$/.test(S.profile.progStart))? S.profile.progStart : mondayKey();
  const out=[];
  for(let i=0;i<7;i++){ const k=addDays(mondayKey(),i), d=Math.round((dateOf(k)-dateOf(st))/864e5);
    if(((d%P.cycle)+P.cycle)%P.cycle!==P.cycle-1) out.push(i); }
  return out;
}
/* evenly spread when a programme gives no positions for a number of days */
function spreadDays(n){ return Array.from({length:n},(_,j)=>Math.min(6,Math.floor(j*7/n))); }
function progPositions(P,n){
  if(P.cycle) return cycleOn();
  return (P.pos&&P.pos[n]&&P.pos[n].length===n)? P.pos[n].slice() : spreadDays(n);
}

/* ---------- this programme's templates ---------- */
function progTemplatesFor(id){ const f=PROG_TPLS[id]; return f? f() : []; }
/* add what is missing, fitted to the kit; never touch one that is there,
   because it may have been edited */
function ensureProgTemplates(id){
  S.templates=Array.isArray(S.templates)? S.templates : [];
  const have=new Set(S.templates.map(t=>t.id));
  const add=progTemplatesFor(id).filter(t=>!have.has(t.id));
  add.forEach(t=>t.ex.forEach(r=>{ const id2=fitToKit(r.exId); if(id2!==r.exId){ r.exId=id2; r.tempo=tempoOf(id2); }
    if(r.rot) r.rot=r.rot.map(fitToKit); }));
  if(add.length) S.templates=S.templates.concat(add);
  return add.length;
}
/* the row as done this week: a max effort variation that rotates */
function rowThisWeek(row){
  if(!row||!Array.isArray(row.rot)||!row.rot.length) return row;
  const id=row.rot[schemeWeek()%row.rot.length];
  return id===row.exId? row : Object.assign({},row,{exId:id,tempo:tempoOf(id)});
}

/* ---------- the week ---------- */
const FILLERS=['rest','cook'];
const isFiller=c=>FILLERS.indexOf(c)>=0;
function progPattern(P){
  const n=progDays(P), out=Array(7).fill(S.profile.aim==='eat'? 'cook':'rest');
  const pos=progPositions(P,n);
  let seq;
  if(P.circ) seq=progStyleWeek(P,pos.length);
  else {
    const order=(P.order||[]).filter(c=>SLOTS[c]||(S.templates||[]).some(t=>t.id===c)||(S.runPlans||[]).some(r=>r.id===c));
    if(!order.length) return null;
    /* fewer days than sessions: the week rolls on from where the last stopped */
    const off=n<order.length? (schemeWeek()*n)%order.length : 0;
    seq=Array.from({length:n},(_,j)=>order[(j+off)%order.length]);
  }
  pos.forEach((d,j)=>{ if(seq[j]) out[d]=seq[j]; });
  return out;
}
/* this week's HYROX or CrossFit circuits for a programme: made once a week,
   then kept, so edits stick */
function progStyleWeek(P,n){
  S.circuits=Array.isArray(S.circuits)? S.circuits : [];
  const wk=mondayKey(), kinds=P.cycle? Array(n).fill(P.circ[0]) : P.circ.slice(0,n);
  const key=wk+'|'+P.id+'|'+kinds.join(',');
  if(S.styleWeek&&S.styleWeek.key===key&&Array.isArray(S.styleWeek.seq)&&S.styleWeek.ids.every(id=>S.circuits.some(c=>c.id===id))){
    S.styleWeek.ids.forEach(id=>{ const c=S.circuits.find(x=>x.id===id); if(c) (c.items||[]).concat(c.strength||[]).forEach(fitItem); });
    return S.styleWeek.seq;
  }
  const w=schemeWeek(), used=new Set((S.workouts||[]).map(x=>x.circuitId)), pinned=pinnedCodes();
  S.circuits=S.circuits.filter(c=>!c.gen||used.has(c.id)||pinned.has(c.id));
  let ci=0;
  const ids=kinds.map((kd,k)=>{
    if(SLOTS[kd]) return kd;
    const c= kd==='cf'? crossfitSession(w,k) : (CF_KINDS[kd]? cfKindSession(kd,w,k) : hyroxSession(kd,w,k));
    const id='g'+wk.replace(/-/g,'')+'_'+P.id.replace(/_/g,'')+(ci++);
    const full=Object.assign({id,gen:true,weekOf:wk,forTime:true,style:P.style,prog:P.id},c);
    (full.items||[]).concat(full.strength||[]).forEach(fitItem);
    S.circuits=S.circuits.filter(x=>x.id!==id); S.circuits.push(full); return id; });
  S.styleWeek={key,weekOf:wk,ids:ids.filter(id=>!SLOTS[id]),seq:ids};
  return ids;
}
/* CrossFit sessions with one job each, for the competitor week */
const CF_KINDS={strmet:1,gymeng:1,wlmet:1,hyeng:1,cflong:1};
function cfKindSession(kind,w,k){
  const r=seeded(w*613+k*97+11), pick=a=>a[Math.floor(r()*a.length)];
  if(kind==='strmet'){ const lift=CF_LIFTS[(w+k)%CF_LIFTS.length];
    const moves=[pick(CF_POOLS.wl),pick(CF_POOLS.gym),pick(CF_POOLS.mono)].filter((x,i,a)=>a.indexOf(x)===i);
    return {name:'Strength, then a metcon',sub:moveOf(lift).n+' 5 x 3 to 5, then 3 rounds',mins:55,format:'fortime',rounds:3,
      strength:[{t:'lift',move:lift,sets:5,amt:[5,3,5,3][w%4],kg:null}],items:moves.map(id=>cfItem(id)),
      why:'Build to heavy sets of the lift, rest, then three rounds at a pace you can hold.',warn:'Scale the metcon so the strength work stays the priority.'}; }
  if(kind==='gymeng'){ const g=[pick(CF_POOLS.gym),pick(['pushup','burpee','situp'])].filter((x,i,a)=>a.indexOf(x)===i), mins=[14,16,18,20][w%4];
    return {name:'Gymnastics and engine',sub:'EMOM '+mins+': skill, then the rower',mins:mins+15,format:'emom',amrapMins:mins,strength:[],
      items:g.concat(['rowcal']).map(id=>cfItem(id,Math.max(1,Math.round((moveOf(id).r||10)*0.6)))),
      why:'Each minute, one movement in turn. Quality reps on the gymnastics, a steady pace on the machine.',warn:'If a minute leaves less than 15 seconds of rest, take reps off.'}; }
  if(kind==='wlmet'){ const lift=['clean','pushpress','cleanjerk','thruster'][(w+k)%4], mins=[10,12,14][w%3];
    const moves=[pick(CF_POOLS.wl),pick(CF_POOLS.bw)].filter((x,i,a)=>a.indexOf(x)===i);
    return {name:'Weightlifting, then a metcon',sub:moveOf(lift).n+' to a heavy set, then AMRAP '+mins,mins:mins+30,format:'amrap',amrapMins:mins,
      strength:[{t:'lift',move:lift,sets:5,amt:[3,2,3,2][w%4],kg:null}],items:moves.map(id=>cfItem(id)),
      why:'Technique under load first, then a short, quick piece.',warn:'Leave the barbell lighter in the metcon than in the lifting.'}; }
  if(kind==='hyeng'){ const rounds=[4,5,4,5][w%4];
    return {name:'Hybrid engine',sub:rounds+' rounds: run, row, and a third',mins:rounds*8+10,format:'fortime',rounds,strength:[],
      items:[cfItem('run',400),cfItem('rowcal',15),cfItem(pick(['du','burpee','kbswing']))],
      why:'Steady across machines and running. The same pace in the last round as the first.',warn:'Hold back in round one.'}; }
  const rd=seeded(w*31+k);
  const all=[...CF_POOLS.wl,...CF_POOLS.gym,...CF_POOLS.bw].filter((x,i,a)=>a.indexOf(x)===i);
  const picks=[]; while(picks.length<6){ const id=all[Math.floor(rd()*all.length)]; if(picks.indexOf(id)<0) picks.push(id); }
  return {name:'Long chipper',sub:'One pass through six movements, big numbers',mins:45,format:'fortime',rounds:1,strength:[],
    items:[cfItem('rowcal',30)].concat(picks.map(id=>cfItem(id,Math.round((moveOf(id).r||10)*2.5)))),
    why:'A long one: break the big sets up early, keep moving.',warn:'A 30 to 40 minute piece. Scale to keep it there.'};
}

/* where the sessions go when the person has picked their own days */
function trainDaysOf(){ const d=S.profile&&S.profile.trainDays;
  return Array.isArray(d)? d.filter(x=>Number.isInteger(x)&&x>=0&&x<7).sort((a,b)=>a-b) : null; }
function placeSessions(out){
  const seq=out.filter(c=>!isFiller(c));
  let days=trainDaysOf();
  /* a gym split picked as a programme sits on that programme's days */
  if(!days||!days.length){ const P=activeProg(); days=(P&&P.split&&P.pos&&P.pos[seq.length])? P.pos[seq.length] : null; }
  if(!days||!days.length||seq.length!==days.length) return out;
  const fill=S.profile.aim==='eat'? 'cook':'rest', res=Array(7).fill(fill);
  days.forEach((d,j)=>{ res[d]=seq[j]; });
  return res;
}
/* days fixed to repeat every week, on top of whatever the week would be */
function pinsOf(){ const p=S.profile&&S.profile.pins; return (p&&typeof p==='object')? p : {}; }
function pinnedCodes(){ return new Set(Object.values(pinsOf())); }
function codeExists(c){ return !!(SLOTS[c]||(S.templates||[]).some(t=>t.id===c)||(S.runPlans||[]).some(r=>r.id===c)||(S.circuits||[]).some(x=>x.id===c)); }
function applyPins(pattern){
  const pins=pinsOf();
  Object.keys(pins).forEach(k=>{ const i=+k; if(i>=0&&i<7&&codeExists(pins[k])) pattern[i]=pins[k]; });
  return pattern;
}
/* sessions in this week's pattern that are training (not rest or cooking) */
function progSessionCount(P){ const pat=progPattern(P); return pat? pat.filter(c=>!isFiller(c)&&c!=='walk').length : 0; }

/* ---------- choosing one ---------- */
function progCounts(P,n){
  /* lifting and cardio days, so the energy maths and the rest of the app see
     the same week */
  if(P.circ) return {lift:P.cycle? 5 : P.circ.filter(c=>!SLOTS[c]).length,cardio:0};
  if(P.split) return {lift:n,cardio:0};
  const order=P.order, seq=Array.from({length:n},(_,j)=>order[j%order.length]);
  const runs=seq.filter(c=>(S.runPlans||[]).some(r=>r.id===c)||c==='run').length, walks=seq.filter(c=>c==='walk').length;
  return {lift:Math.max(0,n-runs-walks),cardio:runs};
}
function applyProgramme(id,opts){
  opts=opts||{};
  const p=S.profile, P=progById(id);
  const snap=JSON.parse(JSON.stringify({profile:p,templates:S.templates,plan:S.plan,styleWeek:S.styleWeek||null}));
  if(!P){ /* back to a style's own week */
    if(p.deloadWas!==undefined){ p.deload=p.deloadWas.on; if(p.deloadWas.every) p.deloadEvery=p.deloadWas.every; delete p.deloadWas; }
    p.programme=null; p.progDays=null;
    if(opts.style) p.style=opts.style;
    if(opts.disc) p.disc=opts.disc;
  } else {
    const n=Math.max(P.days? P.days[0] : 1,Math.min(P.days? P.days[1] : 7,+opts.days||P.def||4));
    if(p.programme!==id) p.progStart=mondayKey();
    p.programme=id; p.disc=P.disc; p.progDays=P.cycle? null : n;
    p.style=P.style||'gym';
    if(P.split) p.split=P.split;
    if(PROG_TPLS[id]) ensureProgTemplates(id);
    const c=progCounts(P,n); p.liftDays=Math.min(6,c.lift); p.cardioDays=Math.min(6,c.cardio);
    /* 5/3/1 has its own light fourth week, so the app's easy weeks step aside */
    if(P.ownDeload&&p.deloadWas===undefined){ p.deloadWas={on:p.deload!==false,every:p.deloadEvery||null}; p.deload=false; }
    if(!P.ownDeload&&p.deloadWas!==undefined){ p.deload=p.deloadWas.on; if(p.deloadWas.every) p.deloadEvery=p.deloadWas.every; delete p.deloadWas; }
    /* chosen days that no longer match the count are dropped, not guessed at */
    const td=trainDaysOf(); if(td&&td.length!==(P.cycle? td.length : n)) p.trainDays=null;
    if(P.cycle) p.trainDays=null;
  }
  S.styleWeek=null;
  if(!opts.quiet){ S.plan=buildPlan(); save(); }
  return snap;
}
function undoProgramme(snap){
  S.profile=snap.profile; S.templates=snap.templates; S.plan=snap.plan; S.styleWeek=snap.styleWeek;
  save(); renderAll();
}
/* a templates-free programme name, for the Plan tile and the summary */
function progLabel(){
  const P=activeProg(); if(P) return P.t;
  const st=styleOf();
  if(STYLE_PROGS[st]) return STYLE_PROGS[st];
  const sp=splitOf(); return sp? SPLITS[sp].t : 'Gauntlet\'s own week';
}
/* the week as day names, for a programme card */
function progWeekText(P,n){
  const pos=P.cycle? [0,1,2,4,5,6] : progPositions(P,n||P.def||n);
  const names=P.circ? P.circ.map(c=>SLOTS[c]? SLOTS[c].label : CIRC_NAMES[c]||c)
    : P.split? SPLITS[P.split].order.map(id=>{ const t=(S.templates||[]).find(x=>x.id===id); return t? t.name : id; })
    : P.order.map(c=>{ if(SLOTS[c]) return SLOTS[c].label; const r=(S.runPlans||[]).find(x=>x.id===c); if(r) return r.name;
        const t=progTemplatesFor(P.id).find(x=>x.id===c)||(S.templates||[]).find(x=>x.id===c); return t? t.name : c; });
  if(P.cycle) return 'Three days on, one off, on a rhythm that moves through the week.';
  return pos.map((d,j)=>DAYS[d].slice(0,3)+' '+names[j%names.length]).join(' · ');
}
const CIRC_NAMES={engine:'Running engine',strength:'Station strength',comp:'Compromised running',mini:'Half simulation',sim:'Race simulation',
  upperrun:'Upper and running',lowerst:'Lower and stations',long:'Long engine',cf:'Workout of the day',
  strmet:'Strength and metcon',gymeng:'Gymnastics and engine',wlmet:'Weightlifting and metcon',hyeng:'Hybrid engine',cflong:'Long chipper'};
/* how well a number of days suits it, in plain words */
function progFit(P,n){
  if(P.cycle) return 'Five or six sessions most weeks.';
  if(n<P.def) return 'Made for '+P.def+' days. At '+n+' it rolls on through the week, so each session comes round a little less often.';
  return 'Made for '+P.def+' days.';
}

/* ---------- HYROX sessions the programmes add ---------- */
const _hyroxSession=hyroxSession;
hyroxSession=function(kind,w,k){
  const frac=[0.5,0.6,0.75,1][w%4];
  if(kind==='mini'){
    if(w%4===3) return _hyroxSession('sim',w,k);
    const half=w%2===0? HYROX_ORDER.slice(0,4) : HYROX_ORDER.slice(4);
    const items=[]; half.forEach(id=>{ items.push(st('run',1000)); items.push(st(id,HYROX_RACE[id])); });
    return {name:'Half race simulation',sub:'4 x 1km and '+(w%2===0? 'the first' : 'the last')+' four stations at race distance',mins:50,format:'fortime',items,
      why:'Half the race at race distances, alternating halves each week. The full race every fourth week.',
      warn:'Race pace on the runs, not faster. Note the time: it is the one to beat.'};
  }
  if(kind==='upperrun'){
    const items=[st('run',800),st('wallball',20),st('skierg',250),st('dbpushpress',12)];
    return {name:'Upper body stations and running',sub:'4 rounds: run, wall balls, SkiErg, push press',mins:45,format:'fortime',rounds:4,items,
      why:'The upper body stations under running fatigue. A steady pace you could hold for the race.',warn:'Keep the wall balls unbroken if you can; rest on the run, not the ball.'};
  }
  if(kind==='lowerst'){
    const items=[st('sledpush',25,{kg:Math.round(moveOf('sledpush').kg[sexKey()]*1.1)}),st('sblunge',20),st('farmers',100),st('bbj',20)];
    return {name:'Lower body stations',sub:'4 rounds of the leg-heavy stations, a little over race weight',mins:45,format:'fortime',rounds:4,items,
      why:'The sled, the lunges, the carry and the burpee broad jumps are where legs go. Heavier than race weight on the sled.',warn:'Form over speed.'};
  }
  if(kind==='long'){
    const ids=HYROX_ORDER.filter((x,i)=>i%2===(w%2)), items=[];
    ids.concat(ids.slice(0,2)).forEach(id=>{ items.push(st('run',1000)); items.push(st(id,niceAmt(HYROX_RACE[id]*Math.min(0.75,frac),moveOf(id).u))); });
    return {name:'Long engine simulation',sub:'6 x 1km, each into a station at three quarters of race distance',mins:70,format:'fortime',items,
      why:'Long and steady: the engine that carries you through the second half of a race.',warn:'Conversational on the first two runs.'};
  }
  return _hyroxSession(kind,w,k);
};

/* ---------- hooks into the week the rest of the app builds ---------- */
const _weekPattern=weekPattern;
weekPattern=function(){
  const P=activeProg();
  let out=null;
  if(P&&(P.order||P.circ)) out=progPattern(P);
  if(!out) out=_weekPattern();
  return applyPins(placeSessions(out));
};
const _sessionsWanted=sessionsWanted;
sessionsWanted=function(){
  const P=activeProg();
  if(P&&P.circ&&P.cycle) return Math.max(1,cycleOn().length);
  if(P&&(P.order||P.circ)) return Math.max(1,progDays(P));
  return _sessionsWanted();
};
/* a programme's templates arrive with a synced profile or after a reinstall */
(()=>{ const P=activeProg(); if(P&&PROG_TPLS[P.id]) ensureProgTemplates(P.id); })();

Object.assign(window.__G||{},{DISCIPLINES,PROGRAMMES,PROG_TPLS,STYLE_PROGS,progById,activeProg,progsFor,discOf,progDays,cycleOn,progPositions,
  progTemplatesFor,ensureProgTemplates,rowThisWeek,progPattern,progStyleWeek,cfKindSession,placeSessions,trainDaysOf,pinsOf,applyPins,
  applyProgramme,undoProgramme,progLabel,progWeekText,progFit,parseScheme,weekPattern,sessionsWanted,hyroxSession,progCounts,discById});

/* =====================================================================
   The programme sheet: every named week, how many days, which days, and
   days fixed to repeat. Reached from Plan. Nothing here removes a way of
   changing the week that was there before: Change this day, the templates,
   Training style and the split are all where they were.
   ===================================================================== */
let progView={disc:null,open:null,days:null};
function currentDays(){
  /* the days this week's sessions sit on, before any fixed days */
  const P=activeProg(), raw=(P&&(P.order||P.circ))? progPattern(P) : _weekPattern();
  const base=placeSessions(raw||_weekPattern());
  return base.map((c,i)=>isFiller(c)? -1 : i).filter(i=>i>=0);
}
const dayCode=d=>d? (d.templateId||d.circuitId||d.runId||d.slot) : null;
function progCardHtml(P,on){
  const n=on? progDays(P) : P.def, open=progView.open===P.id;
  const kitMiss=(P.kit||[]).filter(k=>!hasKit(k));
  return `<div class="progcard ${on?'on':''} ${open?'open':''}">
    <button class="progh" data-progpeek="${P.id}" aria-expanded="${open}">
      <span class="pt"><b>${escHabit(P.t)}</b>${on? '<i class="inuse">In use</i>' : ''}</span>
      <span class="ps">${escHabit(P.s)}</span>
      <span class="pm">${P.cycle? '3 on, 1 off' : (P.days[0]===P.days[1]? P.def+' days' : P.days[0]+' to '+P.days[1]+' days')} · ${P.level}</span></button>
    ${open? `<div class="progb">
      <div class="pweek">${escHabit(progWeekText(P,n))}</div>
      <p>${escHabit(P.why)}</p>
      ${kitMiss.length? `<div class="note">Needs ${kitMiss.map(k=>(KIT.find(x=>x.id===k)||{t:k}).t.toLowerCase()).join(' and ')}, which you have not said you have. Movements that need it are swapped for the nearest thing you can do.</div>` : ''}
      ${on? '' : `<button class="sheetcta" data-proguse="${P.id}">Use ${escHabit(P.t)}</button>
      <div class="note">Your weights and history come with you. This week is rebuilt from today; Undo puts it back.</div>`}
    </div>` : ''}</div>`;
}
function openProgSheet(disc){
  progView={disc:disc||progView.disc||discOf(),open:progView.open,days:null};
  drawProgSheet(); openSheet('altSheet');
}
function drawProgSheet(){
  const P=activeProg(), disc=progView.disc, D=discById(disc), st=styleOf();
  $('altTitle').textContent='Programme';
  $('altSub').textContent='Named weeks from every kind of training. Every session in them can still be changed, and so can every day.';
  const list=progsFor(disc), styleWeek=STYLE_PROGS[D.style]&&D.style!=='gym';
  const ownOn=!P&&styleOf()===D.style&&(D.style!=='gym'||discOf()==='gym');
  const days=progView.days||trainDaysOf()||currentDays(), need=currentDays().length;
  $('altBody').innerHTML=`<div style="padding:0 14px 10px" class="progsheet">
    <div class="pnow"><span>Now</span><b>${escHabit(progLabel())}</b></div>
    <div class="chips progdiscs" role="group" aria-label="Kinds of training">${DISCIPLINES.map(d=>`<button class="${d.id===disc?'on':''}" data-progdisc="${d.id}" aria-pressed="${d.id===disc}">${escHabit(d.t)}</button>`).join('')}</div>
    <div class="note" style="margin:6px 0 10px">${escHabit(D.s)}.</div>
    ${styleWeek? `<div class="progcard ${ownOn?'on':''}"><button class="progh" data-progstyle="${D.style}">
      <span class="pt"><b>${escHabit(STYLE_PROGS[D.style])}</b>${ownOn? '<i class="inuse">In use</i>' : ''}</span>
      <span class="ps">${escHabit(STYLES[D.style].s)}</span><span class="pm">${D.style==='hifb'? '4 days, your choice' : '2 to 6 days, your choice'}${D.style==='hybrid'? ' · choose the mix' : ''}</span></button></div>` : ''}
    ${disc==='gym'? `<button class="inlinebtn" data-setting="split" style="margin:0 0 8px">Or pick a split and set your own days for lifting and cardio</button>` : ''}
    ${list.map(x=>progCardHtml(x,!!(P&&P.id===x.id))).join('')}
    ${!list.length&&!styleWeek? `<div class="empty">Nothing here for under 18s yet. Bodybuilding, general fitness and calisthenics all have programmes built for you.</div>` : ''}
    ${P&&!P.cycle&&P.days[0]!==P.days[1]? `<div class="slab">Days a week for ${escHabit(P.t)}</div>
      <div class="chips">${Array.from({length:P.days[1]-P.days[0]+1},(_,i)=>P.days[0]+i).map(n=>`<button class="${progDays(P)===n?'on':''}" data-progdays="${n}">${n}</button>`).join('')}</div>
      <div class="note">${escHabit(progFit(P,progDays(P)))}</div>` : ''}
    ${P&&P.cycle? '' : `<div class="slab">Which days</div>
      <div class="weekpick" role="group" aria-label="Training days">${DAYS.map((nm,i)=>`<button class="${days.indexOf(i)>=0?'on':''}" data-trainday="${i}" aria-pressed="${days.indexOf(i)>=0}">${nm}</button>`).join('')}</div>
      <div class="note">${days.length===need? (progView.days? 'Ready to move your sessions to these days.' : (trainDaysOf()? 'Your own days. Sessions stay in the same order.' : 'Pick the days that suit your week; the sessions keep their order.'))
        : 'Pick '+need+' day'+(need===1?'':'s')+' for your '+need+' session'+(need===1?'':'s')+' (you have '+days.length+'). To train more or fewer days, change the number above or in Training style.'}</div>
      <div class="setbtns">${progView.days? `<button class="go" data-trainsave="1" ${days.length===need?'':'disabled'}>Use these days</button>` : ''}${trainDaysOf()? `<button data-trainclear="1">Back to the usual days</button>` : ''}</div>`}
    <div class="slab">Every week</div>
    ${(()=>{ const pins=pinsOf(), ks=Object.keys(pins).map(Number).sort((a,b)=>a-b);
      return (ks.length? ks.map(i=>{ const sl=slotFor(pins[i]); return `<div class="pinrow"><span><b>${DAYS[i]}</b> ${escHabit(dayLabel(Object.assign({},sl))||sl.label||'')}</span><button class="mini" data-unpin="${i}">Unfix</button></div>`; }).join('')
        : `<div class="note">Fix a day to repeat every week from Change this day, or keep this whole week as it is.</div>`)
        +`<div class="setbtns"><button data-pinweek="1">Keep this week's days every week</button>${ks.length? `<button data-unpinall="1">Unfix all</button>` : ''}</div>`; })()}
    <details class="method" style="margin-top:12px"><summary><b>Where these come from</b></summary><span>${PROG_EVIDENCE}</span></details>
  </div>`;
}
const PROG_EVIDENCE='With the weekly work matched, full body and split routines build the same strength and muscle (Ramos-Campo and colleagues, 2024, 14 trials), so pick the shape that fits your week. Periodised programmes, such as daily undulating or 5/3/1 waves, gave a little more strength than unvaried ones with the work matched, and no difference in muscle (Moesgaard and colleagues, 2022); daily undulating and linear periodisation came out about the same (Harries and colleagues, 2015; Grgic and colleagues, 2017). Olympic lifting improved jump height in sportspeople (Hackett and colleagues, 2016). Progressed bodyweight training built strength comparable to the bench press (Kikuchi and Nakazato, 2017; Kotarsky and colleagues, 2018). Plyometrics improve jumping (de Villarreal and colleagues, 2009), and heavy strength work improved running economy in distance runners (Blagrove and colleagues, 2018). Endurance work alongside lifting did not reduce muscle or maximal strength but blunted explosive strength (Schumann and colleagues, 2022). The WHO (2020) advises strength work on two or more days a week, and balance on three or more from 65. 5/3/1, Westside conjugate, PHAT, PHUL and the HYROX and CrossFit weeks are coaches\' and sports\' own methods: sound, widely used, but not tested as written. Percentages come from your own lifting: the best estimated single (Epley) across your last six sessions of that lift, and 90% of it for a 5/3/1 training max.';
/* the fix-every-week line in Change this day */
function pinRowHtml(n,d){
  const pinned=pinsOf()[n]!==undefined;
  return `<button class="opt check pinopt ${pinned?'on':''}" data-pinday="${n}" role="checkbox" aria-checked="${pinned}"><span class="box" aria-hidden="true"></span>
    <div class="txt"><div class="t">Every week</div><div class="s">${pinned? DAYS[n]+' stays '+escHabit(dayLabel(d)||'Rest')+' every week, whatever the programme does. Change it below and the new choice stays.' : 'Keep '+escHabit(dayLabel(d)||'Rest')+' on '+DAYS[n]+' every week, not just this one'}</div></div></button>`;
}
/* fixing a day changes nothing now; unfixing one hands that day back to the
   programme straight away, with Undo */
function setPins(next,msg){
  const was=Object.assign({},pinsOf()), planWas=JSON.parse(JSON.stringify(S.plan||null));
  S.profile.pins=next;
  const freed=Object.keys(was).filter(k=>next[k]===undefined).map(Number);
  if(freed.length&&S.plan&&S.plan.days){ const pat=weekPattern();
    freed.forEach(i=>{ const old=S.plan.days[i]||{}; S.plan.days[i]=Object.assign(slotFor(pat[i]),{dow:i,checkin:!!old.checkin,exclude:old.exclude||[],setDelta:old.setDelta||0}); }); }
  save(); renderAll();
  toast(msg,'Undo',()=>{ S.profile.pins=was; if(planWas) S.plan=planWas; save(); renderAll(); });
}
document.addEventListener('click',e=>{
  const pd=e.target.closest('[data-progdisc]');
  if(pd){ progView.disc=pd.dataset.progdisc; progView.open=null; drawProgSheet(); return; }
  const pk=e.target.closest('[data-progpeek]');
  if(pk){ progView.open= progView.open===pk.dataset.progpeek? null : pk.dataset.progpeek; drawProgSheet(); return; }
  const pu=e.target.closest('[data-proguse]');
  if(pu){ const id=pu.dataset.proguse, P=progById(id); if(!P) return;
    const snap=applyProgramme(id); renderAll(); progView.open=null; progView.days=null; drawProgSheet();
    toast(P.t+': this week rebuilt'+(P.ownDeload? '. Its own light fourth week replaces the app\'s easy weeks' : ''),'Undo',()=>{ undoProgramme(snap); drawProgSheet(); }); return; }
  const ps=e.target.closest('[data-progstyle]');
  if(ps){ const style=ps.dataset.progstyle, snap=applyProgramme(null,{style,disc:discById(progView.disc).id});
    S.profile.style=style; if(style==='hifb'&&!S.profile.hifbSet){ S.profile.liftDays=4; S.profile.cardioDays=0; S.profile.hifbSet=true; }
    if(style!=='gym'&&sessionsWanted()<2) S.profile.liftDays=3;
    S.styleWeek=null; S.plan=buildPlan(); save(); renderAll();
    if(style==='hybrid'){ openStyleSheet(); return; }
    drawProgSheet(); toast(STYLES[style].t+': this week rebuilt','Undo',()=>{ undoProgramme(snap); drawProgSheet(); }); return; }
  const pn=e.target.closest('[data-progdays]');
  if(pn){ const P=activeProg(); if(!P) return; const snap=applyProgramme(P.id,{days:+pn.dataset.progdays}); S.profile.progDays=+pn.dataset.progdays;
    S.plan=buildPlan(); save(); renderAll(); progView.days=null; drawProgSheet();
    toast(P.t+', '+progDays(P)+' days a week','Undo',()=>{ undoProgramme(snap); drawProgSheet(); }); return; }
  const td=e.target.closest('[data-trainday]');
  if(td){ const i=+td.dataset.trainday, cur=(progView.days||trainDaysOf()||currentDays()).slice();
    progView.days= cur.indexOf(i)>=0? cur.filter(x=>x!==i) : cur.concat([i]).sort((a,b)=>a-b); drawProgSheet(); return; }
  if(e.target.closest('[data-trainsave]')){ const days=progView.days; if(!days||days.length!==currentDays().length) return;
    const was=S.profile.trainDays||null; S.profile.trainDays=days.slice(); S.plan=buildPlan(); save(); renderAll(); progView.days=null; drawProgSheet();
    toast('Training on '+days.map(i=>DAYS[i]).join(', '),'Undo',()=>{ S.profile.trainDays=was; S.plan=buildPlan(); save(); renderAll(); drawProgSheet(); }); return; }
  if(e.target.closest('[data-trainclear]')){ const was=S.profile.trainDays; S.profile.trainDays=null; S.plan=buildPlan(); save(); renderAll(); progView.days=null; drawProgSheet();
    toast('Back to the usual days','Undo',()=>{ S.profile.trainDays=was; S.plan=buildPlan(); save(); renderAll(); drawProgSheet(); }); return; }
  const up=e.target.closest('[data-unpin]');
  if(up){ const next=Object.assign({},pinsOf()); delete next[+up.dataset.unpin]; setPins(next,DAYS[+up.dataset.unpin]+' follows the programme again'); drawProgSheet(); return; }
  if(e.target.closest('[data-unpinall]')){ setPins({},'No fixed days'); drawProgSheet(); return; }
  if(e.target.closest('[data-pinweek]')){ const plan=ensurePlan(), next={};
    plan.days.forEach((d,i)=>{ const c=dayCode(d); if(c) next[i]=c; });
    setPins(next,'This week\'s days repeat every week'); drawProgSheet(); return; }
  const pp=e.target.closest('[data-pinday]');
  if(pp){ const n=+pp.dataset.pinday, d=(S.plan&&S.plan.days[n])||{}, next=Object.assign({},pinsOf());
    if(next[n]!==undefined){ delete next[n]; setPins(next,DAYS[n]+' follows the programme again'); }
    else { next[n]=dayCode(d)||'rest'; setPins(next,DAYS[n]+' is '+(dayLabel(d)||'Rest')+' every week'); }
    if(typeof openSwap==='function') openSwap(n,true); return; }
});
Object.assign(window.__G||{},{openProgSheet,drawProgSheet,progView:()=>progView,currentDays,pinRowHtml,dayCode,PROG_EVIDENCE});

/* ---------- onboarding: the same programmes, one tap each ---------- */
/* the families that are not already one of the training styles */
const ONB_DISCS=['strength','power','oly','cals','general','hybrid','athletic'];
function onbDiscNow(){
  if(onbDraft.disc) return onbDraft.disc;
  const st=onbDraft.style||'gym';
  return st==='hyrox'? 'hyrox' : st==='crossfit'? 'crossfit' : null;
}
function onbProgBlock(){
  const disc=onbDiscNow(); if(!disc) return '';
  const list=progsFor(disc); if(!list.length) return '';
  const P=onbDraft.prog? progById(onbDraft.prog) : null, own=!onbDraft.disc;
  return `<div class="slab">${own? 'Your week' : 'Programme'}</div>
    <div class="splitopts">${own? `<button class="splitopt ${!P?'on':''}" data-onbprog="" aria-pressed="${!P}"><b>${escHabit(STYLE_PROGS[onbDraft.style])}</b><span>Sessions that change every week, as many days as you like</span></button>` : ''}
    ${list.map(x=>`<button class="splitopt ${P&&P.id===x.id?'on':''}" data-onbprog="${x.id}" aria-pressed="${!!(P&&P.id===x.id)}">
      <b>${escHabit(x.t)}</b><span>${escHabit(x.s)}</span><small>${x.cycle? '3 on, 1 off' : (x.days[0]===x.days[1]? x.def+' days' : x.days[0]+' to '+x.days[1]+' days')} · ${x.level}${x.adult? ' · 18 and over' : ''}</small></button>`).join('')}</div>
    ${P? `${P.cycle||P.days[0]===P.days[1]? '' : `<div class="field" style="margin:4px 0 12px"><div class="fl"><div class="k">Days a week</div><div class="v">${onbDraft.progDays||P.def}</div></div>
      <div class="chips">${Array.from({length:P.days[1]-P.days[0]+1},(_,i)=>P.days[0]+i).map(n=>`<button class="${(onbDraft.progDays||P.def)===n?'on':''}" data-onbpdays="${n}">${n}</button>`).join('')}</div></div>`}
      <div class="note" style="margin-bottom:14px">${escHabit(progWeekText(P,onbDraft.progDays||P.def))}. ${escHabit(P.why)} Every session and every day can be changed later.</div>` : ''}`;
}
function onbSetProg(id){
  const P=progById(id);
  onbDraft.prog=P? P.id : null;
  if(P){ onbDraft.progDays=P.def; onbDraft.style=P.style||'gym';
    const c=progCounts(P,P.def); onbDraft.liftDays=Math.min(6,c.lift); onbDraft.cardioDays=Math.min(6,c.cardio); }
}
document.addEventListener('click',e=>{
  if(!onbDraft||!e.target.closest('#onb')) return;
  const od=e.target.closest('[data-onbdisc]');
  if(od){ onbDraft.disc=od.dataset.onbdisc; onbDraft.style='gym';
    const list=progsFor(onbDraft.disc), want=onbDraft.liftDays||3;
    const pick=list.find(x=>!x.cycle&&want>=x.days[0]&&want<=x.days[1])||list[0];
    onbSetProg(pick&&pick.id); if(pick&&!pick.cycle) onbDraft.progDays=Math.max(pick.days[0],Math.min(pick.days[1],want));
    if(pick){ const c=progCounts(pick,onbDraft.progDays); onbDraft.liftDays=Math.min(6,c.lift); onbDraft.cardioDays=Math.min(6,c.cardio); }
    onbRender(); return; }
  const op=e.target.closest('[data-onbprog]');
  if(op){ onbSetProg(op.dataset.onbprog||null); if(!onbDraft.prog&&!onbDraft.disc){ onbDraft.liftDays=Math.max(2,onbDraft.liftDays||4); onbDraft.cardioDays=0; } onbRender(); return; }
  const on=e.target.closest('[data-onbpdays]');
  if(on){ const P=progById(onbDraft.prog); if(!P) return; onbDraft.progDays=+on.dataset.onbpdays;
    const c=progCounts(P,onbDraft.progDays); onbDraft.liftDays=Math.min(6,c.lift); onbDraft.cardioDays=Math.min(6,c.cardio); onbRender(); return; }
});
Object.assign(window.__G||{},{ONB_DISCS,onbProgBlock,onbSetProg});
