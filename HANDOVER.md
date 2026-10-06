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
- [x] 0001 applied to gauntlet-test by Feargal in the SQL editor (6 Oct); `supabase/tests/rls.sql` run there too, every check ok, and it cleaned up after itself. Connector writes still get cancelled (the approval never reaches Feargal), so database changes go through him pasting into the SQL editor; connector reads work for checking.
- [x] Split into `src/` (6 Oct): `src/index.html` is the page with `<!-- include: path -->` lines; `src/styles.css`; `src/js/app/01..15`, `daily.js`, `workouts/01..05`, `boot.js`, `trends/01..02`, `cloud.js`, `poses.js`, `coach.js`, `settings.js`. `node build.js` writes the root `index.html` (first build byte-identical, same SHA-256). Scripts share one global scope as before, so include order matters. `build.test.js` fails if the committed `index.html` is not a fresh build, and checks the build refuses `</script` in a script, unused or doubly included files, CRLF.
- [x] `.github/workflows/test-and-deploy.yml`: build check plus `npm test` (including RLS on the runner's PostgreSQL 16) on every push; main publishes to Pages only if they pass. Pages source switched to GitHub Actions by Feargal (6 Oct), so a failing test now blocks the deploy. `gh run list -R fergtech-ireland/gauntlet` works from a session; run logs do not (proxy). Runner pinned to ubuntu-24.04 because ubuntu-latest moves to Ubuntu 26 from 19 Oct 2026.
- [x] RLS harness (6 Oct): `supabase/tests/rls.sql` acts as A, B and a signed-out visitor (25 checks: own rows only, cannot write as others, every public table has RLS on, signed out reads nothing, delete my account removes everything). `rls.test.js` runs it on a throwaway local Postgres 16 after `supabase/tests/supabase-stub.sql` (roles, `auth.users`, Supabase's `auth.uid()`, default grants) and every migration in order; it is in `npm test`. Proved by breaking rules on purpose (open read, RLS off, anon grant, new table without RLS): each fails a named check. Every new table must get checks in `rls.sql` in the same change.
- Gate: the split app passes every existing check, deployed from GitHub, with the test project live. **Met 6 Oct 2026. Phase 0 is done.**

**Phase 1 (accounts) progress:**
- [x] Build 52 (6 Oct): the plumbing.
  - `0002_accounts.sql`: private `settings` table (profile, goal, targets, birth_year, health_consent_at, terms_version, terms_accepted_at, rev). Consent enforced in the database: settings refuse a row without both consents, and `state` refuses inserts/updates until a settings row exists (restrictive policies via `has_consented()`). Withdrawing consent is deleting the row. Handle rules in the database: `^[a-z0-9_]{3,20}$`, unique, `handle_blocklist` table (exact match on the handle minus digits and underscores, or contains; no API access, add words in the SQL editor), changeable once every 30 days by trigger (the clock cannot be backdated), `handle_available(h)` RPC for claimed accounts. Anonymous accounts (`is_anonymous` in the JWT) are kept out of profiles, posts, follows and tries, and cannot credit tries. `profiles.display_name` added (not used yet).
  - `0003_trigger_not_callable.sql`: revokes API execute on the trigger function (Supabase advisor finding).
  - Both applied to gauntlet-test through the connector (writes worked this time); structure checked there; advisor left with intended findings only (blocklist has no policies on purpose; delete_my_account, handle_available, has_consented, increment_try callable by signed-in users on purpose). **Not on live yet.**
  - `rls.sql` now 53 checks, including an anonymous person D and a never-consenting C; `supabase-stub.sql` gained Supabase's `auth.jwt()`. Each new rule was broken on purpose and a named check failed.
  - App (`src/js/cloud.js`): sign-in by a 6-digit code typed into the app (`sendCode`, `verifyCode`), replacing the magic link (an old link still works on a computer). Anonymous accounts (`signInAnonymously`, only with consent; not called automatically yet). Claim = add an email to the anonymous account (`PUT /auth/v1/user`, then verify type `email_change`; same user id). If the email already has an account, the anonymous one is erased from the server before signing in to the other. Two separate, unticked consent boxes (health data; how data is used) wherever an account starts; consent stored in `S.profile.consent` with `TERMS_VERSION` ('2026-10-b52'). Settings row pushed before state; settings pulled when state is not newer. Withdraw consent in Your data (deletes state and settings on the server, checked, then signs out; device keeps everything). Delete everything covers settings and skips tables a project does not have yet. Onboarding: handle rule matches the database, "Already use Gauntlet on another phone? Sign in" on the first screen, and the account step uses the code.
  - `?cloud=test` points a device at gauntlet-test (sticky until `?cloud=live`); switching signs out of the other project.
- [ ] **Feargal, before testing build 52 on gauntlet-test** (Supabase dashboard, gauntlet-test project, Authentication):
  1. Email Templates: in "Magic Link", "Confirm signup" and "Change Email Address", show the code: add `<p>Your Gauntlet code: <b>{{ .Token }}</b></p>`. Without it the email has only a link, which on an iPhone opens Safari, not the app.
  2. Sign In / Providers: switch on "Allow anonymous sign-ins" (needed from build 53; harmless now).
  3. Then open https://fergtech-ireland.github.io/gauntlet/?cloud=test, Progress, Account, "Back up or sign in".
  Built-in email is rate limited (a few emails an hour), fine for testing; a real email provider is needed before testers.
- [ ] Build 53: consent at first open plus a silent anonymous account; privacy policy and terms pages (plain English, then a solicitor's hour; bump `TERMS_VERSION` and re-ask when they change); year of birth instead of age at sign-up (under 16 stays on the teen version, no account); the handle picker using `handle_available` (fixes handles from before the rules, which are kept on the device and flagged in the panel); claim prompt after the first logged session.
- [ ] Gate: start on phone A, claim, sign in on phone B and see the same settings (on gauntlet-test); RLS passes. Then 0002 and 0003 go to live (SQL editor or connector), and the email templates and anonymous setting are copied to the live project.

**Working notes:** Supabase connector writes to gauntlet-test worked on 6 Oct (apply_migration); if they get cancelled again, Feargal pastes the migration into the SQL editor. Run `get_advisors` after every migration. A single UAT journey can be run from a scratch copy of uat.js (header plus that journey) to iterate quickly. Run the full suite in the background (`nohup node test.js > out.txt &`, then check) because it takes about 4 minutes and single commands time out at 5. Commits are authored as Claude (`git config user.email noreply@anthropic.com`). `package-lock.json` is gitignored.

**Current build:** 52. Live: https://fergtech-ireland.github.io/gauntlet/ · Repo: github.com/fergtech-ireland/gauntlet (main)
**Deploys:** Claude now has push access to the repo and the Supabase connector, so builds are committed and pushed directly (pushing to main publishes the live site). Build 49 pushed 6 Oct 2026; the repo was on build 47 before that.
**Supabase:** delete policies in place. 6 Oct 2026: `increment_try` restricted to signed-in users (see `supabase-increment-try.sql`). Still open: switch on leaked password protection in the dashboard (Authentication, password settings).
**Tests:** `npm install && npm test` = 1,601 checks, 0 failures (build 12, regression 152, cta 59, uat 1,301 with 55 journeys, sw 24, rls 53). Journey 55 runs the whole account flow against a fake Supabase that keeps the 0002 rules. Making a change: edit `src/`, `node build.js`, `npm test`, commit, push.

## How we work
- PWA served from `index.html`, which is built from `src/` by `node build.js` (never edit `index.html` by hand). Tests run in jsdom; layout is checked in real Chrome (Playwright, phone widths 320 to 430px).
- Research first, cite evidence in the app's method sheet, label rules of thumb as such. Never use em dashes.
- Every build: account for every changed line, never weaken a test, check in a real browser, re-test from a clean install, then commit and push to main (that publishes the live site).
- Keep verified backups somewhere that survives resets, and check for half-finished interrupted attempts before continuing.

## Builds 44 to 52 in brief
- 44: What matters today (max 3 ranked priorities), confidence labels, sleep view.
- 45: Returning after a break (lighter start), pain check (pain-monitoring model, red flags), readiness vs own baseline.
- 46: Shorter Today (UAT findings P116 to P119, P207 to P209).
- 47: Meal "eaten at" times, skipped meals, dinner logs as dinner; training splits (full body, upper/lower, PPL, body part, PPL+UL, auto).
- 48: Training style at sign-up and in settings: Gym, HYROX, CrossFit, or a mix. Sessions change weekly, fit the person's kit (stand-ins say what they replace), and every part is editable (movement, amount, weight, format, rounds, strength lift). Official HYROX order and Open weights (Pro weights vary by source and season, so the app says to check). Also fixed: food stamped at the clock instead of its meal's shown time; snacks landing on a training-day dinner; a date-dependent test.

- 49: HIFB (high-intensity functional bodybuilding) as a fifth training style: four seeded sessions (chest/triceps, back/biceps, shoulders/abs, legs), each an 800m buy-in, four blocks of 4 sets with a 400m run straight after each, an 800m buy-out. Sets log like any lift (PRs, progression); every run is timed live (auto-starts on a block's last set) or typed (m:ss); records keep splits, pace, first-to-last total, effort 1 to 10 and session-RPE load; finish screen, past session and a You panel compare runs over time. Running minutes are kept out of the lifting energy maths (already in steps). Evidence sheet: Schumann 2022, Lundberg 2022, Foster 2001; rest and distances labelled rules of thumb. HIFB templates are protected from the lifting-focus rewrite. Template manager rebuilt: search by name or movement, filters (week, lifting, HIFB, circuits, running, yours), your week and recently done first, families that fold away, Duplicate, Delete (own templates only, blocked while in this week, with undo).
- 50: Fibre (P1-08). Every food has fibre per portion (McCance and Widdowson, USDA; AOAC as on Irish/UK labels); mixed dishes, takeaways and protein bars flagged as typical values. Logged food totals fibre into the day record like calories; food screen shows fibre against 30g (SACN 2015; EFSA 25g); tapping it shows sources, unknown items, easy foods to close the gap and the evidence (Reynolds, Lancet 2019, observational). Custom foods take an optional fibre figure.
- 52: Accounts plumbing (Phase 1, first build): see Phase 1 progress above.
- 51: Change this day rebuilt: what the day is now with Edit, Rest/Walk/Cook in one tap, three suggestions with reasons (things missing from the week first), then the template manager's search, filters and folding groups (old generated circuits hidden). Tap a name to preview what is in it (sets and reps, runs, circuit parts, run steps); Use sets the day with Undo; editing from here returns to the sheet. The template manager gets the same tap-to-preview.

## Still open from the review
- Open: P1-03 wellbeing loop, P1-05 wider goals, P1-06 personal patterns. The review's detailed wording for these is not in the repo or past chats; get Feargal to paste it before building.
- Decisions: health data (native wrapper or aggregator), built-in coach (server and budget), barcode scanning, Feed tab placement, real-device accessibility testing.
