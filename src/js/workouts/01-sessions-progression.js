
/* =====================================================================
   Workout logging, in the shape lifters already know from StrengthLog
   and Strong: templates you start in one tap, a set by set log with the
   previous session beside each row, a tick that starts the rest timer,
   warm up sets, add or swap any exercise mid session, and records worked
   out on the way out. Everything is amendable. The template is a
   starting point, not a cage.
   ===================================================================== */

/* Every movement carries a tempo and a movement pattern. Tempo is written the
   usual four digits: lower, pause at the bottom, lift, pause at the top.
   The meta-analysis (Schoenfeld, Ogborn and Krieger) found hypertrophy is much
   the same anywhere from half a second to eight seconds a rep, and only falls
   off past ten, so nothing here is slow for the sake of it, and no claim is made
   that tempo builds more muscle. It is here for repeatability and position. The pattern is what makes a sensible
   substitute possible when something hurts. */
/* The exercise library. Every movement carries what a lifter actually needs to
   pick one: the muscle it trains, what else it hits, the kit it needs, the
   movement pattern (which is what makes a sensible substitute possible), a
   tempo, a difficulty, and one line of coaching. Written rather than scraped,
   so there are no duplicate entries with three different calorie counts and no
   "Barbell Bench Press (2)". Tempo is lower, pause, lift, pause, as always. */
