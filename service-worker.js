@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=Epilogue:wght@500;600;700&family=Fira+Code:wght@400;500;600&family=Fraunces:opsz,wght@9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;500;600&family=JetBrains+Mono:wght@500;600;700&family=Manrope:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,600;6..72,700&family=Outfit:wght@400;500;600;700;800&family=Public+Sans:wght@400;500;600;700&family=Sora:wght@500;600;700&family=Source+Sans+3:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');

.batch-action-bar {
  position: fixed; left: 50%; bottom: max(18px, env(safe-area-inset-bottom)); z-index: 1000;
  transform: translateX(-50%); display: flex; align-items: end; gap: 10px; flex-wrap: wrap;
  width: min(920px, calc(100vw - 28px)); padding: 12px; color: var(--card-text);
  background: color-mix(in srgb, var(--surface) 92%, transparent); border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); backdrop-filter: blur(18px);
}
.batch-action-bar[hidden] { display: none; }
.batch-field { display: grid; gap: 3px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
.batch-field select { min-width: 120px; padding: 8px 10px; }
.task-card.batch-selected { outline: 3px solid var(--primary); outline-offset: 2px; box-shadow: 0 0 0 6px var(--focus-ring), var(--shadow-md); }
.project-epic-badge { display: inline-flex; margin: 4px 0 7px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.report-launcher { display: block; margin: -12px 0 18px auto; }
.command-visual-grid { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(280px, .8fr); gap: 16px; margin-top: 16px; }
.cash-flow-chart svg { display: block; width: 100%; min-height: 230px; overflow: visible; }
.cash-gridline { stroke: var(--surface-border); stroke-width: 1; }
.cash-line { fill: none; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; }
.cash-line.income { stroke: var(--success); }
.cash-line.expense { stroke: var(--danger); }
.cash-area.expense { fill: rgba(var(--danger-rgb), .08); }
.cash-chart-legend { display: flex; gap: 16px; font-size: 12px; font-weight: 700; }
.cash-chart-legend span::before { content: ''; display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; background: var(--success); }
.cash-chart-legend span + span::before { background: var(--danger); }
.project-delivery-row { display: grid; gap: 5px; padding: 10px 0; border-bottom: 1px solid var(--surface-border); }
.project-delivery-row span { color: var(--text-muted); font-size: 11px; }
.project-dual-track { position: relative; height: 9px; background: rgba(var(--surface-rgb), .5); border: 1px solid var(--surface-border); border-radius: 999px; overflow: hidden; }
.project-dual-track i { position: absolute; inset: 0 auto 0 0; display: block; border-radius: inherit; }
.project-dual-track .delivery { background: var(--primary); height: 4px; top: 0; }
.project-dual-track .spend { background: var(--warning); height: 4px; top: auto; bottom: 0; }
.summary-report-modal { width: min(880px, calc(100vw - 24px)); max-height: calc(100vh - 24px); padding: 0; color: var(--card-text); background: var(--surface); border: 1px solid var(--surface-border-strong); border-radius: var(--radius-xl); box-shadow: var(--shadow-lg); }
.summary-report-modal::backdrop { background: rgba(4, 8, 18, .72); backdrop-filter: blur(8px); }
.report-shell { padding: 24px; }
.report-actions { display: flex; justify-content: flex-end; gap: 8px; position: sticky; top: 0; padding-bottom: 16px; background: var(--surface); z-index: 2; }
.report-body { max-width: 720px; margin: auto; }
.report-body h1 { font-family: var(--font-display); font-size: clamp(28px, 5vw, 46px); }
.report-meta { color: var(--text-muted); }
.report-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 24px 0; }
.report-metrics div { padding: 16px; background: var(--bg); border: 1px solid var(--surface-border); border-radius: var(--radius-md); }
.report-metrics strong, .report-metrics span { display: block; }
.report-metrics strong { font: 800 24px/1 var(--font-metric); }
.report-metrics span { margin-top: 6px; color: var(--text-muted); font-size: 11px; }
.offline-banner { position: fixed; right: 16px; bottom: 16px; z-index: 1200; padding: 9px 12px; color: #fff; background: #27272a; border-radius: 999px; box-shadow: var(--shadow-lg); font-size: 12px; font-weight: 700; }
@media (max-width: 760px) {
  .command-visual-grid { grid-template-columns: 1fr; }
  .batch-action-bar { align-items: stretch; }
  .batch-action-bar > * { flex: 1 1 120px; }
  .batch-action-bar > strong { flex-basis: 100%; }
  .report-metrics { grid-template-columns: 1fr; }
  .report-launcher { margin: 0 0 16px; width: 100%; }
}
@media (max-width: 380px) {
  .batch-field select { min-width: 0; width: 100%; }
  .report-shell { padding: 15px; }
}
@media print {
  body.printing-report > *:not(#summary-report-modal) { display: none !important; }
  body.printing-report #summary-report-modal { position: static; display: block; width: 100%; max-height: none; border: 0; box-shadow: none; }
  body.printing-report .report-actions { display: none; }
  body.printing-report .report-body { max-width: none; color: #111; }
}

/* 2026 command shell */
body.app-shell {
  --sidebar-width: 252px;
  --sidebar-collapsed-width: 76px;
  min-width: 360px;
  padding-left: calc(var(--sidebar-width) + 24px) !important;
  font-family: var(--font-body) !important;
  transition: padding-left .28s cubic-bezier(.16, 1, .3, 1);
}
body.app-shell.sidebar-collapsed { padding-left: calc(var(--sidebar-collapsed-width) + 24px) !important; }
.app-shell .container { max-width: 1500px; }
.app-shell .control-panel { grid-template-columns: minmax(240px, 1fr) auto auto auto auto; }
.app-shell .column h3 { top: 14px; }
.app-shell h1, .app-shell h2, .app-shell h3, .app-shell h4 { font-family: var(--font-display); }
.app-sidebar {
  position: fixed; inset: 14px auto 14px 14px; z-index: 900; width: var(--sidebar-width);
  display: flex; flex-direction: column; gap: 14px; padding: 14px;
  color: var(--card-text); background: color-mix(in srgb, var(--surface) 91%, transparent);
  border: 1px solid var(--surface-border-strong); border-radius: 22px;
  box-shadow: 0 28px 70px -38px rgba(0,0,0,.72); backdrop-filter: blur(24px) saturate(1.25);
  transition: width .28s cubic-bezier(.16,1,.3,1), background .2s ease;
}
.sidebar-brand { display: grid; grid-template-columns: 38px minmax(0, 1fr) 30px; align-items: center; gap: 10px; min-height: 42px; }
.sidebar-mark { display: grid; place-items: center; width: 38px; aspect-ratio: 1; color: var(--primary-contrast-text); background: var(--primary); border-radius: 12px; font: 800 17px/1 var(--font-display); box-shadow: 0 9px 24px -12px var(--primary); }
.sidebar-brand-copy { min-width: 0; display: grid; }
.sidebar-brand-copy strong { font: 750 15px/1.15 var(--font-display); }
.sidebar-brand-copy small { margin-top: 4px; color: var(--text-muted); font-size: 9px; letter-spacing: .08em; text-transform: uppercase; }
.sidebar-toggle { width: 30px; height: 30px; padding: 0; color: var(--card-text); background: transparent; border: 1px solid var(--surface-border); border-radius: 9px; font-size: 19px; }
.sidebar-command { display: grid; grid-template-columns: 24px 1fr auto; align-items: center; gap: 8px; width: 100%; padding: 10px; color: var(--card-text); text-align: left; background: color-mix(in srgb, var(--bg) 48%, transparent); border: 1px solid var(--surface-border); border-radius: 12px; }
.sidebar-command:hover { border-color: var(--primary); box-shadow: 0 0 0 3px var(--focus-ring); }
.sidebar-command kbd, .command-palette kbd { padding: 3px 6px; color: var(--text-muted); background: var(--surface); border: 1px solid var(--surface-border); border-bottom-color: var(--surface-border-strong); border-radius: 6px; font: 600 9px/1 var(--font-metric); }
.app-sidebar .view-tabs { position: static !important; top: auto !important; z-index: auto !important; display: flex !important; flex: 1; flex-direction: column; align-items: stretch; gap: 5px; margin: 0; padding: 0; overflow: visible; background: transparent; border: 0; border-radius: 0; box-shadow: none; backdrop-filter: none; }
.app-sidebar .view-tab { position: relative; display: grid; grid-template-columns: 28px minmax(0,1fr) auto; align-items: center; gap: 9px; width: 100%; min-height: 42px; padding: 8px 10px; color: var(--text-muted); text-align: left; background: transparent; border: 1px solid transparent; border-radius: 11px; box-shadow: none; }
.app-sidebar .view-tab:hover { color: var(--card-text); background: color-mix(in srgb, var(--primary) 9%, transparent); border-color: color-mix(in srgb, var(--primary) 22%, transparent); transform: translateX(2px); }
.app-sidebar .view-tab.active { color: var(--card-text); background: color-mix(in srgb, var(--primary) 15%, var(--surface)); border-color: color-mix(in srgb, var(--primary) 42%, transparent); box-shadow: inset 3px 0 0 var(--primary), 0 8px 25px -22px var(--primary); }
.nav-icon { display: grid; place-items: center; width: 25px; height: 25px; font: 700 16px/1 var(--font-metric); }
.nav-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nav-badge { min-width: 22px; padding: 4px 6px; text-align: center; color: var(--card-text); background: color-mix(in srgb, var(--primary) 14%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 24%, transparent); border-radius: 999px; font: 600 9px/1 var(--font-metric); }
.sidebar-footer { display: flex; align-items: center; gap: 9px; padding: 9px 10px; color: var(--text-muted); font-size: 10px; }
.sync-orbit { width: 8px; height: 8px; background: var(--success); border-radius: 50%; box-shadow: 0 0 0 5px rgba(var(--success-rgb), .12); }
body.sidebar-collapsed .app-sidebar { width: var(--sidebar-collapsed-width); }
body.sidebar-collapsed .sidebar-brand { grid-template-columns: 38px; justify-content: center; }
body.sidebar-collapsed .sidebar-brand-copy, body.sidebar-collapsed .sidebar-command .nav-label, body.sidebar-collapsed .sidebar-command kbd, body.sidebar-collapsed .app-sidebar .nav-label, body.sidebar-collapsed .app-sidebar .nav-badge, body.sidebar-collapsed .sidebar-footer .nav-label { display: none; }
body.sidebar-collapsed .sidebar-toggle { position: absolute; right: -12px; top: 19px; background: var(--surface); transform: rotate(180deg); }
body.sidebar-collapsed .sidebar-command, body.sidebar-collapsed .app-sidebar .view-tab { grid-template-columns: 1fr; justify-items: center; padding-inline: 6px; }
body.sidebar-collapsed .app-sidebar .view-tab:hover::after { content: attr(aria-label); position: absolute; left: calc(100% + 13px); z-index: 30; width: max-content; max-width: 210px; padding: 8px 10px; color: var(--card-text); background: var(--surface); border: 1px solid var(--surface-border-strong); border-radius: 9px; box-shadow: var(--shadow-lg); font-size: 11px; pointer-events: none; }

/* Dynamic theme and type catalogs */
#themePresetCatalog { grid-template-columns: repeat(auto-fit, minmax(128px, 1fr)); }
#themePresetCatalog .theme-preset-swatch { min-height: 74px; align-content: start; }
#themePresetCatalog .preset-dots { width: 100%; height: 32px; border: 1px solid rgba(255,255,255,.18); border-radius: 9px; }
#fontPresetCatalog { grid-template-columns: repeat(2, minmax(0, 1fr)); }
#fontPresetCatalog .font-preset-button { display: grid; grid-template-columns: 58px minmax(0,1fr); align-items: center; gap: 11px; min-height: 74px; text-align: left; }
#fontPresetCatalog .font-preset-button > span:last-child { display: grid; gap: 4px; }
.font-sample-badge { display: grid; place-items: center; width: 58px; height: 46px; color: var(--primary); background: color-mix(in srgb, var(--primary) 10%, transparent); border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent); border-radius: 10px; font-size: 16px !important; font-weight: 700; opacity: 1 !important; }

/* Spotlight command palette */
.command-palette { width: min(720px, calc(100vw - 24px)); max-height: min(680px, calc(100vh - 32px)); padding: 0; color: var(--card-text); background: transparent; border: 0; overflow: visible; }
.command-palette::backdrop { background: rgba(3,7,18,.68); backdrop-filter: blur(9px); }
.command-palette-shell { overflow: hidden; background: color-mix(in srgb, var(--surface) 95%, transparent); border: 1px solid var(--surface-border-strong); border-radius: 20px; box-shadow: 0 36px 100px -30px rgba(0,0,0,.9); backdrop-filter: blur(24px); }
.command-palette-head { display: grid; grid-template-columns: 26px 1fr auto; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--surface-border); }
.command-palette-head input { width: 100%; padding: 8px 0 !important; color: var(--card-text) !important; background: transparent !important; border: 0 !important; box-shadow: none !important; font-size: 16px; }
.command-palette-results { max-height: min(520px, 65vh); padding: 8px; overflow-y: auto; }
.command-result { display: grid; grid-template-columns: 36px minmax(0,1fr) auto; align-items: center; gap: 10px; width: 100%; padding: 10px; color: var(--card-text); text-align: left; background: transparent; border: 1px solid transparent; border-radius: 11px; }
.command-result:hover, .command-result.is-active { background: color-mix(in srgb, var(--primary) 12%, transparent); border-color: color-mix(in srgb, var(--primary) 28%, transparent); }
.command-result-icon { display: grid; place-items: center; width: 34px; height: 34px; color: var(--primary); background: color-mix(in srgb, var(--primary) 12%, transparent); border-radius: 9px; }
.command-result-copy { min-width: 0; display: grid; gap: 3px; }
.command-result-copy strong, .command-result-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.command-result-copy small, .command-result-kind { color: var(--text-muted); font-size: 10px; }
.command-palette-empty { padding: 34px 18px; color: var(--text-muted); text-align: center; }
.command-palette-footer { display: flex; gap: 18px; padding: 10px 16px; color: var(--text-muted); border-top: 1px solid var(--surface-border); font-size: 9px; }

/* Density and granular inline editing */
.density-switcher { display: inline-flex; padding: 3px; background: color-mix(in srgb, var(--bg) 55%, transparent); border: 1px solid var(--surface-border); border-radius: 10px; }
.control-panel .report-launcher { align-self: stretch; margin: 0; white-space: nowrap; }
.density-button { min-height: 30px; padding: 6px 9px; color: var(--text-muted); background: transparent; border: 0; border-radius: 7px; font-size: 10px; }
.density-button.active { color: var(--primary-contrast-text); background: var(--primary); box-shadow: var(--shadow-sm); }
.inline-editable { position: relative; cursor: text; border-radius: 6px; transition: box-shadow .16s ease, background .16s ease; }
.inline-editable:hover { background: color-mix(in srgb, var(--primary) 7%, transparent); }
.inline-editable:focus { min-width: 22px; color: var(--card-text); background: var(--surface); outline: none; box-shadow: 0 0 0 3px var(--focus-ring), inset 0 0 0 1px var(--primary); }
.inline-editable:empty::before, .editable:empty::before { content: attr(data-placeholder); color: var(--text-muted); pointer-events: none; }
.inline-date-cluster { display: inline-flex; align-items: center; gap: 5px; flex-wrap: wrap; }
.inline-date-value { padding: 3px 5px; color: var(--card-text); border: 1px dashed var(--surface-border-strong); font: 500 10px/1.2 var(--font-metric); }
.subtask-progress-pill { display: inline-flex; align-items: center; gap: 6px; margin: 0 0 8px; padding: 4px 7px; color: var(--card-text); background: color-mix(in srgb, var(--surface) 75%, transparent); border: 1px solid var(--surface-border); border-radius: 999px; font: 600 9px/1 var(--font-metric); }
.subtask-progress-ring { width: 15px; height: 15px; border-radius: 50%; background: conic-gradient(var(--success) var(--progress), color-mix(in srgb, var(--surface-border) 75%, transparent) 0); -webkit-mask: radial-gradient(circle, transparent 45%, #000 47%); mask: radial-gradient(circle, transparent 45%, #000 47%); }
body[data-density="compact"] .board { gap: 10px; }
body[data-density="compact"] .column { padding: 8px; }
body[data-density="compact"] .column h3 { min-height: 38px; padding: 7px 8px; font-size: 11px; }
body[data-density="compact"] .task-card { display: grid; grid-template-columns: minmax(130px, 1.7fr) auto auto auto; align-items: center; gap: 8px; min-height: 42px; margin-bottom: 5px; padding: 7px 9px; border-radius: 8px; }
body[data-density="compact"] .task-card .task-title { grid-column: 1; margin: 0; font-size: 11px; white-space: nowrap; -webkit-line-clamp: 1; }
body[data-density="compact"] .task-card .badges { grid-column: 2; margin: 0; flex-wrap: nowrap; }
body[data-density="compact"] .task-card .task-desc, body[data-density="compact"] .task-card .task-photo-thumb, body[data-density="compact"] .task-card .task-metric, body[data-density="compact"] .task-card > div[style*="font-size: 11px"] { display: none !important; }
body[data-density="compact"] .task-card .inline-date-cluster { display: none; }
body[data-density="compact"] .task-card .subtask-progress-pill { grid-column: 3; margin: 0; }
body[data-density="compact"] .task-card > .actions { grid-column: 4; margin: 0 !important; }
body[data-density="compact"] .task-card .task-expand-area { grid-column: 1 / -1; }

/* Drag physics, context actions, calendar density */
.task-card.is-dragging { opacity: .52; transform: rotate(1.2deg) scale(1.025); box-shadow: 0 28px 48px -24px rgba(0,0,0,.78); cursor: grabbing; }
.task-drop-placeholder { min-height: 62px; margin: 8px 0; background: color-mix(in srgb, var(--primary) 8%, transparent); border: 2px dashed color-mix(in srgb, var(--primary) 62%, transparent); border-radius: var(--radius-md); animation: placeholderPulse 1.1s ease-in-out infinite alternate; }
@keyframes placeholderPulse { to { background: color-mix(in srgb, var(--primary) 15%, transparent); } }
.task-context-menu { position: fixed; z-index: 1400; width: 210px; padding: 7px; color: var(--card-text); background: color-mix(in srgb, var(--surface) 96%, transparent); border: 1px solid var(--surface-border-strong); border-radius: 13px; box-shadow: 0 24px 65px -25px rgba(0,0,0,.88); backdrop-filter: blur(18px); }
.task-context-menu button { display: flex; align-items: center; gap: 9px; width: 100%; padding: 9px 10px; color: var(--card-text); text-align: left; background: transparent; border: 0; border-radius: 8px; font-size: 11px; }
.task-context-menu button:hover { background: color-mix(in srgb, var(--primary) 12%, transparent); }
.task-context-menu button.danger { color: var(--danger); }
.calendar-density-dots { display: flex; gap: 3px; margin: 3px 0 5px; }
.calendar-density-dot { width: 6px; height: 6px; background: var(--dot-color, var(--primary)); border-radius: 50%; box-shadow: 0 0 0 2px color-mix(in srgb, var(--dot-color, var(--primary)) 18%, transparent); }
.schedule-cell.is-range-selecting { position: relative; z-index: 20; background: color-mix(in srgb, var(--primary) 20%, var(--surface)) !important; box-shadow: inset 0 0 0 2px var(--primary); user-select: none; }
.schedule-grid.is-drag-blocking { cursor: row-resize; user-select: none; }

/* Stackable, reversible notifications */
.toast-deck { position: fixed; right: 18px; bottom: 18px; z-index: 1800; display: grid; gap: 9px; width: min(370px, calc(100vw - 28px)); pointer-events: none; }
.toast-deck-item { display: grid; grid-template-columns: 8px minmax(0,1fr) auto auto; align-items: center; gap: 10px; padding: 11px 12px; color: var(--card-text); background: color-mix(in srgb, var(--surface) 95%, transparent); border: 1px solid var(--surface-border-strong); border-radius: 13px; box-shadow: 0 20px 55px -28px rgba(0,0,0,.85); backdrop-filter: blur(18px); pointer-events: auto; animation: toastIn .24s cubic-bezier(.16,1,.3,1); }
.toast-deck-item::before { content: ''; width: 7px; height: 7px; background: var(--primary); border-radius: 50%; }
.toast-deck-item[data-type="success"]::before { background: var(--success); }
.toast-deck-item[data-type="error"]::before { background: var(--danger); }
.toast-undo { padding: 5px 7px; color: var(--primary); background: transparent; border: 0; font-weight: 800; }
.toast-dismiss { width: 25px; height: 25px; padding: 0; color: var(--text-muted); background: transparent; border: 0; }
@keyframes toastIn { from { opacity: 0; transform: translateY(12px) scale(.97); } }

@media (max-width: 900px) {
  body.app-shell, body.app-shell.sidebar-collapsed { padding: 14px 14px 92px !important; }
  .app-sidebar, body.sidebar-collapsed .app-sidebar { inset: auto 10px 10px; width: auto; height: 70px; flex-direction: row; align-items: center; padding: 8px 10px; border-radius: 18px; }
  .sidebar-brand, .sidebar-command, .sidebar-footer, .sidebar-toggle { display: none !important; }
  .app-sidebar .view-tabs { flex-direction: row; justify-content: space-between; overflow-x: auto; }
  .app-sidebar .view-tab, body.sidebar-collapsed .app-sidebar .view-tab { grid-template-columns: 1fr; justify-items: center; min-width: 52px; width: auto; padding: 7px 9px; }
  .app-sidebar .nav-label, .app-sidebar .nav-badge { display: none; }
  .app-sidebar .view-tab:hover { transform: translateY(-2px); }
  #fontPresetCatalog { grid-template-columns: 1fr; }
  .app-shell .control-panel { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 560px) {
  .app-sidebar .view-tab { min-width: 46px; }
  .command-palette-footer { display: none; }
  .density-switcher { width: 100%; }
  .app-shell .control-panel { grid-template-columns: 1fr; }
  .density-button { flex: 1; }
  body[data-density="compact"] .task-card { grid-template-columns: minmax(120px,1fr) auto; }
  body[data-density="compact"] .task-card .badges { display: none; }
  body[data-density="compact"] .task-card .subtask-progress-pill { grid-column: 2; }
  body[data-density="compact"] .task-card > .actions { grid-column: 1 / -1; }
}

/* SoloFlow SaaS surface and task-action polish */
.app-shell,
.app-shell button,
.app-shell input,
.app-shell select,
.app-shell textarea,
.app-shell [contenteditable="true"] {
  font-family: var(--font-body);
}

.app-sidebar {
  inset: 0 auto 0 0;
  padding: 20px 14px;
  color: var(--card-text);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--surface) 96%, transparent), color-mix(in srgb, var(--bg) 91%, transparent));
  border: 0;
  border-right: 1px solid color-mix(in srgb, var(--surface-border-strong) 72%, transparent);
  border-radius: 0;
  box-shadow: 18px 0 54px -44px rgba(0, 0, 0, .82);
  backdrop-filter: blur(22px) saturate(1.15);
}
.sidebar-brand { padding: 0 3px 12px; border-bottom: 1px solid var(--surface-border); }
.sidebar-mark {
  border: 1px solid color-mix(in srgb, var(--primary) 55%, transparent);
  background: linear-gradient(145deg, color-mix(in srgb, var(--primary) 82%, white), var(--primary));
  box-shadow: 0 12px 28px -16px var(--primary);
}
.sidebar-brand-copy small {
  width: max-content;
  margin-top: 5px;
  padding: 3px 7px;
  color: var(--success);
  background: rgba(var(--success-rgb), .1);
  border: 1px solid rgba(var(--success-rgb), .22);
  border-radius: 999px;
}
.app-sidebar .view-tab {
  border-radius: 9px;
  transition: color .15s ease, background-color .15s ease, border-color .15s ease, transform .15s ease;
}
.app-sidebar .view-tab:hover {
  color: var(--card-text);
  background: color-mix(in srgb, var(--card-text) 6%, transparent);
  border-color: transparent;
}
.app-sidebar .view-tab.active {
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  border-color: color-mix(in srgb, var(--primary) 20%, transparent);
  box-shadow: inset 3px 0 0 var(--primary), 0 0 22px -16px var(--primary);
}
.nav-badge {
  min-width: 24px;
  padding: 4px 7px;
  color: var(--text-muted);
  background: color-mix(in srgb, var(--card-text) 7%, transparent);
  border-color: color-mix(in srgb, var(--card-text) 10%, transparent);
  font: 650 10px/1 var(--font-metric);
}
.app-sidebar .view-tab.active .nav-badge {
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  border-color: color-mix(in srgb, var(--primary) 24%, transparent);
}
.sync-orbit { animation: syncStatusPulse 2.2s ease-out infinite; }
@keyframes syncStatusPulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(var(--success-rgb), .12); }
  50% { box-shadow: 0 0 0 8px rgba(var(--success-rgb), 0); }
}

