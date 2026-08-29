import { createSoloFlowStore } from './core/state.js';
import { installCloudWriteQueue } from './core/firebase.js';
import { installThemeModule } from './modules/theme.js';
import { installTaskModule } from './modules/tasks.js';
import { installTimerModule } from './modules/timer.js';
import { installScheduleModule } from './modules/schedule.js';
import { installCalendarModule } from './modules/calendar.js';
import { installInboxModule } from './modules/inbox.js';
import { installProductivityModule } from './modules/productivity.js';
import { installFinanceModule } from './modules/finance.js';
import { installShortcutManager } from './modules/shortcuts.js';
import { installReportModule } from './modules/reports.js';

function bridgeLegacyPersistence(store) {
  const bindings = {
    saveTasks: ['tasks', 'tasks'],
    saveEvents: ['events', 'events'],
    saveSchedule: ['schedule', 'scheduleData'],
    saveFinance: ['transactions', 'financeTransactions'],
    saveFinanceCommand: ['projects', 'financeProjects'],
    saveSettings: ['settings', 'settings']
  };
  Object.entries(bindings).forEach(([functionName, [stateKey, globalName]]) => {
    const legacy = window[functionName];
    if (typeof legacy !== 'function') return;
    window[functionName] = function observableSave(...args) {
      const result = legacy.apply(this, args);
      store.set(stateKey, structuredClone(window[globalName]), { source: functionName });
      if (functionName === 'saveFinanceCommand') {
        store.set('assets', structuredClone(window.financeAssets), { source: functionName });
        store.set('budgets', structuredClone(window.financeBudgets), { source: functionName });
      }
      return result;
    };
  });
}

function installNetworkStatus(store) {
  const banner = document.createElement('div');
  banner.className = 'offline-banner';
  banner.textContent = 'Offline · changes saved locally';
  banner.hidden = navigator.onLine;
  document.body.append(banner);
  store.subscribe('online', ({ value }) => { banner.hidden = value; });
}

function installToastDeck() {
  const deck = document.getElementById('toastDeck');
  if (!deck) return;
  window.showToast = (message, type = 'info', undo = null) => {
    const item = document.createElement('div');
    item.className = 'toast-deck-item';
    item.dataset.type = type;
    item.setAttribute('role', type === 'error' ? 'alert' : 'status');
    const copy = document.createElement('span');
    copy.textContent = String(message);
    item.append(copy);
    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      item.animate([{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: 'translateX(22px)' }], { duration: 180, easing: 'ease-in' }).finished.finally(() => item.remove());
    };
    if (undo?.action) {
      const undoButton = document.createElement('button');
      undoButton.type = 'button';
      undoButton.className = 'toast-undo';
      undoButton.textContent = undo.label || 'Undo';
      undoButton.addEventListener('click', () => { undo.action(); dismiss(); });
      item.append(undoButton);
    }
    const dismissButton = document.createElement('button');
    dismissButton.type = 'button';
    dismissButton.className = 'toast-dismiss';
    dismissButton.textContent = '✕';
    dismissButton.setAttribute('aria-label', 'Dismiss notification');
    dismissButton.addEventListener('click', dismiss);
    item.append(dismissButton);
    deck.prepend(item);
    while (deck.children.length > 5) deck.lastElementChild?.remove();
    setTimeout(dismiss, 5000);
    return { dismiss };
  };
  window.alert = window.showToast;
}

function installGlobalShell(store) {
  document.body.classList.add('app-shell');
  const sidebar = document.getElementById('appSidebar');
  const toggle = document.getElementById('sidebarToggle');
  const applyCollapsed = (collapsed) => {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    toggle?.setAttribute('aria-expanded', String(!collapsed));
    toggle?.setAttribute('aria-label', collapsed ? 'Expand navigation' : 'Collapse navigation');
    localStorage.setItem('soloflow_sidebar_collapsed', String(collapsed));
    store.set('sidebarCollapsed', collapsed, { source: 'shell' });
  };
  applyCollapsed(localStorage.getItem('soloflow_sidebar_collapsed') === 'true');
  toggle?.addEventListener('click', () => applyCollapsed(!document.body.classList.contains('sidebar-collapsed')));
  sidebar?.querySelectorAll('.view-tab').forEach((button) => button.setAttribute('aria-label', button.querySelector('.nav-label')?.textContent || 'Workspace view'));

  const updateCounters = () => {
    const tasks = window.tasks || [];
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    const values = {
      all: tasks.filter((task) => task.status !== 'done').length,
      today: tasks.filter((task) => task.status !== 'done' && (task.dueDate === today || task.priority === 'High')).length,
      backlog: tasks.filter((task) => task.status !== 'done' && !task.dueDate).length,
      calendar: (window.events?.length || 0) + tasks.filter((task) => task.syncedToCalendar).length + (window.gcalEvents?.length || 0),
      finance: window.financeTransactions?.length || 0
    };
    Object.entries(values).forEach(([key, value]) => { const badge = document.getElementById(`nav-count-${key}`); if (badge) badge.textContent = value > 99 ? '99+' : String(value); });
  };

  const legacySetView = window.setView;
  window.setView = function reactiveSetView(view) {
    const result = legacySetView.call(this, view);
    store.set('view', view, { source: 'navigation' });
    document.querySelectorAll('.view-tab').forEach((button) => {
      const active = button.dataset.view === view;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    return result;
  };
  ['tasks', 'events', 'transactions', 'state:change'].forEach((topic) => store.subscribe(topic, updateCounters));
  ['renderTasks', 'renderEvents', 'renderCalendar', 'renderFinance'].forEach((functionName) => {
    const render = window[functionName];
    if (typeof render !== 'function') return;
    window[functionName] = function renderWithNavigationCounters(...args) {
      const result = render.apply(this, args);
      updateCounters();
      return result;
    };
  });
  updateCounters();
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try { await navigator.serviceWorker.register('./service-worker.js', { scope: './' }); }
  catch (error) { console.warn('SoloFlow service worker was not registered.', error); }
}

function start() {
  installCloudWriteQueue();
  const store = createSoloFlowStore();
  bridgeLegacyPersistence(store);
  installToastDeck();
  installThemeModule(store);
  installGlobalShell(store);
  const taskModule = installTaskModule(store);
  installTimerModule(store);
  installScheduleModule(store);
  installCalendarModule(store);
  installInboxModule(store);
  installProductivityModule(store);
  installFinanceModule(store);
  installShortcutManager(taskModule);
  installReportModule();
  installNetworkStatus(store);
  registerServiceWorker();
  window.renderTasks?.();
  window.renderFinance?.();
  window.setView?.('all');
  store.bus.emit('app:ready', { at: Date.now() });
}

if (document.readyState === 'loading') addEventListener('DOMContentLoaded', start, { once: true });
else start();