const LIBRARY=[
  {id:"bench",n:"Bench Press",g:"Chest",p:"horizontal push",eq:"barbell",m:"Pectorals",s:"Triceps, Front delts",t:"3010",d:2,c:"Shoulder blades pinned, bar to mid chest."},
  {id:"incline",n:"Incline Bench Press",g:"Chest",p:"horizontal push",eq:"barbell",m:"Upper pectorals",s:"Front delts, Triceps",t:"3010",d:2,c:"Thirty degrees. Any steeper and it becomes a shoulder press."},
  {id:"decline",n:"Decline Bench Press",g:"Chest",p:"horizontal push",eq:"barbell",m:"Lower pectorals",s:"Triceps",t:"3010",d:2,c:"Bar to the lower chest, elbows tucked."},
  {id:"closegrip",n:"Close Grip Bench Press",g:"Chest",p:"horizontal push",eq:"barbell",m:"Triceps",s:"Pectorals",t:"3010",d:2,c:"Hands shoulder width, elbows close to the ribs."},
  {id:"floorpress",n:"Floor Press",g:"Chest",p:"horizontal push",eq:"barbell",m:"Pectorals",s:"Triceps",t:"3110",d:2,c:"Pause when the elbows touch the floor."},
  {id:"dbpress",n:"DB Bench Press",g:"Chest",p:"horizontal push",eq:"dumbbell",m:"Pectorals",s:"Triceps, Front delts",t:"3010",d:1,c:"Wrists stacked over the elbows."},
  {id:"dbincline",n:"DB Incline Press",g:"Chest",p:"horizontal push",eq:"dumbbell",m:"Upper pectorals",s:"Front delts",t:"3010",d:1,c:"Let the weights drift together at the top."},
  {id:"dbfloor",n:"DB Floor Press",g:"Chest",p:"horizontal push",eq:"dumbbell",m:"Pectorals",s:"Triceps",t:"3110",d:1,c:"Kind on the shoulder. Pause on the floor."},
  {id:"machpress",n:"Machine Chest Press",g:"Chest",p:"horizontal push",eq:"machine",m:"Pectorals",s:"Triceps",t:"3011",d:1,c:"Seat height so the handles sit at mid chest."},
  {id:"hammerpress",n:"Hammer Strength Press",g:"Chest",p:"horizontal push",eq:"machine",m:"Pectorals",s:"Triceps",t:"3011",d:1,c:"Drive one arm at a time if the machine allows."},
  {id:"smithbench",n:"Smith Machine Bench",g:"Chest",p:"horizontal push",eq:"machine",m:"Pectorals",s:"Triceps",t:"3010",d:1,c:"Useful when you have no spotter."},
  {id:"pushup",n:"Press Up",g:"Chest",p:"horizontal push",eq:"bodyweight",m:"Pectorals",s:"Triceps, Core",t:"3010",d:1,c:"Body in one line, ribs down."},
  {id:"pushupincline",n:"Incline Press Up",g:"Chest",p:"horizontal push",eq:"bodyweight",m:"Pectorals",s:"Triceps",t:"3010",d:1,c:"Hands on a bench. Where to start if the floor is too hard."},
  {id:"pushupdecline",n:"Decline Press Up",g:"Chest",p:"horizontal push",eq:"bodyweight",m:"Upper pectorals",s:"Triceps",t:"3010",d:2,c:"Feet raised. Harder than it looks."},
  {id:"diamond",n:"Diamond Press Up",g:"Chest",p:"horizontal push",eq:"bodyweight",m:"Triceps",s:"Pectorals",t:"3010",d:2,c:"Hands together under the sternum."},
  {id:"fly",n:"Cable Fly",g:"Chest",p:"chest isolation",eq:"cable",m:"Pectorals",s:"Front delts",t:"2011",d:1,c:"Soft elbows, squeeze at the front."},
  {id:"lowfly",n:"Low to High Cable Fly",g:"Chest",p:"chest isolation",eq:"cable",m:"Upper pectorals",s:"Front delts",t:"2011",d:1,c:"Finish with the hands at collarbone height."},
  {id:"highfly",n:"High to Low Cable Fly",g:"Chest",p:"chest isolation",eq:"cable",m:"Lower pectorals",s:"Front delts",t:"2011",d:1,c:"Finish at the hips."},
  {id:"dbfly",n:"DB Fly",g:"Chest",p:"chest isolation",eq:"dumbbell",m:"Pectorals",s:"Front delts",t:"3011",d:2,c:"Stop at chest level. No deeper."},
  {id:"pecdeck",n:"Pec Deck",g:"Chest",p:"chest isolation",eq:"machine",m:"Pectorals",s:"Front delts",t:"2011",d:1,c:"Elbows at chest height throughout."},
  {id:"dbpullover",n:"DB Pullover",g:"Chest",p:"chest isolation",eq:"dumbbell",m:"Pectorals",s:"Lats, Serratus",t:"3010",d:2,c:"Ribs stay down as the arms go back."},
  {id:"chestdip",n:"Chest Dip",g:"Chest",p:"horizontal push",eq:"bodyweight",m:"Lower pectorals",s:"Triceps",t:"3010",d:3,c:"Lean forward. Stop when the shoulder feels stretched."},
  {id:"bandpress",n:"Band Chest Press",g:"Chest",p:"horizontal push",eq:"band",m:"Pectorals",s:"Triceps",t:"3011",d:1,c:"Anchor behind you at chest height."},
  {id:"svend",n:"Svend Press",g:"Chest",p:"chest isolation",eq:"other",m:"Pectorals",s:"Front delts",t:"2012",d:1,c:"Crush two plates together and press out."},
  {id:"deadlift",n:"Deadlift",g:"Back",p:"hinge",eq:"barbell",m:"Erectors, Glutes",s:"Hamstrings, Traps, Lats",t:"3010",d:3,c:"Push the floor away. Bar stays against the legs."},
  {id:"sumo",n:"Sumo Deadlift",g:"Back",p:"hinge",eq:"barbell",m:"Glutes, Adductors",s:"Erectors, Quads",t:"3010",d:3,c:"Wide stance, knees tracking over the toes."},
  {id:"trapbar",n:"Trap Bar Deadlift",g:"Back",p:"hinge",eq:"barbell",m:"Glutes, Quads",s:"Erectors, Traps",t:"3010",d:2,c:"The friendliest deadlift for most backs."},
  {id:"rackpull",n:"Rack Pull",g:"Back",p:"hinge",eq:"barbell",m:"Erectors, Traps",s:"Glutes",t:"3010",d:2,c:"From the knee. Heavier than a full pull."},
  {id:"deficit",n:"Deficit Deadlift",g:"Back",p:"hinge",eq:"barbell",m:"Hamstrings, Glutes",s:"Erectors",t:"3010",d:3,c:"Standing on a plate. Only if your positions are solid."},
  {id:"bbrow",n:"Barbell Row",g:"Back",p:"horizontal pull",eq:"barbell",m:"Lats, Mid back",s:"Biceps, Erectors",t:"3010",d:2,c:"Torso at forty five degrees, bar to the belly button."},
  {id:"pendlay",n:"Pendlay Row",g:"Back",p:"horizontal pull",eq:"barbell",m:"Mid back",s:"Lats, Biceps",t:"3010",d:3,c:"Bar resets on the floor each rep."},
  {id:"tbar",n:"T Bar Row",g:"Back",p:"horizontal pull",eq:"barbell",m:"Mid back",s:"Lats, Biceps",t:"2011",d:2,c:"Chest supported if the machine allows."},
  {id:"yatesrow",n:"Yates Row",g:"Back",p:"horizontal pull",eq:"barbell",m:"Lats",s:"Biceps, Traps",t:"2011",d:2,c:"Underhand, more upright than a barbell row."},
  {id:"dbrow",n:"DB Row",g:"Back",p:"horizontal pull",eq:"dumbbell",m:"Lats",s:"Biceps, Mid back",t:"2011",d:1,c:"Row toward the hip, not the armpit."},
  {id:"chestrow",n:"Chest Supported DB Row",g:"Back",p:"horizontal pull",eq:"dumbbell",m:"Mid back",s:"Lats, Rear delts",t:"2011",d:1,c:"No momentum available, which is the point."},
  {id:"csrow",n:"Chest Supported Row",g:"Back",p:"horizontal pull",eq:"machine",m:"Mid back",s:"Lats, Biceps",t:"2011",d:1,c:"Pinch the shoulder blades at the top."},
  {id:"cablerow",n:"Seated Cable Row",g:"Back",p:"horizontal pull",eq:"cable",m:"Mid back",s:"Lats, Biceps",t:"2011",d:1,c:"Sit tall. The torso does not rock."},
  {id:"onearmcable",n:"Single Arm Cable Row",g:"Back",p:"horizontal pull",eq:"cable",m:"Lats",s:"Mid back",t:"2011",d:1,c:"Let the shoulder reach forward at the stretch."},
  {id:"machrow",n:"Machine Row",g:"Back",p:"horizontal pull",eq:"machine",m:"Mid back",s:"Lats",t:"2011",d:1,c:"Chest against the pad throughout."},
  {id:"invrow",n:"Inverted Row",g:"Back",p:"horizontal pull",eq:"bodyweight",m:"Mid back",s:"Lats, Biceps",t:"2011",d:1,c:"Body in one line, chest to the bar."},
  {id:"seallrow",n:"Seal Row",g:"Back",p:"horizontal pull",eq:"barbell",m:"Mid back",s:"Lats",t:"2011",d:2,c:"Lying face down. Pure back, no cheating."},
  {id:"chin",n:"Chin Up",g:"Back",p:"vertical pull",eq:"bodyweight",m:"Lats",s:"Biceps",t:"3110",d:3,c:"Underhand. Chest to the bar, no swinging."},
  {id:"pullup",n:"Pull Up",g:"Back",p:"vertical pull",eq:"bodyweight",m:"Lats",s:"Biceps, Mid back",t:"3110",d:3,c:"Overhand, hands outside the shoulders."},
  {id:"neutralpull",n:"Neutral Grip Pull Up",g:"Back",p:"vertical pull",eq:"bodyweight",m:"Lats",s:"Biceps",t:"3110",d:3,c:"Palms facing. Usually the kindest on the elbows."},
  {id:"assistchin",n:"Assisted Chin Up",g:"Back",p:"vertical pull",eq:"machine",m:"Lats",s:"Biceps",t:"3110",d:1,c:"Use as little help as you can manage."},
  {id:"pulldown",n:"Lat Pulldown",g:"Back",p:"vertical pull",eq:"machine",m:"Lats",s:"Biceps",t:"3011",d:1,c:"Bar to the collarbone, elbows down not back."},
  {id:"closepulldown",n:"Close Grip Pulldown",g:"Back",p:"vertical pull",eq:"machine",m:"Lats",s:"Biceps",t:"3011",d:1,c:"Narrow neutral handle, longer range."},
  {id:"straightarm",n:"Straight Arm Pulldown",g:"Back",p:"vertical pull",eq:"cable",m:"Lats",s:"Triceps",t:"2011",d:1,c:"Arms stay straight. It is not a triceps press."},
  {id:"pullover",n:"Cable Pullover",g:"Back",p:"vertical pull",eq:"cable",m:"Lats",s:"Chest",t:"3011",d:2,c:"Hinge slightly and keep the ribs down."},
  {id:"negpull",n:"Negative Pull Up",g:"Back",p:"vertical pull",eq:"bodyweight",m:"Lats",s:"Biceps",t:"5010",d:2,c:"Jump up, lower for five seconds. How to earn a pull up."},
  {id:"shrug",n:"Barbell Shrug",g:"Back",p:"shoulder isolation",eq:"barbell",m:"Traps",s:"Forearms",t:"2012",d:1,c:"Straight up, not in circles."},
  {id:"dbshrug",n:"DB Shrug",g:"Back",p:"shoulder isolation",eq:"dumbbell",m:"Traps",s:"Forearms",t:"2012",d:1,c:"Pause at the top for a full second."},
  {id:"facepull",n:"Face Pull",g:"Back",p:"horizontal pull",eq:"cable",m:"Rear delts",s:"Traps, Rotator cuff",t:"2012",d:1,c:"Rope to the forehead, elbows high."},
  {id:"backext",n:"Back Extension",g:"Back",p:"hinge",eq:"bodyweight",m:"Erectors",s:"Glutes, Hamstrings",t:"2111",d:1,c:"Stop level. Do not arch past it."},
  {id:"goodmorning",n:"Good Morning",g:"Back",p:"hinge",eq:"barbell",m:"Hamstrings, Erectors",s:"Glutes",t:"3110",d:3,c:"Light. Hinge, do not squat it."},
  {id:"hyper45",n:"45 Degree Back Raise",g:"Back",p:"hinge",eq:"bodyweight",m:"Erectors",s:"Glutes",t:"2111",d:1,c:"Round the upper back if you want more glute."},
  {id:"farmers",n:"Farmer's Carry",g:"Back",p:"carry",eq:"dumbbell",m:"Traps, Grip",s:"Core",t:"hold",d:1,c:"Stand tall, walk, do not rush."},
  {id:"suitcase",n:"Suitcase Carry",g:"Back",p:"carry",eq:"dumbbell",m:"Obliques, Grip",s:"Traps",t:"hold",d:1,c:"One side only. Resist the lean."},
  {id:"ohp",n:"Overhead Press",g:"Shoulders",p:"vertical push",eq:"barbell",m:"Front delts",s:"Triceps, Core",t:"3010",d:3,c:"Squeeze the glutes. No leg drive."},
  {id:"pushpress",n:"Push Press",g:"Shoulders",p:"vertical push",eq:"barbell",m:"Front delts",s:"Triceps, Quads",t:"3010",d:3,c:"Small dip, drive with the legs."},
  {id:"dbohp",n:"DB Shoulder Press",g:"Shoulders",p:"vertical push",eq:"dumbbell",m:"Front delts",s:"Triceps",t:"3010",d:2,c:"Seated is easier to control than standing."},
  {id:"arnold",n:"Arnold Press",g:"Shoulders",p:"vertical push",eq:"dumbbell",m:"Front delts",s:"Side delts, Triceps",t:"3010",d:2,c:"Rotate as you press. Slowly."},
  {id:"machohp",n:"Machine Shoulder Press",g:"Shoulders",p:"vertical push",eq:"machine",m:"Front delts",s:"Triceps",t:"3011",d:1,c:"Handles at ear height to start."},
  {id:"landmine",n:"Landmine Press",g:"Shoulders",p:"vertical push",eq:"barbell",m:"Front delts",s:"Triceps, Core",t:"3010",d:1,c:"The friendliest press for a cranky shoulder."},
  {id:"zpress",n:"Z Press",g:"Shoulders",p:"vertical push",eq:"dumbbell",m:"Front delts",s:"Core",t:"3010",d:3,c:"Sitting on the floor, legs straight. Nowhere to hide."},
  {id:"pikepush",n:"Pike Press Up",g:"Shoulders",p:"vertical push",eq:"bodyweight",m:"Front delts",s:"Triceps",t:"3010",d:2,c:"Hips high, crown of the head to the floor."},
  {id:"lateral",n:"DB Lateral Raise",g:"Shoulders",p:"shoulder isolation",eq:"dumbbell",m:"Side delts",s:"Traps",t:"2011",d:1,c:"Lead with the elbow, stop at shoulder height."},
  {id:"cablelateral",n:"Cable Lateral Raise",g:"Shoulders",p:"shoulder isolation",eq:"cable",m:"Side delts",s:"Traps",t:"2011",d:1,c:"Constant tension all the way down."},
  {id:"machlateral",n:"Machine Lateral Raise",g:"Shoulders",p:"shoulder isolation",eq:"machine",m:"Side delts",s:"Traps",t:"2011",d:1,c:"Pad against the outside of the arm, not the wrist."},
  {id:"leanlateral",n:"Leaning Lateral Raise",g:"Shoulders",p:"shoulder isolation",eq:"dumbbell",m:"Side delts",s:"Traps",t:"2011",d:2,c:"Hang off an upright for a longer range."},
  {id:"frontraise",n:"Front Raise",g:"Shoulders",p:"shoulder isolation",eq:"dumbbell",m:"Front delts",s:"Upper chest",t:"2011",d:1,c:"To eye level, no higher."},
  {id:"plateraise",n:"Plate Front Raise",g:"Shoulders",p:"shoulder isolation",eq:"other",m:"Front delts",s:"Core",t:"2011",d:1,c:"Hold the plate at three and nine o'clock."},
  {id:"rear",n:"Rear Delt Fly",g:"Shoulders",p:"shoulder isolation",eq:"dumbbell",m:"Rear delts",s:"Mid back",t:"2011",d:1,c:"Thumbs down, elbows soft."},
  {id:"cablerear",n:"Cable Rear Delt Fly",g:"Shoulders",p:"shoulder isolation",eq:"cable",m:"Rear delts",s:"Mid back",t:"2011",d:1,c:"Cross the cables and open wide."},
  {id:"reversepec",n:"Reverse Pec Deck",g:"Shoulders",p:"shoulder isolation",eq:"machine",m:"Rear delts",s:"Mid back",t:"2011",d:1,c:"Elbows level with the shoulders."},
  {id:"uprightrow",n:"Upright Row",g:"Shoulders",p:"vertical pull",eq:"barbell",m:"Side delts",s:"Traps, Biceps",t:"2011",d:2,c:"Wide grip, stop at the sternum."},
  {id:"ytraise",n:"Y Raise",g:"Shoulders",p:"shoulder isolation",eq:"dumbbell",m:"Lower traps",s:"Rear delts",t:"2012",d:1,c:"On an incline bench, thumbs up."},
  {id:"cubanpress",n:"Cuban Press",g:"Shoulders",p:"shoulder isolation",eq:"dumbbell",m:"Rotator cuff",s:"Side delts",t:"3010",d:2,c:"Light. This is prehab, not a press."},
  {id:"extrot",n:"External Rotation",g:"Shoulders",p:"shoulder isolation",eq:"band",m:"Rotator cuff",s:"Rear delts",t:"3011",d:1,c:"Elbow pinned to the ribs."},
  {id:"bandpullapart",n:"Band Pull Apart",g:"Shoulders",p:"shoulder isolation",eq:"band",m:"Rear delts",s:"Mid back",t:"2012",d:1,c:"Thirty a day fixes a lot of desks."},
  {id:"curl",n:"Barbell Curl",g:"Arms",p:"elbow flexion",eq:"barbell",m:"Biceps",s:"Forearms",t:"2011",d:1,c:"Elbows at the ribs. Five degrees of swing, no more."},
  {id:"ezcurl",n:"EZ Bar Curl",g:"Arms",p:"elbow flexion",eq:"barbell",m:"Biceps",s:"Forearms",t:"2011",d:1,c:"Kinder on the wrists than a straight bar."},
  {id:"dbcurl",n:"DB Curl",g:"Arms",p:"elbow flexion",eq:"dumbbell",m:"Biceps",s:"Forearms",t:"2011",d:1,c:"Supinate as you come up."},
  {id:"hammer",n:"Hammer Curl",g:"Arms",p:"elbow flexion",eq:"dumbbell",m:"Brachialis",s:"Biceps, Forearms",t:"2011",d:1,c:"Neutral grip throughout."},
  {id:"inclinecurl",n:"Incline DB Curl",g:"Arms",p:"elbow flexion",eq:"dumbbell",m:"Biceps",s:"Forearms",t:"3011",d:2,c:"Arms hang behind the body. Long stretch."},
  {id:"preacher",n:"Preacher Curl",g:"Arms",p:"elbow flexion",eq:"barbell",m:"Biceps",s:"Forearms",t:"3011",d:1,c:"Do not bounce out of the bottom."},
  {id:"cablecurl",n:"Cable Curl",g:"Arms",p:"elbow flexion",eq:"cable",m:"Biceps",s:"Forearms",t:"2011",d:1,c:"Tension does not disappear at the top."},
  {id:"concentration",n:"Concentration Curl",g:"Arms",p:"elbow flexion",eq:"dumbbell",m:"Biceps",s:"Forearms",t:"3011",d:1,c:"Elbow braced on the thigh."},
  {id:"spidercurl",n:"Spider Curl",g:"Arms",p:"elbow flexion",eq:"dumbbell",m:"Biceps",s:"Forearms",t:"3011",d:2,c:"Chest on an incline bench, arms straight down."},
  {id:"reversecurl",n:"Reverse Curl",g:"Arms",p:"elbow flexion",eq:"barbell",m:"Brachioradialis",s:"Biceps, Forearms",t:"2011",d:1,c:"Overhand. Humbling weight."},
  {id:"21s",n:"21s",g:"Arms",p:"elbow flexion",eq:"barbell",m:"Biceps",s:"Forearms",t:"2010",d:2,c:"Seven bottom half, seven top half, seven full."},
  {id:"pushdown",n:"Tricep Pushdown",g:"Arms",p:"elbow extension",eq:"cable",m:"Triceps",s:"Forearms",t:"2011",d:1,c:"Elbows pinned. Only the forearm moves."},
  {id:"ropepush",n:"Rope Pushdown",g:"Arms",p:"elbow extension",eq:"cable",m:"Triceps",s:"Forearms",t:"2012",d:1,c:"Split the rope at the bottom."},
  {id:"ohtri",n:"Overhead Triceps Extension",g:"Arms",p:"elbow extension",eq:"dumbbell",m:"Triceps",s:"Shoulders",t:"3011",d:1,c:"Elbows point forward, not out."},
  {id:"ropeoh",n:"Overhead Rope Extension",g:"Arms",p:"elbow extension",eq:"cable",m:"Triceps",s:"Shoulders",t:"3011",d:1,c:"Step away from the stack for a longer stretch."},
  {id:"skull",n:"Skull Crusher",g:"Arms",p:"elbow extension",eq:"barbell",m:"Triceps",s:"Forearms",t:"3010",d:2,c:"To the forehead or just behind it."},
  {id:"dip",n:"Tricep Dip",g:"Arms",p:"elbow extension",eq:"bodyweight",m:"Triceps",s:"Chest, Front delts",t:"3010",d:2,c:"Upright torso to bias the triceps."},
  {id:"benchdip",n:"Bench Dip",g:"Arms",p:"elbow extension",eq:"bodyweight",m:"Triceps",s:"Front delts",t:"3010",d:1,c:"Feet closer in if the shoulders complain."},
  {id:"kickback",n:"Tricep Kickback",g:"Arms",p:"elbow extension",eq:"dumbbell",m:"Triceps",s:"Rear delts",t:"2012",d:1,c:"Squeeze at the top, light weight."},
  {id:"jmpress",n:"JM Press",g:"Arms",p:"elbow extension",eq:"barbell",m:"Triceps",s:"Chest",t:"3010",d:3,c:"Half a skull crusher, half a close grip press."},
  {id:"wristcurl",n:"Wrist Curl",g:"Arms",p:"grip",eq:"dumbbell",m:"Forearms",s:"Grip",t:"2012",d:1,c:"Forearms on the thighs, small range."},
  {id:"revwrist",n:"Reverse Wrist Curl",g:"Arms",p:"grip",eq:"dumbbell",m:"Forearm extensors",s:"Grip",t:"2012",d:1,c:"Good for elbow pain from gripping."},
  {id:"deadhang",n:"Dead Hang",g:"Arms",p:"grip",eq:"bodyweight",m:"Grip",s:"Lats, Shoulders",t:"hold",d:1,c:"Just hang. Thirty seconds is plenty."},
  {id:"plateping",n:"Plate Pinch",g:"Arms",p:"grip",eq:"other",m:"Grip",s:"Forearms",t:"hold",d:1,c:"Two plates, smooth sides out."},
  {id:"squat",n:"Back Squat",g:"Legs",p:"squat",eq:"barbell",m:"Quads, Glutes",s:"Erectors, Adductors",t:"3010",d:3,c:"Knees track over the toes. Depth before weight."},
  {id:"frontsquat",n:"Front Squat",g:"Legs",p:"squat",eq:"barbell",m:"Quads",s:"Glutes, Core",t:"3010",d:3,c:"Elbows high. The bar sits on the shoulders, not the hands."},
  {id:"boxsquat",n:"Box Squat",g:"Legs",p:"squat",eq:"barbell",m:"Glutes, Quads",s:"Erectors",t:"3110",d:2,c:"Sit back, pause, drive up. Teaches depth."},
  {id:"pausesquat",n:"Pause Squat",g:"Legs",p:"squat",eq:"barbell",m:"Quads",s:"Glutes",t:"3310",d:3,c:"Three seconds at the bottom. Leave your ego outside."},
  {id:"goblet",n:"Goblet Squat",g:"Legs",p:"squat",eq:"dumbbell",m:"Quads, Glutes",s:"Core",t:"3110",d:1,c:"Chest up, elbows inside the knees."},
  {id:"hack",n:"Hack Squat",g:"Legs",p:"squat",eq:"machine",m:"Quads",s:"Glutes",t:"3010",d:2,c:"Feet low on the platform for more quad."},
  {id:"legpress",n:"Leg Press",g:"Legs",p:"squat",eq:"machine",m:"Quads, Glutes",s:"Hamstrings",t:"3010",d:1,c:"Do not let the lower back round at the bottom."},
  {id:"smithsquat",n:"Smith Machine Squat",g:"Legs",p:"squat",eq:"machine",m:"Quads",s:"Glutes",t:"3010",d:1,c:"Feet slightly forward of the bar."},
  {id:"bwsquat",n:"Bodyweight Squat",g:"Legs",p:"squat",eq:"bodyweight",m:"Quads, Glutes",s:"Core",t:"2010",d:1,c:"Where everything starts."},
  {id:"jumpsquat",n:"Jump Squat",g:"Legs",p:"squat",eq:"bodyweight",m:"Quads, Glutes",s:"Calves",t:"10X0",d:2,c:"Land quietly. Quality over quantity."},
  {id:"sissy",n:"Sissy Squat",g:"Legs",p:"knee isolation",eq:"bodyweight",m:"Quads",s:"Core",t:"3010",d:3,c:"Knees travel forward, hips stay extended."},
  {id:"rdl",n:"Romanian Deadlift",g:"Legs",p:"hinge",eq:"barbell",m:"Hamstrings",s:"Glutes, Erectors",t:"3110",d:2,c:"Push the hips back. Stop before the back rounds."},
  {id:"dbrdl",n:"DB Romanian Deadlift",g:"Legs",p:"hinge",eq:"dumbbell",m:"Hamstrings",s:"Glutes",t:"3110",d:1,c:"Weights travel down the front of the legs."},
  {id:"slrdl",n:"Single Leg RDL",g:"Legs",p:"hinge",eq:"dumbbell",m:"Hamstrings",s:"Glutes, Core",t:"3110",d:3,c:"Hips square. Balance is part of the exercise."},
  {id:"stifleg",n:"Stiff Leg Deadlift",g:"Legs",p:"hinge",eq:"barbell",m:"Hamstrings",s:"Erectors, Glutes",t:"3110",d:3,c:"Softer knees than it sounds."},
  {id:"hipthrust",n:"Hip Thrust",g:"Legs",p:"hinge",eq:"barbell",m:"Glutes",s:"Hamstrings",t:"2012",d:2,c:"Ribs down, chin tucked, squeeze at the top."},
  {id:"gluteBridge",n:"Glute Bridge",g:"Legs",p:"hinge",eq:"bodyweight",m:"Glutes",s:"Hamstrings",t:"2012",d:1,c:"Press through the heels."},
  {id:"singleglute",n:"Single Leg Glute Bridge",g:"Legs",p:"hinge",eq:"bodyweight",m:"Glutes",s:"Hamstrings, Core",t:"2012",d:2,c:"Keep the hips level."},
  {id:"kbswing",n:"Kettlebell Swing",g:"Legs",p:"hinge",eq:"kettlebell",m:"Glutes, Hamstrings",s:"Core, Shoulders",t:"10X0",d:2,c:"A hinge, not a squat. The arms are rope."},
  {id:"bss",n:"Bulgarian Split Squat",g:"Legs",p:"lunge",eq:"dumbbell",m:"Quads, Glutes",s:"Adductors",t:"3110",d:3,c:"Do not rush these. Back foot on a bench."},
  {id:"lunge",n:"Walking Lunge",g:"Legs",p:"lunge",eq:"dumbbell",m:"Quads, Glutes",s:"Hamstrings",t:"2010",d:2,c:"Long steps for glutes, short for quads."},
  {id:"revlunge",n:"Reverse Lunge",g:"Legs",p:"lunge",eq:"dumbbell",m:"Glutes, Quads",s:"Hamstrings",t:"2010",d:1,c:"Kinder on the knees than stepping forward."},
  {id:"staticlunge",n:"Static Lunge",g:"Legs",p:"lunge",eq:"dumbbell",m:"Quads, Glutes",s:"Hamstrings",t:"3010",d:1,c:"Feet stay put, straight up and down."},
  {id:"curtsy",n:"Curtsy Lunge",g:"Legs",p:"lunge",eq:"dumbbell",m:"Glutes",s:"Adductors, Quads",t:"2010",d:2,c:"Step behind and across."},
  {id:"stepup",n:"Step Up",g:"Legs",p:"lunge",eq:"dumbbell",m:"Quads, Glutes",s:"Hamstrings",t:"2010",d:1,c:"Drive through the top foot. Do not push off the bottom."},
  {id:"splitsquat",n:"Split Squat",g:"Legs",p:"lunge",eq:"dumbbell",m:"Quads, Glutes",s:"Adductors",t:"3010",d:2,c:"Both feet on the floor, no bench needed."},
  {id:"pistol",n:"Pistol Squat",g:"Legs",p:"lunge",eq:"bodyweight",m:"Quads, Glutes",s:"Core",t:"3010",d:3,c:"Hold a counterweight to learn it."},
  {id:"legext",n:"Leg Extension",g:"Legs",p:"knee isolation",eq:"machine",m:"Quads",s:"-",t:"2011",d:1,c:"Pause at the top, do not swing."},
  {id:"hamcurl",n:"Lying Hamstring Curl",g:"Legs",p:"knee isolation",eq:"machine",m:"Hamstrings",s:"Calves",t:"2011",d:1,c:"Hips stay down on the pad."},
  {id:"seatedham",n:"Seated Hamstring Curl",g:"Legs",p:"knee isolation",eq:"machine",m:"Hamstrings",s:"Calves",t:"2011",d:1,c:"Often better loaded than the lying version."},
  {id:"nordic",n:"Nordic Curl",g:"Legs",p:"knee isolation",eq:"bodyweight",m:"Hamstrings",s:"Glutes",t:"5010",d:3,c:"Lower as slowly as you can. Brutal."},
  {id:"goodgirl",n:"Hip Abduction",g:"Legs",p:"hip isolation",eq:"machine",m:"Glute medius",s:"Glutes",t:"2012",d:1,c:"Lean forward slightly for more glute."},
  {id:"adduction",n:"Hip Adduction",g:"Legs",p:"hip isolation",eq:"machine",m:"Adductors",s:"-",t:"2012",d:1,c:"Slow out of the stretch."},
  {id:"cablekick",n:"Cable Kickback",g:"Legs",p:"hip isolation",eq:"cable",m:"Glutes",s:"Hamstrings",t:"2012",d:1,c:"Hips square, small range, big squeeze."},
  {id:"clamshell",n:"Clamshell",g:"Legs",p:"hip isolation",eq:"band",m:"Glute medius",s:"Glutes",t:"2012",d:1,c:"Band above the knees, hips stacked."},
  {id:"monster",n:"Monster Walk",g:"Legs",p:"hip isolation",eq:"band",m:"Glute medius",s:"Quads",t:"2010",d:1,c:"Small steps, knees pushed out."},
  {id:"calf",n:"Standing Calf Raise",g:"Legs",p:"calf",eq:"machine",m:"Calves",s:"-",t:"2111",d:1,c:"Pause in the stretch at the bottom."},
  {id:"seatedcalf",n:"Seated Calf Raise",g:"Legs",p:"calf",eq:"machine",m:"Soleus",s:"Calves",t:"2111",d:1,c:"Bent knee bias. Slow."},
  {id:"legpresscalf",n:"Leg Press Calf Raise",g:"Legs",p:"calf",eq:"machine",m:"Calves",s:"-",t:"2111",d:1,c:"Full range, toes only on the platform."},
  {id:"sled",n:"Sled Push",g:"Legs",p:"carry",eq:"other",m:"Quads, Glutes",s:"Calves, Core",t:"hold",d:2,c:"Low body angle, short quick steps."},
  {id:"sledpull",n:"Sled Pull",g:"Legs",p:"carry",eq:"other",m:"Hamstrings, Glutes",s:"Back, Grip",t:"hold",d:2,c:"Lean back against the load."},
  {id:"wallsit",n:"Wall Sit",g:"Legs",p:"squat",eq:"bodyweight",m:"Quads",s:"Glutes",t:"hold",d:1,c:"Thighs parallel. Count in breaths, not seconds."},
  {id:"plank",n:"Plank",g:"Core",p:"anti-extension",eq:"bodyweight",m:"Abdominals",s:"Shoulders, Glutes",t:"hold",d:1,c:"Ribs down, glutes on. Quality beats minutes."},
  {id:"sidplank",n:"Side Plank",g:"Core",p:"anti-rotation",eq:"bodyweight",m:"Obliques",s:"Glute medius",t:"hold",d:1,c:"Stack the shoulders and hips."},
  {id:"deadbug",n:"Dead Bug",g:"Core",p:"anti-extension",eq:"bodyweight",m:"Abdominals",s:"Hip flexors",t:"3030",d:1,c:"Lower back stays flat to the floor."},
  {id:"birddog",n:"Bird Dog",g:"Core",p:"anti-rotation",eq:"bodyweight",m:"Erectors",s:"Glutes, Abdominals",t:"3030",d:1,c:"Move slowly enough that nothing wobbles."},
  {id:"paloff",n:"Pallof Press",g:"Core",p:"anti-rotation",eq:"cable",m:"Obliques",s:"Abdominals",t:"2121",d:1,c:"Resist the twist. That is the whole exercise."},
  {id:"crunch",n:"Crunch",g:"Core",p:"trunk flexion",eq:"bodyweight",m:"Abdominals",s:"Hip flexors",t:"2111",d:1,c:"Short range, no pulling on the neck."},
  {id:"cablecrunch",n:"Cable Crunch",g:"Core",p:"trunk flexion",eq:"cable",m:"Abdominals",s:"Obliques",t:"2111",d:1,c:"Round the spine down, hips stay put."},
  {id:"hanging",n:"Hanging Knee Raise",g:"Core",p:"trunk flexion",eq:"bodyweight",m:"Abdominals",s:"Hip flexors",t:"2111",d:2,c:"Curl the pelvis, do not just swing the legs."},
  {id:"legraise",n:"Lying Leg Raise",g:"Core",p:"trunk flexion",eq:"bodyweight",m:"Abdominals",s:"Hip flexors",t:"2111",d:1,c:"Hands under the hips if the back arches."},
  {id:"toestobar",n:"Toes to Bar",g:"Core",p:"trunk flexion",eq:"bodyweight",m:"Abdominals",s:"Lats, Grip",t:"2010",d:3,c:"Strict before kipping."},
  {id:"vup",n:"V Up",g:"Core",p:"trunk flexion",eq:"bodyweight",m:"Abdominals",s:"Hip flexors",t:"2010",d:2,c:"Reach for the toes, land softly."},
  {id:"russian",n:"Russian Twist",g:"Core",p:"anti-rotation",eq:"other",m:"Obliques",s:"Abdominals",t:"2010",d:1,c:"Rotate from the ribs, not the arms."},
  {id:"woodchop",n:"Cable Woodchop",g:"Core",p:"anti-rotation",eq:"cable",m:"Obliques",s:"Abdominals",t:"2011",d:1,c:"Pivot the back foot."},
  {id:"abwheel",n:"Ab Wheel Rollout",g:"Core",p:"anti-extension",eq:"other",m:"Abdominals",s:"Lats",t:"3010",d:3,c:"Go only as far as you can keep the ribs down."},
  {id:"hollow",n:"Hollow Hold",g:"Core",p:"anti-extension",eq:"bodyweight",m:"Abdominals",s:"Hip flexors",t:"hold",d:2,c:"Lower back glued to the floor."},
  {id:"mountain",n:"Mountain Climber",g:"Core",p:"trunk flexion",eq:"bodyweight",m:"Abdominals",s:"Shoulders, Quads",t:"2010",d:1,c:"Hips stay low and still."},
  {id:"bearcrawl",n:"Bear Crawl",g:"Core",p:"carry",eq:"bodyweight",m:"Abdominals",s:"Shoulders, Quads",t:"hold",d:2,c:"Knees an inch off the floor."},
  {id:"copenhagen",n:"Copenhagen Plank",g:"Core",p:"anti-rotation",eq:"bodyweight",m:"Adductors",s:"Obliques",t:"hold",d:3,c:"Start with the bottom knee down."},
  {id:"burpee",n:"Burpee",g:"Conditioning",p:"full body",eq:"bodyweight",m:"Full body",s:"Quads, Chest",t:"2010",d:2,c:"Step back instead of jumping if the back is grumpy."},
  {id:"thruster",n:"Thruster",g:"Conditioning",p:"full body",eq:"dumbbell",m:"Quads, Shoulders",s:"Core",t:"2010",d:3,c:"Squat and press as one movement."},
  {id:"clean",n:"Power Clean",g:"Conditioning",p:"full body",eq:"barbell",m:"Full body",s:"Traps, Quads",t:"10X0",d:3,c:"Technique first. Load much later."},
  {id:"snatch",n:"DB Snatch",g:"Conditioning",p:"full body",eq:"dumbbell",m:"Full body",s:"Shoulders, Glutes",t:"10X0",d:3,c:"One pull from the floor to overhead."},
  {id:"wallball",n:"Wall Ball",g:"Conditioning",p:"full body",eq:"other",m:"Quads, Shoulders",s:"Core",t:"2010",d:2,c:"Squat to the target, breathe at the top."},
  {id:"boxjump",n:"Box Jump",g:"Conditioning",p:"full body",eq:"other",m:"Quads, Glutes",s:"Calves",t:"10X0",d:2,c:"Step down. Every time."},
  {id:"battle",n:"Battle Ropes",g:"Conditioning",p:"full body",eq:"other",m:"Shoulders",s:"Core, Grip",t:"hold",d:1,c:"Thirty seconds on, thirty off."},
  {id:"rowerg",n:"Row Erg",g:"Conditioning",p:"cardio",eq:"machine",m:"Full body",s:"Legs, Back",t:"hold",d:1,c:"Legs, then back, then arms. Reverse on the way in."},
  {id:"skierg",n:"Ski Erg",g:"Conditioning",p:"cardio",eq:"machine",m:"Lats, Core",s:"Triceps",t:"hold",d:1,c:"Hinge at the hips, do not just pull with the arms."},
  {id:"assault",n:"Assault Bike",g:"Conditioning",p:"cardio",eq:"machine",m:"Full body",s:"Quads, Shoulders",t:"hold",d:2,c:"Brutally honest about your fitness."},
  {id:"treadmill",n:"Treadmill Run",g:"Conditioning",p:"cardio",eq:"machine",m:"Legs",s:"Full body",t:"hold",d:1,c:"One percent incline to match outdoors."},
  {id:"skip",n:"Skipping",g:"Conditioning",p:"cardio",eq:"other",m:"Calves",s:"Shoulders",t:"hold",d:1,c:"Small jumps, wrists do the work."},
  {id:"stair",n:"Stair Climber",g:"Conditioning",p:"cardio",eq:"machine",m:"Glutes, Quads",s:"Calves",t:"hold",d:1,c:"Do not lean on the handles."},
  {id:"bike",n:"Stationary Bike",g:"Conditioning",p:"cardio",eq:"machine",m:"Quads",s:"Glutes, Calves",t:"hold",d:1,c:"Saddle height so the knee is almost straight at the bottom."},
  {id:"sprint",n:"Sprints",g:"Conditioning",p:"cardio",eq:"bodyweight",m:"Hamstrings, Glutes",s:"Quads, Calves",t:"10X0",d:3,c:"Warm up properly first. Really."},
  {id:"catcow",n:"Cat Cow",g:"Mobility",p:"mobility",eq:"bodyweight",m:"Spine",s:"Core",t:"3030",d:1,c:"Slow, no forcing it."},
  {id:"hipflex",n:"Hip Flexor Stretch",g:"Mobility",p:"mobility",eq:"bodyweight",m:"Hip flexors",s:"Quads",t:"hold",d:1,c:"Squeeze the back glute to feel it properly."},
  {id:"90_90",n:"90/90 Hip Switch",g:"Mobility",p:"mobility",eq:"bodyweight",m:"Hips",s:"Glutes",t:"3030",d:1,c:"Chest tall, move slowly between sides."},
  {id:"worlds",n:"World's Greatest Stretch",g:"Mobility",p:"mobility",eq:"bodyweight",m:"Hips, Thoracic",s:"Hamstrings",t:"hold",d:1,c:"Worth the name. Two minutes a side."},
  {id:"thoracic",n:"Thoracic Rotation",g:"Mobility",p:"mobility",eq:"bodyweight",m:"Thoracic spine",s:"Shoulders",t:"3030",d:1,c:"Rotate from the ribs, hips stay still."},
  {id:"couch",n:"Couch Stretch",g:"Mobility",p:"mobility",eq:"bodyweight",m:"Quads, Hip flexors",s:"-",t:"hold",d:2,c:"Two minutes a side. Breathe."},
  {id:"pigeon",n:"Pigeon Pose",g:"Mobility",p:"mobility",eq:"bodyweight",m:"Glutes",s:"Hips",t:"hold",d:2,c:"Back to it if the knee complains."},
  {id:"hamstretch",n:"Hamstring Stretch",g:"Mobility",p:"mobility",eq:"bodyweight",m:"Hamstrings",s:"Calves",t:"hold",d:1,c:"Hinge from the hip, not the spine."},
  {id:"calfstretch",n:"Calf Stretch",g:"Mobility",p:"mobility",eq:"bodyweight",m:"Calves",s:"Achilles",t:"hold",d:1,c:"Back heel down, knee straight then bent."},
  {id:"shoulderdis",n:"Shoulder Dislocates",g:"Mobility",p:"mobility",eq:"band",m:"Shoulders",s:"Chest",t:"3030",d:1,c:"Wide grip. Narrow it over weeks, not days."},
  {id:"childs",n:"Child's Pose",g:"Mobility",p:"mobility",eq:"bodyweight",m:"Lats, Spine",s:"Hips",t:"hold",d:1,c:"Where to start and finish."},
  {id:"foamroll",n:"Foam Roll Quads and Glutes",g:"Mobility",p:"mobility",eq:"other",m:"Quads, Glutes",s:"IT band",t:"hold",d:1,c:"Slow. Pause where it is tender."},
  {id:"foamback",n:"Foam Roll Upper Back",g:"Mobility",p:"mobility",eq:"other",m:"Thoracic spine",s:"Lats",t:"hold",d:1,c:"Support the head with the hands."},
  {id:"ankle",n:"Ankle Mobilisation",g:"Mobility",p:"mobility",eq:"bodyweight",m:"Ankles",s:"Calves",t:"3030",d:1,c:"Knee over the toe, heel down."},
  {id:"glutestretch",n:"Figure Four Stretch",g:"Mobility",p:"mobility",eq:"bodyweight",m:"Glutes",s:"Hips",t:"hold",d:1,c:"Lying or seated, both work."}
,
  {id:"dbsqueeze",n:"DB Squeeze Press",g:"Chest",p:"horizontal push",eq:"dumbbell",m:"Pectorals",s:"Triceps",t:"3012",d:1,c:"Press the weights together the whole set."},
  {id:"guillotine",n:"Guillotine Press",g:"Chest",p:"horizontal push",eq:"barbell",m:"Upper pectorals",s:"Front delts",t:"3010",d:3,c:"Bar to the neck line. Light, spotter, care."},
  {id:"banded_pushup",n:"Banded Press Up",g:"Chest",p:"horizontal push",eq:"band",m:"Pectorals",s:"Triceps",t:"3010",d:2,c:"Band across the back for tension at the top."},
  {id:"cable_press",n:"Standing Cable Press",g:"Chest",p:"horizontal push",eq:"cable",m:"Pectorals",s:"Core, Triceps",t:"3011",d:1,c:"Split stance, ribs down."},
  {id:"machfly",n:"Machine Fly",g:"Chest",p:"chest isolation",eq:"machine",m:"Pectorals",s:"Front delts",t:"2011",d:1,c:"Fixed path, good for a last set to failure."},
  {id:"meadows",n:"Meadows Row",g:"Back",p:"horizontal pull",eq:"barbell",m:"Lats",s:"Mid back, Biceps",t:"2011",d:2,c:"Landmine, staggered stance, one arm."},
  {id:"gorilla",n:"Gorilla Row",g:"Back",p:"horizontal pull",eq:"kettlebell",m:"Lats",s:"Mid back",t:"2011",d:2,c:"Alternate arms, other hand on the bell."},
  {id:"kbrow",n:"Kettlebell Row",g:"Back",p:"horizontal pull",eq:"kettlebell",m:"Lats",s:"Biceps",t:"2011",d:1,c:"Hinge and hold the position."},
  {id:"machpulldown",n:"Machine Pulldown",g:"Back",p:"vertical pull",eq:"machine",m:"Lats",s:"Biceps",t:"3011",d:1,c:"Chest pad takes the swing out."},
  {id:"bandrow",n:"Band Row",g:"Back",p:"horizontal pull",eq:"band",m:"Mid back",s:"Lats, Biceps",t:"2011",d:1,c:"Anchor at waist height."},
  {id:"bandpulldown",n:"Band Pulldown",g:"Back",p:"vertical pull",eq:"band",m:"Lats",s:"Biceps",t:"3011",d:1,c:"Anchor overhead, kneel underneath."},
  {id:"renegade",n:"Renegade Row",g:"Back",p:"horizontal pull",eq:"dumbbell",m:"Lats",s:"Core, Shoulders",t:"2011",d:3,c:"Hips do not rotate. Widen the feet."},
  {id:"highpull",n:"High Pull",g:"Back",p:"vertical pull",eq:"barbell",m:"Traps",s:"Rear delts, Biceps",t:"10X0",d:3,c:"Explosive. Elbows lead."},
  {id:"hexshrug",n:"Trap Bar Shrug",g:"Back",p:"shoulder isolation",eq:"barbell",m:"Traps",s:"Grip",t:"2012",d:1,c:"Neutral grip, heavy, simple."},
  {id:"prone_y",n:"Prone Y Raise",g:"Back",p:"shoulder isolation",eq:"bodyweight",m:"Lower traps",s:"Rear delts",t:"2012",d:1,c:"Face down, thumbs up, tiny weight."},
  {id:"seated_ohp",n:"Seated Barbell Press",g:"Shoulders",p:"vertical push",eq:"barbell",m:"Front delts",s:"Triceps",t:"3010",d:2,c:"Back supported, no leg drive available."},
  {id:"behindneck",n:"Behind the Neck Press",g:"Shoulders",p:"vertical push",eq:"barbell",m:"Side delts",s:"Triceps",t:"3010",d:3,c:"Only with the shoulder mobility to earn it."},
  {id:"kbpress",n:"Kettlebell Press",g:"Shoulders",p:"vertical push",eq:"kettlebell",m:"Front delts",s:"Core, Triceps",t:"3010",d:2,c:"The bell rests on the forearm."},
  {id:"bottomsup",n:"Bottoms Up Press",g:"Shoulders",p:"vertical push",eq:"kettlebell",m:"Front delts",s:"Grip, Rotator cuff",t:"3010",d:3,c:"Grip and shoulder stability in one."},
  {id:"machrear",n:"Machine Rear Delt",g:"Shoulders",p:"shoulder isolation",eq:"machine",m:"Rear delts",s:"Mid back",t:"2011",d:1,c:"Fixed path, easy to overload."},
  {id:"bandlateral",n:"Band Lateral Raise",g:"Shoulders",p:"shoulder isolation",eq:"band",m:"Side delts",s:"Traps",t:"2011",d:1,c:"Hardest at the top, where it should be."},
  {id:"landmine_lat",n:"Landmine Lateral Raise",g:"Shoulders",p:"shoulder isolation",eq:"barbell",m:"Side delts",s:"Traps",t:"2011",d:2,c:"One arm, long lever."},
  {id:"bayesian",n:"Bayesian Curl",g:"Arms",p:"elbow flexion",eq:"cable",m:"Biceps",s:"Forearms",t:"3011",d:2,c:"Facing away from the stack, arms behind you."},
  {id:"drag",n:"Drag Curl",g:"Arms",p:"elbow flexion",eq:"barbell",m:"Biceps",s:"Forearms",t:"2011",d:2,c:"Bar drags up the body, elbows go back."},
  {id:"zottman",n:"Zottman Curl",g:"Arms",p:"elbow flexion",eq:"dumbbell",m:"Biceps",s:"Forearms, Brachialis",t:"3011",d:2,c:"Up supinated, down pronated."},
  {id:"bandcurl",n:"Band Curl",g:"Arms",p:"elbow flexion",eq:"band",m:"Biceps",s:"Forearms",t:"2011",d:1,c:"Travel friendly."},
  {id:"machcurl",n:"Machine Curl",g:"Arms",p:"elbow flexion",eq:"machine",m:"Biceps",s:"Forearms",t:"2011",d:1,c:"Pad set so the elbows sit under the shoulders."},
  {id:"machtri",n:"Machine Triceps Extension",g:"Arms",p:"elbow extension",eq:"machine",m:"Triceps",s:"-",t:"2011",d:1,c:"Fixed path, good for high reps."},
  {id:"bandpushdown",n:"Band Pushdown",g:"Arms",p:"elbow extension",eq:"band",m:"Triceps",s:"Forearms",t:"2012",d:1,c:"Anchor high, elbows pinned."},
  {id:"cgpushup",n:"Close Grip Press Up",g:"Arms",p:"elbow extension",eq:"bodyweight",m:"Triceps",s:"Chest",t:"3010",d:2,c:"Hands under the shoulders, elbows back."},
  {id:"hexpress",n:"Hex Press",g:"Arms",p:"elbow extension",eq:"dumbbell",m:"Triceps",s:"Pectorals",t:"3012",d:1,c:"Weights pressed together throughout."},
  {id:"farmerkb",n:"Kettlebell Farmer Walk",g:"Arms",p:"carry",eq:"kettlebell",m:"Grip",s:"Traps, Core",t:"hold",d:1,c:"Heavy, short, tall."},
  {id:"frontrack",n:"Front Rack Carry",g:"Arms",p:"carry",eq:"kettlebell",m:"Core",s:"Shoulders, Grip",t:"hold",d:2,c:"Ribs down. Harder than it looks."},
  {id:"overheadcarry",n:"Overhead Carry",g:"Arms",p:"carry",eq:"dumbbell",m:"Shoulders",s:"Core, Grip",t:"hold",d:3,c:"Arm locked, ribs down, walk slowly."},
  {id:"zercher",n:"Zercher Squat",g:"Legs",p:"squat",eq:"barbell",m:"Quads, Glutes",s:"Core, Biceps",t:"3010",d:3,c:"Bar in the elbow crease. Uncomfortable and effective."},
  {id:"bulgarianbb",n:"Barbell Split Squat",g:"Legs",p:"lunge",eq:"barbell",m:"Quads, Glutes",s:"Adductors",t:"3010",d:3,c:"Heavier than the dumbbell version, harder to balance."},
  {id:"belt",n:"Belt Squat",g:"Legs",p:"squat",eq:"machine",m:"Quads, Glutes",s:"-",t:"3010",d:1,c:"No spinal load. Good on a tired back."},
  {id:"vsquat",n:"V Squat",g:"Legs",p:"squat",eq:"machine",m:"Quads",s:"Glutes",t:"3010",d:1,c:"Between a hack squat and a leg press."},
  {id:"landmine_squat",n:"Landmine Squat",g:"Legs",p:"squat",eq:"barbell",m:"Quads, Glutes",s:"Core",t:"3010",d:1,c:"Counterbalanced, easy to learn."},
  {id:"kbgoblet",n:"Kettlebell Goblet Squat",g:"Legs",p:"squat",eq:"kettlebell",m:"Quads, Glutes",s:"Core",t:"3110",d:1,c:"Bell by the horns at the chest."},
  {id:"kbdeadlift",n:"Kettlebell Deadlift",g:"Legs",p:"hinge",eq:"kettlebell",m:"Glutes, Hamstrings",s:"Erectors",t:"3010",d:1,c:"Where to learn the hinge."},
  {id:"singleleg_press",n:"Single Leg Press",g:"Legs",p:"squat",eq:"machine",m:"Quads, Glutes",s:"Hamstrings",t:"3010",d:2,c:"Evens out a side to side difference."},
  {id:"frog",n:"Frog Pump",g:"Legs",p:"hinge",eq:"bodyweight",m:"Glutes",s:"Hamstrings",t:"2012",d:1,c:"Soles together, knees out, high reps."},
  {id:"bandhipthrust",n:"Band Hip Thrust",g:"Legs",p:"hinge",eq:"band",m:"Glutes",s:"Hamstrings",t:"2012",d:1,c:"Band above the knees to add abduction."},
  {id:"reverse_hyper",n:"Reverse Hyperextension",g:"Legs",p:"hinge",eq:"machine",m:"Glutes, Hamstrings",s:"Erectors",t:"2012",d:2,c:"Kind on the back when done light."},
  {id:"cossack",n:"Cossack Squat",g:"Legs",p:"lunge",eq:"bodyweight",m:"Adductors, Quads",s:"Glutes",t:"3010",d:2,c:"Sit into one side, other leg straight."},
  {id:"tibialis",n:"Tibialis Raise",g:"Legs",p:"calf",eq:"bodyweight",m:"Tibialis",s:"Shins",t:"2012",d:1,c:"Shins against a wall. Good for runners."},
  {id:"hipcircle",n:"Banded Side Step",g:"Legs",p:"hip isolation",eq:"band",m:"Glute medius",s:"Quads",t:"2010",d:1,c:"Stay low, small steps."},
  {id:"hanging_oblique",n:"Hanging Oblique Raise",g:"Core",p:"trunk flexion",eq:"bodyweight",m:"Obliques",s:"Abdominals",t:"2111",d:3,c:"Knees to one hip, then the other."},
  {id:"suitcase_hold",n:"Suitcase Hold",g:"Core",p:"anti-rotation",eq:"dumbbell",m:"Obliques",s:"Grip",t:"hold",d:1,c:"Stand still and resist the lean."},
  {id:"turkish",n:"Turkish Get Up",g:"Core",p:"full body",eq:"kettlebell",m:"Core",s:"Shoulders, Glutes",t:"hold",d:3,c:"Five minutes a side, no rush. A whole workout in one move."},
  {id:"deadbug_band",n:"Banded Dead Bug",g:"Core",p:"anti-extension",eq:"band",m:"Abdominals",s:"Hip flexors",t:"3030",d:2,c:"Band gives the arms something to fight."},
  {id:"plankreach",n:"Plank Shoulder Tap",g:"Core",p:"anti-rotation",eq:"bodyweight",m:"Abdominals",s:"Shoulders",t:"2010",d:2,c:"Hips do not move."},
  {id:"sprintbike",n:"Bike Intervals",g:"Conditioning",p:"cardio",eq:"machine",m:"Quads",s:"Full body",t:"hold",d:2,c:"Thirty hard, ninety easy."},
  {id:"shuttle",n:"Shuttle Runs",g:"Conditioning",p:"cardio",eq:"bodyweight",m:"Legs",s:"Full body",t:"10X0",d:2,c:"Turn on the same foot each time."},
  {id:"stepups_cond",n:"Weighted Step Up Intervals",g:"Conditioning",p:"full body",eq:"dumbbell",m:"Quads, Glutes",s:"Calves",t:"2010",d:2,c:"A stair climber you can load."},
  {id:"kbcomplex",n:"Kettlebell Complex",g:"Conditioning",p:"full body",eq:"kettlebell",m:"Full body",s:"Core",t:"2010",d:3,c:"Swing, clean, press, squat. No rest between."},
  {id:"dbcomplex",n:"Dumbbell Complex",g:"Conditioning",p:"full body",eq:"dumbbell",m:"Full body",s:"Core",t:"2010",d:3,c:"Pick one weight and do not put it down."},
  {id:"jumprope_dbl",n:"Double Unders",g:"Conditioning",p:"cardio",eq:"other",m:"Calves",s:"Shoulders",t:"10X0",d:3,c:"Relax the arms. Rope speed, not jump height."}
];
const TEMPO_FALLBACK={Chest:'3010',Shoulders:'2011',Arms:'2011',Back:'2011',Legs:'3010',Core:'2111',Mobility:'3030'};
function tempoOf(exId){
  const x=LIBRARY.find(e=>e.id===exId);
  return (x&&x.t) || TEMPO_FALLBACK[(x&&x.g)||'Legs'] || '2011';
}
const EQUIP={barbell:'Barbell',dumbbell:'Dumbbell',kettlebell:'Kettlebell',cable:'Cable',
  machine:'Machine',bodyweight:'Bodyweight',band:'Band',other:'Other'};