.app-shell .task-card {
  color: var(--card-text);
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--surface) 72%, transparent), transparent 72%),
    color-mix(in srgb, var(--surface) 78%, var(--bg));
  border: 1px solid color-mix(in srgb, var(--surface-border-strong) 82%, transparent);
  border-radius: 16px;
  box-shadow: 0 8px 22px -20px rgba(0, 0, 0, .82), inset 0 1px color-mix(in srgb, white 7%, transparent);
  transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
}
.app-shell .task-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--primary) 38%, var(--surface-border-strong));
  box-shadow: 0 20px 36px -28px rgba(0, 0, 0, .9), 0 0 0 1px color-mix(in srgb, var(--primary) 10%, transparent);
}
.task-title { color: var(--card-text); font-family: var(--font-display); font-weight: 720; letter-spacing: -.012em; }
.task-desc { color: var(--text-muted); line-height: 1.55; }
.task-card .badge {
  background: color-mix(in srgb, var(--surface) 72%, transparent);
  color: var(--card-text);
  border-color: var(--surface-border);
  font-size: 10px;
  font-weight: 700;
}
.task-card .badge.high { background: rgba(var(--danger-rgb), .12); color: var(--danger); border-color: rgba(var(--danger-rgb), .28); }
.task-card .badge.medium { background: rgba(var(--warning-rgb), .12); color: var(--warning); border-color: rgba(var(--warning-rgb), .28); }
.task-card .badge.low { background: rgba(var(--success-rgb), .12); color: var(--success); border-color: rgba(var(--success-rgb), .28); }
.task-meta {
  display: grid;
  gap: 9px;
  padding: 12px;
  color: var(--card-text);
  background: color-mix(in srgb, var(--surface) 62%, transparent);
  border: 1px solid var(--surface-border);
  border-radius: 12px;
}
.task-meta p { margin: 0; }
.task-meta input,
.timer-container {
  color: var(--card-text);
  background: color-mix(in srgb, var(--bg) 55%, var(--surface));
  border-color: var(--surface-border-strong);
  border-radius: 10px;
}
.task-card-action-strip {
  justify-content: flex-start;
  gap: 7px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--surface-border);
}
.task-card-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 32px;
  padding: 7px 10px;
  color: var(--text-muted) !important;
  background: color-mix(in srgb, var(--surface) 76%, transparent) !important;
  border-color: var(--surface-border) !important;
  border-radius: 9px;
  font: 650 10px/1 var(--font-body);
  box-shadow: none;
}
.task-card-action > span { color: currentColor; font: 700 13px/1 var(--font-metric); }
.task-card-action:hover {
  color: var(--card-text) !important;
  background: color-mix(in srgb, var(--primary) 9%, var(--surface)) !important;
  border-color: color-mix(in srgb, var(--primary) 34%, var(--surface-border)) !important;
}
.task-card-action.task-action-email { color: var(--purple) !important; }
.task-card-action.task-action-sync { color: var(--primary) !important; }
.task-card-action.task-action-sync.is-synced { color: var(--success) !important; border-color: rgba(var(--success-rgb), .32) !important; }
.task-card-action.task-action-delete { margin-left: auto; color: var(--danger) !important; }

