# Prompt: SoloFlow product and UX builds

> **How to use this file.** Open Claude Code at the repository root and say:
> *"Read `docs/product-roadmap/CLAUDE_CODE_PROMPT.md`, then do Build U0."*
> Run one build per session and one pull request per build. Review and merge it, then start the next one the same way ("…then do Build U1"). The builds are ordered so each one can reuse what the previous ones added.

---

## Your role and goal

You are the product engineer and designer making SoloFlow feel like one app instead of eight tabs. SoloFlow is a local-first workspace for solo operators: tasks, events, a weekly schedule, a focus timer, and finance.

It already looks polished. The gaps are in how the parts connect, plus a set of small visual bugs:

- The Today view doesn't show today's events.
- Weekly Schedule blocks aren't linked to tasks.
- Focus history is recorded per day but never shown.
- The finance ledger can't be edited.
- On a phone, the Board shows one task card at a time.

A separate infrastructure brief already exists: `docs/production-readiness/CLAUDE_CODE_PROMPT.md` and `ASSESSMENT.md`. It covers sync, data safety, security, tests, and CI. This brief doesn't repeat it. **Read its "How the app is built" and "Ground rules" sections before you start.** They apply here unchanged.

## Before you start (every build)

1. **Check prerequisites.** If the repo has no `package.json` and `tests/` (production-readiness Phase 0), stop and tell the owner. Recommend running production-readiness Phase 0 and Phase 1 first, for three reasons:
   - They're small.
   - They fix data-loss and code-injection bugs.
   - Phase 0's screenshot and axe tests will catch regressions from this work.

   Continue only if the owner says so. In that case, put your Playwright checks in a script under `scripts/` and attach the screenshots to the PR.
2. **Verify every problem in your build against the current code.** Quotes and line numbers here come from commit `34933d9` and may have moved. If something is already fixed, say so and skip it.
3. **Adapt to what has landed since.** For example:
   - If production-readiness Phase 3 moved the inline script into `app/legacy-core.js`, look for code there.
   - If its Phase 5 added formatting helpers or `modules/dialogs.js`, reuse them instead of building duplicates.
4. **Running the app in tests.** The sandbox may block `www.gstatic.com`. Serve the Firebase SDK from `node_modules/firebase` (11.6.1) using Playwright request routing, as production-readiness Phase 0 describes.

## Rules for this brief (on top of the production-readiness ground rules)

1. **Put new code in `modules/` or `core/`, not `index.html`.** Hook into the legacy core through its `window.*` functions, the way existing modules do. Register new modules in `bootstrap.js` in the order its comments require.
2. **No new inline event handlers.** Use `data-action` attributes and the delegated router from U0. This keeps the work compatible with the CSP planned in production-readiness Phase 3.
3. **Additive data only.**
   - These builds may add **optional fields** to existing items. Each build lists the fields it adds.
   - They must not add new synced localStorage keys, Firestore documents, or collections. New collections, such as Clients, wait for sync engine v2.
   - Old clients must ignore the new fields safely, and old data without them must render correctly.
   - Local-only UI conveniences (a remembered tab, a dismissed hint) may use `soloflow_ui_*` localStorage keys.
4. **Use theme tokens only.** There are 15 theme presets (`THEME_PRESETS` in `modules/theme.js`), both light and dark.
   - Don't hardcode colours. Charts use the `--viz-*` tokens in `styles/architecture.css`.
   - Check every new screen in `graphiteEmber` (dark, the default), `minimalistStudio` (light), and `tokyoNeon` (high chroma).
5. **Give every pointer interaction a keyboard path**, including drag. Every animation respects `prefers-reduced-motion`.
6. **Keep shared logic pure and tested.**
   - Date math, parsing, and derived data go in pure functions with unit tests.
   - Tests use a fixed "now" and run in two time zones: `Asia/Manila` and `America/Los_Angeles`.
7. **Include screenshots in every PR.**
   - Before and after, at 1440×900 and iPhone 13, in a dark and a light theme.
   - Seed realistic data so screens aren't empty:
     - At least 10 tasks across all statuses, with due dates in the past, today, and the future.
     - At least 4 events, including a weekly repeat.
     - At least 100 transactions over 4 months.
     - 2 budgets.
8. **Release steps:**
   - Add new files to `APP_SHELL` in `service-worker.js`.
   - Bump `CACHE_NAME` and the `architecture.css?v=` query, unless versioning is automated by then.
   - Update `README.md` for any user-visible change or new shortcut.

