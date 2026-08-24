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

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try { await navigator.serviceWorker.register('./service-worker.js', { scope: './' }); }
  catch (error) { console.warn('SoloFlow service worker was not registered.', error); }
}

function start() {
  installCloudWriteQueue();
  const store = createSoloFlowStore();
  bridgeLegacyPersistence(store);
  installThemeModule(store);
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
  store.bus.emit('app:ready', { at: Date.now() });
}

if (document.readyState === 'loading') addEventListener('DOMContentLoaded', start, { once: true });
else start();

