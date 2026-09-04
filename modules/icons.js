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
  stop: icon('<rect x="6" y="6" width="12" height="12" rx="2"/>', { fill: 'currentColor' })
};

export function iconHtml(name) {
  return ICONS[name] || '';
}