---

## Build U0: shared foundation (small, nothing visible changes)

Goal: build the helpers every later build needs, so they don't each reinvent date math and click handling.

1. **`core/format.js`**
   - `parseISODate('YYYY-MM-DD')` returns a `Date` at **local** midnight. Never use `new Date('YYYY-MM-DD')`: it means UTC midnight, which shows the previous day for anyone west of UTC.
     - Known bug: the finance ledger row uses `new Date(tx.date).toLocaleDateString()` (`index.html`, `renderFinance` ledger rows, ~line 5923). In the Americas, every transaction shows one day early.
     - Grep for other `new Date(` calls on date-only strings and fix them too.
   - `formatDate(iso, style)` supports three styles:
     - `short`: "Thu, Nov 5"
     - `long`: "Thursday, November 5"
     - `relative`: "Today", "Tomorrow", "In 4 days", "Overdue by 1 day"
   - Read the locale from one place. Region settings (production-readiness Phase 5) should then be a one-line change.
   - `formatTime('14:00')` and `formatDuration(seconds)` ("2h 30m").
   - `formatMoney(cents, { compact, sign })`, with one source for the currency (PHP for now).
2. **`core/selectors.js`**: pure functions over plain data. Pass arrays in; don't read `window` inside.
   - `tasksDueOnOrBefore(tasks, iso)`, `tasksCompletedOn(tasks, iso)`, `tasksPlannedFor(tasks, iso)`.
   - `eventsOn(events, iso)`: export and reuse `occursOn` from `modules/events.js`. Don't copy it.
   - `focusSecondsOn(tasks, iso)` and `focusSecondsByDay(tasks, fromIso, toIso)`. They read `task.focusLog` (`{ 'YYYY-MM-DD': seconds }`), which `allocateFocusSeconds` in `modules/timer.js` writes.
   - `spentOn(transactions, iso)`: expenses only, in cents.
   - `scheduleBlocksOn(scheduleData, iso)`: dated entries plus the weekday template, with the same precedence as the legacy schedule renderer.
3. **`core/actions.js`**: `registerActions({ 'task.complete': (el, event) => … })`.
   - Installs one delegated `click` listener on `document` that dispatches on `closest('[data-action]')` and passes `el.dataset`.
   - Non-button elements also handle `keydown` Enter and Space.
   - Unknown actions log a warning on localhost only.
4. **Tests** for all of the above, including:
   - A date-only string in `America/Los_Angeles`.
   - A weekly repeating event across a daylight-saving change.

**Done when:** tests pass, the ledger date bug is fixed and covered by a test, and nothing else visibly changes.

---

## Build U1: polish pass (visible bugs and rough edges)

Each item below was seen in the running app on 2026-11-05. Fix them all in one PR, with before and after screenshots of each.

1. **Month Calendar dates jump up and down.** Day numbers sit at different heights depending on how many chips the day has. In the Nov 2–8 row, "2", "5", and "6" sit high while "3" and "7" sit low.
   - Likely cause: each `.calendar-day` is a `<button>`, and browsers centre a button's contents vertically.
   - Fix: pin the contents to the top (`.calendar-day` in `styles/architecture.css`). Check Chromium and WebKit.
2. **Today's Focus and Backlog show a Done column that can never fill.** Their filters in `renderTasks` (`currentView === 'today'` / `'backlog'`) exclude done tasks. So Done always says "No completed work yet · Add your first task", even after the user finished tasks today.
   - **Today:** the Done column shows tasks completed today (`tasksCompletedOn`), with fitting empty-state copy ("Nothing finished yet today"). U2 later replaces this view entirely.
   - **Backlog:** hide the Done column, and the Done tab on phones. Let the other two columns use the width.
   - **Everywhere:** show the empty state's "Add your first task" button only when the user has zero tasks.
3. **The command palette is noisy.**
   - Command titles start with a literal `> ` (in `modules/shortcuts.js`, e.g. `'> New Task'`), and every row carries a "Command" tag.
   - Fix:
     - Remove the prefix.
     - Group results under small section headings (Commands, Tasks, Events, Finance) instead of tagging each row.
     - Show the keyboard shortcut on the right where one exists (N, P, T, 1–6).
     - Rename "Open the Financial Command Center" to "Open Finance".
4. **Dates are formatted inconsistently.** Use `core/format.js` everywhere a person reads a date. Known cases:
   - Productivity "Needs attention" says "Overdue since 2026-11-04" (raw ISO), while cards say "Overdue by 1 day".
   - The ledger shows "11/5/2026".
