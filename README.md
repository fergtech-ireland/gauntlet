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
| `test/run-tests.js` | The test suite (705 checks, 41 suites) |
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

Five steps: a handle, an aim, one question about you, a read through the week you
have been given, and the day you want to check in on. A sixth asks for an email if
the copy you installed has a project behind it.

The question about you is sex, with a "rather not say" option. It is asked because
two things do not work without it: the resting burn equation differs by 166 kcal
between the two, and cycle tracking cannot be offered to someone the app has never
asked. Answering female offers cycle tracking there and then, with what it does and
does not do written out.

The review step is the one that matters. All seven days are shown, not just the
lifting: run sessions with their structure and what they are for, walks, cooking,
rest and the check in. Every movement is listed with its sets, reps, tempo and rest. Tap any of them and you get three substitutes that train the
same pattern, the full library if none of those suit, or the option to take it out
for good. A movement you take out leaves every day it appears in, is never
suggested as a substitute again, and the exercise list offers to put it back if you
change your mind. That is there so an injury or a dodgy shoulder is dealt with
before the first session rather than three weeks in.

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