.app-shell .editable:focus,
.app-shell input:focus,
.app-shell select:focus,
.app-shell textarea:focus {
  color: var(--card-text);
  background: var(--surface);
  border-color: var(--primary);
  outline: none;
  box-shadow: 0 0 0 3px var(--focus-ring);
  caret-color: var(--primary);
}

@media (max-width: 900px) {
  .app-sidebar, body.sidebar-collapsed .app-sidebar {
    inset: auto 10px 10px;
    border: 1px solid var(--surface-border-strong);
    border-radius: 18px;
  }
}
@media (max-width: 560px) {
  .task-card-action { flex: 1 1 calc(50% - 7px); }
  .task-card-action.task-action-delete { margin-left: 0; }
}

/* v4 — Linear / shadcn-inspired product shell */
body.app-shell {
  --sidebar-width: 256px;
  background:
    radial-gradient(circle at 76% -16%, rgba(var(--primary-rgb), .09), transparent 34rem),
    var(--bg);
  background-attachment: fixed;
  color: var(--text);
}
.app-shell .container { width: min(100%, 1680px); padding: 0 clamp(4px, 1.6vw, 24px); }
.app-shell .soloflow-header {
  position: sticky;
  top: 12px;
  z-index: 100;
  padding: 12px 16px;
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  border: 1px solid color-mix(in srgb, var(--surface-border-strong) 76%, transparent);
  border-radius: 14px;
  box-shadow: 0 14px 38px -32px rgba(0,0,0,.92);
  backdrop-filter: blur(18px) saturate(1.15);
}
.app-shell .soloflow-title-group h1 { font-size: 15px; letter-spacing: -.015em; }
.app-shell #pageTitle { font-size: clamp(25px, 3vw, 40px); letter-spacing: -.045em; }
.app-shell .banner-image { border-radius: 14px; border: 1px solid var(--surface-border); }

