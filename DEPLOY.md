# Deploying Gauntlet

Live site: https://fergtech-ireland.github.io/gauntlet/
Repository: github.com/fergtech-ireland/gauntlet (branch `main`)

The footer at the bottom of every screen shows the build number, which is how you confirm a phone has a release.

## How a release goes out

Claude commits and pushes to `main` directly; nothing is uploaded by hand any more.

1. The source is edited in `src/`, and `node build.js` writes `index.html` from it.
2. `npm test` runs every suite locally.
3. A push to `main` starts **Test and deploy** on GitHub (the **Actions** tab): it checks `index.html` is a fresh build of `src/`, runs every suite, and only if all of them pass publishes the site to GitHub Pages.
4. A push that fails a test is not published. The live site stays on the last good release.

## One-time setting (Feargal, in the GitHub website)

The tests only block a bad release once Pages publishes from the workflow rather than straight from the branch:

1. Repository, **Settings**, **Pages**.
2. Under **Build and deployment**, **Source**: choose **GitHub Actions** (instead of "Deploy from a branch").
3. That is all; it saves itself. Until this is done, every push to `main` is published whether the tests pass or not, and the workflow's deploy step reports a failure because Pages is not expecting it.

To confirm it worked: the **Actions** tab shows **Test and deploy** with two green ticks (test, deploy), and **pages build and deployment** no longer appears for new pushes.

## Checking a release on a computer

1. Open the live site in a private or incognito window.
2. Scroll to the bottom: the footer shows the new build number.
3. In Chrome: right-click, **Inspect**, **Application** tab, **Service workers**. `sw.js` should say **activated and is running**.

## Phones

Phones get the new version the next time the app is opened with a connection. An app left open in the background shows **A new version of Gauntlet is ready** with an **Update** button. It waits if someone is mid-workout or filling in a form.

`sw.js` does not need touching for a release. Only change it if its own behaviour changes, and then also change `VERSION` at the top of it.

## Database changes

Every change is a numbered file in `supabase/migrations/`. It is applied to the **gauntlet-test** project first, checked there (including `supabase/tests/rls.sql`, which can be pasted into the SQL editor), and applied to the live **gauntlet** project only after its phase gate. `rls.test.js` also runs every migration and the security checks on a throwaway Postgres in every test run.

The older one-off scripts `supabase-delete-policies.sql` and `supabase-increment-try.sql` are already applied to the live project and are folded into `0001_baseline.sql`.

## Rolling back

Ask Claude to revert the bad commit on `main` (`git revert`, then push). The workflow tests and republishes the previous version. Phones follow on their next open, the same as any other release.
