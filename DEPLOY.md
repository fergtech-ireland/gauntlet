# Publishing Gauntlet, and sharing it with testers

Three parts.

1. **GitHub Pages** puts the app online and on people's home screens.
2. **Supabase** gives your testers accounts, so they can sign in, keep their data
   across devices, and see each other's sessions.
3. **Redeploying** when they come back with feedback, without costing anyone their data.

All of it can be done from a phone, except the SQL step which is easier on a laptop.

---

## Part 1: GitHub Pages

**The seven files the app needs:** `index.html`, `manifest.webmanifest`, `sw.js`,
`icon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`

1. `github.com`, sign in, tap **+** then **New repository**.
2. Name it `gauntlet`, choose **Public**, **Create repository**.
3. **uploading an existing file**, select the seven files, **Commit changes**.
   They must land in the top level, not in a folder.
4. **Settings**, then **Pages**. Source: **Deploy from a branch**, branch **main**,
   folder **/ (root)**. Save.
5. Wait two or three minutes, refresh, and GitHub shows your address:
   `https://YOURNAME.github.io/gauntlet/`

That address is what you send your testers. On iPhone they open it in Safari and
tap Share then **Add to Home Screen**. On Android, Chrome offers **Install**.

Without part 2 they each get a private app on their own phone. Everything works
except accounts and seeing each other.

---

## Part 1b: the project is already in the file

`index.html` as shipped already carries the project below, so there is nothing to
edit and nothing for your testers to type:

```js
const CLOUD_CONFIG={
  url: 'https://zerclmrlwniaogtxyngw.supabase.co',
  key: 'sb_publishable_C5lUkvG-ZtESrhc_-71HOg_jejh2AJG'
};
```

Both values are public by design: what protects people is row level security in
the database, not secrecy of the key. Never put the service role key here.

If you ever move to a different Supabase project, that block near the bottom of
`index.html` is the only thing to change.

## Part 2: Supabase, so the group is real

1. `supabase.com`, **Start your project**, sign in with GitHub.
2. **New project**. Name it `gauntlet`, Free plan, region Ireland or nearest.
   Set a database password, save it in the browser, you will not need it again.
3. **SQL Editor**, **New query**. Paste the whole of `supabase-setup.sql` and
   **Run**. It creates five tables, the policies, and one function. Running it
   twice is harmless by design.
4. **Authentication**, then **URL Configuration**:
   - **Site URL**: `https://YOURNAME.github.io/gauntlet/`
   - **Redirect URLs**: add the same address.
   Without this the sign in links will refuse to come back to your app.
5. **Authentication**, then **Providers**, and check **Email** is enabled.
   Magic link is on by default. You do not need passwords.
6. **Project Settings**, then **API keys**. Copy the **Project URL** and the
   **publishable** key (`sb_publishable_...`).
   Never use the **service role** key. It bypasses every policy in the database.
7. Nothing to paste: those two values are already in `index.html`. Just confirm
   they match what this page shows you.

### Giving it to your testers

Send them one thing: the web address.

Each tester then:

1. Opens it, adds it to the home screen.
2. Signs up: a handle, an aim, a read through their week, a check in day, then
   their email.
3. Taps the link that arrives and they are signed in, on that device and any other
   they sign in on. No password, no keys, nothing to configure.

Anyone who would rather not have an account can skip that last step and the app
works exactly the same, just on their phone only.

Signed out, the database returns nothing at all. Signed in, they can read the
group's posts and profiles, and only ever their own logs, weight, check ins and
forecasts.

Free tier limits, for reference: 50,000 monthly active users and 500 MB of
database. A test group of ten will not come close.

---

## Part 3: Redeploying without losing anyone's data

This is the part that usually goes wrong, so the app is built for it.

**When you change the app:**

1. Replace the changed file in the repo (open it, pencil icon, paste, commit).
2. If you changed `index.html`, open `sw.js` and bump the cache name, and change
   `APP_VERSION` in `index.html` to the same number so the footer tells the truth
   (a test fails if they disagree):
   `gauntlet-v19` becomes `gauntlet-v20`. Commit that too.

   Without the bump, phones keep serving the copy they cached and your testers
   will tell you nothing changed.

**Why their data survives:**

- Local saves are never thrown away on a version change. Older saves are walked up
  a migration chain, so someone who has not opened the app in three releases keeps
  their handle, history, lifts and weigh ins. A test covers exactly this.
- The same migration runs on anything pulled down from Supabase, so an old payload
  written by a previous build is upgraded on the way in rather than rejected.
- Signed in testers have a server copy, so even a cleared browser is recoverable:
  reinstall, sign in, and it pulls down.

**When you change the database:**

Add to the bottom of `supabase-setup.sql` in the same style, then run the whole
file again:

```sql
alter table public.posts add column if not exists notes text;
create table if not exists public.something_new ( ... );
```

Never `drop table` or `drop column` on anything with data in it. Adding is free,
removing is not.

---

## Checking a build before you send it out

```
cd test && npm install jsdom
node final-deployment.js     # walks a tester through the uploaded file
node cta-audit.js            # clicks every button in the app
node flow-audit.js           # walks each flow and checks the empty states
node boot-check.js           # does the page come up at all
node uat.js                  # four journeys, done by tapping only
cd .. && node test/run-tests.js
```

`final-deployment.js` is the one to run before you send anything out. It takes
`index.html` exactly as it stands, pastes a project into it the way you will,
installs it twice as two different testers, signs one up by email, trains, checks
in, has the second follow the first and try their session, restores the first onto
a new phone, and finishes by loading an old save to prove a redeploy costs nobody
their history. 54 checks, no mocking of the app itself.

1010 checks across 56 suites: the screens and flows, the plan and its adaptations,
the forecast maths against published methods, the workout logger with tempo and
records, accounts and row level security against a fake Supabase, the group feed
with two testers following each other, the migration path from an old save, a check
that no claim the research does not support has crept back in, and one end to end
run of a full week that finishes by backing up and restoring onto a second device.

If that comes back clean, the build is safe to put in front of people.

---

## Tell your testers two things

They will find both anyway, and it costs you less to say it first:

- **Steps and sleep are simulated in this build.** A browser cannot read Apple
  Health or Health Connect. The app labels them as demo data, and real ones need a
  native wrapper later.
- **The feed is empty until people sign in and follow each other.** There are no
  stock accounts and no invented activity, so a lone tester sees only their own
  sessions.

Everything else is real: the plan, the adaptations, the workout logger, the
forecast, the check in, weight, backup and sync.

## What lives where

| Thing | Where |
| --- | --- |
| Someone's week, day to day | Their own phone, under `gauntlet.v4` |
| Their backup | One row in `state`, readable only by their account |
| Posts, follows, tries | Shared tables, readable by anyone signed in to your project |
| Project URL and publishable key | On each phone under `gauntlet.cloud`, and safe to share |
| Service role key | Nowhere near any of this |