.app-sidebar {
  width: var(--sidebar-width);
  gap: 10px;
  padding: 16px 12px 12px;
  background: color-mix(in srgb, var(--surface) 94%, var(--bg));
  border-right-color: color-mix(in srgb, var(--card-text) 10%, transparent);
  box-shadow: 14px 0 40px -36px rgba(0,0,0,.96);
}
.sidebar-brand { min-height: 48px; margin-bottom: 3px; padding: 0 6px 12px; }
.sidebar-mark { width: 34px; border-radius: 9px; font-size: 14px; }
.sidebar-brand-copy strong { font-size: 14px; letter-spacing: -.02em; }
.sidebar-brand-copy small { margin-top: 3px; padding: 0; color: var(--text-muted); background: transparent; border: 0; border-radius: 0; font-size: 8px; }
.sidebar-command { min-height: 38px; padding: 8px 9px; border-radius: 8px; box-shadow: none; }
.app-sidebar .view-tabs { gap: 2px; padding-top: 5px; }
.app-sidebar .view-tab {
  min-height: 38px;
  padding: 7px 9px;
  border-radius: 7px;
  font-size: 11px;
  font-weight: 600;
  box-shadow: none;
}
.app-sidebar .view-tab:hover { transform: none; }
.app-sidebar .view-tab.active { box-shadow: inset 2px 0 0 var(--primary); }
.nav-icon { width: 23px; height: 23px; font-size: 14px; }
.nav-badge { min-width: 21px; padding: 3px 6px; font-size: 8px; }
.sidebar-settings {
  display: grid;
  grid-template-columns: 28px minmax(0,1fr) auto;
  align-items: center;
  gap: 9px;
  width: 100%;
  min-height: 38px;
  padding: 7px 9px;
  color: var(--text-muted);
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 7px;
  box-shadow: none;
  font-size: 11px;
  font-weight: 600;
}
.sidebar-settings:hover { color: var(--card-text); background: color-mix(in srgb, var(--card-text) 6%, transparent); border-color: transparent; transform: none; }
.settings-key { color: var(--text-muted); font: 600 8px/1 var(--font-metric); }
.sidebar-footer { margin-top: 0; padding: 8px 10px 2px; border-top: 1px solid var(--surface-border); }
body.sidebar-collapsed .sidebar-settings { grid-template-columns: 1fr; justify-items: center; padding-inline: 6px; }
body.sidebar-collapsed .sidebar-settings .nav-label,
body.sidebar-collapsed .sidebar-settings .settings-key { display: none; }

