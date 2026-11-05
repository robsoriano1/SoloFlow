# Prompt: make SoloFlow production-ready

> **How to use this file.** Open Claude Code at the repository root and say:
> *"Read `docs/production-readiness/CLAUDE_CODE_PROMPT.md` and `docs/production-readiness/ASSESSMENT.md`, then do Phase 0."*
> Run one phase per session and one pull request per phase. Review and merge it, then start the next phase the same way ("…then do Phase 1"). The phases are ordered so that each one makes the next one safer.

---

## Your role and goal

You are the engineer taking SoloFlow from "polished personal project" to "production app real people trust with their tasks and money". SoloFlow is a local-first productivity and finance workspace: tasks, events, schedule, focus timer, finance. It's deployed as a static site on Vercel, with Firebase Auth and Firestore for cloud sync.

The findings you are fixing are in `docs/production-readiness/ASSESSMENT.md`. Finding IDs (D1, R2, S1, …) refer to that file. **Before changing anything, verify each finding in your phase against the current code.** If one is wrong or already fixed, say so and skip it.

## How the app is built (read before touching anything)

- **No build step.** `index.html` is served as-is. It holds ~2,000 lines of CSS in `<style>` and ~3,000 lines of JS in one inline `<script type="module">`. That inline script is the "legacy core": Firebase init, auth, persistence, and most rendering, all exposed as `window.*` functions.
- **Boot order matters.** The inline module runs first. Then `bootstrap.js` installs the `modules/*.js` enhancers, which **wrap** `window.*` functions such as `renderTasks`, `renderFinance`, `setView`, and `saveTasks`. The comments in `bootstrap.js` explain the required order. If you replace or rename a `window.*` function, every wrapper must keep working.
- **Persistence contract.** Treat this as a public API. Never rename a key, path, or field without a migration.
  - **localStorage keys:**
    - `tasks`, `trackerEvents`, `weeklySchedule`, `trackerSettings`.
    - `soloflow_finance`, `soloflow_finance_assets`, `soloflow_finance_projects`, `soloflow_finance_budgets`, `soloflow_finance_preferences`.
    - `soloflow_productivity_settings`, plus UI preferences (`soloflow_density`, `soloflow_sidebar_collapsed`, `soloflowFontHref`, …).
    - The Pomodoro's own keys in `modules/pomodoro.js`.
  - **Firestore documents:** `artifacts/soloflow-tracker/users/{uid}/trackerData/{tasks|events|schedule|finance|financeCommand|settings|pomodoro}`. List data lives under a `data` field; `financeCommand` holds `assets`, `projects`, `budgets`, `preferences`.
  - **Data shapes:**
    - Tasks: see `window.normalizeTaskSchema`.
    - Transactions: `{ id, payee, category, amountCents (negative = expense), spendingType, allocationClass, transactionNature, frequency, date (ISO) }`.
    - Schedule: a map keyed `"YYYY-MM-DD-HH:MM"` or `"<Weekday>-HH:MM"` (recurring template) → `{ text, bg, span, hidden }`.
- **Saving.** `window.save*()` writes localStorage first, then enqueues a debounced whole-document `setDoc` through `window.SoloFlowCloudQueue` (`core/firebase.js`).
- **Service worker** (`service-worker.js`): network-first for HTML/JS/CSS, cache-first for fonts and images. When you ship code, bump `CACHE_NAME`, add new files to `APP_SHELL`, and bump `styles/architecture.css?v=` in `index.html` (until Phase 4 automates this).
- **Firebase SDK** is 11.6.1, imported from `https://www.gstatic.com/firebasejs/11.6.1/…`. The sign-in handler is proxied same-origin through `vercel.json` (`/__/auth/*`). `SAME_ORIGIN_AUTH_HOSTS` in `index.html` lists the production host.
- **Finance charts** (already built): `modules/finance-charts.js` reads `window.SoloFlowFinance` (`getRange`, `getPreviousRange`, `matchesFilters`, `classify`, `derive`), which is exposed from `index.html`. Chart colors are `--viz-*` custom properties in `styles/architecture.css`, with light steps under `:root[data-theme-mode="light"]`. Keep that pattern for any new chart.
- **Local dev:** `python3 -m http.server 8080` and open `http://localhost:8080/index.html`. Service workers and ES modules need http(s).

