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

export function installLayoutModule() {
  hydrateIcons();
  installFinanceEmptyState();
  installBoardToolbar();
  installQuickCapture();
  installWorkspaceName();
  return { hydrateIcons };
}
