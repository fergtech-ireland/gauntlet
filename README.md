# Gauntlet

Open it and you know what you are doing today, and why. The plan rebuilds itself
from your check ins. The social side sits in a tab, where it belongs.

## What is in this folder

| File | What it does |
| --- | --- |
| `index.html` | The whole app |
| `manifest.webmanifest` | Tells the phone it is an app, not a web page |
| `sw.js` | Makes it work with no signal |
| `icon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | The logo at every size |
| `test/run-tests.js` | The test suite (1010 checks, 56 suites) |
| `test/cta-audit.js` | Clicks every button in the app and fails if one does nothing or opens behind something |
| `test/flow-audit.js` | Walks each flow end to end and checks the empty states |
| `test/uat.js` | Four journeys done by tapping only, no internals touched |
| `test/boot-check.js` | Does the page come up at all, with every export resolving |
| `test/final-deployment.js` | A full tester journey through the file as uploaded (54 checks) |
| `supabase-setup.sql` | Paste into Supabase to create the tables and policies |
| `DEPLOY.md` | Step by step: GitHub Pages, then Supabase, then redeploying |

All seven app files must sit in the same folder. `index.html` already carries the
Supabase project it talks to, so there is nothing to edit before uploading.

## The four screens

**Your tracker does the counting.** Steps, sleep and resting heart rate come from
Apple Health, Health Connect or Garmin. The app never asks you for them, and a walk
day ticks itself off when the steps arrive. In this build the connection is simulated
so you can see the behaviour; on a phone the same fields come from the real bridge.

**Today.** One session in large type, a line saying why it picked that one, and one
button. Underneath: the week as a seven day ribbon, then a short list (weigh in, log
today, check in on Sunday). Nothing else.

**Plan.** The whole week, every day changeable, and a plain English block headed
"why this week looks like this". Templates open from here.

**Progress.** Weight and trend, this week against the plan, what people tried of
yours, your reference numbers, plus the seven day averages and the steer.

**Feed.** Follow people, try what they did, credit travels back.

## Where the forecast comes from

Nothing in the prediction is invented. Every step names a published method, and the
app shows them all under "How this is worked out".

| Piece | Method |
| --- | --- |
| Resting burn | Mifflin St Jeor (1990) |
| Walking | ACSM: kcal/min = METs x 3.5 x kg / 200, walking at 3 METs, since 100 steps/min is the established moderate-intensity threshold (CADENCE-Adults). Counted net of rest so resting burn is not double counted |
| Lifting | 4 METs, Compendium of Physical Activities, same equation |
| Your expenditure | Intake balance: TDEE = mean intake minus change in energy stores over the period. Validated against doubly labelled water to roughly 200 kcal/day at group level. Used once there are ten days of food logs and a real weight slope; estimated until then |
| Weight trend | Least squares slope over your weigh ins for the maths, exponentially weighted smoothing for the line you look at |
| Energy per kg | 7700 kcal/kg (Wishnofsky), stated as a long run average. The first fortnight is flagged because early change is mostly water |
| Beyond a week | Recomputed each week with the new bodyweight. Hall and Chow showed the static 3500 kcal rule overestimates precisely because it holds expenditure constant |
| The margin | Standard deviation of this app's own past errors once there are three. The NIH Body Weight Planner spans about -6% to +4% on an individual, so a bare number would oversell it |
| Limits | Never predicts faster than 1% of bodyweight a week, and says nothing at all when there is nothing to work from |

When the week misses by more than ten percent, the gap is converted to calories and
split between causes using the same equations: eating over, steps short, sessions
missed. Anything left over is labelled as unexplained rather than blamed on something.

The verification suite checks the formulas against published values (Mifflin by hand,
the ACSM equation, 500 kcal/day equals 0.45 kg/week), recovers a known expenditure
from simulated intake and weight data to within 100 kcal, recovers a known weekly rate
through a noisy simulated scale, and confirms the four week projection decelerates
rather than running in a straight line.

## Progress: forecast first, then the trend

The screen opens with one number and one sentence.

**At the start of the week** it is a forecast: where the scale lands by your check in
day, based on your own last few weeks, with a margin and a note saying how much
history it is working from. A first week says plainly that it is guessing.

**After your check in** the same card becomes a review: what I predicted, what
happened, and if the two are more than ten percent apart, why. It names the cause
from your own logs: sessions you did not do, steps under your usual, eating over on
the days you tracked, protein short, or the water retention window.

Below that: the weight chart with a dashed projection and a line saying where you
land in four weeks at this rate, eight weeks of consistency bars, and six averages
with an arrow each showing which way they moved against the week before.

## Cycle

Optional, off by default. It does two things and nothing else: it widens the weight
forecast where fluid retention peaks, and says so on the day, so water is not read
as fat.

The figure it uses is the measured one. Kanellakis and colleagues (2023) tracked 42
women and found an average rise of about 0.5 kg across the cycle, mostly
extracellular fluid around menstruation. Larger numbers circulate online; they are
not what the measurement found, so the app does not repeat them.

Whether training should change by phase is not established, so the app never
quietly makes a week easier. It says what is happening and leaves the decision
where it belongs.

## The weekly check in

You pick the day at sign up. It is offered on that day, once a week, and Today tells
you when the next one is due rather than nagging. Three screens, and the first one has
nothing to fill in.

1. **Your week.** Sessions done against planned, volume lifted, steps and sleep a day,
   weight change, protein if you tracked it. Each figure says where it came from.
2. **Three things I cannot see.** How recovered you feel, whether you want to train,
   and anything that hurt. One box for anything else.
3. **So next week changes.** The actual diff, day by day, with the reasons underneath.
   You commit it, and you can still change any day afterwards.

Adherence is worked out rather than asked. Nine sliders became two.

## How the plan adapts

Your aim sets a weekly pattern. After that it is driven by what you log:

- recovery at 5 or under on the check in takes a set off every lift
- recovery at 4 or under drops the last lifting day to a walk
- any movement you flagged as painful is left out of every session, by name
- sleep under 6.5 hours for the week lightens it on its own
- nutrition adherence of 4 or under gets you one food habit, not five

Every one of those is written on the Plan screen in the words above, and the session
that opens really is shorter and really is missing that movement. Changing your aim,
swapping a day, or finishing a check in rebuilds the week immediately.

## Sign up

Five steps: a handle, an aim (with how many days a week you want to lift and how
many you want for cardio), one question about you, a read through the week you
have been given, and the day you want to check in on. A sixth asks for an email if
the copy you installed has a project behind it.

The question about you is sex, with a "rather not say" option. It is asked because
two things do not work without it: the resting burn equation differs by 166 kcal
between the two, and cycle tracking cannot be offered to someone the app has never
asked. Answering female offers cycle tracking there and then, with what it does and
does not do written out.

The review step is the one that matters, and everything in it is editable: the
session on a day, the movements inside it, and the sets, reps and rest. It says as
much, because a plan built from averages is a suggestion rather than a prescription.
All seven days are shown, not just the lifting: run sessions with their structure and what they are for, walks, cooking,
rest and the check in. Every movement is listed with its sets, reps, tempo and rest. Tap any of them and you get three substitutes that train the
same pattern, the full library if none of those suit, or the option to take it out
for good. A movement you take out leaves every day it appears in, is never
suggested as a substitute again, and the exercise list offers to put it back if you
change your mind. That is there so an injury or a dodgy shoulder is dealt with
before the first session rather than three weeks in.

## Circuits

A third kind of session, for the ones that are neither a lift nor a run: a run, a
station, a run, a station, done against the clock. There are no sets to beat and no
single pace, so the logger is a tick list with a running clock, and the number it
keeps is your time.

Four ship with the app, all editable: a full HYROX simulation, a half one to start
with, a stations only version for a day you cannot get outside, and a simpler engine
session. The HYROX ones need a pair of dumbbells and somewhere to run, nothing else:
hammer curls stand in for the ski erg, glute bridges for the sled push, shrugs for
the sled pull, jump squats for the burpee broad jumps, suitcase squats for the wall
balls, a static hold for the carry, suitcase lunges for the sandbag.

The circuit editor lets you rename one, add or remove runs and stations, reorder
them, or switch any line between a run and a station. "New circuit" copies an
existing one so you are never starting from a blank page. Any of them can go on any
day, including at sign up.

Finish it a second time and it tells you whether you were quicker or slower, and if
you only ticked some of it, it says the time is not comparable rather than
pretending it is. A circuit can go on any day, from sign up or from the plan.

## Running

Running is a plan, not the word "run". Five sessions ship with it: easy, long,
intervals, tempo, and a run walk build for starting or coming back. Each has a
structure, a rough duration and a line saying what it is for.

A running week follows the polarised shape: most of it easy enough to hold a
conversation, one harder session, one longer one. That split comes from Seiler's
work on how elite endurance athletes actually train, and the trials since have
generally favoured it over spending the week in the middle. Any run day can be
swapped for another session, a walk, or a rest, from sign up or from the plan.

## Changing the week as it happens

**Taking a movement out.** Tap any movement on a day, or the three dots on it
mid session, and you get three like for like substitutes, the full library, or
"take it out". Taking it out removes it from every day it appears in, so the next
session and every one after it is already correct, and it is never suggested as a
substitute again. Mid session you also get "remove from today only", which leaves
the template alone.

**Not today.** Every session day has a "Not today" on it, and picking rest on the
daily log asks the same question. Three answers:

- **Push it along.** The session moves to the next day and everything after it
  shifts too. The week absorbs the shift at the first rest day, so if Saturday is
  a rest day and you skip Monday, nothing past Saturday moves. If there is no rest
  day left, the last session comes off the end and the app tells you which one.
- **Drop it this week.** Rest day instead, and your weekly target drops by one so
  the number you are chasing stays honest.
- **Leave it.**

The check in day never moves.

## Progressive overload

Double progression, which is the method with the most support behind it. Pick a
rep range, start at the bottom, add reps session to session, and when every
working set reaches the top, add the smallest useful jump and drop back to the
bottom. The app does the bookkeeping and tells you the decision before you start.

| Rule | Where it comes from |
| --- | --- |
| Reps first, then load | Double progression, as taught by every serious coach |
| Raise the load once the target is beaten by a rep or two | ACSM novice guidance, 2 to 10% |
| Two reps past the target, two sessions running, means go up | The 2 for 2 rule (NASM) |
| 2.5kg barbell, 5kg on big lower body lifts, 2kg dumbbell, 1.25kg isolation | The smallest increment that still measures, all inside the ACSM band |
| None of it is magic | Plotkin and colleagues (2022) found load progression and rep progression grew muscle about equally, with effort and volume mattering more |

In the session, each exercise carries the decision in words: "You hit 12 reps on
every set at 80kg, so cash it in: 82.5kg for 10 reps", along with what you lifted
last time and the total load to beat. The session opens already prefilled at the
prescription. At the end, a line per exercise says what to aim for next time, with
a rise marked plainly, and the honest caveat that these are suggestions.

## Built for a phone in a gym

Every set row has a minus and a plus on both the weight and the reps, stepping by
the right increment for that movement, so you can dial in 60kg without the
keyboard ever appearing. Steppers are 52px tall and the tick is 52px square,
comfortably above Apple's 44pt and Material's 48dp guidance, and the numbers are
17px. Tapping a stepper updates the number in place rather than redrawing the
list, so nothing flickers or drops a tap mid set.

## The exercise library

253 movements, written rather than scraped. Each one carries the things you
actually need to choose it: primary muscle, what else it hits, the kit it needs,
the movement pattern, a tempo, a difficulty, and one line of coaching.

For scale: Hevy ships about 400, MacroFactor 900, Fitbod 1600. We are smaller on
raw count and deliberately better on two things. There are no duplicate entries,
because nobody crowdsourced it, so you will never scroll past "Bench Press (2)".
And every entry has the pattern metadata, which is what lets the app offer a
sensible substitute when something hurts: an RDL suggests other hinges, a bench
press suggests other horizontal presses, and it prefers kit you already have.

Coverage: at least 15 movements for every body part, at least 10 for every kind of
equipment, and 60 odd that need nothing at all. A home setup with a pair of
dumbbells is a first class citizen rather than an afterthought.

Finding one is the other half. The picker searches names, muscles, patterns and
equipment at once, ranks name matches above passing mentions, filters by body part
and by what you have, and floats anything you have lifted before to the top.

## Food

Logged in taps. The research on why people stop tracking is unanimous that friction
is the reason, and a 2023 study in Appetite found people who called logging "quick
and easy" were over three times more likely to still be at it after 90 days. So
there is a short list of things people actually eat, with half and double portions
one tap away, your own recent items at the top, and a search box. Calories and
protein fill themselves into the daily log as you add things, and the running total
sits against your target.

It is forty odd foods, not twenty million, and it does not pretend otherwise. If
what you ate is not on the list, type the calories in as before.

## Tempo

Every movement carries one, written the usual four digits: lower, pause at the
bottom, lift, pause at the top. So 3010 is three seconds down, no pause, lift with
intent, no pause.

The digits sit beside the sets and reps. The plain English sentence appears only
where a pause is doing real work, a Romanian deadlift or a split squat, rather than
under every row: on a lateral raise 2011 means little more than "do not swing it".
A switch on the Progress screen, and in the explainer itself, turns the whole thing
off. Hiding it changes nothing about the programme, the tempos stay in the
templates and simply stop being printed.

The tempos are not there for growth, and the app does not claim they are.
Schoenfeld, Ogborn and Krieger pooled the controlled trials and found much the
same hypertrophy anywhere between half a second and eight seconds a rep, provided
the set is near failure, with it falling off only past ten. Load, effort and volume
matter far more. Tempo is in the app for two honest reasons: your sets stay
repeatable, so the numbers you log mean the same thing week to week, and the pauses
keep you out of positions you would otherwise bounce out of. No email, no password, no height or weight. Body
details are asked for only if you press "work out my maintenance" on Progress, and
the number that comes back is a reference with a caveat attached, never a daily target.

## Publish it from your phone (GitHub Pages)

1. Sign in at `github.com`, tap `+`, **New repository**, name it `gauntlet`, public.
2. **uploading an existing file**, upload the seven app files, **Commit changes**.
3. **Settings**, **Pages**, deploy from branch `main`, folder `/ (root)`, save.
4. Open `https://YOURNAME.github.io/gauntlet/`. iPhone: Share, **Add to Home Screen**.
   Android: the **Install** banner in Chrome.

Locally: `python3 -m http.server 8080`, then `http://localhost:8080`.

When you change a file, bump the cache name in `sw.js` or phones keep the old copy.

## Your data

On the device, under `gauntlet.v4`. Nothing leaves the phone.

## Tests

```
cd test && npm install jsdom
node final-deployment.js     # the one to run before sending anything out
cd .. && node test/run-tests.js
```

`run-tests.js` is 705 checks across 41 suites: the screens and flows, sign up, the
plan and how it adapts, moving and dropping days, the forecast maths against the
published methods, the workout logger with tempo and records, running plans,
templates, accounts and row level security against a fake Supabase, the group feed,
the migration path from an old save, and a check that no claim the research does not
support has crept back in.

`final-deployment.js` takes `index.html` exactly as it stands, pastes a project into
it the way you will, and walks two testers through install, sign up, a week of
training, a check in, following each other, a restore onto a second phone, and a
redeploy landing on an old save. 54 checks, nothing about the app mocked.