## Ground rules (every phase)

1. **Protect user data above all.** Every change to storage or sync must be backward compatible, include an idempotent migration, and keep the old data until the owner confirms the migration worked. Never delete legacy Firestore documents or localStorage keys in the same release that stops using them.
2. **Keep the look.** Reuse the existing design tokens (CSS custom properties in `index.html` and `styles/architecture.css`), components (`.finance-panel`, `.btn-small`, `.sf-sheet` dialogs, `window.showToast` with an undo option), and icons (`modules/icons.js`). Don't redesign screens unless a task says to.
3. **Deploys stay build-free.** Tooling goes in `devDependencies` only (tests, lint, emulator). Runtime dependencies are vendored ES module files, each with a stated reason.
4. **Test first where you can.** Write a failing test that reproduces each bug before fixing it. After every phase, `npm test` passes locally and in CI.
5. **Check the UI by eye.** For any visible change, take Playwright screenshots at 1440×900 and iPhone 13, in a dark theme (default `graphiteEmber`) and a light one (`minimalistStudio`). Check for overlap, horizontal scroll, and console errors.
6. **Small commits, one PR per phase.** The PR description lists:
   - What changed, and which finding IDs it closes.
   - How it was verified.
   - Any **manual steps for the owner** (console settings, keys, decisions).
7. **Never commit secrets.** The Firebase web config and a Sentry DSN are public by design; service-account keys and tokens are not.
8. **Ask the owner first** before anything in the Firebase, Google Cloud, or Vercel consoles; before deleting data; before changing auth providers; and before adding a paid service. Write these up as PR checklist items instead of doing them.
9. **Keep every feature and shortcut** listed in `README.md` working unless a task says otherwise. Update `README.md` when behavior changes.
10. **Report honestly.** If something is skipped, flaky, or only partly done, say so in the PR.

---

## Phase 0: safety net (tooling, tests, CI)

Goal: every later phase can be verified automatically.

1. **Tooling.** Add `package.json` (`"private": true`, `"type": "module"`).
   - Dev dependencies: `@playwright/test`, `@axe-core/playwright`, `eslint` (flat config, browser globals, `ecmaVersion: 'latest'`), and `firebase` pinned to `11.6.1`. Its package root contains `firebase-app.js`, `firebase-auth.js`, and `firebase-firestore.js`, the same files the CDN serves.
   - Scripts: `serve`, `lint`, `test`, `test:e2e`.
2. **Hermetic test server.** Write `scripts/serve.mjs`, a tiny static server with no dependencies, and use it as Playwright's `webServer`.
   - In the Playwright fixture, route `https://www.gstatic.com/firebasejs/11.6.1/*` to the files in `node_modules/firebase/`.
   - Abort `*.googleapis.com`, `www.google.com/recaptcha`, and Google Fonts, so tests never touch production.
   - Freeze the clock with `page.clock.setFixedTime` and set `timezoneId: 'Asia/Manila'`.
3. **Smoke tests** (desktop and iPhone 13), each failing on any page error:
   - The app boots with no page errors.
   - Add a task, start it, complete it, delete it, then Undo.
   - Add an event; add a finance transaction.
   - Every view renders via `setView`.
   - No horizontal scroll on phone views.
   - Shortcuts work: `N` and `Cmd/Ctrl+K`.
   - Finance charts: each `#finance-*-chart` renders an SVG, and its Table toggle shows rows.
4. **Regression tests for the P0 bugs**, marked `test.fail()` with the finding ID. They should flip to passing in Phase 1.
   - **R1:** with gstatic aborted, the user sees an explanation (not a silent dead UI) and can download their data.
   - **R2:** `localStorage.tasks = '{bad'` still boots, and the bad value is kept aside.
   - **S1:** importing `[{"id":"x'),window.__pwned=1,('","title":"t","status":"todo"}]` then clicking the card's main action leaves `window.__pwned` undefined.
   - **D6:** export → wipe storage → import restores tasks, events, schedule, finance, and settings.
