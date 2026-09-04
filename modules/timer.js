import { ICONS } from './icons.js';

const localDateKey = (timestamp = Date.now()) => {
  const date = new Date(timestamp);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(timestamp - offset).toISOString().slice(0, 10);
};

function allocateFocusSeconds(task, from, to) {
  task.focusLog = task.focusLog && typeof task.focusLog === 'object' ? task.focusLog : {};
  let cursor = from;
  while (cursor < to) {
    const date = new Date(cursor);
    const boundary = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
    const segmentEnd = Math.min(to, boundary);
    const seconds = Math.max(0, Math.floor((segmentEnd - cursor) / 1000));
    const key = localDateKey(cursor);
    task.focusLog[key] = (task.focusLog[key] || 0) + seconds;
    cursor = segmentEnd;
  }
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `⏱ ${hours ? `${hours}h ` : ''}${minutes}m${remainder}s`;
}

export function installTimerModule(store) {
  const workerSource = `
    let heartbeat = null;
    self.onmessage = ({ data }) => {
      if (data.type === 'start') {
        clearInterval(heartbeat);
        const tick = () => self.postMessage({ type: 'tick', now: Date.now() });
        tick();
        heartbeat = setInterval(tick, 250);
      }
      if (data.type === 'stop') { clearInterval(heartbeat); heartbeat = null; }
    };
  `;
  const url = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
  const worker = new Worker(url);
  let session = null;
  let lastPersistedSecond = -1;

  function paint(taskId, seconds, active) {
    const display = document.getElementById(`display-timer-${taskId}`);
    if (display) display.textContent = formatDuration(seconds);
    const button = document.getElementById(`btn-timer-${taskId}`);
    if (button) {
      button.className = active ? 'btn-timer active' : 'btn-timer';
      button.innerHTML = active ? `${ICONS.stop} Stop` : `${ICONS.play} Pomodoro`;
      button.setAttribute('aria-pressed', String(active));
    }
  }

  function commit(now = Date.now(), persist = false) {
    if (!session) return;
    const task = window.tasks.find((item) => item.id === session.taskId);
    if (!task) {
      worker.postMessage({ type: 'stop' });
      session = null;
      window.activeTaskId = null;
      window.timerInterval = null;
      store.set('activeTimer', null, { source: 'timer-missing-task' });
      return;
    }
    const totalSeconds = session.baseSeconds + Math.max(0, Math.floor((now - session.startedAt) / 1000));
    const delta = totalSeconds - task.timeSpent;
    if (delta > 0) {
      allocateFocusSeconds(task, session.lastAllocatedAt, session.lastAllocatedAt + delta * 1000);
      session.lastAllocatedAt += delta * 1000;
      task.timeSpent = totalSeconds;
      store.patchCollection('tasks', task.id, { timeSpent: task.timeSpent, focusLog: task.focusLog }, { source: 'timer' });
    }
    paint(task.id, task.timeSpent, true);
    if (persist || (totalSeconds > 0 && totalSeconds % 10 === 0 && totalSeconds !== lastPersistedSecond)) {
      lastPersistedSecond = totalSeconds;
      window.saveTasks(true);
    }
  }

  function stop(persist = true) {
    if (!session) return;
    const priorId = session.taskId;
    commit(Date.now(), persist);
    worker.postMessage({ type: 'stop' });
    paint(priorId, window.tasks.find((item) => item.id === priorId)?.timeSpent || 0, false);
    session = null;
    window.activeTaskId = null;
    window.timerInterval = null;
    store.set('activeTimer', null, { source: 'timer' });
  }

  function start(taskId) {
    const task = window.tasks.find((item) => item.id === taskId);
    if (!task) return;
    const now = Date.now();
    task.timeSpent = Number(task.timeSpent) || 0;
    session = { taskId, startedAt: now, lastAllocatedAt: now, baseSeconds: task.timeSpent };
    window.activeTaskId = taskId;
    window.timerInterval = null;
    lastPersistedSecond = -1;
    worker.postMessage({ type: 'start' });
    paint(taskId, task.timeSpent, true);
    store.set('activeTimer', { taskId, startedAt: now }, { source: 'timer' });
  }

  worker.addEventListener('message', ({ data }) => {
    if (data.type === 'tick') commit(data.now);
  });

  window.toggleTimer = (taskId) => {
    if (session?.taskId === taskId) return stop();
    if (session) stop();
    start(taskId);
  };
  window.SoloFlowTimer = { start, stop, commit, get activeTaskId() { return session?.taskId || null; } };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) commit(Date.now()); });
  addEventListener('pagehide', () => commit(Date.now(), true));
  return window.SoloFlowTimer;
}
