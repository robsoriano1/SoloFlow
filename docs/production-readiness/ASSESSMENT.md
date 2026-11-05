# SoloFlow production-readiness assessment

Assessed 2026-11-05 against `main` at `39642a4`. Companion document: [`CLAUDE_CODE_PROMPT.md`](./CLAUDE_CODE_PROMPT.md) turns these findings into build instructions for Claude Code.

## Summary

SoloFlow looks finished: a polished, responsive UI with tasks, events, a schedule, focus timing, and finance. The gaps are underneath. Before it is production-ready it needs:

1. **No silent data loss.** Signing in, editing offline, or using two devices can each overwrite newer work with an older copy. A failed cloud write can also replace a newer queued one.
2. **Sync that survives growth.** Each data type is one Firestore document holding the whole list. About eight task photos, or roughly 1,700 plain tasks, pass Firestore's 1 MiB document limit. After that, task sync stops for good and the user isn't told.
3. **A boot that can't silently fail.** If the Firebase CDN is blocked, or one localStorage value is corrupt, the app loads looking normal but does nothing.
4. **Closing an injection hole.** A crafted backup file runs code on import (verified).
5. **Real backups.** Anonymous auth is off in the live Firebase project, so anyone not signed in with Google keeps data only in their browser. "Export JSON" saves tasks only, not events, schedule, finance, or settings.

Then the operational basics: tests, CI, error monitoring, security headers, Firestore rules in the repo, a privacy policy, and account deletion.

## How this was assessed

- Read all the source: `index.html` (5,790 lines: ~2,000 of CSS and ~3,000 of inline JS), `bootstrap.js`, `core/`, all 13 `modules/`, `service-worker.js`, `manifest.webmanifest`, `vercel.json`.
- Ran the app in headless Chromium at desktop (1440×900) and phone (iPhone 13) sizes. The Firebase SDK was served from the npm package because the sandbox blocks `www.gstatic.com`.
- Ran these scenarios:
  - Firebase CDN blocked.
  - Corrupted localStorage.
  - A crafted backup import.
  - A 1,500-task stress test.
  - Asia/Manila at 02:00.
  - axe-core WCAG 2.1 AA scans on five views.
- **Not tested:**
  - Live Firestore sync, because the sandbox can't reach the backend. Sync findings come from reading the code.
  - The deployed Firestore security rules, which aren't in the repo.
  - The production site's HTTP headers, because the domain was unreachable.

Labels used below: **Verified** means reproduced in the browser. **Code** means found by reading the code, with the exact function named.

## What is already good

- **Local-first saving.** Every save writes to localStorage before the cloud.
- **Sign-in flow.** Error messages are careful and specific, popup vs redirect choices are thought through, and the Firebase auth handler is proxied same-origin (`vercel.json`).
- **Phone layout.** It's responsive with a tab bar, and no view scrolls sideways (verified on all views).
- **Output escaping.** It's consistent in events and finance, links are allow-listed to http(s) (`taskSafeUrl`), and rich text is sanitized to a short tag list.
- **Undo.** Task and event deletes have a five-second Undo.
- **Money handling.** Amounts are stored as integer cents.
- **Service worker.** It's network-first for code, so deploys aren't stuck behind a stale cache.
- **Accessibility.** The basics are mostly in place: native `<dialog>`, labelled controls, a keyboard command palette. axe found only six violations across five views.

## Findings

### P0: fix before calling it production

