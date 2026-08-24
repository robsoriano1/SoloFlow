# SoloFlow Command Center PWA

This package keeps the original SoloFlow DOM IDs, Firebase listeners, Google Calendar and Gmail REST integrations, local-storage schema, finance ledgers, and import/export behavior. A compatibility bootstrap adds modular state events, debounced cloud writes, an accurate worker timer, batch operations, charts, reporting, shortcuts, and offline support.

## Run locally

Service workers and ES modules require HTTP(S); they do not install from `file://` URLs.

```bash
python3 -m http.server 8080 --directory .
```

Open `http://localhost:8080/index.html`.

## Keyboard shortcuts

- `N`: new task capture
- `/` or `F`: search
- `Space` or `P`: toggle focus timer
- `1`–`6`: Kanban, Focus, Backlog, Schedule, Calendar, Finance
- `Escape`: close overlays and clear batch selection

Multi-select Kanban cards with `Shift+Click` for a range or `Ctrl/Cmd+Click` for individual cards.

## PDF reports

Use **Generate summary**, then **Print / Save PDF**. The browser print dialog provides the platform-native PDF export while keeping the app dependency-free.