5. **Accessibility gate.** Run axe (`wcag2a`, `wcag2aa`, `wcag21aa`) on every view. Record today's violations in `tests/a11y-baseline.json` and fail on anything new.
6. **CI.** `.github/workflows/ci.yml` runs on pull requests and on pushes to `main`: `npm ci`, `npx playwright install --with-deps chromium`, `npm run lint`, `npm test`. Upload the Playwright report as an artifact.

**Done when:** CI is green, the known-failing tests are marked `test.fail`, and `README.md` has a "Development" section.

---

## Phase 1: critical safety fixes (small, independent)

1. **Safe boot (R2).**
   - Add `core/storage.js` with:
     - `readJSON(key, fallback, validate?)`: on a parse or validation failure, copy the raw string to `soloflow_quarantine_<key>_<timestamp>`, return the fallback, and record the failure.
     - `writeJSON(key, value)`: catches `QuotaExceededError`, shows one clear toast ("This device's storage is full. Export a backup and remove photos to free space."), and never throws to the caller.
   - Replace every `JSON.parse(localStorage.getItem(...))` and save-path `localStorage.setItem` for app data, in `index.html` and the modules. The inline module can `import` from `./core/storage.js`.
   - After boot, show one toast if anything was quarantined, with a "Download the unreadable data" action.
2. **Self-hosted Firebase (R1).**
   - Vendor `firebase-app.js`, `firebase-auth.js`, and `firebase-firestore.js` (11.6.1) into `vendor/firebase/11.6.1/`. Add `scripts/vendor-firebase.mjs` to refresh them from `node_modules`.
   - Add `<script type="importmap">` **before any module script**, mapping each exact `https://www.gstatic.com/firebasejs/11.6.1/<file>` URL to the local file. That keeps both the app's imports and the SDK's own cross-imports working.
   - Update `service-worker.js`: add the vendored files to `APP_SHELL` and remove gstatic from `OPTIONAL_REMOTE_ASSETS`.
3. **Boot watchdog (R1, and any future crash).**
   - Add a tiny classic `<script>` at the top of `<body>`, with no imports, that listens for `error` and `unhandledrejection`.
   - `app:ready` is only emitted on the internal store bus. So at the end of `bootstrap.js` `start()`, also set `window.__soloflowReady = true` and dispatch a DOM event: `document.dispatchEvent(new Event('soloflow:ready'))`.
   - If that event hasn't fired within ~6 s, or an error arrives first, render a visible panel: "SoloFlow couldn't start", with **Reload** and **Download my data**.
   - Download my data builds a JSON file from every known localStorage key, using raw strings so corrupt values survive. It must work even when every module failed.
4. **Injection fix (S1).**
   - In `window.renderTasks`, stop interpolating `task.id` into inline handlers. Use `data-task-id` and `data-action` attributes, with one delegated listener on each board column (`#col-todo`, `#col-inprogress`, `#col-done`).
   - Also sanitize ids at every entry point (localStorage load, cloud snapshot, import). `normalizeTaskSchema` keeps ids matching `^[A-Za-z0-9_-]{1,64}$` and regenerates others, remapping `blockedBy` and any other references.
   - Grep the whole repo for template literals that put a `${…}` inside an `on*="…"` attribute (finance and budget rows have some) and fix them the same way.
5. **Full backup and restore (D6).**
   - Replace `exportTasks`/`importTasks` with `exportWorkspace()`/`importWorkspace()`. The file shape:
     ```json
     { "format": "soloflow-backup", "version": 2, "exportedAt": "…", "app": { "cache": "<CACHE_NAME>" },
       "data": { "tasks": [], "events": [], "schedule": {}, "finance": { "transactions": [], "assets": [], "projects": [], "budgets": [], "preferences": {} },
                 "settings": {}, "productivitySettings": {}, "pomodoroSettings": {} } }
     ```
   - Import accepts v2 files and the legacy v1 format (a bare array of tasks).
   - Validate with hand-written validators: types, ids, amounts as integers, dates as parseable strings.
   - Show a preview `<dialog>` with counts per data type and two choices:
     - **Merge**: match by id; the newer `metadata.updatedAt` or `updatedAt` wins; otherwise keep both.
     - **Replace everything**: requires typing `REPLACE`.
   - Before Replace, download (or store in IndexedDB) an automatic pre-import snapshot.
   - Rename the settings section to "Backup & restore" and show "Last backup: <date>". Keep the old button ids working, or update every reference.