/* Settings is a workspace dialog while retaining the original details element and IDs. */
details.customize-menu:not([open]) { display: none; }
details.customize-menu[open] {
  position: fixed;
  inset: 0;
  z-index: 1700;
  display: block;
  width: 100%;
  max-height: 100vh;
  margin: 0;
  padding: clamp(18px, 4vw, 56px) max(16px, calc((100vw - 1160px) / 2));
  overflow-y: auto;
  color: var(--card-text);
  background: color-mix(in srgb, #020617 74%, transparent);
  border: 0;
  border-radius: 0;
  box-shadow: none;
  backdrop-filter: blur(18px) saturate(.8);
}
details.customize-menu[open] > summary,
details.customize-menu[open] > .settings-group {
  width: min(1120px, 100%);
  margin-inline: auto;
  background: color-mix(in srgb, var(--surface) 97%, var(--bg));
  border-inline: 1px solid var(--surface-border-strong);
}
details.customize-menu[open] > summary {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 60px;
  padding: 16px 20px;
  color: var(--card-text);
  border: 1px solid var(--surface-border-strong);
  border-radius: 14px 14px 0 0;
  box-shadow: 0 12px 32px -28px rgba(0,0,0,.95);
}
details.customize-menu[open] > summary::after { display: none; }
.settings-close { display: grid; place-items: center; width: 30px; height: 30px; color: var(--text-muted); background: color-mix(in srgb, var(--card-text) 6%, transparent); border: 1px solid var(--surface-border); border-radius: 8px; font: 500 20px/1 var(--font-body); }
details.customize-menu[open] > .settings-group { margin-top: 0; padding: 22px; border-top: 0; border-bottom: 1px solid var(--surface-border); border-radius: 0; }
details.customize-menu[open] > .settings-group:last-child { border-bottom: 1px solid var(--surface-border-strong); border-radius: 0 0 14px 14px; }
.settings-group h4 { color: var(--card-text); font-size: 13px; }

/* Active workspaces become deliberate main-canvas surfaces. */
#schedule-container,
#calendar-container,
#inbox-container,
#productivity-container,
#finance-container {
  min-height: calc(100vh - 150px);
  animation: workspaceEnter .18s ease-out;
}
#inbox-container,
#productivity-container { display: none; }
@keyframes workspaceEnter { from { opacity: 0; transform: translateY(4px); } }
.app-shell .control-panel,
.app-shell .form-card,
.app-shell .column,
.app-shell .schedule-container,
.app-shell .calendar-container,
.app-shell .inbox-container,
.app-shell .productivity-container,
.app-shell .finance-container,
.app-shell .finance-panel {
  background: color-mix(in srgb, var(--surface) 86%, var(--bg));
  border: 1px solid color-mix(in srgb, var(--card-text) 9%, transparent);
  box-shadow: 0 1px 0 color-mix(in srgb, white 3%, transparent), 0 18px 46px -42px rgba(0,0,0,.95);
}
.app-shell .control-panel { border-radius: 12px; }
.app-shell .form-card { border-radius: 14px; }
.app-shell .column { border-radius: 12px; }
.app-shell .column h3 { background: color-mix(in srgb, var(--surface) 93%, transparent); border-bottom-color: var(--surface-border); }
.app-shell .task-card { border-radius: 10px; box-shadow: 0 1px 2px rgba(0,0,0,.16); }
.app-shell .task-card:hover { transform: translateY(-1px); box-shadow: 0 10px 28px -24px rgba(0,0,0,.9); }

