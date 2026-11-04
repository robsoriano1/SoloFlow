import { hydrateIcons } from './icons.js';

/**
 * Presentation-only behaviour for the v10 layout: icon slots, the board
 * toolbar's overflow menu and Quick Capture's reveal. Nothing here reads or
 * writes app data; it only toggles classes and ARIA state on existing markup
 * and calls the same window.* functions the buttons always called.
 */

const PHONE_QUERY = '(max-width: 900px)';

// A small disclosure: a button that opens a panel, closed again by Escape, a
// click outside, or choosing something inside it.
function bindDisclosure({ toggle, root, closeOnPick = 'button' }) {
  if (!toggle || !root) return null;
  const isOpen = () => root.classList.contains('is-open');
  const set = (open, { focusToggle = false } = {}) => {
    root.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (!open && focusToggle) toggle.focus();
  };
  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    set(!isOpen());
    if (isOpen()) root.querySelector('.toolbar-more-menu button, [role="menu"] button')?.focus({ preventScroll: true });
  });
  document.addEventListener('click', (event) => {
    if (!isOpen()) return;
    if (!root.contains(event.target)) { set(false); return; }
    if (closeOnPick && event.target.closest(closeOnPick) && event.target !== toggle && !toggle.contains(event.target)) {
      // Let the density switch paint its new state before the menu closes.
      setTimeout(() => set(false), 120);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) { event.stopPropagation(); set(false, { focusToggle: true }); }
  });
  return { set, isOpen };
}

function installBoardToolbar() {
  const toggle = document.getElementById('boardToolbarMoreToggle');
  const root = toggle?.closest('.toolbar-overflow');
  const menu = bindDisclosure({ toggle, root });
  // Leaving the phone layout with the menu open would leave it stuck open.
  matchMedia(PHONE_QUERY).addEventListener('change', () => menu?.set(false));
}

function installQuickCapture() {
  const form = document.getElementById('kanban-task-form');
  const title = document.getElementById('taskTitle');
  const toggle = document.getElementById('quickCaptureDetailsToggle');
  const drawer = form?.querySelector('details.task-advanced-fields');
  const priority = document.getElementById('taskPriority');
  const due = document.getElementById('taskDueDate');
  if (!form || !title) return;

  const hasExtras = () => Boolean(due?.value) || (priority && priority.value !== 'Medium') || Boolean(drawer?.open);
  const setExpanded = (expanded) => form.classList.toggle('is-expanded', expanded);
  const paintToggle = () => {
    if (!toggle) return;
    const open = Boolean(drawer?.open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Hide details' : 'Add details';
  };

  // "Add details" opens the full drawer (category, notes, subtasks, links…).
  toggle?.addEventListener('click', () => {
    if (!drawer) return;
    drawer.open = !drawer.open;
    if (drawer.open) setExpanded(true);
  });
  drawer?.addEventListener('toggle', () => { if (drawer.open) setExpanded(true); paintToggle(); });
  paintToggle();

  // Focus anywhere in the card reveals priority, date and paste-from-email.
  form.addEventListener('focusin', () => setExpanded(true));
  // It folds again only when the person moves on elsewhere with nothing set
  // beyond the title. Listening for that outside (rather than on focusout)
  // keeps the row in place while a click inside lands, including in Safari,
  // which does not focus buttons on click.
  const foldIfIdle = (event) => {
    if (form.contains(event.target) || !form.classList.contains('is-expanded')) return;
    if (!hasExtras()) setExpanded(false);
  };
  document.addEventListener('pointerdown', foldIfIdle, true);
  document.addEventListener('focusin', foldIfIdle);

  // A single-line capture field submits on Enter, like the Add button.
  title.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.isComposing || event.shiftKey) return;
    event.preventDefault();
    window.addTask?.();
  });
}

// The workspace name used to be the page's largest heading. It now lives in
// Settings and shows under the brand in the sidebar.
function installWorkspaceName() {
  const source = document.getElementById('pageTitle');
  const target = document.querySelector('.sidebar-brand-copy small');
  if (!source || !target) return;
  const sync = () => { target.textContent = source.textContent.trim() || 'My Workspace'; };
  sync();
  new MutationObserver(sync).observe(source, { childList: true, characterData: true, subtree: true });
}

// Finance shows one page-level empty state when there are no transactions.
function installFinanceEmptyState() {
  const container = document.getElementById('finance-container');
  const render = window.renderFinance;
  if (!container || typeof render !== 'function') return;
  const paint = () => container.classList.toggle('is-empty', !(window.financeTransactions || []).length);
  window.renderFinance = function renderFinanceWithEmptyState(...args) {
    const result = render.apply(this, args);
    paint();
    return result;
  };
  paint();
}

