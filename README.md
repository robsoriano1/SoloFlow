# SoloFlow

This package keeps the original SoloFlow DOM IDs, Firebase listeners, local-storage schema, finance ledgers, and import/export behavior. Its modular enhancement layer adds reactive state events, debounced cloud writes, an accurate worker timer, batch operations, charts, reporting, an accessible command shell, inline editing, and offline support.

## Run locally

Service workers and ES modules require HTTP(S); they do not install from `file://` URLs.

```bash
python3 -m http.server 8080 --directory .
```

Open `http://localhost:8080/index.html`.

## Development

The app itself has no build step and no runtime dependencies. `package.json` only holds development tools: Playwright, axe, ESLint, and the Firebase SDK (pinned to the 11.6.1 build the app loads from the CDN, so tests can serve it locally).

```bash
npm install
npx playwright install chromium
```

- `npm run serve`: serve the app at `http://127.0.0.1:8080/index.html` (`--port` to change it).
- `npm run lint`: ESLint over `bootstrap.js`, `core/`, `modules/`, the service worker, scripts and tests. The inline script in `index.html` isn't linted yet.
- `npm test`: unit tests (`node --test`), then the end-to-end tests.
- `npm run test:e2e`: only the Playwright tests. Add `--project=desktop` or `--project=phone`, or `--ui` to watch them run.
- `npm run test:a11y:update`: re-record `tests/a11y-baseline.json` after fixing accessibility issues.

What the tests cover:

- **Hermetic runs.** The tests never reach production. The Firebase SDK is served from `node_modules/firebase`, and every other outside request (Firebase APIs, reCAPTCHA, Google Fonts) is blocked. The clock is frozen at 10:30 on Thursday, 5 November 2026, in `Asia/Manila`. Shared fixtures are in `tests/e2e/fixtures.js`, and seed data in `tests/support/seed.js`.
- **Two devices.** Each test runs at desktop size (1440×900) and on iPhone 13. Any uncaught page error fails the test.
- **Smoke tests** (`tests/e2e/smoke.spec.js`): boot; a task's full lifecycle with Undo; adding an event and a transaction; every view; no sideways scrolling on phones; the `N` and `Cmd/Ctrl+K` shortcuts; and each finance chart with its Table view.
- **Known bugs** (`tests/e2e/regressions.spec.js`): each one is reproduced and marked `test.fail`, named by its finding ID in `docs/production-readiness/ASSESSMENT.md`. When a fix makes one pass, Playwright reports it, and the fix removes the marker.
- **Accessibility** (`tests/e2e/a11y.spec.js`): axe checks WCAG 2.0 A/AA and 2.1 AA on all eight views. Known violations are listed in `tests/a11y-baseline.json`, and the test fails on anything new.

CI (`.github/workflows/ci.yml`) runs lint and `npm test` on every pull request and on pushes to `main`, and uploads the Playwright report as an artifact.

## Keyboard shortcuts

- `N`: new task capture
- `Cmd/Ctrl + K` or `/`: open the global command palette
- `F`: focus the Kanban search field
- `Space` or `P`: toggle focus timer
- `T`: show or hide the floating Pomodoro button (the timer keeps running while hidden)
- `1`–`6`: Kanban, Focus, Backlog, Schedule, Productivity, Finance
- `Escape`: close overlays and clear batch selection

Multi-select Kanban cards with `Shift+Click` for a range or `Ctrl/Cmd+Click` for individual cards.

## Events

The **Events** tab groups events into Today, Tomorrow, Next 7 days, Later and Past, with search and a one-click **Clear past**. Events can repeat daily, weekly, monthly or yearly (optionally until a date), carry an end time, location, notes and a color tag, and show on the Weekly Schedule and Month Calendar on every date they occur. Each event's **⋯** menu can duplicate it, turn it into a prep task on the board, add it to Google Calendar, or download it as an `.ics` file; **Export .ics** saves every event currently shown. Deleting an event or clearing past events offers a five-second Undo.

## Tasks

Right-click a task for completion, focus, duplicate, link, and delete actions. Task deletions and status changes provide a five-second Undo notification. Use the control-bar switcher to alternate between Comfortable cards and Compact spreadsheet-style rows.

## Finance

The **Finance Tracker** charts follow the reporting period and type filters:

- **Cash flow by month:** income against spending for the last six months.
- **Spending pace:** this period's running total against the same point last period and your daily target.
- **Spending calendar:** a daily heatmap with no-spend days, your biggest day and your priciest weekday.

Hover or tab to any chart for exact figures. **Table** shows the same data as rows. KPI tiles and category bars compare against the same point in the previous period. Budgets mark where an even pace would put you today. Runway averages up to 90 days of spending.

## Production readiness

`docs/production-readiness/ASSESSMENT.md` lists what still stands between SoloFlow and a production launch. `docs/production-readiness/CLAUDE_CODE_PROMPT.md` is a phased brief for Claude Code to build it.

## Product roadmap

`docs/product-roadmap/CLAUDE_CODE_PROMPT.md` is a build-by-build brief for Claude Code covering product and UX work: shared date and action helpers, a polish pass, a real Today view, one-line smart capture, the phone layout, time-blocking tasks on the Weekly Schedule, a restructured Finance page, productivity trends with a weekly review, and motion. It assumes production-readiness Phases 0 and 1 have landed.

## PDF reports

Use **Generate summary**, then **Print / Save PDF**. The browser print dialog provides the platform-native PDF export while keeping the app dependency-free.