/* Financial command center */
.finance-container { padding: clamp(14px, 2vw, 24px); border-radius: 14px !important; }
.finance-command-shell { display: grid; gap: 14px; }
.finance-toolbar { padding: 12px; background: color-mix(in srgb, var(--bg) 34%, transparent); border: 1px solid var(--surface-border); border-radius: 10px; }
.finance-control label,
.finance-segment-field > span { color: var(--text-muted); font-size: 9px; font-weight: 750; letter-spacing: .075em; text-transform: uppercase; }
.finance-kpi-grid { gap: 10px; }
.finance-kpi {
  min-height: 118px;
  padding: 16px;
  background: color-mix(in srgb, var(--surface) 93%, var(--bg));
  border: 1px solid var(--surface-border);
  border-radius: 11px;
  box-shadow: 0 1px 2px rgba(0,0,0,.14);
}
.finance-kpi::after { display: none; }
.finance-kpi-value { margin: 13px 0 7px; font-size: clamp(22px, 2.1vw, 29px); font-variant-numeric: tabular-nums; }
.finance-kpi-meta { color: var(--text-muted); opacity: 1; }
.finance-panel { padding: 16px; border-radius: 11px !important; }
.finance-panel-header { min-height: 40px; }
.finance-panel-header h3 { margin-top: 3px; color: var(--card-text); font-size: 14px; letter-spacing: -.015em; }
.finance-section-kicker { color: var(--text-muted); font-size: 8px; letter-spacing: .09em; }
.command-tabs { width: max-content; max-width: 100%; padding: 3px; border-radius: 8px; }
.command-tab { min-height: 30px; padding: 6px 11px; border-radius: 6px; font-size: 10px; }
.finance-capture-grid { grid-template-columns: 1fr 1fr; gap: 9px; }
.finance-capture-grid > input,
.finance-capture-grid > button { min-height: 42px; }
.finance-amount-field {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  min-height: 72px;
  padding: 8px 13px 7px;
  background: color-mix(in srgb, var(--primary) 7%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--primary) 32%, var(--surface-border));
  border-radius: 10px;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.finance-amount-field:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px var(--focus-ring); }