5. **The ledger shows internal tags.** The classification column reads "needs expense one-time".
   - Show a category chip, plus "Need", "Want", or "Saving".
   - Show "Monthly" (or the frequency) only when it isn't one-time.
   - Drop "expense" and "income": the amount's sign and colour already say it.
6. **The category suggestions are someone's personal list.** `#financeCategoryList` is hardcoded with entries like "PC Parts & Electronics", "Musical Instruments", and "Vehicle Mods".
   - Build the list from categories this user has actually used, most-used first.
   - Top it up with a short neutral default set: Food & Dining, Transport, Housing & Utilities, Subscriptions, Software & Tools, Health, Income, Savings.
   - Do the same for the task category field (`#taskCategory`). It's free text with no suggestions today, so a typo splits "Time by category".
   - Change only the suggestions, never the stored data.
7. **Tasks and events look the same** on the Month Calendar and in the Weekly Schedule's all-day row: the same pill with a slightly different dot.
   - Give tasks a checkbox-style marker, struck through when done.
   - Give events a solid colour bar using their colour tag.
   - Add a small two-item legend.
8. **An assignee filter in a solo app.** Hide `#assigneeFilter` unless at least one task has an assignee.
9. **"Avg. time to finish a task: 0.0 days"** appears when there's no data. `averageCycleDays` falls back to `0` when it has no samples. Show "—" with "Not enough data yet" until at least 3 finished tasks have a start time.

**Done when:** every item has before and after screenshots, and axe shows no new violations.

---

## Build U2: a real Today view

**Problem:** "Today's Focus" is the Kanban board with a date filter. It doesn't show:

- Today's events. A client call at 11:00 is invisible there.
- What you finished today.
- How much focus time you've logged.
- What you've spent.

Today is the screen a solo operator opens first, and it should connect the whole app.

Replace the Today view's content. Keep `setView('today')`, `#tab-today`, the `2` shortcut, and the nav badge.

**Layout:** two columns on desktop; one column on phones, in the order listed.

1. **Header.** "Thursday, November 5", plus a one-line summary: "3 to do · 1 event · 1h 30m focused of 4h".
2. **Top 3** (left, top). Up to three tasks pinned for today.
   - **Empty state = the morning plan:** "Pick up to 3 things for today", with one-tap pins for suggestions in this order: overdue, due today, in progress, backlog.
   - Stored as the optional field `task.plannedFor = 'YYYY-MM-DD'`.
   - Unfinished pins from earlier days show as "Carried over from Tue".
3. **Agenda** (right). A vertical timeline with a "now" line.
   - It runs from 7:00 (or the first item, if earlier) to 20:00 (or the last item, if later).
   - It shows:
     - Today's events (`eventsOn`, including repeats).
     - Tasks with a `dueTime`.
     - Weekly Schedule blocks (`scheduleBlocksOn`).
   - All-day items sit above the timeline.
   - Clicking an event opens its editor; clicking a task opens the task.
4. **Due & overdue** (left). Today's other open tasks, overdue first, in compact cards with the existing Start and Complete actions.
5. **Done today.** Collapsible. Tasks from `tasksCompletedOn(today)` with focus time per task, and Reopen with Undo.
6. **Focus ring.** Today's focus against the daily goal (`productivitySettings.dailyFocusTargetSeconds`). A "Start next" button starts the top unfinished Top 3 task, using the same path as the palette's Start Focus Timer.
7. **Money strip.** Shown only if the user has any transactions.
   - Spent today against the daily target (`financePreferences.dailyTargetCents`), with a link to Finance.
   - A "Log expense" button opens the finance record form prefilled with today's date.
8. **End of day.** Appears after 17:00 local, or from a "Wrap up" button.
   - Lists unfinished Top 3 and due-today tasks.
   - "Move all to tomorrow" sets their `dueDate` and `plannedFor` to tomorrow, with a single Undo toast. Per-task choices are also offered.

Search and Quick Capture stay on Today, and capture there defaults the due date to today.

**Design:**

- Reuse the existing panel surfaces (like `.finance-panel`), card components, and `modules/icons.js`. Don't introduce a new visual language.
- Use `core/selectors.js` for all data.
- Re-render once per animation frame when the `tasks`, `events`, `schedule`, or `transactions` store topics change.

**Tests** (clock fixed at 10:30 Manila, seeded data):