| # | Area | Finding | Where | How known |
|---|---|---|---|---|
| D1 | Data loss | **Signing in replaces local data.** If a device with local-only work signs into a Google account that already has cloud data, the snapshot listeners replace `window.tasks`, events, schedule, and finance wholesale and rewrite localStorage. The local-only work is gone. | `setupFirestoreListeners()` in `index.html` | Code |
| D2 | Data loss | **Offline edits are overwritten on the next launch.** Cloud writes wait 500 ms in memory (`core/firebase.js`), Firestore uses its memory-only cache, and the `soloflow_pending_cloud_write` flag is written but never read. If you edit offline, or close the tab within 500 ms, the next online launch receives the older cloud copy, which replaces the newer local one. | `FirestoreWriteQueue`, `setupFirestoreListeners()` | Code |
| D3 | Data loss | **Multiple devices: last write wins on whole lists.** Each data type is a single document holding the full array (`artifacts/soloflow-tracker/users/{uid}/trackerData/tasks`, …). Two devices editing different tasks lose one device's edits. A running focus timer rewrites the full task list every 10 s (`modules/timer.js` `commit()`), so collisions are likely. | save functions, `modules/timer.js` | Code |
| D4 | Data loss | **A failed write replaces newer queued writes.** `FirestoreWriteQueue.flush()` re-queues the failed (older) writer over any newer write queued in the meantime. It has no backoff and no retry limit, and the user never sees an error. Permanent failures (permission denied, document too large) retry every 500 ms forever while the UI still says "Cloud sync on". | `core/firebase.js` | Code |
| D5 | Scale | **The 1 MiB document limit.** Photos are stored as base64 JPEG inside `task.photoUrl` (~120 KB each, measured). 1,500 plain tasks measured 863 KB. A few photos or ~1,700 tasks push the tasks document past the limit, after which task sync stops (see D4). The 5 MB localStorage quota is also unguarded: a `QuotaExceededError` makes the save throw. | `handlePhotoUpload`, `editTaskPhoto`, `saveTasks` | Measured + code |
| D6 | Backup | **Most users have no backup.** The live project returns `auth/admin-restricted-operation` for anonymous sign-in, so users who haven't signed in with Google keep data only in localStorage. Safari can wipe that after 7 days without a visit for sites not on the home screen, and `navigator.storage.persist()` is never requested. "Export JSON" (under "Data backup") exports **tasks only**, and Import replaces every task without asking. | `exportTasks`, `importTasks` | Verified + code |
| R1 | Resilience | **The app silently breaks if the Firebase CDN fails.** The inline module statically imports Firebase from `www.gstatic.com`. If that's blocked (privacy extension, firewall, flaky first visit), the whole module fails. The board renders empty, Add does nothing, and no error appears. | `index.html` inline `<script type="module">` | Verified (screenshot) |
| R2 | Resilience | **One corrupt localStorage value stops the app from booting.** Nine keys go through `JSON.parse(localStorage.getItem(...))` without try/catch. One bad value throws a SyntaxError, and the app stays dead until storage is cleared by hand. | state loading block in `index.html` | Verified |
| S1 | Security | **A backup file can inject code.** Task `id` values are inserted raw into ~10 inline `onclick`/`onblur` handlers in `renderTasks`. A backup file containing the id `x'),alert(1),('` runs the injected code on click. | `window.renderTasks` | Verified (payload ran) |
| S2 | Security | **The reCAPTCHA token does nothing.** `mintLoginToken()` mints a reCAPTCHA Enterprise token and throws it away: no backend checks it and App Check isn't set up. It loads a google.com script on every page and blocks Google sign-in when that script fails. Firestore is protected only by security rules, which aren't in the repo. | `mintLoginToken`, `<head>` | Code |

### P1: fix for a solid launch

