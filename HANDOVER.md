# Gauntlet: handover for a new chat

**Current build:** 51 (all files in this folder). Live: https://fergtech-ireland.github.io/gauntlet/ · Repo: github.com/fergtech-ireland/gauntlet (main)
**Deploys:** Claude now has push access to the repo and the Supabase connector, so builds are committed and pushed directly (pushing to main publishes the live site). Build 49 pushed 6 Oct 2026; the repo was on build 47 before that.
**Supabase:** delete policies in place. 6 Oct 2026: `increment_try` restricted to signed-in users (see `supabase-increment-try.sql`). Still open: switch on leaked password protection in the dashboard (Authentication, password settings).
**Tests:** `npm install && npm test` = 1,482 checks, 0 failures (regression, cta, uat with 54 journeys, sw). `node upgrade.test.js` for older-build upgrades.

## How we work
- Single-file PWA (`index.html`), no build step. Tests run in jsdom; layout is checked in real Chrome (Playwright, phone widths 320 to 430px).
- Research first, cite evidence in the app's method sheet, label rules of thumb as such. Never use em dashes.
- Every build: account for every changed line, never weaken a test, check in a real browser, re-test from a clean install, then list files changed since Feargal's LAST UPLOAD (not the last build).
- Keep verified backups somewhere that survives resets, and check for half-finished interrupted attempts before continuing.

## Builds 44 to 51 in brief
- 44: What matters today (max 3 ranked priorities), confidence labels, sleep view.
- 45: Returning after a break (lighter start), pain check (pain-monitoring model, red flags), readiness vs own baseline.
- 46: Shorter Today (UAT findings P116 to P119, P207 to P209).
- 47: Meal "eaten at" times, skipped meals, dinner logs as dinner; training splits (full body, upper/lower, PPL, body part, PPL+UL, auto).
- 48: Training style at sign-up and in settings: Gym, HYROX, CrossFit, or a mix. Sessions change weekly, fit the person's kit (stand-ins say what they replace), and every part is editable (movement, amount, weight, format, rounds, strength lift). Official HYROX order and Open weights (Pro weights vary by source and season, so the app says to check). Also fixed: food stamped at the clock instead of its meal's shown time; snacks landing on a training-day dinner; a date-dependent test.

- 49: HIFB (high-intensity functional bodybuilding) as a fifth training style: four seeded sessions (chest/triceps, back/biceps, shoulders/abs, legs), each an 800m buy-in, four blocks of 4 sets with a 400m run straight after each, an 800m buy-out. Sets log like any lift (PRs, progression); every run is timed live (auto-starts on a block's last set) or typed (m:ss); records keep splits, pace, first-to-last total, effort 1 to 10 and session-RPE load; finish screen, past session and a You panel compare runs over time. Running minutes are kept out of the lifting energy maths (already in steps). Evidence sheet: Schumann 2022, Lundberg 2022, Foster 2001; rest and distances labelled rules of thumb. HIFB templates are protected from the lifting-focus rewrite. Template manager rebuilt: search by name or movement, filters (week, lifting, HIFB, circuits, running, yours), your week and recently done first, families that fold away, Duplicate, Delete (own templates only, blocked while in this week, with undo).
- 50: Fibre (P1-08). Every food has fibre per portion (McCance and Widdowson, USDA; AOAC as on Irish/UK labels); mixed dishes, takeaways and protein bars flagged as typical values. Logged food totals fibre into the day record like calories; food screen shows fibre against 30g (SACN 2015; EFSA 25g); tapping it shows sources, unknown items, easy foods to close the gap and the evidence (Reynolds, Lancet 2019, observational). Custom foods take an optional fibre figure.
- 51: Change this day rebuilt: what the day is now with Edit, Rest/Walk/Cook in one tap, three suggestions with reasons (things missing from the week first), then the template manager's search, filters and folding groups (old generated circuits hidden). Tap a name to preview what is in it (sets and reps, runs, circuit parts, run steps); Use sets the day with Undo; editing from here returns to the sheet. The template manager gets the same tap-to-preview.

## Still open from the review
- Open: P1-03 wellbeing loop, P1-05 wider goals, P1-06 personal patterns. The review's detailed wording for these is not in the repo or past chats; get Feargal to paste it before building.
- Decisions: health data (native wrapper or aggregator), built-in coach (server and budget), barcode scanning, Feed tab placement, real-device accessibility testing.
