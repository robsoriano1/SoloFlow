const icon = (paths, { fill = 'none' } = {}) =>
  `<svg class="btn-icon" viewBox="0 0 24 24" width="14" height="14" fill="${fill}" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;

export const ICONS = {
  arrowRight: icon('<line x1="4" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/>'),
  arrowLeft: icon('<line x1="20" y1="12" x2="5" y2="12"/><polyline points="11 6 5 12 11 18"/>'),
  arrowUpRight: icon('<line x1="7" y1="17" x2="17" y2="7"/><polyline points="8 7 17 7 17 16"/>'),
  chevronLeft: icon('<polyline points="15 6 9 12 15 18"/>'),
  chevronRight: icon('<polyline points="9 6 15 12 9 18"/>'),
  chevronDown: icon('<polyline points="6 9 12 15 18 9"/>'),
  chevronUp: icon('<polyline points="18 15 12 9 6 15"/>'),
  play: icon('<path d="M7.5 5.5v13a1 1 0 0 0 1.53.85l10.4-6.5a1 1 0 0 0 0-1.7L9.03 4.65A1 1 0 0 0 7.5 5.5Z"/>', { fill: 'currentColor' }),
  stop: icon('<rect x="6" y="6" width="12" height="12" rx="2"/>', { fill: 'currentColor' }),
  mapPin: icon('<path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.2"/>'),
  repeat: icon('<polyline points="17 2.5 20.5 6 17 9.5"/><path d="M3.5 11.5V10a4 4 0 0 1 4-4h13"/><polyline points="7 21.5 3.5 18 7 14.5"/><path d="M20.5 12.5V14a4 4 0 0 1-4 4h-13"/>'),
  link: icon('<path d="M10 14a4.5 4.5 0 0 0 6.36 0l3.18-3.18a4.5 4.5 0 0 0-6.36-6.36L12 5.64"/><path d="M14 10a4.5 4.5 0 0 0-6.36 0l-3.18 3.18a4.5 4.5 0 0 0 6.36 6.36L12 18.36"/>'),
  more: icon('<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>', { fill: 'currentColor' }),
  // Added in the v10 UI pass to replace emoji; same 24px grid, stroke and caps.
  plus: icon('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'),
  close: icon('<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>'),
  check: icon('<polyline points="5 12.5 10 17.5 19 7"/>'),
  search: icon('<circle cx="11" cy="11" r="6.5"/><line x1="20" y1="20" x2="15.8" y2="15.8"/>'),
  mail: icon('<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><polyline points="4 7 12 13 20 7"/>'),
  trash: icon('<polyline points="4 7 20 7"/><path d="M9 7V4.8a.8.8 0 0 1 .8-.8h4.4a.8.8 0 0 1 .8.8V7"/><path d="M6 7l1 12.2A2 2 0 0 0 9 21h6a2 2 0 0 0 2-1.8L18 7"/>'),
  chart: icon('<line x1="4.5" y1="20" x2="19.5" y2="20"/><line x1="7.5" y1="16" x2="7.5" y2="11"/><line x1="12" y1="16" x2="12" y2="6"/><line x1="16.5" y1="16" x2="16.5" y2="13"/>'),
  bolt: icon('<path d="M13 3 5.5 13.5H12L11 21l7.5-10.5H12Z"/>'),
  clock: icon('<circle cx="12" cy="12" r="8.5"/><polyline points="12 7.5 12 12 15 14"/>'),
  timer: icon('<circle cx="12" cy="13.5" r="7"/><line x1="12" y1="13.5" x2="12" y2="10"/><line x1="10" y1="3.5" x2="14" y2="3.5"/>'),
  calendar: icon('<rect x="4" y="5" width="16" height="15" rx="2"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="8.5" y1="3" x2="8.5" y2="7"/><line x1="15.5" y1="3" x2="15.5" y2="7"/>'),
  lock: icon('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
  file: icon('<path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8Z"/><polyline points="14 3.5 14 8 18.5 8"/>'),
  image: icon('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m20.5 15.5-4.5-4.5-9 8.5"/>'),
  upload: icon('<path d="M4.5 15v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3"/><polyline points="8 8 12 4 16 8"/><line x1="12" y1="4" x2="12" y2="15"/>'),
  download: icon('<path d="M4.5 15v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3"/><polyline points="8 11 12 15 16 11"/><line x1="12" y1="4" x2="12" y2="15"/>'),
  alert: icon('<path d="M10.3 4.2 3 17a2 2 0 0 0 1.7 3h14.6a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z"/><line x1="12" y1="9.5" x2="12" y2="13"/><line x1="12" y1="16.5" x2="12.01" y2="16.5"/>'),
  cloud: icon('<path d="M7 18.5h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 9.6 4.5 4.5 0 0 0 7 18.5Z"/>'),
  palette: icon('<path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7H16a4.5 4.5 0 0 0 4.5-4.5c0-4.6-3.8-6.7-8.5-6.7Z"/><circle cx="8" cy="11" r=".8"/><circle cx="10.8" cy="7.7" r=".8"/><circle cx="14.8" cy="8" r=".8"/>'),
  archive: icon('<rect x="3.5" y="4.5" width="17" height="4.5" rx="1"/><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9"/><line x1="10" y1="13" x2="14" y2="13"/>'),
  gear: icon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>'),
  refresh: icon('<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><polyline points="19.5 4.5 19.5 9 15 9"/>'),
  copy: icon('<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>'),
  highlight: icon('<path d="m14.5 4.5 5 5L10 19H5v-5Z"/><line x1="12.5" y1="6.5" x2="17.5" y2="11.5"/>'),
  mergeDown: icon('<polyline points="7 6 12 11 17 6"/><polyline points="7 13 12 18 17 13"/>'),
  split: icon('<line x1="4" y1="12" x2="20" y2="12"/><polyline points="8 8 12 4 16 8"/><polyline points="8 16 12 20 16 16"/>'),
  filter: icon('<line x1="4" y1="7" x2="20" y2="7"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="10" y1="17" x2="14" y2="17"/>'),
  grid: icon('<rect x="4" y="4" width="6.5" height="6.5" rx="1.2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2"/>'),
  edit: icon('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16Z"/><line x1="13.5" y1="6.5" x2="17.5" y2="10.5"/>')
};

export function iconHtml(name) {
  return ICONS[name] || '';
}

/* Static markup can't import a module, so it marks the spot with
   <span data-icon="name"> and this fills it in once modules load. */
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((slot) => {
    if (slot.dataset.iconReady === 'true') return;
    const markup = ICONS[slot.dataset.icon];
    if (!markup) return;
    slot.innerHTML = markup;
    slot.dataset.iconReady = 'true';
    slot.setAttribute('aria-hidden', 'true');
  });
}