6. **Persistent storage.** After the first successful save, call `navigator.storage.persist()`. In Settings, show the result and `navigator.storage.estimate()`.
7. **Write-queue correctness (D4, interim until Phase 2).**
   - In `FirestoreWriteQueue.flush()`, on failure, re-queue only if no newer entry exists for that key.
   - Add exponential backoff with jitter (1 s → 60 s cap).
   - Treat `permission-denied`, `invalid-argument`, `failed-precondition`, `resource-exhausted`, and `unauthenticated` as permanent: stop retrying, and set the cloud status to `error` with a specific message.
   - Before each `setDoc`, estimate the payload's byte size. Above ~900 KB, don't write; show "Too much data to sync (photos?)".
   - Expose `SoloFlowCloudQueue.state` (pending count, last error, last success) and emit `sync:*` events on `SoloFlowStore.bus`.
8. **Remove dead code (M2):** `__app_id`, `__initial_auth_token`, the overwritten first `window.showToast`, and the unused `measurementId` (unless Phase 4 adds Analytics).

**Done when:** the Phase 0 `test.fail` tests pass (remove the markers), each fix has its own test, and the boot-failure panel is screenshotted with gstatic blocked.

---

## Phase 2: sync engine v2 (the big one)

Goal: no silent data loss across devices, sign-in, or going offline, and no 1 MiB ceiling.

**Start by writing `docs/adr/0001-sync-engine-v2.md`** (context, decision, alternatives, migration, rollback). **Stop and ask the owner to approve it before writing code.** The recommended design:

1. **Per-item documents.**
   - Lists: `artifacts/soloflow-tracker/users/{uid}/{tasks|events|transactions|assets|projects|budgets}/{id}`.
   - Schedule: per-date documents, `schedule/{YYYY-MM-DD}`, plus `schedule/_template` for the weekday template.
   - `settings` and `preferences` stay single documents written with `{ merge: true }`.
   - Every item carries `updatedAt` (ms), `updatedBy` (the existing `soloflow_device_id`), and `deleted: true` delete markers. Purge delete markers after 30 days.
2. **Keep the existing save boundary.** There are 100+ call sites, so don't touch them. Inside each `window.save*()`, diff the in-memory list against the last synced snapshot to produce upserts and deletes. Write only those, batched (`writeBatch`, ≤ 500 operations).
3. **Durable offline writes.** Initialize Firestore with:
   ```js
   initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) })
   ```
   Fall back to memory cache when IndexedDB is unavailable. Firestore then queues writes durably across reloads.
4. **Inbound merge.** Listen with a query on each collection (`onSnapshot`) and apply changes item by item. A remote item replaces the local one only if `remote.updatedAt > local.updatedAt` and no local write for that id is pending. Re-render once per animation frame, not once per document.
5. **Sign-in merge (D1).**
   - When the user changes, wait for each collection's first **server** snapshot. Then merge local and remote by id and `updatedAt`, upload local-only or newer items, and only then attach live listeners.
   - Show a one-time toast: "Added 12 items from this device to your account."
   - If the owner enables anonymous auth, upgrade the anonymous user with `linkWithPopup` / `linkWithRedirect` so the uid and data carry over. On `auth/credential-already-in-use`, sign in to the existing account and merge.
6. **Timer write volume (D3).** `modules/timer.js` writes only the active task's document, every 60 s and on stop, `pagehide`, or `visibilitychange` to hidden. That replaces rewriting the whole list every 10 s.
7. **Photos (D5).** Move them out of task documents.
   - **Default (free plan):** `photos/{photoId}` documents, each holding one compressed JPEG (≤ 600 px wide, ≤ 200 KB). The task stores `photo: { id, width, height, bytes }`.
   - **Option (ask the owner):** Cloud Storage for Firebase. It needs the Blaze plan.
   - Migrate existing base64 `photoUrl` values and keep `photoUrl` readable during the transition. Use IndexedDB for photos when signed out.
