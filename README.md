# SoloFlow

This package keeps the original SoloFlow DOM IDs, Firebase listeners, local-storage schema, finance ledgers, and import/export behavior. Its modular enhancement layer adds reactive state events, debounced cloud writes, an accurate worker timer, batch operations, charts, reporting, an accessible command shell, inline editing, and offline support.

## Run locally

Service workers and ES modules require HTTP(S); they do not install from `file://` URLs.

```bash
python3 -m http.server 8080 --directory .
```

Open `http://localhost:8080/index.html`.

## Keyboard shortcuts

- `N`: new task capture
- `Cmd/Ctrl + K` or `/`: open the global command palette
- `F`: focus the Kanban search field
- `Space` or `P`: toggle focus timer
- `1`–`6`: Kanban, Focus, Backlog, Schedule, Productivity, Finance
- `Escape`: close overlays and clear batch selection

Multi-select Kanban cards with `Shift+Click` for a range or `Ctrl/Cmd+Click` for individual cards.

## Events

The **Events** tab groups events into Today, Tomorrow, Next 7 days, Later and Past, with search and a one-click **Clear past**. Events can repeat daily, weekly, monthly or yearly (optionally until a date), carry an end time, location, notes and a color tag, and show on the Weekly Schedule and Month Calendar on every date they occur. Each event's **⋯** menu can duplicate it, turn it into a prep task on the board, add it to Google Calendar, or download it as an `.ics` file; **Export .ics** saves every event currently shown. Deleting an event or clearing past events offers a five-second Undo.

## Tasks

Right-click a task for completion, focus, duplicate, link, and delete actions. Task deletions and status changes provide a five-second Undo notification. Use the control-bar switcher to alternate between Comfortable cards and Compact spreadsheet-style rows.

## PDF reports

Use **Generate summary**, then **Print / Save PDF**. The browser print dialog provides the platform-native PDF export while keeping the app dependency-free.