// Wraps a window.* function so layout can react after it runs, without
// changing what it does or returns.
function after(name, callback) {
  const original = window[name];
  if (typeof original !== 'function') return;
  window[name] = function layoutAfter(...args) {
    const result = original.apply(this, args);
    try { callback(...args); } catch (error) { console.warn(`SoloFlow layout: ${name} hook failed`, error); }
    return result;
  };
}

const BOARD_VIEWS = ['all', 'today', 'backlog'];
const MORE_VIEWS = ['backlog', 'calendar', 'productivity'];
const currentView = () => document.querySelector('.view-tab.active[data-view]')?.dataset.view || 'all';

// --- Phone tab bar: five destinations plus "More" -------------------------
function installMoreNav() {
  const toggle = document.getElementById('navMoreToggle');
  const sheet = document.getElementById('navMoreSheet');
  if (!toggle || !sheet || typeof sheet.showModal !== 'function') return;

  sheet.querySelectorAll('[data-icon-from]').forEach((item) => {
    const source = document.querySelector(`#${item.dataset.iconFrom} .ph-icon-regular`);
    if (!source) return;
    const slot = document.createElement('span');
    slot.className = 'nav-icon';
    slot.append(source.cloneNode(true));
    item.prepend(slot);
  });

  const paintCounts = () => sheet.querySelectorAll('[data-count-from]').forEach((count) => {
    const value = document.getElementById(count.dataset.countFrom)?.textContent.trim() || '';
    count.textContent = value && value !== '0' ? value : '';
  });
  const paintCurrent = (view = currentView()) => {
    const inMore = MORE_VIEWS.includes(view);
    toggle.classList.toggle('is-current', inMore);
    if (inMore) toggle.setAttribute('aria-current', 'page'); else toggle.removeAttribute('aria-current');
    sheet.querySelectorAll('[data-sheet-view]').forEach((item) => {
      const active = item.dataset.sheetView === view;
      item.classList.toggle('is-active', active);
      if (active) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current');
    });
  };
  const close = () => { if (sheet.open) sheet.close(); };

  toggle.addEventListener('click', () => {
    paintCounts();
    paintCurrent();
    sheet.showModal();
    toggle.setAttribute('aria-expanded', 'true');
  });
  sheet.addEventListener('close', () => { toggle.setAttribute('aria-expanded', 'false'); });
  sheet.addEventListener('click', (event) => {
    // A click on the dialog itself (not its body) is the backdrop.
    if (event.target === sheet || event.target.closest('[data-action="close-sheet"]')) { close(); return; }
    const item = event.target.closest('[data-sheet-view]');
    if (!item) return;
    close();
    window.setView?.(item.dataset.sheetView);
  });
  after('setView', (view) => paintCurrent(view));
  matchMedia(PHONE_QUERY).addEventListener('change', (query) => { if (!query.matches) close(); });
  paintCurrent();
}

// --- Board: one column at a time on phones -----------------------------------
function installBoardSegments() {
  const group = document.getElementById('boardSegments');
  const board = document.querySelector('.board');
  if (!group || !board) return;
  const buttons = [...group.querySelectorAll('[data-column]')];
  const select = (column, { focus = false } = {}) => {
    board.dataset.activeColumn = column;
    buttons.forEach((button) => {
      const active = button.dataset.column === column;
      button.setAttribute('aria-pressed', String(active));
      button.tabIndex = active ? 0 : -1;
      if (active && focus) button.focus();
    });
  };
  const paintCounts = () => {
    group.querySelectorAll('[data-count]').forEach((count) => {
      count.textContent = String(document.querySelectorAll(`#${count.dataset.count}-list .task-card`).length);
    });
  };
  const paintVisibility = (view = currentView()) => { group.hidden = !BOARD_VIEWS.includes(view); };

  group.addEventListener('click', (event) => {
    const button = event.target.closest('[data-column]');
    if (button) select(button.dataset.column);
  });
  // Arrow keys move between the three options, like any segmented control.
  group.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const index = buttons.findIndex((button) => button.dataset.column === board.dataset.activeColumn);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    event.preventDefault();
    select(buttons[next].dataset.column, { focus: true });
  });

  after('renderTasks', paintCounts);
  after('setView', (view) => paintVisibility(view));
  // A new task lands in To Do, so show that column.
  const before = () => (window.tasks || []).length;
  const legacyAdd = window.addTask;
  if (typeof legacyAdd === 'function') {
    window.addTask = function addTaskShowingTodo(...args) {
      const count = before();
      const result = legacyAdd.apply(this, args);
      if (before() > count) select('todo');
      return result;
    };
  }
  select('todo');
  paintCounts();
  paintVisibility();
}

