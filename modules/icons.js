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
  more: icon('<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>', { fill: 'currentColor' })
};

export function iconHtml(name) {
  return ICONS[name] || '';
}