8. **Migration from the old documents.**
   - On the first v2 run for a user, if the old `trackerData/*` documents exist and `meta/migration` isn't `{ version: 2 }`: read the old arrays, merge them with local data, write per-item documents in batches, then set `meta/migration = { version: 2, at, counts }`.
   - Make it idempotent and resumable.
   - **Don't delete the old documents.** Add a `migrated: true` field so stale clients can tell.
   - Old clients pick up the new code on their next load (the service worker is network-first). Document the leftover risk in the ADR.
9. **Sync status UI.**
   - Sidebar footer: "Synced · 2 min ago", "Syncing 3 changes…", "Offline · 3 waiting", or "Sync problem" (opens details).
   - Settings: last sync time, pending count, last error, and a "Retry" button.
10. **Emulator tests.** Add `firebase.json` with emulators for auth and firestore, and `firebase-tools` as a dev dependency.
    - Connect to the emulators only when `location.hostname === 'localhost'` and `?emulator=1`. It must be impossible to enable in production.
    - Playwright tests use **two browser contexts signed in as the same emulator user:**
      - Concurrent edits to different tasks both survive.
      - An edit made offline, then a reload, then reconnecting keeps the edit.
      - Signing in keeps local-only items.
      - Migration from seeded old documents gives the same data.
      - A delete propagates and doesn't come back.
      - A 2,000-task workspace with 20 photos syncs.

**Done when:** all of the above tests pass, the ADR is merged, and a manual two-device check on a Vercel preview (phone + laptop) is described in the PR.

---

## Phase 3: security hardening

1. **Remove inline event handlers** (~100 `on*=` attributes in markup and templates). Replace them view by view with `data-action` attributes and delegated listeners. Keep the `window.*` functions, because the command palette and shortcuts call them.
2. **Move the inline `<script type="module">` into `app/legacy-core.js`** and the inline `<style>` into `styles/base.css`. Keep the tiny font-loader script inline, but give it a CSP hash, or move it to a file and accept the font flash.
3. **Security headers in `vercel.json`.**
   - First ship `Content-Security-Policy-Report-Only`. Enforce it once a preview runs clean:
     - `default-src 'self'`
     - `script-src 'self' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/` (the last two only if App Check uses reCAPTCHA)
     - `style-src 'self' https://fonts.googleapis.com` and `style-src-attr 'unsafe-inline'`
     - `font-src https://fonts.gstatic.com`
     - `img-src 'self' data: blob: https:` (banner and task image URLs can be any https)
     - `connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com` plus the error-monitoring ingest host
     - `frame-src https://soloflow-41bfb.firebaseapp.com https://www.google.com/recaptcha/`
     - `worker-src 'self' blob:` (`modules/timer.js` runs a Blob worker)
     - `manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`
   - Also: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
   - **Use `Cross-Origin-Opener-Policy: same-origin-allow-popups`.** Plain `same-origin` breaks `signInWithPopup`.
   - Send `Cache-Control: no-cache` for `/service-worker.js` and `/index.html`.
   - Verify on a preview deployment: popup sign-in on desktop, redirect sign-in from the installed phone app, sync, fonts, photos, banner, `.ics` export, the Google Calendar link, and the timer worker.
4. **Firestore rules in the repo.**
   - Add `firestore.rules` and `.firebaserc` (project `soloflow-41bfb`). Only `request.auth.uid == userId` may read or write `artifacts/{appId}/users/{userId}/{document=**}`; deny everything else.
   - For v2 item documents, check that `updatedAt` is a number, ids match the id pattern, and photo documents are ≤ 900 KB.
   - Test the rules with `@firebase/rules-unit-testing` against the emulator.
   - **Do not deploy them.** The PR asks the owner to diff them against the console's current rules first.
5. **App Check (S2).**
   - Vendor `firebase-app-check.js` and call `initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider('<existing site key>'), isTokenAutoRefreshEnabled: true })`. Use a debug token on localhost and the emulator.
   - Delete the custom `mintLoginToken` flow, so a blocked reCAPTCHA no longer blocks sign-in; App Check failures only degrade sync, with a message.
   - The owner turns on enforcement in the console after a week of monitoring.
