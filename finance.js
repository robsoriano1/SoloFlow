/**
 * SoloFlow's compatibility-first reactive store.
 * The legacy window collections remain the persistence contract; this store
 * publishes granular mutations so new modules can patch only affected nodes.
 */
export class EventBus {
  #listeners = new Map();

  on(topic, listener) {
    if (!this.#listeners.has(topic)) this.#listeners.set(topic, new Set());
    this.#listeners.get(topic).add(listener);
    return () => this.#listeners.get(topic)?.delete(listener);
  }

  emit(topic, detail) {
    this.#listeners.get(topic)?.forEach((listener) => listener(detail));
    this.#listeners.get('*')?.forEach((listener) => listener({ topic, detail }));
  }
}

export class ReactiveStore {
  #state;
  #bus = new EventBus();

  constructor(initialState = {}) {
    this.#state = structuredClone(initialState);
  }

  get bus() { return this.#bus; }
  get state() { return this.#state; }
  snapshot() { return structuredClone(this.#state); }

  subscribe(topic, listener) { return this.#bus.on(topic, listener); }

  set(path, value, meta = {}) {
    const keys = path.split('.');
    let cursor = this.#state;
    for (const key of keys.slice(0, -1)) cursor = cursor[key] ??= {};
    const key = keys.at(-1);
    const previous = cursor[key];
    cursor[key] = value;
    this.#bus.emit(path, { path, value, previous, meta });
    this.#bus.emit('state:change', { path, value, previous, meta });
  }

  patchCollection(name, id, patch, meta = {}) {
    const collection = this.#state[name] ?? [];
    const index = collection.findIndex((item) => item.id === id);
    if (index < 0) return false;
    const previous = collection[index];
    const value = { ...previous, ...patch };
    collection[index] = value;
    this.#bus.emit(`${name}:patch`, { id, index, value, previous, meta });
    this.#bus.emit('state:change', { path: name, value, previous, meta });
    return true;
  }

  syncFromWindow(meta = { source: 'legacy' }) {
    const mappings = {
      tasks: 'tasks', events: 'events', schedule: 'scheduleData',
      transactions: 'financeTransactions', assets: 'financeAssets',
      projects: 'financeProjects', budgets: 'financeBudgets', settings: 'settings'
    };
    Object.entries(mappings).forEach(([key, globalName]) => {
      const next = window[globalName];
      if (next !== undefined) this.set(key, structuredClone(next), meta);
    });
  }
}

export function createSoloFlowStore() {
  const store = new ReactiveStore({
    tasks: window.tasks ?? [],
    events: window.events ?? [],
    schedule: window.scheduleData ?? {},
    transactions: window.financeTransactions ?? [],
    assets: window.financeAssets ?? [],
    projects: window.financeProjects ?? [],
    budgets: window.financeBudgets ?? [],
    settings: window.settings ?? {},
    selection: [],
    online: navigator.onLine
  });
  window.SoloFlowStore = store;
  addEventListener('online', () => store.set('online', true, { source: 'network' }));
  addEventListener('offline', () => store.set('online', false, { source: 'network' }));
  return store;
}