const DIFF={1:'Straightforward',2:'Some practice needed',3:'Technical'};
function exBlurb(x){ return x? [x.m, EQUIP[x.eq]||x.eq].filter(Boolean).join(' · ') : ''; }
/* Tempo is shown, but the explanation only appears where a pause is actually
   doing something. On a lateral raise 2011 means little more than "do not swing
   it", and a line of prose under every row is noise. */
const showTempo=()=>!(S.profile&&S.profile.showTempo===false);
function tempoMatters(t){
  if(!t) return false;
  if(t==='hold') return true;
  const d=String(t).split('').map(Number);
  /* A pause at the bottom, or an unusually long lowering, is a coaching point.
     A one second squeeze at the top is just "do not swing it", and does not
     need a sentence under every row. */
  return d.length===4 && (d[1]>0 || d[0]>=4);
}
function tempoWords(t){
  if(!t) return '';
  if(t==='hold') return 'Hold the position. No reps to count, just time.';
  const d=String(t).split('').map(n=>n==='X'?0:+n);
  if(d.length!==4||d.some(isNaN)) return '';
  const bits=[`${d[0]} second${d[0]===1?'':'s'} lowering`];
  if(d[1]) bits.push(`${d[1]} second${d[1]===1?'':'s'} paused at the bottom`);
  bits.push(d[2]<=1? 'lift with intent' : `${d[2]} seconds lifting`);
  if(d[3]) bits.push(`${d[3]} second${d[3]===1?'':'s'} squeezed at the top`);
  return bits.join(', ')+'.';
}
/* something else that trains the same thing, for when one movement hurts */
function similarTo(exId,n){
  const x=LIBRARY.find(e=>e.id===exId); if(!x) return [];
  const excluded=(S.profile&&S.profile.excluded)||[];
  const pool=LIBRARY.filter(e=>e.id!==exId&&!excluded.includes(e.id));
  /* same movement pattern first, and within that the same muscle and kit you
     already have to hand, since a substitute you cannot equip is no use */
  const score=e=>(e.p===x.p?100:0)+(e.m===x.m?30:0)+(e.g===x.g?20:0)+(e.eq===x.eq?15:0)
    -Math.abs((e.d||1)-(x.d||1))*5;
  return pool.map(e=>({e,v:score(e)})).filter(o=>o.v>0).sort((a,b)=>b.v-a.v).map(o=>o.e).slice(0,n||3);
}
const exOf=id=>LIBRARY.find(x=>x.id===id)||{id,n:id,g:'Other'};
/* The nearest thing that trains the same pattern with the kit that is actually
   in the room. Pattern first, because that is what makes a substitute honest;
   then the same muscle, the same body part, and a similar difficulty. */