6. **Small fixes.**
   - Quote and validate the banner URL before putting it in CSS (S5).
   - Move `SAME_ORIGIN_AUTH_HOSTS` into a small config block and document how to add a custom domain (O5).

---

## Phase 4: operations and release

1. **Error monitoring (O2).**
   - Vendor the Sentry browser SDK as an ESM file, or a provider the owner picks.
   - Initialize it only on production hosts, with the DSN from a config block, and release = app version.
   - Capture: unhandled errors and rejections, boot-watchdog failures, and sync failures (tag the collection and error code).
   - **Privacy:** a `beforeSend` that strips task titles, descriptions, payees, and amounts. Never send storage contents. `sendDefaultPii: false`.
2. **Versioning (O3).**
   - Add `version.json` (`{ "version": "YYYY.MM.DD-<n>" }`) and `scripts/bump-version.mjs`, which rewrites `CACHE_NAME` and every `?v=` query.
   - A CI check fails when app files change without a bump.
3. **Update prompt.** When a new service worker installs, show a toast: "A new version of SoloFlow is ready", with a **Reload** action. Never reload automatically during an edit.
4. **Environments.**
   - Support a second Firebase config for preview deployments (chosen by hostname), so previews never touch production data.
   - Document the owner's steps: create a `soloflow-staging` project and add the preview domains.
5. **`docs/RUNBOOK.md`.** Cover: deploy and instant rollback in Vercel; bumping the version; reading Sentry; restoring a user's data from the old documents or a backup file; and rotating or restricting the API key.

---

## Phase 5: product features for launch

1. **In-app dialogs (U1).**
   - Add `modules/dialogs.js`: `confirmDialog({ title, body, confirmLabel, danger })` and `formDialog({ title, fields, submitLabel })`, each returning a Promise. Build them on `<dialog>` styled like `.sf-sheet`, with focus trap, Esc, and focus returning to the trigger.
   - Replace all 17 `prompt()`/`confirm()` calls. Editing an asset or project becomes one form.