- The 11:00 event appears, with the now line above it.
- A pinned task survives a reload.
- "Move all to tomorrow" works, and Undo restores the tasks.
- A weekly event appears on the right weekday.
- No horizontal scroll on phone.

---

## Build U3: smart quick capture

**Problem:** adding a task with a date, time, category, and priority means opening "Add details" and filling four fields. Fast capture is the core loop of a task app.

1. **`core/parse-capture.js`**: `parseCapture(text, { now, locale, categories })` returns `{ title, dueDate?, dueTime?, category?, priority?, assignee?, tokens: [{ type, start, end, raw, value }] }`. It's a pure function with no DOM access.
   - **Dates:**
     - `today`/`tod` and `tomorrow`/`tmr`.
     - Weekday names and 3-letter abbreviations mean the next occurrence; "next fri" means the one after that.
     - `in 3 days`.
     - `next week` means next Monday, or the user's week start if Region settings exist.
     - `nov 12` and `12 nov`.
     - `11/12`, with day/month order taken from the locale.
   - **Times:** `2pm`, `2:30pm`, `14:00`, `at 9`. A time with no date means today if that time is still ahead, otherwise tomorrow.
   - **Tags:**
     - `#category` matches existing categories case-insensitively; new categories are allowed.
     - `!high`, `!h`, or `!!!` set high priority; `!low` sets low.
     - `@name` sets the assignee.
   - **Ambiguity.** Strip a token from the title only when it's clearly a token.
     - "Meet at the Monday Club" must keep "Monday". Accept a date word only at the end of the text or next to another token.
     - Quoted text is never parsed: `Read "Friday Black"` stays a plain title.
     - When in doubt, keep the text in the title and let the user tap the suggestion.
   - **Unit tests:** at least 40 cases, covering the ambiguous ones, month ends, the year rollover, and `America/Los_Angeles`.
2. **Capture bar UI** (`#taskTitle`):
   - As you type, recognised tokens are highlighted and shown as chips under the input ("Fri, Nov 6 · 2:00 PM", "#client", "High").
   - Each chip has an ✕ that turns that text back into plain title.
   - Enter creates the task with the parsed fields.
   - The "Add details" fields show the parsed values, and the two stay in sync.
3. **Command palette:** when nothing matches, and always as the last row, offer "Create task: <parsed preview>".
4. Leave "Paste from email" unchanged.
5. **First-use hint.** Show "Try: Invoice Halcyon fri 2pm #client !high" under the bar until the user dismisses it or uses a token. Remember the dismissal locally.

---

## Build U4: the phone experience

**Problem:** on an iPhone 13 (390×664 viewport), the first task card on the Board starts about 410 px down, so you see one card. Above it sit the app bar, page title, subtitle, search, two filter selects, the capture bar, and the column tabs. The floating Pomodoro pill also covers the bottom card on every view.

1. **Compact header on phones (≤ 640 px).**
   - Show only the page title, with the count pill inline; hide the subtitle.
   - Move search and the category and assignee filters behind one "Search & filter" icon button that opens a sheet. Show a dot on the button when a filter is active.
