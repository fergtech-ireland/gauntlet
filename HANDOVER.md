# Gauntlet: handover for a new chat

**Current build:** 49 (all files in this folder). Live: https://fergtech-ireland.github.io/gauntlet/ · Repo: github.com/fergtech-ireland/gauntlet (main)
**Last build Feargal uploaded:** 43 · **Supabase SQL last run:** build 43 (unchanged since build 40; nothing new to run)
**Tests:** `npm install && npm test` = 1,451 checks, 0 failures (regression, cta, uat with 52 journeys, sw). `node upgrade.test.js` for older-build upgrades.

## How we work
- Single-file PWA (`index.html`), no build step. Tests run in jsdom; layout is checked in real Chrome (Playwright, phone widths 320 to 430px).
- Research first, cite evidence in the app's method sheet, label rules of thumb as such. Never use em dashes.
- Every build: account for every changed line, never weaken a test, check in a real browser, re-test from a clean install, then list files changed since Feargal's LAST UPLOAD (not the last build).
- Keep verified backups somewhere that survives resets, and check for half-finished interrupted attempts before continuing.

## Builds 44 to 49 in brief
- 44: What matters today (max 3 ranked priorities), confidence labels, sleep view.
- 45: Returning after a break (lighter start), pain check (pain-monitoring model, red flags), readiness vs own baseline.
- 46: Shorter Today (UAT findings P116 to P119, P207 to P209).
- 47: Meal "eaten at" times, skipped meals, dinner logs as dinner; training splits (full body, upper/lower, PPL, body part, PPL+UL, auto).
- 48: Training style at sign-up and in settings: Gym, HYROX, CrossFit, or a mix. Sessions change weekly, fit the person's kit (stand-ins say what they replace), and every part is editable (movement, amount, weight, format, rounds, strength lift). Official HYROX order and Open weights (Pro weights vary by source and season, so the app says to check). Also fixed: food stamped at the clock instead of its meal's shown time; snacks landing on a training-day dinner; a date-dependent test.

- 49: HIFB (high-intensity functional bodybuilding) as a fifth training style: four seeded sessions (chest/triceps, back/biceps, shoulders/abs, legs), each an 800m buy-in, four blocks of 4 sets with a 400m run straight after each, an 800m buy-out. Sets log like any lift (PRs, progression); every run is timed live (auto-starts on a block's last set) or typed (m:ss); records keep splits, pace, first-to-last total, effort 1 to 10 and session-RPE load; finish screen, past session and a You panel compare runs over time. Running minutes are kept out of the lifting energy maths (already in steps). Evidence sheet: Schumann 2022, Lundberg 2022, Foster 2001; rest and distances labelled rules of thumb. HIFB templates are protected from the lifting-focus rewrite. Template manager rebuilt: search by name or movement, filters (week, lifting, HIFB, circuits, running, yours), your week and recently done first, families that fold away, Duplicate, Delete (own templates only, blocked while in this week, with undo).

## Still open from the review
- Open: P1-03 wellbeing loop, P1-05 wider goals, P1-06 personal patterns, P1-08 fibre.
- Decisions: health data (native wrapper or aggregator), built-in coach (server and budget), barcode scanning, Feed tab placement, real-device accessibility testing.