2. **Region settings (B2).**
   - Settings → Region: currency (default PHP), locale (default the browser's), week start (default Monday), saved in `settings`.
   - Add shared `formatMoney(cents, { compact })` and `formatDate` helpers. Use them everywhere: replace the 27 hardcoded `₱`, the `CURRENCY` constant in `modules/finance-charts.js`, the currency in `financeMoney` and `modules/finance.js`, and the `'en-US'` date calls.
3. **Finance (B3).**
   - Undo toast for transaction, budget, asset, and project deletes, matching tasks.
   - CSV export of transactions in the current filter.
   - P2: CSV import with column mapping.
4. **Reminders and notifications.**
   - Ask for permission only from a user action (Settings → Notifications).
   - Per-task and per-event reminders: at the time, or 10 min, 1 h, or 1 day before.
   - Pomodoro phase-end notifications.
   - Deliver through `registration.showNotification` while the app is open or installed.
   - Say plainly in the UI that reminders need SoloFlow open. Background push (FCM + Cloud Functions, Blaze plan) is a later decision for the owner.
5. **Account and privacy (O4).**
   - Settings → Account: signed-in email; "Download all my data" (the v2 backup); "Delete my cloud data" (all item, photo, and old documents, then sign out; typed confirmation); "Sign out and clear this device".
   - Add static `privacy.html` and `terms.html`. Mark them as drafts for the owner's legal review: they cover local storage, Firebase/Google processing, error monitoring, and deletion. Link them from Settings and the sign-in area.
6. **Backup reminders and sign-in messaging (U3).**
   - Replace the toast that appears on every launch with a calm, persistent state. The sidebar footer reads "Not backed up" and opens Backup & restore.
   - Nudge at most once every 7 days, and only when the user isn't signed in and hasn't exported in 30 days.
7. **Accessibility and layout (A1, U2).**
   - Fix the axe findings:
     - `.task-card`: use a proper list or `article` semantics with no nested interactive role.
     - `.command-tabs`: real `role="tab"` children, `aria-selected`, and arrow-key behavior.
     - Contrast of `#btn-clear-done`, `#finance-tx-count`, and `#finance-period-label`.
   - Reserve bottom space so the Pomodoro button and toasts never cover content on any view.
   - Target: zero axe violations on all eight views. Then delete the baseline file.
8. **PWA and brand (M3, M5).**
   - Generate PNG icons from `assets/soloflow-logo.png`: 192, 512, and a maskable 512 with a safe zone, plus a 180 px `apple-touch-icon`.
   - Set the manifest's `theme_color`/`background_color` to `#E2622F`/`#14110E`, split the `any` and `maskable` purposes, and add install screenshots.
   - Add Open Graph and Twitter tags with a 1200×630 image.
9. **P2, if time allows:**
   - First-run onboarding (three steps, plus optional sample data clearable in one click).
   - Recurring tasks, and Trash/Archive with restore.
   - Sync the productivity goal and UI preferences (M4).

---

## Phase 6: performance and maintainability (P2)

1. **Render less** (P1 in the assessment).
   - Render a card's expanded details only when it's opened. Target fewer than 25 DOM nodes per collapsed card.
   - Show the latest 50 Done cards with "Show more".
   - Use the existing `window.patchTaskCard` and `SoloFlowStore.patchCollection` for single-field edits instead of re-rendering everything.
   - Target: 1,500 tasks render in under 200 ms on desktop Chromium. Add a performance test that fails above 400 ms.
2. **Extract the legacy core by area**: auth/sync, settings/theme, tasks, schedule, calendar, finance, productivity. Each becomes a module that keeps its `window.*` API.
   - Remove duplicate implementations: the two theme engines (`index.html` vs `modules/theme.js`), the two `formatText` functions, and the two toasts.
   - Add `node:test` unit tests for the pure functions:
     - Date helpers.
     - `deriveFinanceAnalytics` and `getPreviousFinanceRange`.
     - The chart data builders in `modules/finance-charts.js` (export `monthlyData`, `paceData`, `calendarData`).
     - Event recurrence expansion in `modules/events.js`.
     - `fuzzyScore` in `modules/shortcuts.js`.
3. Drop the `window.*` globals that nothing outside their own module uses.

---

## Definition of done (whole project)

- [ ] No P0 or P1 finding in `ASSESSMENT.md` is open; each is closed by a linked PR or explicitly deferred by the owner.
- [ ] CI runs lint, unit, end-to-end, accessibility, and emulator sync tests on every PR. `main` is green.
- [ ] Two devices editing at once, offline editing, signing in, and importing never lose data (automated tests plus one manual check on a preview).
- [ ] The app still boots and offers "Download my data" with the CDN blocked, storage corrupted, or a module throwing.
- [ ] CSP and security headers are enforced in production, and Firestore rules are in the repo and tested.
- [ ] Errors reach monitoring with private data stripped.
- [ ] Privacy policy, terms, data download, and cloud-data deletion are live.
- [ ] Zero axe violations on all views; no horizontal scroll at 375 px; screenshots in each PR.
- [ ] `README.md`, `docs/RUNBOOK.md`, and the ADR describe how it all works.

## Owner checklist (manual; Claude Code prepares these, the owner does them)

- [ ] Decide on anonymous auth (enable + link-on-sign-in is recommended).
- [ ] Restrict the browser API key to HTTP referrers (production, previews, localhost).
- [ ] Review and deploy `firestore.rules`. Enable App Check in monitor mode, then enforce.
- [ ] Choose where photos live: Firestore documents (free plan) or Cloud Storage (Blaze).
- [ ] Create a Sentry (or alternative) project and provide the DSN.
- [ ] Create a staging Firebase project for previews.
- [ ] Add privacy and terms URLs to the OAuth consent screen. Review the legal drafts.
- [ ] If you use a custom domain, add it to Firebase authorized domains, the OAuth redirect URIs (`/__/auth/handler`), and `SAME_ORIGIN_AUTH_HOSTS`.
- [ ] Set Firebase budget alerts.
