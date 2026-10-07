# Gauntlet UI redesign (builds 55 onward)

Agreed by Feargal on 6 Oct 2026 after five rounds of prototypes and a team vote. Goal: the app should stop feeling "AI made" and feel like the veteran apps people already trust (Whoop and Oura for readiness, MyFitnessPal and Strava for logging, Fitbod for the session player), without losing a single feature.

**The final design is a merge of two shortlisted directions:**
- **Rings** (Pulse/Whoop-like: three rings on Today, dark hero card, works in night mode)
- **Daybook** (Fuel/MFP-like: calm light layout, meals as a list, quiet rows)

It comes in **Day** and **Night** themes from one set of screens.

## Where the design lives

- Final canvas (day and night of every screen): https://claude.ai/artifact/E1eHs9y4w5X3tpVajMevgf
- Source of those screens, in this repo: `design/redesign/`
  - `Main.dc.html` (Today, good day)
  - `Final-Low.dc.html` (Today after a short night)
  - `Final-Log.dc.html` (+ Log sheet)
  - `Final-Plan.dc.html`
  - `Final-Eat.dc.html`
  - `Final-Train.dc.html` (session player)
  - `Final-You.dc.html`

  These are design-canvas files: HTML with `{{holes}}` filled by a small `renderVals()` script at the bottom. Read them for exact layout, spacing, copy and the token objects. They are reference only: they are not part of the build, and nothing in `src/` includes them.
- Earlier rounds, for background only:
  - merged directions A/B/C with the parity list: https://claude.ai/artifact/WwmCQbKM4Jf99YNBKCBJdF
  - v2: https://claude.ai/artifact/DiwZztQ1BE9zPWRnYeWYbW
  - vote: https://claude.ai/artifact/48XDpHSKHM23W1kfVQLxZC

## Non-negotiables

1. **No lost functionality.** Every prompt, row, sheet and log in build 54 stays reachable. The redesign is a restyle and rearrangement, not a rewrite of the logic. Reuse `priorities()`, `readiness()`, `confidence()`, `proteinPaceText`, `openLog`, `openDay`, `openFood`, `openWeigh`, `openWeek`, `openPainCheck`, `QUICK`/`openQuick` and the rest as they are.
2. **Readiness is never a number.** It is shown as a word (Better, Usual, Lower or Building) against the person's own 28-day baseline, exactly as `readiness()` returns it. The ring fill is only a visual for that word (about 90% / 58% / 28%; Building shows an empty ring with the word).
3. **Weight goes up because of last week's reps, never because of readiness.** On a lower day the card offers holding steady or stopping a set early (the existing `setDelta` / easy week rules).
4. **Teen version:** no calories anywhere. The Food ring shows meals logged instead of kcal left, mirroring `teenGlanceRow()`. Stress prompt keeps Childline 1800 66 66 66. No Weigh in tile.
5. **No em dashes** in copy, code comments or docs.
6. **Every build:** never weaken a test (update selectors and assertions to the new markup, keeping what each check proves), check in real Chrome at 320 to 430px in **both themes**, check text contrast (WCAG AA, 4.5:1 for body text) in both, and re-test from a clean install.

## Design tokens

Implement as CSS custom properties on `:root` (day) and `:root[data-theme="night"]` (night). Replace the old palette variables (`--paper`, `--ink`, `--marine`, `--oxblood`, `--forest`, `--burnt`, `--clay`, `--marigold`) by mapping every use to a token below. Do not hard-code colours in JS-built markup; use `var(--token)`.

| Token | Day | Night | Use |
|---|---|---|---|
| bg | #F6F5F1 | #0F1211 | page |
| surface | #FFFFFF | #181C1A | cards, sheets |
| line | #E6E4DE | #262B29 | 1px borders, dividers |
| ink | #1B1F1D | #F2F3F1 | main text |
| sub | #3D4440 | #C6CBC8 | secondary text |
| mute | #6A706C | #8F9692 | labels, captions |
| track (chip) | #EDEBE5 | #232826 | ring tracks, chips, bars |
| green / cta | #17844F | #3DD68C | primary buttons, Better, done ticks |
| ctaInk | #FFFFFF | #06120B | text on cta |
| greenTint | #E3F2EA | #18291F | positive backgrounds |
| coral | #E0613B | #FF7A59 | Food ring, alerts, worked muscles |
| coralText | #B8452A | #FF8F72 | coral text on light |
| coralTint | #FBE9E3 | #33221D | |
| amber | #D88A1C | #FFB23E | Lower readiness, warnings, nearly recovered |
| amberText | #9A5C0A | #FFB23E | |
| amberTint | #F8EEDC | #322819 | |
| cyan | #1E8FA6 | #4CC3D9 | Train ring, sleep |
| cyanText | #16798C | #4CC3D9 | |
| cyanTint | #E2F1F4 | #182B30 | |
| carbs | #E9A93C | #FFB23E | macro bar |
| fat | #3E86B8 | #4CC3D9 | macro bar |
| fibre | #6E9A2E | #A8D26B | macro bar |
| hero | #1B1F1D | #1F2422 | session hero card (dark in both themes) |
| heroLine | (none) | #2C322F | hero border at night |
| heroInk | #FFFFFF | #FFFFFF | |
| heroSub | #B8BDB9 | #A9B0AC | |
| heroChip | #2D3330 | #2C322F | |
| mint | #7CD3A4 | #7CD3A4 | muscle map highlight, hero accents |
| mintInk | #0F2A1D | #0F2A1D | text on mint |
| bodyBase | #3A403D | #343A37 | unworked muscles in hero map |
| navBg | #FFFFFF | #0F1211 | bottom nav |
| logBg / logInk | #1B1F1D / #FFFFFF | #F2F3F1 / #0F1211 | the round + Log button (inverts) |
| scrim | #8A8C86 | #050606 | behind sheets (with opacity) |
| recoveryBase | #E2E0DA | (use track) | You tab body map, untrained |
| worked / nearly / fresh / usual | #E0613B / #D88A1C / #17844F / #C9CCC6 | night equivalents: coral / amber / green / #3A403D | recovery map states |