function fitToKit(exId){
  const x=exOf(exId);
  if(!x.p||hasKit(x.eq)) return exId;
  const score=e=>(e.m===x.m?30:0)+(e.g===x.g?20:0)-Math.abs((e.d||1)-(x.d||1))*5;
  const pool=LIBRARY.filter(e=>e.p===x.p&&hasKit(e.eq)).sort((a,b)=>score(b)-score(a));
  return pool.length? pool[0].id : exId;
}
/* Run after the kit is chosen or changed. Returns what it swapped, so the app
   can say so rather than quietly rewriting somebody's programme. */
function fitTemplatesToKit(){
  const swaps=[];
  (S.templates||[]).forEach(t=>{
    t.ex.forEach(r=>{
      const id=fitToKit(r.exId);
      if(id!==r.exId){ swaps.push([exOf(r.exId).n,exOf(id).n]); r.exId=id; r.tempo=tempoOf(id); }
    });
  });
  if(swaps.length) save();
  return swaps;
}
const GROUPS=[...new Set(LIBRARY.map(x=>x.g))];

/* Running sessions, structured rather than "go for a run".
   The distribution follows polarised training: most of the week easy enough to
   hold a conversation, one harder session, one longer one. Seiler's work on
   elite endurance athletes is where the 80/20 split comes from, and the trials
   since have generally favoured it over training everything in the middle.
   Every session is editable, and any day can be swapped for another. */