2. **Capture.** On phones, replace the always-visible capture bar with a "+" floating button. It opens capture as a bottom sheet (with U3's chips) and raises the keyboard immediately.
3. **One floating control, not two.**
   - While the focus timer is idle, show only "+".
   - While a timer runs, dock a slim "now focusing" bar above the tab bar (task title, time left, pause, stop), with "+" above it.
   - Reserve bottom padding on every view so neither covers content. This also closes production-readiness finding U2 if it's still open.
4. **Swipe actions on task cards** (touch only).
   - Swipe right to complete. Swipe left to move the due date to tomorrow.
   - Show the action's colour and icon as the card slides. Trigger at about 35% of the card width. Offer Undo in a toast.
   - Long-press opens the existing context menu.
   - The card's buttons remain the accessible path.
5. **Month Calendar on phones** shows only dots. Add an agenda list under the grid for the selected day (default today), rendered the same way as U2's agenda.
6. **Board column tabs** (To Do / In Progress / Done) stay pinned under the header while scrolling.
7. **Safe areas.** Respect `env(safe-area-inset-bottom)` for the tab bar, floating button, and sheets. Test in the installed (standalone) display mode.

**Tests** on iPhone 13 with seeded data:

- At least 3 task cards are visible above the fold on the Board.
- On every view, after scrolling to the bottom, the floating button and focus bar don't overlap the last item (compare bounding boxes).
- Swipe to complete works, and Undo restores the task.

---

## Build U5: time-blocking (tasks on the Weekly Schedule)

**Problem:** Weekly Schedule blocks are free text typed into cells (`modules/schedule.js`), with no link to tasks. You plan the week in one place and track the work in another, and nothing compares the plan with what actually happened.

1. **Data.** Schedule entries gain an optional `taskId`: `{ text, bg, span, hidden, taskId? }`. `text` keeps a copy of the task title, so old clients still show something.
2. **Task tray** (desktop).
   - A collapsible, searchable panel beside the week grid lists open tasks: Top 3 first, then due this week, then backlog.
   - Drag a task onto a slot to create a linked block, one hour long by default.
   - Drag a block's bottom edge to resize it (reuse the existing merge logic), or drag the block to move it.
3. **Keyboard and phone path.** A "Schedule…" action in the task card menu opens a sheet with day, start time, and duration. On phones this is the only path; there's no drag.
4. **Linked blocks:**
   - Show the live task title and a status marker.
   - A play button starts the focus timer on that task. A check button completes it.
   - If the task is deleted, the block falls back to its `text` copy, struck through, labelled "Task deleted".
5. **Plan vs actual.**
   - Each day header shows "Planned 3h · Focused 1h 40m": linked block minutes against `focusSecondsOn` for that day.
   - Each linked block shows a thin bar of focused against planned minutes for that task on that day.
6. Tasks with a `dueTime` show as a marker at that time. Check whether this already happens.
7. The U2 agenda picks up linked blocks automatically through `scheduleBlocksOn`.

**Tests:**

- Dragging a task to Thu 14:00 creates a linked block.
- Resizing the block to 2 hours works.
- The block persists after a reload.
- Completing the task from the block updates the board.
- The keyboard path creates the same block.
- Old free-text blocks are unchanged.

---

## Build U6: Finance, restructured

**Problem:** on desktop, Finance is one page about 3,000 px tall. In order, it shows:

- The record form.
- The filters.
- Four KPIs.
- Six chart panels.
- Only then the ledger, collapsed to 6 rows.

Transactions can't be edited, only deleted, so a typo in an amount means deleting and re-entering it. And "Liquid cash" and "Daily target" are settings, but they sit in the filter row.

1. **Sub-tabs** under the Finance header: Overview · Transactions · Budgets · Assets & projects.
   - Remember the last tab locally, and support `?view=finance&tab=transactions`.
   - Use a real `role="tablist"`, with arrow keys moving between tabs.
   - What goes where:
     - **Overview:** the KPIs and the existing charts, unchanged, from `modules/finance-charts.js`.
     - **Transactions:** the ledger, as the main content.
     - **Budgets:** the budget meters, the Set Budget form, and the needs/wants split.
     - **Assets & projects:** the existing capital, assets, and project budget panels.
   - The period, type, and frequency filters stay in a shared bar under the tabs and apply to every tab.
2. **Record form.**
   - On desktop, a compact single row on every tab: payee, amount, category, date, an Expense/Income toggle, and Record.
   - On phones, a bottom sheet opened from the "+" button (U4), defaulting to "Log expense" on Finance.
3. **Ledger.**
   - Group rows by day, with the day's net total in the group header.
   - Add search (payee, category, notes), category filter chips, and sorting by date or amount.
   - Show 50 rows, then "Show more". Don't collapse the ledger by default.
   - Clicking a row opens it for editing in a sheet with every field. Delete lives inside the sheet and offers Undo, which closes production-readiness finding B3 for transactions if it's still open.
   - Multi-select for bulk delete and bulk re-categorise.
4. **Targets.**
   - Move "Liquid cash" and "Daily target" out of the filter row into a "Targets" button on Overview that opens a small sheet.
   - Show the values read-only in the KPIs that use them, e.g. "Runway · based on ₱120,000 cash · Edit".
5. **Recurring & subscriptions card** on Overview.
   - Lists transactions whose `frequency` isn't one-time, grouped by payee, with the monthly-equivalent cost and a total ("₱4,200 a month in subscriptions").
   - If a payee appears in at least 3 of the last 4 months with similar amounts (within 10%) and isn't marked recurring, suggest "Looks recurring. Mark as monthly?"
6. Keep every existing chart and its Table toggle, `window.SoloFlowFinance`, and every finance `window.*` function working.

**Tests:**

- Editing a transaction's amount updates the KPIs and charts.
- Undo restores a deleted transaction.
- The tab deep link opens the right tab.
- Filters persist across tabs.
- No horizontal scroll on phone.

---

## Build U7: productivity trends and a weekly review

**Problem:** `modules/timer.js` already records focus seconds per task per day in `task.focusLog`, but the Productivity Hub shows only today. Finance has trend charts; productivity has none.

1. **Trend panels in the Productivity Hub.**
   - Reuse the chart patterns and `--viz-*` tokens from `modules/finance-charts.js`. Like the finance charts, every chart gets hover and keyboard read-outs and a Table toggle.
   - **Focus calendar:** a daily focus heatmap for the last 26 weeks. Reuse the spending-calendar component; factor it into a shared builder rather than copying it.
   - **Focus by week:** bars for the last 12 weeks against the weekly goal (daily goal × working days).
   - **Finished per week:** the last 12 weeks.
   - **Where your time goes, over time:** each category's share per week, as stacked bars (top 5 categories plus Other).
2. **Weekly review.**
   - Opened from a button in the Hub.
   - Also nudged on Friday after 15:00, or Monday morning if last week wasn't reviewed. Nudge at most once a week, and make it dismissible.
   - A guided sheet with four steps:
     1. **Done:** what you finished this week, focus hours against the goal, and your best day.
     2. **Slipped:** open tasks that were due or planned this week. For each: Reschedule (date picker), Move to backlog, or Drop (delete with Undo).
     3. **Money:** money in and out this week against the weekly average, the biggest expense, and budgets at risk.
     4. **Next week:** pick next week's priorities, and drag them onto next week's schedule if U5 has landed.
   - **Finish:** offer "Save as PDF" through the existing print path in `modules/reports.js`, and record `lastReviewedWeek` in `settings` (an additive field).
3. Format every duration in the Hub with `formatDuration`.

**Tests:**

- Seeded `focusLog` data across 12 weeks gives the right totals, checked against a hand-computed fixture.
- Rescheduling in the review works, and Undo restores the task.
- Reduced motion is respected.

---

## Build U8: motion and feel

This build is purely presentational. Do it last so it covers the new screens.

1. **View switches** use the View Transitions API (`document.startViewTransition`) where it's supported.
   - The main panel gets a quick crossfade with an 8 px rise.
   - The sidebar and tab bar stay still (give them a `view-transition-name`).
   - Where the API isn't supported, switch instantly.
2. **Completing a task.**
   - The checkmark draws in about 200 ms, then the card moves into Done (FLIP with `getBoundingClientRect`, or a named view transition).
   - Moving a card between columns by drag uses the same animation.
3. **Toasts, sheets, and the palette** share one enter and exit motion: opacity plus a 6–8 px shift over 160–200 ms, ease-out on enter and ease-in on exit.
   - Define these as tokens (`--motion-fast`, `--motion-base`, `--ease-out`, `--ease-in`) in `styles/architecture.css`.
4. **Skeletons** for the first paint of the board and of Finance. Measure first, and add them only if the first render takes more than 150 ms.
5. **Limits.** All motion is off under `prefers-reduced-motion: reduce`. Never animate layout on lists of more than 200 items.

---

## Later: Clients (after sync engine v2)

Don't start this until production-readiness Phase 2 (per-item sync) has merged, because it adds a new collection. If the owner asks before then, write an ADR only.

- **A Client item:** name, hourly rate, currency, colour, and notes. Tasks, events, transactions, and finance projects can link to a client.
- **A page per client:**
  - Open tasks and upcoming events.
  - Focus hours this month.
  - Billed and unbilled hours (times the rate).
  - Income received.
- **"Draft invoice":**
  - Select unbilled focus time to produce a printable invoice through the existing print-to-PDF path.
  - "Mark sent" records expected income.
  - "Mark paid" creates a real income transaction.
- **Why:** this is SoloFlow's natural edge for freelancers. Users already tag tasks "Client", and Finance already has project budgets.

---

## Definition of done (this brief)

- [ ] Today shows the day's events, tasks, schedule blocks, finished work, focus, and spending in one place.
- [ ] A task with a date, time, category, and priority can be captured in one line.
- [ ] On a phone, at least 3 cards are visible on the Board, and nothing floating covers content.
- [ ] Tasks can be scheduled onto the week, and the week shows planned against focused time.
- [ ] Finance has tabs, an editable ledger, and recurring costs at a glance.
- [ ] Productivity shows 12-week trends, and a weekly review exists.
- [ ] Every PR includes desktop and phone screenshots in dark and light themes, no new axe violations, tests for new logic, and an updated README.
