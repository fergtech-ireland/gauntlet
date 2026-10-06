# Gauntlet: handover for a new chat

## Start here (6 Oct 2026)

**Opening prompt for a new chat:** "Continue Gauntlet from HANDOVER.md in the repo." Claude attaches github.com/fergtech-ireland/gauntlet with push access, clones it, reads this file, and carries on. No uploads needed.

**Current focus:** turning Gauntlet from a local-only app into a real application with accounts, proper data tables, friends and challenges. The full plan, agreed by Feargal on 6 Oct 2026, is the doc "Gauntlet: from local app to real application": https://claude.ai/code/artifact/c2a1c0da-9821-4a96-8763-bd99dd1b1a58 (read it before starting any phase).

**Decisions agreed (all recommendations accepted):**
1. Split `index.html` into separate source files with a small build step (replaces the old "one file, no build" rule).
2. Mutual friends instead of one-way follows; retire the open feed.
3. Sessions shared with friends by default, each with a Private switch; weight, food, sleep, check-ins, pain and cycle are never shared.
4. Social features from 16; under 16 keeps the teen version with no social features.
5. Sign-in by a 6-digit emailed code typed into the app, not a magic link (iPhone opens links in Safari, outside the home-screen app).
6. Free up the "snacked" Supabase project. It is paused, so it did not block the test project; Feargal deletes it in the dashboard (no delete tool here).

**Phase 0 (foundations) progress:**
- [x] Test Supabase project created: `gauntlet-test`, ref `cfrraitjazkcnxjjkgoj`, eu-west-1. Live project: `gauntlet`, ref `zerclmrlwniaogtxyngw`.
- [x] Live database structure recorded as `supabase/migrations/0001_baseline.sql`. Rule from now: every database change is a numbered file there, applied to gauntlet-test first, live only after its gate.
- [ ] Apply 0001 to gauntlet-test. A third attempt (6 Oct, second chat) also came back "cancelled", so Feargal was asked to paste `supabase/migrations/0001_baseline.sql` into gauntlet-test's SQL editor and run it. Check with `list_tables` on `cfrraitjazkcnxjjkgoj` (expect profiles, state, posts, follows, tries). Then paste `supabase/tests/rls.sql` there too: every row should say ok = true. Do not retry connector writes; they need an approval that does not reach Feargal.
- [x] Split into `src/` (6 Oct): `src/index.html` is the page with `<!-- include: path -->` lines; `src/styles.css`; `src/js/app/01..15`, `daily.js`, `workouts/01..05`, `boot.js`, `trends/01..02`, `cloud.js`, `poses.js`, `coach.js`, `settings.js`. `node build.js` writes the root `index.html` (first build byte-identical, same SHA-256). Scripts share one global scope as before, so include order matters. `build.test.js` fails if the committed `index.html` is not a fresh build, and checks the build refuses `</script` in a script, unused or doubly included files, CRLF.
- [~] `.github/workflows/test-and-deploy.yml`: build check plus `npm test` on every push; main publishes to Pages only if they pass. Waiting on Feargal: Settings, Pages, Source = GitHub Actions (the proxy blocks Claude from that settings call). Until then the branch deploy still publishes every push and the workflow's deploy step fails. Confirm the first run's test job is green on GitHub.
- [x] RLS harness (6 Oct): `supabase/tests/rls.sql` acts as A, B and a signed-out visitor (25 checks: own rows only, cannot write as others, every public table has RLS on, signed out reads nothing, delete my account removes everything). `rls.test.js` runs it on a throwaway local Postgres 16 after `supabase/tests/supabase-stub.sql` (roles, `auth.users`, Supabase's `auth.uid()`, default grants) and every migration in order; it is in `npm test`. Proved by breaking rules on purpose (open read, RLS off, anon grant, new table without RLS): each fails a named check. Every new table must get checks in `rls.sql` in the same change.
- Gate: the split app passes every existing check, deployed from GitHub, with the test project live.

**Then:** Phase 1 (accounts), one build per chat, per the plan doc.

**Working notes:** run the full suite in the background (`nohup node test.js > out.txt &`, then check) because it takes about 4 minutes and single commands time out at 5. Commits are authored as Claude (`git config user.email noreply@anthropic.com`). `package-lock.json` is gitignored.

**Current build:** 51. Live: https://fergtech-ireland.github.io/gauntlet/ · Repo: github.com/fergtech-ireland/gauntlet (main)
**Deploys:** Claude now has push access to the repo and the Supabase connector, so builds are committed and pushed directly (pushing to main publishes the live site). Build 49 pushed 6 Oct 2026; the repo was on build 47 before that.
**Supabase:** delete policies in place. 6 Oct 2026: `increment_try` restricted to signed-in users (see `supabase-increment-try.sql`). Still open: switch on leaked password protection in the dashboard (Authentication, password settings).
**Tests:** `npm install && npm test` = 1,494 app checks plus the RLS suite, 0 failures (build, regression, cta, uat with 54 journeys, sw, rls). Making a change: edit `src/`, `node build.js`, `npm test`, commit, push.

## How we work
- PWA served from `index.html`, which is built from `src/` by `node build.js` (never edit `index.html` by hand). Tests run in jsdom; layout is checked in real Chrome (Playwright, phone widths 320 to 430px).
- Research first, cite evidence in the app's method sheet, label rules of thumb as such. Never use em dashes.
- Every build: account for every changed line, never weaken a test, check in a real browser, re-test from a clean install, then commit and push to main (that publishes the live site).
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