function seedRunPlans(){
  return [
    {id:'r_easy',name:'Easy run',kind:'run',mins:35,met:8.0,
      sub:'Conversational the whole way',
      why:'The bulk of a week should be easy enough to talk in full sentences. This is the one that builds the engine.',
      steps:[{n:'Walk to loosen off',r:'5 min',sec:10},{n:'Easy running',r:'25 min, conversational',sec:16},
        {n:'Walk home',r:'5 min',sec:8}]},
    {id:'r_long',name:'Long run',kind:'run',mins:60,met:8.0,
      sub:'Slower than you think, further than usual',
      why:'One longer effort a week. Pace should feel too easy at the start. If it does not, it is too fast.',
      steps:[{n:'Walk to loosen off',r:'5 min',sec:10},{n:'Easy running',r:'45 to 55 min',sec:18},
        {n:'Walk and stretch',r:'5 min',sec:10}]},
    {id:'r_intervals',name:'Intervals',kind:'run',mins:40,met:10.0,
      sub:'6 × 2 minutes hard, 2 minutes easy',
      why:'The hard fifth of the week. Hard means you can manage a word or two, not a sentence.',
      steps:[{n:'Easy jog to warm up',r:'10 min',sec:12},{n:'2 min hard, 2 min easy jog',r:'× 6',sec:18},
        {n:'Easy jog to cool down',r:'10 min',sec:12}]},
    {id:'r_tempo',name:'Tempo run',kind:'run',mins:40,met:9.8,
      sub:'20 minutes comfortably hard',
      why:'Comfortably hard: you could say a short sentence, but you would rather not.',
      steps:[{n:'Easy jog to warm up',r:'10 min',sec:12},{n:'Steady, comfortably hard',r:'20 min',sec:18},
        {n:'Easy jog to cool down',r:'10 min',sec:10}]},
    {id:'r_walkrun',name:'Run walk build',kind:'run',mins:30,met:6.0,
      sub:'8 × 2 minutes running, 1 minute walking',
      why:'How to start, or come back, without wrecking yourself. Move to the easy run once 30 minutes feels fine.',
      steps:[{n:'Walk to warm up',r:'5 min',sec:10},{n:'2 min run, 1 min walk',r:'× 8',sec:18},
        {n:'Walk to finish',r:'5 min',sec:10}]},

    /* ---------- everything that is not running ----------
       Cardio was five kinds of run, which is no use to anyone who cycles,
       rows, swims or takes a class. MET values are from the Compendium of
       Physical Activities (Ainsworth and colleagues, 2011): the standard
       reference for what an activity costs. They are averages for the whole
       session, so a hard day is worth more than the number says and an easy
       one less. */
    {id:'c_bike_easy',name:'Easy spin',kind:'bike',mins:45,met:6.8,inSteps:false,
      sub:'Steady, talking pace',
      why:'The same job as an easy run, without the pounding. Handy on a day when the legs are wrecked from lifting.',
      steps:[{n:'Spin up, light gear',r:'5 min',sec:10},{n:'Steady riding',r:'35 min, conversational',sec:16},
        {n:'Spin down',r:'5 min',sec:8}]},
    {id:'c_bike_intervals',name:'Bike intervals',kind:'bike',mins:40,met:8.5,inSteps:false,
      sub:'8 × 90 seconds hard',
      why:'Hard work with almost no impact and nothing to be sore from tomorrow.',
      steps:[{n:'Easy spin to warm up',r:'10 min',sec:12},{n:'90 sec hard, 2 min easy',r:'× 8',sec:18},
        {n:'Easy spin to finish',r:'8 min',sec:10}]},
    {id:'c_spin',name:'Spin class',kind:'bike',mins:45,met:8.5,inSteps:false,
      sub:'Whatever the instructor says',
      why:'Fine as your hard cardio day. If you lift the same day, lift first.',
      steps:[{n:'The class',r:'45 min',sec:20}]},
    {id:'c_row_steady',name:'Steady row',kind:'row',mins:30,met:6.0,inSteps:false,
      sub:'Under control, long strokes',
      why:'Legs, back and lungs at once. Drive with the legs, arms last.',
      steps:[{n:'Easy rowing',r:'5 min',sec:10},{n:'Steady rowing',r:'20 min',sec:16},
        {n:'Easy rowing',r:'5 min',sec:8}]},
    {id:'c_row_intervals',name:'Row intervals',kind:'row',mins:30,met:8.5,inSteps:false,
      sub:'6 × 500m, easy row between',
      why:'Short and honest. Hold the same split on the last one as the first, or you went too hard.',
      steps:[{n:'Easy rowing to warm up',r:'8 min',sec:12},{n:'500m hard, 2 min easy',r:'× 6',sec:18},
        {n:'Easy rowing to finish',r:'5 min',sec:10}]},
    {id:'c_swim',name:'Swim',kind:'swim',mins:35,met:5.8,inSteps:false,
      sub:'Steady lengths, rest at the wall',
      why:'No impact at all, and the one cardio day that will not leave your legs heavy for lifting.',
      steps:[{n:'Easy lengths',r:'5 min',sec:10},{n:'Steady lengths',r:'25 min',sec:16},
        {n:'Easy lengths',r:'5 min',sec:8}]},
    {id:'c_swim_intervals',name:'Swim intervals',kind:'swim',mins:40,met:9.8,inSteps:false,
      sub:'10 × 50m hard, 30 seconds rest',
      why:'Hard swimming is very hard. Cut the set short rather than turn it into slow lengths.',
      steps:[{n:'Easy lengths',r:'8 min',sec:12},{n:'50m hard, 30 sec rest',r:'× 10',sec:18},
        {n:'Easy lengths',r:'6 min',sec:10}]},
    {id:'c_cross',name:'Cross trainer',kind:'machine',mins:35,met:5.0,inSteps:false,
      sub:'Steady, hands on the handles',
      why:'Easy on the joints and easy to zone out on, which is the point some days.',
      steps:[{n:'Easy to start',r:'5 min',sec:10},{n:'Steady',r:'25 min',sec:16},{n:'Easy to finish',r:'5 min',sec:8}]},
    {id:'c_stairs',name:'Stair machine',kind:'machine',mins:25,met:9.0,inSteps:false,
      sub:'Steady climbing, no leaning on the rails',
      why:'Brutal for the time it takes. Leaning on the handles is how people fake it: stand up.',
      steps:[{n:'Easy climbing',r:'5 min',sec:10},{n:'Steady climbing',r:'15 min',sec:18},
        {n:'Easy climbing',r:'5 min',sec:8}]},
    {id:'c_airbike',name:'Air bike intervals',kind:'bike',mins:20,met:9.0,inSteps:false,
      sub:'10 × 30 seconds on, 60 off',
      why:'Twenty minutes, and the hardest twenty on this list. Start easier than you think.',
      steps:[{n:'Easy pedalling',r:'5 min',sec:10},{n:'30 sec hard, 60 sec easy',r:'× 10',sec:20},
        {n:'Easy pedalling',r:'4 min',sec:10}]},
    {id:'c_skip',name:'Skipping',kind:'skip',mins:20,met:11.0,inSteps:false,
      sub:'10 × 1 minute, rest as needed',
      why:'Cheap, portable, and harder than it looks. Trips are part of it.',
      steps:[{n:'Easy skipping',r:'3 min',sec:10},{n:'1 min skipping, rest',r:'× 10',sec:18},
        {n:'Easy skipping',r:'3 min',sec:8}]},
    {id:'c_walk_brisk',name:'Brisk walk',kind:'walk',mins:45,met:4.3,
      sub:'Quick enough that talking takes effort',
      why:'The most underrated thing here. It adds up, it costs nothing, and it never interferes with lifting.',
      steps:[{n:'Walking',r:'45 min, brisk',sec:20}]},
    {id:'c_walk_hill',name:'Hill walk',kind:'walk',mins:60,met:6.0,
      sub:'Out on a hill, or the treadmill on an incline',
      why:'Steady and hard without being fast. A hill or a 10% incline does the work for you.',
      steps:[{n:'Warm up on the flat',r:'5 min',sec:10},{n:'Climbing',r:'50 min',sec:18},
        {n:'Easy to finish',r:'5 min',sec:8}]},
    {id:'c_sport',name:'A match or training',kind:'sport',mins:60,met:7.0,inSteps:false,
      sub:'Football, hurling, five a side, whatever you play',
      why:'It counts. Log it as cardio and take it into account when the week looks heavy.',
      steps:[{n:'The session',r:'60 min',sec:20}]}
  ];
}
/* Sessions that move you along the ground already show up in your step count.
   Anything else does not, which is why they are counted separately. */