// --- Schedule: one header with a strip of seven days on phones ----------------
function installScheduleDayStrip() {
  const container = document.getElementById('schedule-container');
  const weekNav = container?.querySelector('.schedule-week-nav');
  if (!container || !weekNav) return;
  const strip = document.createElement('div');
  strip.className = 'schedule-day-strip';
  strip.setAttribute('role', 'group');
  strip.setAttribute('aria-label', 'Day of the week');
  weekNav.after(strip);
  const pad = (value) => String(value).padStart(2, '0');
  const iso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  const paint = () => {
    const grid = document.getElementById('schedule-grid');
    const dayView = Boolean(grid?.classList.contains('is-day-view'));
    container.classList.toggle('has-day-strip', dayView);
    strip.hidden = !dayView;
    if (!dayView || !(window.scheduleWeekStart instanceof Date)) return;
    const shown = grid.querySelector('.schedule-cell[data-date]')?.dataset.date;
    const today = iso(new Date());
    const buttons = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(window.scheduleWeekStart);
      date.setDate(date.getDate() + offset);
      const key = iso(date);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'schedule-day-chip';
      button.dataset.date = key;
      button.classList.toggle('is-today', key === today);
      button.setAttribute('aria-pressed', String(key === shown));
      button.setAttribute('aria-label', `${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${key === today ? ', today' : ''}`);
      const weekday = document.createElement('span');
      weekday.className = 'schedule-day-chip-weekday';
      weekday.textContent = date.toLocaleDateString('en-US', { weekday: 'short' });
      const day = document.createElement('span');
      day.className = 'schedule-day-chip-date';
      day.textContent = String(date.getDate());
      button.append(weekday, day);
      return button;
    });
    strip.replaceChildren(...buttons);
  };
  strip.addEventListener('click', (event) => {
    const button = event.target.closest('[data-date]');
    if (button) window.goToScheduleDate?.(button.dataset.date);
  });
  after('renderSchedule', paint);
  paint();
}

// --- Finance: filters fold into a sheet on phones --------------------------------
// The toolbar stays inline on desktop. On phones "Filters" opens it in a modal
// sheet: the same element (its IDs and handlers untouched) moves into a
// <dialog> in the top layer while open and back to its place afterwards.
function installFinanceFilters() {
  const toggle = document.getElementById('financeFiltersToggle');
  const sheet = document.getElementById('financeFilterSheet');
  const summary = document.getElementById('financeFilterSummary');
  if (!toggle || !sheet) return;
  const home = document.createComment('finance filters');
  sheet.before(home);
  const dialog = document.createElement('dialog');
  dialog.className = 'sf-sheet finance-filter-dialog';
  dialog.setAttribute('aria-label', 'Finance filters');
  document.body.append(dialog);

  const open = () => {
    if (typeof dialog.showModal !== 'function') return;
    dialog.append(sheet);
    dialog.showModal();
    toggle.setAttribute('aria-expanded', 'true');
    sheet.querySelector('select, input')?.focus({ preventScroll: true });
  };
  const close = () => { if (dialog.open) dialog.close(); };
  dialog.addEventListener('close', () => {
    home.after(sheet);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus({ preventScroll: true });
  });
  toggle.addEventListener('click', open);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog || event.target.closest('[data-action="close-filters"]')) close();
  });
  matchMedia(PHONE_QUERY).addEventListener('change', (query) => { if (!query.matches) close(); });

  const text = (id) => document.getElementById(id)?.selectedOptions?.[0]?.textContent.trim() || '';
  const paintSummary = () => {
    if (!summary) return;
    const parts = [];
    if (document.getElementById('financeRangePreset')?.value === 'custom') {
      const start = document.getElementById('financeStartDate')?.value;
      const end = document.getElementById('financeEndDate')?.value;
      parts.push(start || end ? `${start || '…'} to ${end || '…'}` : 'Custom range');
    } else parts.push(text('financeRangePreset'));
    if (document.getElementById('financeNatureFilter')?.value !== 'all') parts.push(text('financeNatureFilter'));
    if (document.getElementById('financeFrequencyFilter')?.value !== 'all') parts.push(text('financeFrequencyFilter'));
    if (document.getElementById('financeLiquidCash')?.value) parts.push('cash set');
    if (document.getElementById('financeDailyTarget')?.value) parts.push('daily target set');
    summary.textContent = parts.filter(Boolean).join(' · ');
  };
  sheet.addEventListener('change', paintSummary);
  after('renderFinance', paintSummary);
  paintSummary();
}

export function installLayoutModule() {
  hydrateIcons();
  installFinanceEmptyState();
  installMoreNav();
  installBoardSegments();
  installScheduleDayStrip();
  installFinanceFilters();
  installBoardToolbar();
  installQuickCapture();
  installWorkspaceName();
  return { hydrateIcons };
}
