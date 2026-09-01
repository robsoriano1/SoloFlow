/** Debounced cloud writer used by the existing Firebase save boundaries. */
export class FirestoreWriteQueue {
  #delay;
  #entries = new Map();
  #running = new Map();

  constructor(delay = 500) {
    this.#delay = delay;
    addEventListener('online', () => this.flushAll());
    addEventListener('pagehide', () => this.flushAll());
  }

  enqueue(key, writer) {
    const prior = this.#entries.get(key);
    if (prior?.timer) clearTimeout(prior.timer);
    const entry = { writer, queuedAt: Date.now(), timer: null };
    entry.timer = setTimeout(() => this.flush(key), this.#delay);
    this.#entries.set(key, entry);
    localStorage.setItem('soloflow_pending_cloud_write', String(Date.now()));
  }

  async flush(key) {
    const entry = this.#entries.get(key);
    if (!entry || !navigator.onLine) return;
    clearTimeout(entry.timer);
    this.#entries.delete(key);
    const previous = this.#running.get(key) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(entry.writer);
    this.#running.set(key, run);
    try {
      await run;
      localStorage.removeItem('soloflow_pending_cloud_write');
    } catch (error) {
      console.error(`SoloFlow cloud write failed for ${key}`, error);
      this.enqueue(key, entry.writer);
    } finally {
      if (this.#running.get(key) === run) this.#running.delete(key);
    }
  }

  flushAll() {
    return Promise.allSettled([...this.#entries.keys()].map((key) => this.flush(key)));
  }
}

export function installCloudWriteQueue() {
  const queue = new FirestoreWriteQueue(500);
  window.SoloFlowCloudQueue = queue;
  return queue;
}