const CARDIO_KINDS={run:'Running',bike:'Bike',row:'Rowing',swim:'Swimming',
  machine:'Machines',skip:'Skipping',walk:'Walking',sport:'Sport'};
const cardioMakesSteps=r=>!r||r.inSteps!==false;
S.runPlans=Array.isArray(S.runPlans)&&S.runPlans.length? S.runPlans : seedRunPlans();
const runPlan=id=>(S.runPlans||[]).find(r=>r.id===id)||null;
try{ Object.assign(window.__G,{runPlan,cardioGroups,CARDIO_KINDS,cardioMakesSteps,seedRunPlans}); }catch(e){}
function runSession(id){
  const r=runPlan(id); if(!r) return null;
  return {title:r.name,type:'run',adds:1,runId:id,steps:r.steps.slice()};
}

/* Circuits. A run, a station, a run, a station, done for time. Neither the
   lifting logger nor the run player fits: there are no sets to beat and no single
   pace, the number that matters is the clock. Every station is editable. The one
   that ships is a HYROX simulation you can do with a pair of dumbbells and
   somewhere to run, which is the point: no sled, no ski erg, no wall balls. */
function seedCircuits(){
  const run=(m,sub)=>({t:'run',label:m+' run',sub:sub||''});
  const st=(label,sub)=>({t:'station',label,sub:sub||''});
  return [
    {id:'c_hyrox_full', name:'HYROX simulation', forTime:true,
      sub:'Eight runs, seven stations, one clock', mins:55,
      why:'Straight from the run into the station, no rest in between. A pair of dumbbells and a stretch of road is all it takes.',
      warn:'If anything pinches or a station falls apart, put the weights down and finish it with bodyweight. The clock is not worth an injury.',
      items:[run('800m','Buy in'),
        st('50 dumbbell hammer curls','Standing in for the ski erg'),run('400m'),
        st('40 weighted glute bridges','Standing in for the sled push. Dumbbells on the hips, drive through the legs.'),run('400m'),
        st('40 dumbbell shrugs, 2 second hold','Standing in for the sled pull'),run('400m'),
        st('30 jump squats or 40 speed air squats','Standing in for the burpee broad jumps'),run('400m'),
        st('40 dumbbell suitcase squats','Standing in for the wall balls. Weights down at your sides.'),run('400m'),
        st('60 to 90 second static dumbbell hold',"Standing in for the farmer's carry. Stand still and squeeze."),run('400m'),
        st('30 dumbbell suitcase lunges','Standing in for the sandbag lunges'),run('800m','Cash out')]},
    {id:'c_hyrox_half', name:'Half HYROX', forTime:true,
      sub:'Four runs, four stations, about half the damage', mins:30,
      why:'The same shape in half the time. A sensible first one, and a good midweek session once the full one is in your legs.',
      warn:'If a station falls apart, finish it with bodyweight rather than slowing to a crawl.',
      items:[run('400m','Buy in'),
        st('25 dumbbell hammer curls','Ski erg stand in'),run('400m'),
        st('20 weighted glute bridges','Sled push stand in'),run('400m'),
        st('20 dumbbell suitcase squats','Wall ball stand in'),run('400m'),
        st('15 dumbbell suitcase lunges','Sandbag stand in'),run('400m','Cash out')]},
    {id:'c_hyrox_stations', name:'HYROX stations only', forTime:true,
      sub:'Seven stations, no running', mins:35,
      why:'For a day you cannot get outside, or when the legs need a break from the road. One minute easy between stations.',
      warn:'Rest a minute between stations. This is not meant to be a race against yourself.',
      items:[st('50 dumbbell hammer curls','Ski erg stand in'),
        st('40 weighted glute bridges','Sled push stand in'),
        st('40 dumbbell shrugs, 2 second hold','Sled pull stand in'),
        st('30 jump squats','Burpee broad jump stand in'),
        st('40 dumbbell suitcase squats','Wall ball stand in'),
        st('60 to 90 second static hold',"Farmer's carry stand in"),
        st('30 dumbbell suitcase lunges','Sandbag lunge stand in')]},
    {id:'c_engine', name:'Engine builder', forTime:true,
      sub:'Five rounds, run and carry', mins:32,
      why:'Simpler than a HYROX, and the one to reach for when you just want the heart rate up for half an hour.',
      warn:'If the running pace collapses, walk the recovery and keep the stations honest.',
      items:[run('400m'),st('20 goblet squats'),run('400m'),st('20 dumbbell rows each side'),
        run('400m'),st('40 second static hold'),run('400m'),st('20 glute bridges'),
        run('400m'),st('20 suitcase lunges')]}
  ];
}
S.circuits=Array.isArray(S.circuits)&&S.circuits.length? S.circuits : seedCircuits();
const circuitOf=id=>(S.circuits||[]).find(c=>c.id===id)||null;

/* seeded templates, taken from the coach sheet, fully editable after that */
/* Prescription by what the movement is, not one number for everything. The
   templates used to put 3 x 12 on a barbell bench, an overhead press and a
   lateral raise alike, which is not how anyone programmes and is the detail a
   coach spots first. Heavy compounds live low in the range with long rest,
   accessories in the middle, isolation high and short.
   The ranges themselves are the ordinary ones: roughly 5 to 30 reps builds
   much the same muscle when sets are taken near failure (Schoenfeld and
   colleagues), so the spread is about joints, fatigue and what the movement can
   actually be loaded with, not about a magic rep number. */
const RX_CLASS=[
  {k:'heavy',   sets:4, repMin:5,  reps:8,  rest:180},
  {k:'compound',sets:3, repMin:8,  reps:12, rest:120},
  {k:'accessory',sets:3,repMin:10, reps:15, rest:75},
  {k:'isolation',sets:3,repMin:12, reps:20, rest:60},
  {k:'core',    sets:3, repMin:8,  reps:15, rest:45},
  {k:'hold',    sets:3, repMin:30, reps:45, rest:45}
];
/* ---------- how many reps, for what ----------
   The old rule, low reps for strength, medium for size, high for endurance, is
   half right, and this table follows the half that holds up:
   - Strength: heavy loads, roughly 1 to 5 reps at 80 to 100% of max, optimise
     maximal strength (Schoenfeld, Grgic, Van Every and Plotkin, 2021). The
     main lifts sit at 3 to 6; accessories stay in a building range because
     muscle is what strength is built on.
   - Muscle: similar growth comes from a wide range of loads, down to about 30%
     of max, provided sets are taken close to failure (same review). 6 to 12 on
     the big lifts is the practical middle; lighter, higher reps suit isolation
     work, which is easier on joints.
   - Losing fat: keep lifting heavy enough to tell your body the muscle is still
     needed. During a diet, most reps in 6 to 12 at 70 to 80% of max, 1 to 3
     minutes rest, and no grinding to failure on heavy compound lifts (Helms and
     colleagues, 2015). "Light weights and high reps to tone" is not a thing.
   - Endurance: 15 or more reps for local muscular endurance, more relevant to
     the legs than the upper body (same 2021 review), with short rests.
   Every range here is a starting point; each one is editable. */
