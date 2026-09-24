# Deploying Gauntlet

Live site: https://fergtech-ireland.github.io/gauntlet/
Repository: github.com/fergtech-ireland/gauntlet (branch `main`)

**This release is build 31.** The footer at the bottom of every screen shows the build
number, which is how you confirm a phone has it. Build 31 includes everything from
builds 20 and 21, so if you skipped either, this one release brings you fully up to date.

## Files in this release

| File | What it is | What to do |
|---|---|---|
| `index.html` | The app | Upload, replacing the old one |
| `sw.js` | The service worker | Upload, replacing the old one |
| `supabase-delete-policies.sql` | Database permission for "Delete everything" | Run once in Supabase (step 5). Uploading it to the repo as well is fine |
| `test.js`, `regression.js`, `cta.js`, `uat.js`, `sw.test.js`, `harness.js` | Automated tests | Upload. The app never loads them |
| `package.json`, `.gitignore` | Test setup | Upload |
| `README.md`, `DEPLOY.md` | Notes | Upload |
| `manifest.webmanifest`, `icon-192.png`, `icon.svg` | Unchanged | Leave as they are |

All files go in the top level of the repository, the same folder as `index.html`.
The tests look for `index.html` and `sw.js` next to themselves.

## 1. Back up the current version

1. Go to the repository on github.com.
2. Click `index.html`, then the download button (the arrow, top right of the file). Do the same for `sw.js`.
3. Keep both somewhere safe. To roll back, you upload these two again.

## 2. Upload the new files

1. On the repository's main page: **Add file**, then **Upload files**.
2. Drag in every file from the table above except the unchanged ones.
   If your download named the app anything other than `index.html` (for example `index-3.html`), rename it to `index.html` first.
3. `.gitignore` starts with a dot, so some computers hide it. If it does not appear in the upload list, skip it here and do step 3.
4. Commit message: `Build 31: a readable chart, and when forecasting starts`.
5. Leave **Commit directly to the main branch** selected. Click **Commit changes**.

## 3. Only if .gitignore did not upload

1. **Add file**, then **Create new file**.
2. Name it `.gitignore` exactly.
3. Contents, one line: `node_modules/`
4. **Commit changes**.

## 4. Wait for the site to publish, then check it on a computer

1. Open the **Actions** tab. Wait for **pages build and deployment** to show a green tick, usually one to two minutes.
2. Open the live site in a private or incognito window.
3. Check: the footer at the bottom of the screen says **Gauntlet, build 31**.
   It opens in the light theme. The **+ Log** button is in the middle of the bar, and there is a tab called **You** where Progress used to be.
   Onboarding has the **Daily step target** and **Body fat %** fields.
   On Plan, **This week** shows each day as a card, with today's open.
   Weigh in (from the **+ Log** button) shows a big number with **−** and **+** buttons, and no slider.
4. In Chrome: right-click, **Inspect**, **Application** tab, **Service workers**. `sw.js` should say **activated and is running**. Under **Cache storage** you should see `gauntlet-shell-v2`.

## 5. Supabase (only if accounts and syncing are switched on)

1. Go to supabase.com and open the Gauntlet project.
2. **Table Editor**, open the `state` table, and look at the type of the `user_id` column.
   It is almost certainly `uuid`. If it says `text`, open `supabase-delete-policies.sql` and change every `auth.uid()` to `auth.uid()::text`.
3. **SQL Editor**, **New query**. Paste the whole of `supabase-delete-policies.sql`. Click **Run**.
4. You should see **Success. No rows returned**. It is safe to run again.
5. Test it with a throwaway account, never a real person's: sign up, log a weigh-in, then You, Your data, **Delete everything**, tap twice.
   It should say **Everything is gone** and restart.
   If it says **Still in the database**, the SQL did not apply; check step 2.

## 6. Phones: a one-time handover

Phones that already have the app are still run by the old service worker, so they need one nudge this first time only.

1. Open Gauntlet. Leave it open for about ten seconds while the new service worker installs and takes over.
2. Close it fully. On iPhone, swipe up from the bottom and swipe the app away. On Android, open recent apps and swipe it away.
3. Open it again. Scroll to the bottom of any screen: the footer should say **build 31**,
   and there should be a tab called **You** where Progress used to be.
4. Still the old one? Repeat once.

Anyone who uses the app will go through this without noticing: their second open after the release gets it.

## Every release after this one

1. Upload the new `index.html`, same as step 2. That is all.
2. `sw.js` does not need touching. Only change it if its own behaviour changes, and then also change `VERSION` at the top of it.
3. Phones get the new version the next time the app is opened with a connection. An app left open in the background shows **A new version of Gauntlet is ready** with an **Update** button. It waits if someone is mid-workout or filling in a form.

## Optional: run the tests before you publish

1. Install Node.js (the LTS version) from nodejs.org.
2. Open a terminal in the folder with these files.
3. Run `npm install` once, then `npm test`.
4. You should see `0 failures, 0 page errors` at the bottom. If anything fails, do not publish.

## If you use the command line instead of the website

```
cd path/to/gauntlet
# copy the new files in, then:
npm install
npm test
git add index.html sw.js sw.test.js test.js regression.js cta.js uat.js harness.js package.json .gitignore README.md DEPLOY.md supabase-delete-policies.sql
git commit -m "Build 31: a readable chart, and when forecasting starts"
git push
```
Then carry on from step 4.

## Rolling back

Upload the `index.html` and `sw.js` you downloaded in step 1, replacing the new ones, and commit.
Phones follow on their next open, the same as any other release.
