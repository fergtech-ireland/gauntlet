# Gauntlet: build and tests

## What goes where

| Path | What it is |
|---|---|
| `src/` | **The app's source.** `src/index.html` is the page; its `<!-- include: ... -->` lines pull in `src/styles.css` and the scripts in `src/js/`, in order. Edit here. |
| `build.js` | Writes `index.html` from `src/`. No dependencies, no transformation: each include is replaced by the file's exact bytes. |
| `index.html` | **The built app**, which is what GitHub Pages serves and what every test loads. Never edit it by hand; run `node build.js`. A test fails if it is not a fresh build. |
| `sw.js` | **The service worker.** Loads the page network-first so every release reaches phones. |
| `manifest.webmanifest`, icons | The install details and icons. |
| `supabase/migrations/` | Every database change, numbered. Applied to gauntlet-test first, the live project only after its gate. |
| `supabase/tests/` | `rls.sql`, the database security checks, and `supabase-stub.sql`, the parts of Supabase they need on a plain Postgres. |
| `.github/workflows/test-and-deploy.yml` | Runs every suite on each push; a push to main that passes is published to Pages. |
| test files, `harness.js`, `package.json` | Development only; the app does not load them. |

The scripts in `src/js/` are classic scripts sharing one global scope, exactly as when they were one file: order matters, and the page includes them in the order shown in `src/index.html`.

## Making a change

```
# edit files in src/
node build.js          # writes index.html
npm test               # every suite, about 4 minutes
git add -A && git commit && git push   # main publishes once the tests pass on GitHub
```

## Running the tests

```
npm install            # installs jsdom, the only dev dependency
npm test               # every suite
npm run test:cta       # one suite: test:build | test:regression | test:cta | test:uat | test:sw | test:rls
```

Set `TZ` to check date handling elsewhere. Auckland and Sydney are worth including: both change their clocks in late September and early October, which is how a summer-time bug in the goal pace was found.

```
TZ=America/Los_Angeles node test.js
```

## The suites

| File | What it protects |
|---|---|
| `build.test.js` | The committed `index.html` is exactly what `src/` builds, and the build refuses mistakes that would break the page (a `</script` inside a script, a file never included, one included twice, Windows line endings). |
| `regression.js` | Every fix made during the review, asserted individually. If a change here goes red, something that was broken and got fixed is broken again. |
| `cta.js` | Two halves. A **static audit** that pulls every id and `data-` attribute written onto an interactive element and checks something in the source listens for it, plus that every `go()` names a real screen and every `openSheet()` names a real sheet. Then a **runtime sweep** that opens every screen and sheet and clicks every control in them. |
| `uat.js` | Fifty-four end-to-end journeys, each on a clean install. These assert the outcome the person came for, not the mechanism underneath. |
| `sw.test.js` | Runs the real `sw.js` in a simulated service worker against a fake GitHub Pages: publish a new version, open the app, get it. Also offline, slow and failing networks, and that Supabase is never touched. |
| `rls.test.js` | Starts a throwaway Postgres, applies every migration in order, then runs `supabase/tests/rls.sql` as two signed-in people and a signed-out visitor: each sees and changes only what they should, every table has RLS on, and delete my account removes everything. Needs the Postgres server programs (GitHub's Ubuntu runners have them; `PG_BIN` points elsewhere). The same `rls.sql` can be pasted into gauntlet-test's SQL editor. |

`harness.js` boots the app in jsdom and is shared by the suites.

## The journeys in uat.js

1. A new person opens the app and gets a week they can start today
2. Someone with two dumbbells in a spare room never sees a barbell
3. They do a lifting session and it is recorded properly
4. The daily loop: weigh in, log food across meals, rate the day
5. A bad week, a check in, and next week is visibly different
6. Picking one habit and keeping it for a week
7. Setting a target, getting there, and being told they got there
8. Something hurts, it comes out, and the app asks about it later
9. Easy weeks arrive on schedule, and the person can move them
10. Taking their data with them, and destroying it
11. The coach: nothing connected, then connected
12. Missing a day, and the week absorbing it
13. An easy week gives lighter weights, and never drags next week down
14. Calories: one maintenance figure everywhere, and a target from their goal
15. Deficits by body size, and exactly what the steps add
16. Theme choice sticks, the brief never says null, reminders tell the truth
17. Delete everything means everything, and never claims more than it did
18. An app left open in the background finds out about a new version
19. The You screen: your plan and settings where you would look for them
20. Changing the theme shows one message, once, however you move around
21. Past sessions open, and show exactly what was done
22. Habits to start and habits to stop
23. Returning users open the app with their history, with no errors
24. Your own habits, a theme sheet that closes, and a footer that tells the truth
25. Exact weigh ins, one place for each day, full session detail, an editor you can use
26. Planned means what was planned, even when the session changes
27. One clear route to today, a finish screen that shows everything, a circuit editor fingers can use
28. Tiles to log with, food first; You in three tabs with settings behind a gear; a weight chart that tells the truth
29. A food list with Irish food in it, and movements you can recognise
30. Cardio that is not running, counted properly
31. A home screen that answers what now, where am I, and is it working
32. Bodyweight counts, tiles log one thing, sauces exist, the keyboard keeps out of the way
33. The daily check in starts from the plan, and takes more than one thing
34. A chart you can read, and a straight answer on when forecasting starts
35. Several habits, raw meat, a tighter home row, a prefilled weight, and eating around the day
36. Meal timing holds up on awkward days, including night shifts
37. Over target shows how far over, with maintenance beside it
38. Any habit can be removed, and the check-in is only done when it is done
39. Rep ranges follow what you are training for, from onboarding to the last set
40. One row per food per meal, with a counter, on a screen built for adding
41. A weight panel you can read at a glance
42. The third-party review's immediate items
43. A version built for teenagers: habits, not weight
44. Review quick wins: restore, sources, toasts, and rules of thumb said as such
45. Supersets and giant sets, one PR per movement, and a red cross for short sets
46. What matters today, how much it has to go on, and a sleep view
47. Coming back after a break, pain that is handled properly, and readiness against your own usual
48. UAT build 45 findings: a shorter, clearer Today
49. Meals: when you ate and meals you skipped; training splits people know
50. HYROX, CrossFit, or a mix: fresh each week, fitted to your kit, every part editable
51. Lots of templates, easy to find: your week first, search, filters, duplicate and delete
52. HIFB: bodybuilding blocks with a run after each, every set and every run tracked
53. Fibre counted from the food you log, against a target with the evidence behind it
54. Changing a day: quick options, suggestions, search, a look inside before choosing, edit and come back

## Things the tests cannot cover

- **Layout and visual rendering.** jsdom has no layout engine, so contrast, tap-target size and the movement figures are asserted structurally, not visually. Those need a real browser or a person.
- **Notifications.** Permission prompts and delivery cannot be exercised headlessly. The scheduling maths is tested; the delivery is not.
- **The Supabase round trip.** Sync and remote deletion are stubbed in the app tests. The database rules themselves are tested on a real Postgres (`rls.test.js`), but Supabase's own sign-in and API layer are not; test those against gauntlet-test before shipping.
- **iOS home-screen behaviour.** Web notifications only work there once the app is added to the home screen, which nothing here can check.