const LIFT_FOCUS={
  youth:{t:'Technique first',s:'Learn it well, then add weight slowly',
    effort:'Stop each set with two or three good reps still in you. Clean reps beat heavy ones, and a coach or PE teacher checking your form is worth more than any weight.',
    rx:{heavy:{sets:2,repMin:8,reps:12,rest:120},compound:{sets:2,repMin:8,reps:12,rest:90},
        accessory:{sets:2,repMin:10,reps:15,rest:75},isolation:{sets:2,repMin:10,reps:15,rest:60},
        core:{sets:2,repMin:8,reps:12,rest:45},hold:{sets:2,repMin:20,reps:30,rest:45}}},
  strength:{t:'Strength',s:'Heavier, fewer reps, longer rests',
    effort:'Heavy sets: stop with one to three reps left in the tank. Rest fully, three minutes or more on the big lifts.',
    rx:{heavy:{sets:4,repMin:3,reps:6,rest:210},compound:{sets:3,repMin:5,reps:8,rest:150},
        accessory:{sets:3,repMin:8,reps:12,rest:90},isolation:{sets:3,repMin:10,reps:15,rest:60},
        core:{sets:3,repMin:8,reps:12,rest:60},hold:{sets:3,repMin:20,reps:40,rest:60}}},
  muscle:{t:'Build muscle',s:'Moderate weights, close to failure',
    effort:'Finish each set one to three reps short of failure. The last reps should be hard, not heroic.',
    rx:{heavy:{sets:4,repMin:6,reps:10,rest:150},compound:{sets:3,repMin:8,reps:12,rest:120},
        accessory:{sets:3,repMin:10,reps:15,rest:90},isolation:{sets:3,repMin:12,reps:20,rest:60},
        core:{sets:3,repMin:10,reps:15,rest:45},hold:{sets:3,repMin:30,reps:45,rest:45}}},
  keep:{t:'Keep muscle while losing fat',s:'Keep the weight on the bar',
    effort:'Keep the weights up even when energy is low. Leave a rep or two in the tank on the heavy lifts; no grinding.',
    rx:{heavy:{sets:4,repMin:5,reps:8,rest:180},compound:{sets:3,repMin:6,reps:10,rest:120},
        accessory:{sets:3,repMin:8,reps:12,rest:90},isolation:{sets:3,repMin:10,reps:15,rest:60},
        core:{sets:3,repMin:10,reps:15,rest:45},hold:{sets:3,repMin:30,reps:45,rest:45}}},
  endurance:{t:'Endurance',s:'Lighter, more reps, short rests',
    effort:'Go close to failure on the last set. Keep rests short: that is the point.',
    rx:{heavy:{sets:3,repMin:10,reps:15,rest:90},compound:{sets:3,repMin:12,reps:15,rest:60},
        accessory:{sets:3,repMin:15,reps:20,rest:45},isolation:{sets:2,repMin:15,reps:25,rest:45},
        core:{sets:3,repMin:15,reps:20,rest:30},hold:{sets:3,repMin:45,reps:60,rest:30}}}
};
/* which focus an aim implies, until the person picks their own */
const AIM_FOCUS={strong:'strength',build:'muscle',lose:'keep',endure:'endurance',hold:'muscle',eat:'muscle'};
function liftFocus(){
  const p=S.profile||{};
  if(isTeen(p)) return 'youth';
  if(p.liftFocus&&LIFT_FOCUS[p.liftFocus]) return p.liftFocus;
  return AIM_FOCUS[p.aim]||'muscle';
}
const rxOf=(k,focus)=>{
  const f=LIFT_FOCUS[focus||liftFocus()]||LIFT_FOCUS.muscle;
  const r=f.rx[k]||f.rx.compound;
  return Object.assign({k},r);
};
/* the recommended numbers for one template row, for the current focus */
function recommendedFor(exId,focus){ const r=rxOf(rxClass(exId),focus); return {sets:r.sets,repMin:r.repMin,reps:r.reps,rest:r.rest}; }
function rowMatches(row,focus){
  const r=recommendedFor(row.exId,focus);
  return +row.sets===r.sets&&+row.repMin===r.repMin&&+row.reps===r.reps&&+row.rest===r.rest;
}
/* set every row of every template to the focus. Returns what it changed, and a
   snapshot so the change can be undone in one tap. */
function applyFocusToTemplates(focus){
  const snap=JSON.parse(JSON.stringify(S.templates||[]));
  let changed=0;
  /* HIFB sessions keep the method's own four sets and short rests */
  (S.templates||[]).filter(t=>!isHifb(t)).forEach(t=>t.ex.forEach(r=>{
    if(rowMatches(r,focus)) return;
    Object.assign(r,recommendedFor(r.exId,focus)); changed++;
  }));
  if(changed) save();
  return {changed,snap};
}
const HEAVY_PATTERNS=['squat','hinge','horizontal push','vertical push','horizontal pull','vertical pull','lunge'];
const HOLD_MOVES=['plank','sidplank','hollow','deadbug','birddog','copenhagen','suitcase_hold','bearcrawl','90_90','catcow'];
/* what class a movement falls into, from the library's own pattern and kit */
function rxClass(exId){
  const x=exOf(exId); if(!x) return 'compound';
  if(HOLD_MOVES.indexOf(exId)>=0) return 'hold';
  if(x.g==='Core') return 'core';
  const pat=x.p||'';
  if(/isolation|calf|grip|elbow|shoulder isolation/.test(pat)) return 'isolation';
  if(HEAVY_PATTERNS.indexOf(pat)>=0){
    if(x.eq==='barbell'&&(x.d||1)>=2) return 'heavy';
    return 'compound';
  }
  return 'accessory';
}
function prescribe(exId,over,focus){
  const r=rxOf(rxClass(exId),focus);
  return Object.assign({exId,sets:r.sets,reps:r.reps,repMin:r.repMin,rest:r.rest,
    tempo:tempoOf(exId),note:''},over||{});
}
/* How a range reads wherever sets and reps are printed. */
function repText(row){
  if(!row) return '';
  const top=+row.reps||0, bottom=+row.repMin||0;
  if(rxClass(row.exId)==='hold') return row.sets+' × '+top+'s';
  return row.sets+' × '+(bottom&&bottom<top? bottom+' to '+top : top);
}
function seedTemplates(){
  const mk=(id,name,rows)=>({id,name,seeded:true,
    ex:rows.map(([exId,note])=>prescribe(exId,{note:note||''}))});
  return [
    mk('t_push','Push',[['bench','Control it. No bouncing off the chest.'],
      ['incline','Thirty degrees. Any steeper and it becomes a shoulder press.'],
      ['ohp','No leg drive.'],['dip',''],['lateral',''],['paloff','Ribs down, resist the twist.']]),
    mk('t_pull','Pull',[['chin','Control over swing.'],['bbrow','Torso at forty five degrees.'],
      ['pulldown',''],['dbrow','Row toward the hips.'],['facepull','Rope to the forehead, elbows high.'],
      ['hammer','Five degrees of swing, no more.']]),
    mk('t_lower','Lower',[['squat','Depth you can hold position at.'],
      ['rdl','Stop before the back rounds.'],['bss','Do not rush these.'],
      ['hamcurl','Hips stay down.'],['calf','Pause in the stretch.'],
      ['hanging','Slow on the way down.']]),
    mk('t_full','Full body',[['goblet','Chest up, elbows inside the knees.'],
      ['dbpress',''],['csrow','Pinch at the top.'],
      ['rdl','Stop before the back rounds.'],['lateral',''],
      ['plank','Ribs down, squeeze the glutes.']]),
    mk('t_fullB','Full body B',[['squat','Depth you can hold position at.'],['dbincline',''],['pulldown',''],
      ['hipthrust','Pause at the top.'],['rear',''],['deadbug','']]),
    mk('t_fullC','Full body C',[['legpress',''],['ohp','No leg drive.'],['cablerow','Pinch at the back.'],
      ['dbrdl','Stop before the back rounds.'],['dbcurl',''],['pushdown','']]),
    mk('t_upperA','Upper A',[['bench','Control it. No bouncing off the chest.'],['bbrow','Torso at forty five degrees.'],
      ['dbohp',''],['pulldown',''],['dbcurl',''],['pushdown','']]),
    mk('t_upperB','Upper B',[['dbincline',''],['chin','Control over swing.'],['cablerow','Pinch at the back.'],
      ['arnold',''],['lateral',''],['ropepush','']]),
    mk('t_lowerB','Lower B',[['deadlift','Brace, then push the floor away.'],['legpress',''],['lunge','Tall torso.'],
      ['legext',''],['calf','Pause in the stretch.'],['plank','Ribs down, squeeze the glutes.']]),
    mk('t_legs','Legs',[['squat','Depth you can hold position at.'],['rdl','Stop before the back rounds.'],
      ['legpress',''],['legext',''],['hamcurl','Hips stay down.'],['calf','Pause in the stretch.']]),
    mk('t_chest','Chest',[['bench','Control it. No bouncing off the chest.'],['dbincline',''],['dip',''],
      ['fly','Squeeze, do not clap.'],['pecdeck','']]),
    mk('t_back','Back',[['deadlift','Brace, then push the floor away.'],['chin','Control over swing.'],
      ['bbrow','Torso at forty five degrees.'],['cablerow','Pinch at the back.'],['pulldown','']]),
    mk('t_shoulders','Shoulders',[['ohp','No leg drive.'],['arnold',''],['lateral',''],
      ['cablelateral',''],['rear',''],['facepull','Rope to the forehead, elbows high.']]),
    mk('t_arms','Arms',[['ezcurl',''],['skull','Elbows still.'],['hammer','Five degrees of swing, no more.'],
      ['pushdown',''],['inclinecurl',''],['ohtri','']]),
    mk('t_mobility','Mobility and core',[['catcow','Slow, no forcing it.'],
      ['deadbug',''],['paloff',''],['90_90',''],['sidplank','Thirty seconds a side.']]),
    hifbTpl('t_hifb_chest','HIFB chest and triceps','push','Fast',['Sustained effort'],[
      ['dbpress',8,12,''],['incline',8,12,'Thirty degrees. Any steeper and it becomes a shoulder press.'],
      ['fly',12,15,'Squeeze, do not clap.'],['ohtri',10,12,'Elbows point at the ceiling.']]),
    hifbTpl('t_hifb_back','HIFB back and biceps','pull','Fast',['Sustained effort'],[
      ['deadlift',6,8,'Brace, then push the floor away. Barbell rows work here too.'],['pulldown',10,12,'Wide grip.'],
      ['cablerow',10,12,'Pinch at the back.'],['dbcurl',10,12,'Up to twelve each arm, alternating.']]),
    hifbTpl('t_hifb_shoulders','HIFB shoulders and abs','push','Fast',['Sustained effort'],[
      ['dbohp',8,10,'Seated.'],['lateral',12,15,''],
      ['frontraise',10,12,'Or upright rows, if your shoulders are happy with them.'],['hanging',12,15,'Or cable crunches.']]),
    hifbTpl('t_hifb_legs','HIFB legs','lower','Sustained',['Max effort'],[
      ['squat',8,10,'Or the leg press.'],['rdl',8,10,'Stop before the back rounds.'],
      ['lunge',16,20,'Steps in total: twenty is ten a leg.'],['legext',12,15,'Or hamstring curls.']],
      'The compromised run day: the legs will feel heavy on every 400. Hold a pace you can keep, not a sprint.'),
  ];
}
/* An HIFB session: four sets of each movement, a short rest between sets,
   and a run straight after the fourth set of each block. */
function hifbTpl(id,name,focus,pace,[outPace],rows,why){
  return {id,name,seeded:true,kind:'hifb',focus,why:why||'',
    hifb:{buyIn:{m:HIFB.buyIn,pace:'Moderate'},buyOut:{m:HIFB.buyOut,pace:outPace}},
    ex:rows.map(([exId,lo,hi,note])=>prescribe(exId,{sets:4,repMin:lo,reps:hi,rest:HIFB.rest,note,run:{m:HIFB.between,pace}}))};
}
S.templates=Array.isArray(S.templates)&&S.templates.length? S.templates : seedTemplates();
/* People who joined before the splits arrived get the new templates too,
   added alongside theirs; nothing of their own is touched. */
(()=>{ const have=new Set(S.templates.map(t=>t.id)); const add=seedTemplates().filter(t=>!have.has(t.id));
  if(add.length){
    /* new templates arrive fitted to the kit the person already said they have */
    if(S.profile&&S.profile.kit&&typeof fitToKit==='function') add.forEach(t=>t.ex.forEach(r=>{ const id2=fitToKit(r.exId); if(id2!==r.exId){ r.exId=id2; r.tempo=tempoOf(id2); } }));
    S.templates=S.templates.concat(add); S.templatesAdded=(S.templatesAdded||0)+add.length; } })();
S.workouts=Array.isArray(S.workouts)? S.workouts : [];
S.restPrefs=S.restPrefs&&typeof S.restPrefs==='object'? S.restPrefs : {};
S.habits=(S.habits&&typeof S.habits==='object')? S.habits : {};
S.customHabits=Array.isArray(S.customHabits)? S.customHabits : [];
/* the single habit from the earlier version becomes the habit to start */
if(S.habit&&typeof S.habit==='object'&&S.habit.id&&!S.habits.start) S.habits.start=S.habit;
S.habit=null;
S.deloadWeeks=(S.deloadWeeks&&typeof S.deloadWeeks==='object')? S.deloadWeeks : {};
S.target=(S.target&&typeof S.target==='object')? S.target : null;
S.customFoods=Array.isArray(S.customFoods)? S.customFoods : [];
S.savedMeals=Array.isArray(S.savedMeals)? S.savedMeals : [];
const _fresh2=freshState;
freshState=function(){ const f=_fresh2(); f.templates=seedTemplates(); f.runPlans=seedRunPlans(); f.circuits=seedCircuits(); f.workouts=[]; f.restPrefs={}; f.customFoods=[]; f.savedMeals=[]; return f; };

/* ---------- history and records ---------- */
const e1RM=(kg,reps)=>reps>0? Math.round(kg*(1+reps/30)) : 0;
/* Working sessions only, unless asked. Easy-week sessions stay on the record
   but never decide what to lift next, never become the "last time" and never
   drag the progression back to deload weights. */