**Built in 55 with five Day text shades darker** (mute #656A67, greenText #157848, cyanText #157385, coralText #B44429, amberText #975A0A) so body text passes AA on the page and on its own tint; see HANDOVER.

**Fonts:**
- **Figtree** (400, 500, 600, 700, 800) for all UI text.
- **Barlow Condensed** (600, 700) for big numbers only: ring values, kcal, timer, reps and kg in the player.

Both come from Google Fonts, replacing Archivo and Archivo Black. Update the privacy policy line about Google Fonts only if the wording names the fonts (it names the service, so it probably needs no change; check, and if `legal.js` changes, bump `TERMS_VERSION`).

**Shape:**
- radius 12 to 16px on cards, 999px on chips and the + button;
- 1px `line` borders;
- no drop shadows except sheets (one soft shadow);
- spacing on a 4px grid.

**Theme switch:**
- Appearance setting with Day / Night / Match phone, default **Match phone**, using `prefers-color-scheme`. Store it in `S.profile.theme` (`'auto' | 'day' | 'night'`).
- Set `data-theme` on `<html>` at boot, before first paint, to avoid a flash.
- Also update `<meta name="theme-color">`.
- The sun/moon button in the Today header flips between Day and Night (it sets an explicit choice; Match phone is chosen in You, Appearance).

## Navigation

The bottom nav becomes:
- **Today**
- **Plan**
- **+ Log** (round, centre)
- **Eat**
- **You**

Feed/Friends moves to a header button on Today (two-person icon, next to the avatar). `data-go` values: keep `today`, `plan` and `progress` (shown as You) so existing tests and handlers keep working; add `eat`.

## Screens

### Today (`renderToday()` in `src/js/app/07-today.js`)

Top to bottom (good day: `Main.dc.html`; short night: `Final-Low.dc.html`):

1. **Header:** small date line, "Today" title, sun/moon toggle, Friends button, avatar (opens You / account).
2. **Three rings:**
   - **Ready:** the readiness word, arc by level, caption "than your usual". Tap opens the readiness explanation that exists now.
   - **Food:** kcal left, or "over" in coral when over target. Teen: meals logged. Tap opens Eat.
   - **Train:** today's session time or "Rest", with "1 of 4 this week" under it. Tap opens the session card or Plan.

   This replaces `glanceRow()`. Protein and sleep or steps move into the driver line and priorities below, so nothing is lost: keep a protein figure visible on Today, in the Meals header (as `Final-Eat` shows).
3. **Driver line:** one sentence on what is moving readiness ("Slept 6h 10m, below your 7h 30m usual"), plus the existing `confidence()` chip ("based on 12 of the last 14 nights").
4. **What matters today:** `prioritiesRow()` exactly as now (up to 3 ranked prompts, same scores and copy), restyled as rows with a coloured left icon:
   - sleep: cyan
   - readiness: amber
   - protein: coral
   - pain: coral
   - stress: amber
   - check-in: green

   In `Final-Low` they sit above the hero; on a good day the hero comes first. Rule: if any priority scores 70 or more, priorities go above the hero.
5. **Hero session card** (dark in both themes):
   - label (TONIGHT · HIFB, or the style);
   - session name;
   - chips (time, blocks, style);
   - small muscle map in mint (see New work);
   - the progression line from the existing logic ("Incline press goes up to 32.5 kg: you hit every rep last week", or on a lower day "Hold steady: keep 30 kg or stop a set early");
   - **Start session** (or Do it again), **See or edit**, **Why today**, **Not today**, **Change this day**;
   - the Leaving out note when pain exclusions apply.

   Rest day: same card, shorter, with Walk / Change this day.
6. **Meals:** Breakfast, Lunch, Snacks and Dinner rows with ticks and kcal, and an Add button. Dinner after training says so. Built from the same day food data as `eatingRow()` / `openFood`; tapping a row opens that meal in Eat. Teen: no kcal, just ticks.
7. **Quick tiles:** Weigh in (not for teens) and Check-in. These replace `logRow()`, which goes to + Log and Eat. Keep Log food reachable in one tap: it is the + Log first item and the Meals Add.
8. **Week strip and week line** (`weekLine()`) as now.
9. **Steps / sleep auto row**, or the connect button, as now.
10. **Habits** (`habitRowFor` / `habitRow`, Add habit), `checkinRow()` and the pain review (`painToReview`) as rows.
11. **Next up.**

### + Log sheet (`openLog` in `11-chrome-actions.js`, `Final-Log.dc.html`)

Same items and order as now:
- Log food (wide, with kcal bar)
- Start today's session or Do it again
- Weigh in (not teens)
- Today's check-in
- Steps (if no tracker)
- Weekly check in
- Something else (templates)
- Ask about your record

New: the daily check-in shows **inline sliders** (sleep hours, day rating, stress) in the sheet, saving through the same code as `openDay`; "More" opens the full `openDay` sheet.

### Plan (`Final-Plan.dc.html`)

The week as day cards:
- day name;
- session or rest;
- a done tick if done;
- **Change** on each day (opens the existing Change this day sheet).

Below the cards: templates (manager), training style and split. No logic change.

### Eat (new tab, `Final-Eat.dc.html`)

A full-screen diary built on the existing food functions (`openFood`, Same as yesterday, Skipped a meal, eaten-at times, fibre against 30g, custom foods):
- date switcher;
- kcal left with eaten / target;
- macro bars: protein, carbs, fat, fibre;
- meals as sections with items and an Add per meal.

Teen: no kcal or macros in kcal terms, meals and protein only as now. The existing food sheet can stay as the add/search step.

### Session player (`src/js/workouts/`, `Final-Train.dc.html`)

- **Header:** minimise, live timer, Finish.
- **Progress:** a thin segmented bar, one segment per set.
- **Current exercise:**
  - name;
  - small thumb that opens the existing "show me" pose demo;
  - progression note ("Up 2.5 kg").
- **Inputs:** big reps and kg steppers in Barlow Condensed, then a full-width **Done, set 3** button.
- **Set table:** last week, kg, reps, ticks.
- **HIFB runs:** run rows (400 m) with the same live or typed timing.
- **After the session:** the "after this: 20 to 40g protein" note on the last block.
- **Rest bar:** pinned at the bottom, counting down.

All logging, PRs, run splits and RPE stay as they are.

### You (Progress, `Final-You.dc.html`)

- Weight goal bar.
- This week grid: Ready / Food / Train by day.
- Readiness history: counts of Better / Usual / Lower over 30 days, no numbers on a scale.
- Recovery body map plus a strength list (see New work).
- Every existing Progress panel below: trends, cycle, HIFB runs, account, Your data, privacy.
- **Appearance:** Day / Night / Match phone.

## New work (not in build 54)

- **Muscle map** in the hero card: needs an exercise to muscle-group mapping (primary and secondary) for every movement in the library. Front and back body SVG with about 12 regions. Research-backed, labelled rule of thumb.
- **Recovery map** in You: same SVG, colouring each group by time since it was last worked hard (worked under 48h, nearly 48 to 72h, fresh). Label as a rule of thumb, cite the evidence in the method sheet.
- **Form video thumb:** reuse the existing poses "show me" demo; no real video yet.
- **Barcode scanning:** still an open decision. Do not build without Feargal's go-ahead (it needs a food database licence decision).
- **Appearance setting:** new, see Theme switch.

## Build order

Each build is shippable on its own and passes the full suite.

- **Build 55: foundations.** Done 6 Oct 2026.
  - Tokens for both themes.
  - `data-theme` set at boot plus `prefers-color-scheme`.
  - Appearance setting.
  - Fonts swapped.
  - Old palette mapped to tokens across `styles.css` and JS-built markup.
  - New nav (Today / Plan / + Log / Eat / You, with Eat temporarily opening the existing food sheet), Friends in the Today header.

  Check every screen in both themes for contrast.
- **Build 56: Today.** Done 7 Oct 2026, see HANDOVER.
  - Rings (with the teen variant), driver line, priorities placement rule.
  - Dark hero card (without the muscle map), Meals list, quick tiles.
  - All existing rows restyled.
  - + Log inline check-in sliders.
- **Build 57: Eat tab.** Done 7 Oct 2026, see HANDOVER. Full diary on the existing food functions, plus earlier days through the date switcher. Barcode button not built (decision first).
- **Build 58: player and You.** Done 7 Oct 2026, see HANDOVER.
  - Player restyle.
  - You tab layout: weight goal, week grid, readiness history, Appearance.
  - Plan day cards.
  - Not built from the design: the strength list on You (it sits beside the recovery map, so it goes with build 59), and the form video (the thumb opens the existing pose demo).
- **Build 59 (optional):** muscle map and recovery map (mapping data, SVG, method sheet entry).
- **Later:** barcode (decision first).

Tests: UAT journeys select by text and `data-*` attributes. Keep existing `data-go`, `data-log` and `data-quick` hooks so most journeys survive. Where a journey must change, keep what it proves. Add journeys for:
- theme switching, with Match phone following `prefers-color-scheme`;
- the teen Food ring showing no calories;
- priorities moving above the hero at score 70 or more;
- the Eat tab adding to the same day record as the old sheet.