.finance-amount-field > span { color: var(--primary); font: 650 22px/1 var(--font-metric); }
.finance-amount-field input {
  width: 100%;
  min-height: 42px;
  padding: 5px 8px !important;
  color: var(--card-text) !important;
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  font: 650 27px/1 var(--font-metric) !important;
  letter-spacing: -.04em;
  font-variant-numeric: tabular-nums;
}
.finance-amount-field small { grid-column: 1 / -1; color: var(--text-muted); font-size: 8px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.finance-segment-field { display: grid; gap: 6px; }
.segmented-source { position: absolute !important; width: 1px !important; height: 1px !important; padding: 0 !important; margin: -1px !important; overflow: hidden !important; clip: rect(0,0,0,0) !important; white-space: nowrap !important; border: 0 !important; }
.finance-segments {
  display: grid;
  grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 3px;
  padding: 3px;
  background: color-mix(in srgb, var(--bg) 58%, transparent);
  border: 1px solid var(--surface-border);
  border-radius: 9px;
}
.finance-segments-three { grid-template-columns: repeat(3, minmax(0,1fr)); }
.finance-segments button {
  min-height: 32px;
  padding: 6px 8px;
  color: var(--text-muted);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  box-shadow: none;
  font-size: 9px;
  font-weight: 700;
  white-space: nowrap;
}
.finance-segments button:hover { color: var(--card-text); background: color-mix(in srgb, var(--card-text) 5%, transparent); transform: none; }
.finance-segments button.active { color: var(--card-text); background: var(--surface); border-color: var(--surface-border-strong); box-shadow: 0 1px 3px rgba(0,0,0,.2); }
.finance-ledger-shell { overflow: hidden; background: color-mix(in srgb, var(--bg) 28%, transparent); border: 1px solid var(--surface-border); border-radius: 9px; }
.finance-ledger-head,
.finance-ledger-row { display: grid; grid-template-columns: minmax(130px,1.2fr) minmax(170px,1.5fr) minmax(100px,.7fr) 34px; align-items: center; gap: 10px; }
.finance-ledger-head {
  position: sticky;
  top: 0;
  z-index: 2;
  min-height: 34px;
  padding: 7px 10px;
  color: var(--text-muted);
  background: color-mix(in srgb, var(--surface) 96%, transparent);
  border-bottom: 1px solid var(--surface-border);
  font-size: 8px;
  font-weight: 750;
  letter-spacing: .08em;
  text-transform: uppercase;
  backdrop-filter: blur(12px);
}
.finance-ledger-head span:nth-child(3) { text-align: right; }
.finance-ledger-list { max-height: 470px; overflow-y: auto; }
.finance-ledger-row { min-height: 56px; padding: 8px 10px; border-bottom: 1px solid var(--surface-border); transition: background .14s ease; }
.finance-ledger-row:last-child { border-bottom: 0; }
.finance-ledger-row:hover { background: color-mix(in srgb, var(--card-text) 4%, transparent); }
.finance-ledger-payee { min-width: 0; display: grid; gap: 3px; }
.finance-ledger-payee strong { overflow: hidden; color: var(--card-text); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.finance-ledger-payee time { color: var(--text-muted); font: 500 8px/1 var(--font-metric); }
.finance-ledger-tags { min-width: 0; display: flex; align-items: center; gap: 5px; overflow: hidden; color: var(--text-muted); font-size: 8px; white-space: nowrap; }
.finance-ledger-tags .badge { flex: 0 0 auto; padding: 3px 6px; font-size: 8px; }
.finance-ledger-amount { text-align: right; font: 650 11px/1 var(--font-metric); font-variant-numeric: tabular-nums; white-space: nowrap; }
.finance-ledger-amount.income { color: var(--success); }
.finance-ledger-amount.expense { color: var(--danger); }
.finance-row-action { width: 28px; min-height: 28px; padding: 0; opacity: 0; transform: translateX(3px); transition: opacity .14s ease, transform .14s ease; }
.finance-ledger-row:hover .finance-row-action,
.finance-row-action:focus-visible { opacity: 1; transform: none; }

@media (max-width: 1100px) {
  .finance-kpi-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
  #finance-view-transactions .finance-panel-grid { grid-template-columns: 1fr !important; }
}
@media (max-width: 900px) {
  .sidebar-settings { display: grid; grid-template-columns: 1fr; justify-items: center; min-width: 52px; width: auto; padding: 7px 9px; }
  .sidebar-settings .nav-label, .sidebar-settings .settings-key { display: none; }
  .app-shell .container { padding: 0; }
  details.customize-menu[open] { padding: 12px; }
}
@media (max-width: 680px) {
  .finance-kpi-grid { grid-template-columns: 1fr; }
  .finance-capture-grid { grid-template-columns: 1fr; }
  .finance-capture-grid .wide { grid-column: 1; }
  .finance-ledger-head { display: none; }
  .finance-ledger-row { grid-template-columns: minmax(0,1fr) auto 30px; gap: 8px; }
  .finance-ledger-tags { grid-column: 1 / -1; grid-row: 2; }
  .finance-ledger-amount { grid-column: 2; grid-row: 1; }
  .finance-row-action { grid-column: 3; grid-row: 1; opacity: 1; transform: none; }
  .finance-segments-three { grid-template-columns: 1fr; }
  details.customize-menu[open] > .settings-group { padding: 16px; }
}
