{
  "name": "SoloFlow — Task and Events Workspace",
  "short_name": "SoloFlow",
  "description": "Offline-ready task, focus, calendar, finance, and project command center.",
  "id": "./index.html",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#0F172A",
  "theme_color": "#6366F1",
  "categories": ["productivity", "finance", "business"],
  "icons": [
    { "src": "./assets/icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any maskable" }
  ],
  "shortcuts": [
    { "name": "New task", "short_name": "New task", "url": "./index.html?action=new-task", "icons": [{ "src": "./assets/icon.svg", "sizes": "any", "type": "image/svg+xml" }] },
    { "name": "Finance", "short_name": "Finance", "url": "./index.html?view=finance", "icons": [{ "src": "./assets/icon.svg", "sizes": "any", "type": "image/svg+xml" }] }
  ]
}

