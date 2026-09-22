# Gauntlet: build and tests

## What goes where

| File | Where it lives |
|---|---|
| `index.html` | **The app.** Replace the live copy with this one. |
| `supabase-delete-policies.sql` | Run once in the Supabase SQL Editor. Only needed if cloud sync is on. |
| `sw.js` | **The service worker.** Loads the page network-first so every release reaches phones. Replace the live copy. |
| `manifest.webmanifest`, `icon-192.png`, `icon.svg` | Unchanged. Keep your existing copies. |
| `test.js`, `regression.js`, `cta.js`, `uat.js`, `sw.test.js`, `harness.js`, `package.json`, `.gitignore`, `README.md`, `DEPLOY.md` | Development only. Keep them in the repository; the app does not load them. |

Step-by-step publishing instructions are in `DEPLOY.md`.

`index.html` is the whole app. One file, no build step, no dependencies at runtime.

## Running the tests

```
npm install            # installs jsdom, the only dev dependency
npm test               # all three suites
npm run test:cta       # one suite: test:regression | test:cta | test:uat | test:sw
```

Set `TZ` to check date handling elsewhere. Auckland and Sydney are worth including: both change their clocks in late September and early October, which is how a summer-time bug in the goal pace was found.

```
TZ=America/Los_Angeles node test.js
```

## The three suites

| File | What it protects |
|---|---|
| `regression.js` | Every fix made during the review, asserted individually. If a change here goes red, something that was broken and got fixed is broken again. |
| `cta.js` | Two halves. A **static audit** that pulls every id and `data-` attribute written onto an interactive element and checks something in the source listens for it, plus that every `go()` names a real screen and every `openSheet()` names a real sheet. Then a **runtime sweep** that opens every screen and sheet and clicks every control in them. |
| `uat.js` | Twenty-nine end-to-end journeys, each on a clean install. These assert the outcome the person came for, not the mechanism underneath. |

| `sw.test.js` | Runs the real `sw.js` in a simulated service worker against a fake GitHub Pages: publish a new version, open the app, get it. Also offline, slow and failing networks, and that Supabase is never touched. |

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

## Things the tests cannot cover

- **Layout and visual rendering.** jsdom has no layout engine, so contrast, tap-target size and the movement figures are asserted structurally, not visually. Those need a real browser or a person.
- **Notifications.** Permission prompts and delivery cannot be exercised headlessly. The scheduling maths is tested; the delivery is not.
- **The Supabase round trip.** Sync and remote deletion are stubbed. Test those against a real project before shipping.
- **iOS home-screen behaviour.** Web notifications only work there once the app is added to the home screen, which nothing here can check.