function exHistory(exId,opts){
  const all=(S.lifts&&S.lifts[exId])||[];
  return (opts&&opts.all)? all : all.filter(e=>!e.deload);
}
function lastSets(exId){ const h=exHistory(exId); return h.length? h[0].sets : null; }
function exerciseStats(exId){
  const h=exHistory(exId);
  if(!h.length) return null;
  let heaviest=0, best1=0, bestVol=0;
  h.forEach(s=>{
    let vol=0;
    s.sets.forEach(x=>{ const kg=+x.kg||0, r=+x.reps||0;
      if(kg>heaviest) heaviest=kg;
      const e=e1RM(kg,r); if(e>best1) best1=e;
      vol+=kg*r; });
    if(vol>bestVol) bestVol=vol;
  });
  return {sessions:h.length, heaviest, best1, bestVol, last:h[0]};
}
/* ---------- bodyweight movements ----------
   A chin up is not zero kilos. The convention the lifting apps settled on, and
   the one used here: movements that hang your whole bodyweight count it in the
   volume, anything you strap on is added to it, and movements that carry only
   part of your weight (press ups, planks, sit ups) count the added weight only.
   So the weight box on those movements means EXTRA weight, is left empty by
   default, and reads BW. */
const BW_FULL=['chin','pullup','chinup','dip','hanging','legraise','muscleup','pullover_bw','invrow','chinneutral'];
const isBwFull=exId=>BW_FULL.indexOf(exId)>=0;
/* Plenty of movements are listed with dumbbells but are perfectly normal to do
   with nothing at all: split squats, lunges, step ups, goblet squats, calf
   raises, most core work. Holding a weight is optional on those, so the weight
   box is optional too, by rule rather than by a list somebody has to maintain. */
const BW_OPTIONAL_PATTERNS=['lunge','squat','hinge','calf','trunk flexion','anti-rotation',
  'anti-extension','hip isolation','knee isolation','mobility'];
const BW_OPTIONAL_KIT=['dumbbell','kettlebell','band','other'];
const isBodyweight=exId=>{ const x=(typeof exOf==='function')? exOf(exId) : null;
  if(!x) return false;
  if(x.eq==='bodyweight'||isBwFull(exId)) return true;
  return BW_OPTIONAL_KIT.indexOf(x.eq)>=0 && BW_OPTIONAL_PATTERNS.indexOf(x.p)>=0;
};
/* what the scale last said, for the volume sum */
function bodyweightNow(){
  if(S.weights&&S.weights.length) return +S.weights[S.weights.length-1].kg||0;
  return +((S.profile||{}).weight)||0;
}
/* what one set actually moved */
const setVolume=(s,exId)=>((+s.kg||0)+(exId&&isBwFull(exId)? bodyweightNow():0))*(+s.reps||0);

/* ===================== progressive overload =====================
   Double progression, which is the method with the most support behind it and
   the one every serious coach teaches: pick a rep range, start at the bottom,
   add reps session to session, and when every working set reaches the top of
   the range, add the smallest useful jump and drop back to the bottom.

   The rules here, and where they come from:
   · Double progression itself. Reps first, then cash them in for load.
   · ACSM novice guidance: raise the load by 2 to 10% once the target is
     exceeded by a rep or two. Our increments land inside that band.
   · The 2 for 2 rule (NASM): two reps past the target on the last set, two
     sessions running, means the weight is ready to go up.
   · Increment size: the smallest that still measures. 2.5kg for barbell
     compounds, 2kg for dumbbells, 1.25kg for isolation work.
   · Plotkin and colleagues (2022) compared progressing load against
     progressing reps and found much the same growth either way, with effort
     and volume mattering more. So none of this is magic. It is bookkeeping
     that guarantees something goes up, which is the part people actually get
     wrong. The app says so rather than pretending the numbers are sacred. */
function incrementFor(exId){
  const x=exOf(exId);
  if(S.progress&&S.progress[exId]&&S.progress[exId].inc) return S.progress[exId].inc;
  if(!x) return 2.5;
  const isolation=/isolation|calf|grip|elbow/.test(x.p||'');
  if(x.eq==='barbell') return /squat|hinge/.test(x.p||'')? 5 : 2.5;
  if(x.eq==='dumbbell') return isolation? 1.25 : 2;
  if(x.eq==='kettlebell') return 4;
  if(x.eq==='machine'||x.eq==='cable') return isolation? 2.5 : 5;
  return isolation? 1.25 : 2.5;
}
const repRangeFor=row=>{
  const top=+(row&&row.reps)||12;
  const bottom=Math.max(1, +(row&&row.repMin) || Math.max(1,top-2));
  return {bottom,top};
};
/* what to aim for on this exercise next time, and why */
/* ---------- coming back after a break (Review P1-10) ----------
   Strength largely holds for about three weeks off; the meta-analysis on
   training cessation (Bosquet and colleagues, 2013) finds real losses appear
   between the third and fourth week and grow with the length of the break,
   and what is lost comes back faster than it was first built. The research
   says when losses start, not an exact load to return at, so the step down is
   this app's rule of thumb built on that timeline: nothing under two weeks,
   5% at two, 10% at four, 20% at eight or more. Normal progression then
   rebuilds from there, usually within a couple of sessions. */
function gapDays(k){ return Math.round((dateOf(todayKey())-dateOf(k))/864e5); }
function breakCut(gap){ return gap>=56? 0.20 : (gap>=28? 0.10 : (gap>=14? 0.05 : 0)); }
function weeksText(gap){ const w=Math.round(gap/7); return w<=1? 'A week and a half' : w+' weeks'; }
function nextPrescription(exId,row){
  const rx=nextPrescriptionBase(exId,row);
  const h=exHistory(exId);
  if(!h.length||rx.kg===null||rx.kg===undefined||!(+rx.kg)) return rx;
  const gap=gapDays(h[0].d), cut=breakCut(gap);
  if(!cut) return rx;
  const inc=rx.inc||incrementFor(exId)||2.5;
  const kg=Math.max(inc,Math.round((+rx.kg)*(1-cut)/inc)*inc);
  return Object.assign({},rx,{kg,kind:'return',gap,cut,
    why:`${weeksText(gap)} since you last did this. Strength mostly holds for about three weeks and comes back quickly after that, so today starts ${Math.round(cut*100)}% lighter at ${kg}kg and builds back from there.`});
}
function nextPrescriptionBase(exId,row){
  const range=repRangeFor(row), inc=incrementFor(exId);
  const hist=exHistory(exId);
  const last=hist[0];
  if(!last||!last.sets||!last.sets.length)
    return {kg:null,reps:range.bottom,range,inc,why:'First time on this one. Pick something you could manage a couple more reps with.',kind:'first'};
  const bw=isBodyweight(exId);
  /* with no weight on it, an empty box is a real entry, not a missing one */
  const working=last.sets.filter(s2=>!s2.warm&&s2.reps!==''&&(bw||s2.kg!==''));
  if(!working.length) return {kg:null,reps:range.bottom,range,inc,why:'Nothing logged last time.',kind:'first'};
  if(bw&&working.every(s2=>!(+s2.kg))){
    /* every set was bodyweight only: reps are the progression */
    const best=Math.max(...working.map(s2=>+s2.reps));
    const hit=working.every(s2=>+s2.reps>=range.top);
    return {kg:null, reps: hit? range.top+2 : Math.min(range.top,best+1), range, inc,
      lastTonnage:0, kind: hit? 'bwload':'bwreps',
      why: hit
        ? `You hit ${range.top} on every set with just bodyweight. Add reps, or start adding weight and go back to ${range.bottom}.`
        : `Bodyweight last time, best set ${best}. Aim for ${Math.min(range.top,best+1)} on the first set.`};
  }
  const topWeight=Math.max(...working.map(s2=>+s2.kg));
  const atTop=working.filter(s2=>+s2.kg===topWeight);
  const allHitTop=atTop.every(s2=>+s2.reps>=range.top);
  const lastSet=atTop[atTop.length-1];
  const twoForTwo=(+lastSet.reps>=range.top+2) &&
    (hist[1]&&(hist[1].sets||[]).filter(s2=>!s2.warm&&+s2.kg===topWeight).some(s2=>+s2.reps>=range.top+2));
  const tonnage=working.reduce((a,s2)=>a+setVolume(s2,exId),0);
  if(allHitTop||twoForTwo){
    const kg=+(topWeight+inc).toFixed(2);
    return {kg, reps:range.bottom, range, inc, lastTonnage:tonnage,
      why: twoForTwo
        ? `You went two reps past the range twice running, so the weight is ready. Up ${inc}kg and back to ${range.bottom} reps.`
        : `You hit ${range.top} reps on every set at ${topWeight}kg, so cash it in: ${kg}kg for ${range.bottom} reps.`,
      kind:'load'};
  }
  const short=atTop.find(s2=>+s2.reps<range.top);
  const target=Math.min(range.top,(+((short||lastSet).reps))+1);
  return {kg:topWeight, reps:target, range, inc, lastTonnage:tonnage,
    why:`Stay at ${topWeight}kg and chase ${target} reps. The weight goes up once every set reaches ${range.top}.`,
    kind:'reps'};
}
/* total load moved, which is the honest check that the week went somewhere */
function tonnageOf(sets,exId){ return (sets||[]).filter(s2=>!s2.warm).reduce((a,s2)=>a+setVolume(s2,exId),0); }
function progressLines(gym){
  return (gym.ex||[]).map(e=>{
    const p=nextPrescription(e.exId,{reps:e.reps,repMin:e.repMin});
    const done=tonnageOf(e.sets);
    return {exId:e.exId, name:exOf(e.exId).n, p, tonnage:done};
  }).filter(x=>x.tonnage>0);
}
/* Finish a set and the rest of that exercise follows it: same weight, same reps.
   It only fills sets you have not touched and have not done, so anything you
   typed yourself stands, and warm ups are left alone. */
function fillForward(i,j){
  const e=GYM.ex[i], src=e.sets[j];
  if(!src||src.warm) return 0;
  let n=0;
  for(let k=j+1;k<e.sets.length;k++){
    const t=e.sets[k];
    if(t.done||t.warm||t.touched) continue;
    t.kg=src.kg; t.reps=src.reps; n++;
  }
  return n;
}
function setPR(exId,st){
  if(!st||!st.done||st.warm||st.kg===''||st.reps==='') return null;
  const pre=GYM&&GYM.pre? GYM.pre[exId] : null;
  if(!pre) return null;                      // no history yet, so nothing to beat
  const kg=+st.kg, reps=+st.reps;
  if(kg>pre.heaviest) return 'weight';
  if(e1RM(kg,reps)>pre.best1) return 'e1rm';
  return null;
}
/* One gold PR per movement, on the set that earned it. Every set after it at
   the same weight used to light up too, because each was compared with the
   record from before the session rather than with the best set so far.
   A set that fell short of the bottom of the rep range is not a PR, whatever
   the weight: it gets a red cross instead. */
const setShort=(e,s)=>!!(s&&s.done&&!s.warm&&s.reps!==''&&+s.reps<repRangeFor({reps:e.reps,repMin:e.repMin}).bottom);
function prIndex(e){
  let best=-1, bk=null;
  e.sets.forEach((s,j)=>{
    if(!setPR(e.exId,s)||setShort(e,s)) return;
    const key=[+s.kg, e1RM(+s.kg,+s.reps)];
    if(best<0||key[0]>bk[0]||(key[0]===bk[0]&&key[1]>bk[1])){ best=j; bk=key; }
  });
  return best;
}
const exHasPR=e=>prIndex(e)>=0;
const workingIndex=(e,j)=>e.sets.slice(0,j+1).filter(s2=>!s2.warm).length;

/* ---------- warm ups and plate maths ----------
   The app had a blank warm up row and no guidance on what to put in it, and no
   help loading a bar. A ramp is a ramp: a few light sets that fall short of the
   working weight, dropping reps as the load climbs. Percentages here are the
   plain ones most coaching uses; they are a starting point, and every row stays
   editable like any other set. */
const WARM_RAMP=[{pct:0.40,reps:8},{pct:0.60,reps:5},{pct:0.80,reps:3}];
const BAR_KG=20, PLATES=[25,20,15,10,5,2.5,1.25];
function roundTo(kg,step){ return Math.max(step,Math.round(kg/step)*step); }
function warmSetsFor(exId,workKg){
  if(!workKg||workKg<=0) return [];
  const x=exOf(exId), bar=x.eq==='barbell';
  const step=bar? 2.5 : (incrementFor(exId)||2.5);
  const out=[];
  WARM_RAMP.forEach(r=>{
    let kg=roundTo(workKg*r.pct,step);
    if(bar&&kg<BAR_KG) kg=BAR_KG;
    if(kg>=workKg) return;
    if(out.length&&out[out.length-1].kg===kg) return;
    out.push({kg,reps:r.reps,warm:true,done:false});
  });
  return out;
}
/* what actually goes on each side of the bar */
function platesFor(kg,barKg){
  const bar=barKg||BAR_KG;
  let side=(kg-bar)/2;
  if(side<0) return null;
  const out=[];
  PLATES.forEach(pl=>{ while(side>=pl-0.001){ out.push(pl); side=+(side-pl).toFixed(3); } });
  if(side>0.01) return {plates:out,short:+side.toFixed(2)};
  return {plates:out,short:0};
}
function plateLine(exId,kg){
  const x=exOf(exId);
  if(x.eq!=='barbell'||!kg) return '';
  const p=platesFor(+kg);
  if(!p) return 'Under an empty bar.';
  if(!p.plates.length) return 'Empty bar.';
  const counts=[];
  p.plates.forEach(v=>{ const last=counts[counts.length-1];
    if(last&&last.v===v) last.n++; else counts.push({v,n:1}); });
  return 'Bar plus '+counts.map(c=>(c.n>1? c.n+' × ':'')+c.v).join(', ')+' a side'
    +(p.short? ', and '+p.short+'kg it will not make' : '');
}