| # | Area | Finding | Where |
|---|---|---|---|
| S3 | Security | **No security headers.** `vercel.json` has rewrites only: no CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, or `frame-ancestors`. ~100 inline event handlers and a 3,000-line inline script make a strict CSP impossible today. | `vercel.json`, `index.html` |
| S4 | Security | **Firestore rules aren't in version control or tested.** The Firebase API key's referrer restrictions are unknown. | n/a |
| S5 | Security | **The banner URL is pasted unescaped into CSS `url('…')`.** It only affects the user's own settings, so the risk is low. | `applySettings` |
| B2 | Correctness | **Currency is hardcoded** to PHP/₱ (27 places, plus the `CURRENCY` constant in `modules/finance-charts.js`), and many dates to `'en-US'`. | finance, tasks, events |
| B3 | Correctness | **Finance deletes have no confirmation or Undo.** Transactions, budgets, assets, and projects are deleted outright, unlike tasks and events. | `deleteFinance*` |
| U1 | UX | **17 native `prompt()`/`confirm()` dialogs.** They cover editing a photo, adding a subtask, editing an asset (four prompts in a row), editing a project, and pasting an email. They block the page, can't be styled, and work poorly on phones. | `index.html` |
| U2 | UX | **The floating Pomodoro button covers content:** "Set Budget" on desktop Finance. On phones, it and the sync toast cover the board's empty-state button. | `modules/pomodoro.js`, CSS |
| U3 | UX | **The sync toast appears on every launch** for users who aren't signed in ("Cloud sync is off for this project"). It's jargon, and it nags without giving a clear "you're not backed up" action. | `initAuth` |
| A1 | Accessibility | **axe WCAG 2.1 AA violations:**<br>• `.task-card` role and nested interactive controls.<br>• `.command-tabs` children.<br>• Contrast: `#btn-clear-done` (3.17:1), `#finance-tx-count`, `#finance-period-label`. | board, finance |
| O1 | Ops | **No tests, CI, linting, or `package.json`.** All 76 commits were verified by hand. | n/a |
| O2 | Ops | **No error monitoring.** Errors go to `console.error` only, so you won't know when sync fails for users. | n/a |
| O3 | Ops | **Cache-busting is manual.** `CACHE_NAME` and `architecture.css?v=` are bumped by hand, and there's no "new version available" prompt. | `service-worker.js`, `index.html` |
| O4 | Legal | **No privacy policy, terms, or account/data deletion.** These are needed once the app holds Google accounts and financial data: the Google OAuth branding needs a privacy policy link, and GDPR and the Philippine Data Privacy Act (RA 10173) expect deletion on request. | n/a |
| O5 | Ops | **The custom domain is hardcoded.** `SAME_ORIGIN_AUTH_HOSTS` only lists `solo-flow-eta.vercel.app`, so a custom domain would quietly break redirect sign-in. | `index.html` |
| P1 | Performance | **The board re-renders every card on every save.** 1,500 tasks took 837 ms to render and produced 109k DOM nodes (~73 per card, mostly hidden expanded details). | `renderTasks` |

### P2: polish and maintainability

- **M1:** `index.html` is 342 KB. There are 130 `window.*` globals, and modules wrap globals in an order-dependent chain (`bootstrap.js`).
- **M2:** Dead code:
  - `__app_id` and `__initial_auth_token` are leftovers from a hosted canvas.
  - `measurementId` is unused.
  - The first `window.showToast` is overwritten by `bootstrap.js`.
- **M3:** The manifest and `assets/icon.svg` use the old indigo/emerald palette (`#6366F1`/`#0F172A`), while the app is ember `#E2622F` on `#14110E`. The only icon is an SVG with the combined `"any maskable"` purpose; there are no 192/512 PNGs.
- **M4:** The productivity goal, density, and sidebar preferences don't sync across devices.
- **M5:** There are no Open Graph/Twitter meta tags for link previews.

## Already done on this branch: finance visualizations

Built in `modules/finance-charts.js` with changes to `renderFinance` (commit `ee4d79a`):

- **Cash flow by month:** income vs spending for the last six months. Hover or focus shows income, spending, and net.
- **Spending pace:** cumulative spending for the selected period against the same point last period and the daily target. It replaces the old 30-day chart, which ignored the period filter.
- **Spending calendar:** a daily spending heatmap (up to a year on wide screens) with no-spend days, biggest day, and priciest weekday.
- **KPI tiles and category bars:** show change vs the same point last period.
- **Needs/wants/savings:** now a split bar against the 50/30/20 target. It uses series colors, not the old good/bad status colors.
- **Budgets:**
  - The two-point sparkline is replaced by a meter with a "today's even pace" marker and a worded status.
  - Forecasts now wait until day 7, because the first few days mostly reflect one early bill.
- **Runway:** now averages up to 90 days of spending. Before, rent paid on the 3rd made runway read as ~1 month.
- **Fixes:**
  - **B1:** the finance date defaulted to the UTC day, which is yesterday in Manila until 8 AM (verified at 02:00 Manila).
  - The finance date field now has a label.

Every chart has hover and keyboard read-outs plus a Table view. Chart colors use a palette checked for color-vision and contrast on all six themes. axe shows no new violations.

## Feature recommendations

### Must-have before launch (P0)

1. **Safe boot and a crash screen.** Guarded storage reads; corrupt values are set aside, not fatal. A visible "SoloFlow couldn't start" panel with Reload and **Download my data**.
2. **Self-hosted Firebase SDK.** Vendor the SDK and remap the CDN URLs with an import map, so a blocked CDN can't break the app.
3. **Full-workspace backup and restore.** Every data type in a versioned file, with a preview and Merge or Replace on import, plus an automatic snapshot before Replace.
4. **Sync engine v2.**
   - One Firestore document per item, with `updatedAt` and delete markers.
   - Sign-in merges instead of replacing.
   - Firestore's persistent offline cache.
   - Backoff, and visible sync status and errors.
   - A one-time migration from the current documents.
5. **Photos moved out of the task list.** Their own documents or storage, with size caps.
6. **Injection fix and import validation.**
7. **Persistent storage, plus backup reminders** for users who aren't signed in. Decide on anonymous auth; if it's enabled, link it to Google on sign-in so the data carries over.
8. **Real bot protection.** Firebase App Check with the existing reCAPTCHA Enterprise key, or remove reCAPTCHA.

### Should-have (P1)

9. Security headers and a CSP: report-only first, then enforced once inline handlers are gone.
10. Firestore rules in the repo, with emulator tests.
11. Error monitoring with privacy scrubbing, plus sync-health reporting.
12. Tests and CI: Playwright end-to-end tests, an accessibility gate, and unit tests for pure functions.
13. Release hygiene: automated cache versioning and an "update available" toast.
14. Account and privacy: privacy policy, terms, "Delete my cloud data", "Sign out and clear this device".
15. In-app dialogs replacing the 17 `prompt()`/`confirm()` calls.
16. Region settings: currency, locale, week start.
17. Finance Undo and CSV export.
18. Reminders and notifications for due tasks, events, and Pomodoro phase ends. Without a server they fire only while SoloFlow is open; true background push needs FCM and Cloud Functions.
19. Accessibility fixes and Pomodoro button placement.

### Nice-to-have (P2)

20. Onboarding: a first-run guide, an optional sample workspace, a landing page.
21. Recurring tasks, and a Trash/Archive with restore.
22. Finance CSV import with column mapping (bank statements).
23. Performance: render card details only when expanded, paginate Done.
24. Split `index.html` into modules, and reduce the globals.
25. Brand refresh for the manifest and icons (PNG 192/512/maskable), plus Open Graph tags.
26. Optional privacy-friendly analytics (e.g. Vercel Web Analytics).

## Steps only the owner can take

- **Firebase console:**
  - Decide on anonymous auth.
  - Enable App Check, starting in monitor mode.
  - Review the deployed rules against the repo's `firestore.rules` before deploying.
  - Set up billing and budget alerts.
- **Google Cloud:**
  - Restrict the browser API key to HTTP referrers (production domain, previews, localhost).
  - Add privacy policy and terms URLs to the OAuth consent screen.
- **Vercel:** if you add a custom domain, add it to `SAME_ORIGIN_AUTH_HOSTS`, Firebase authorized domains, and the OAuth redirect URIs (`https://<domain>/__/auth/handler`).
- **Accounts and decisions:** choose an error-monitoring provider and supply its DSN. Choose where photos live: Firestore per-photo documents work on the free plan, while Cloud Storage for Firebase now requires the Blaze plan (confirm current terms).
- **Legal:** review the drafted privacy policy and terms.
