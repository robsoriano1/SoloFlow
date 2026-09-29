import { createHeartbeat } from './timer.js';

const STORAGE_KEY = 'soloflow_pomodoro';
const DEVICE_KEY = 'soloflow_device_id';
const DEFAULT_SETTINGS = { work: 25, short: 5, long: 15, longEvery: 4, autoStart: true, sound: true };
// Shared with the user's other devices; the chime stays a per-device choice.
const SYNCED_SETTINGS = ['work', 'short', 'long', 'longEvery', 'autoStart'];
// An interval noticed later than this ended while SoloFlow wasn't running
// (closed, asleep, or a frozen background tab). It stops there rather than
// auto-starting a next interval that would already be partly gone.
const LATE_MS = 60_000;
const PHASES = {
  work: { label: 'Focus', accent: 'work' },
  short: { label: 'Short break', accent: 'break' },
  long: { label: 'Long break', accent: 'break' }
};

const clampMinutes = (value, fallback) => {
  const number = Math.round(Number(value));
  return Number.isFinite(number) && number >= 1 && number <= 180 ? number : fallback;
};

const formatClock = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

// { phase, endsAt } while running, { phase, remaining } while paused; anything
// else (a malformed cloud or storage copy) reads as no session.
function validSession(value) {
  if (!value || !PHASES[value.phase]) return null;
  if (Number.isFinite(value.endsAt)) return { phase: value.phase, endsAt: value.endsAt };
  if (Number.isFinite(value.remaining)) return { phase: value.phase, remaining: Math.max(0, value.remaining) };
  return null;
}

function readStored() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      cycles: Number(parsed.cycles) || 0,
      taskId: parsed.taskId || null,
      session: validSession(parsed.session),
      owner: parsed.owner || null,
      updatedAt: Number(parsed.updatedAt) || 0
    };
  } catch {
    return { settings: { ...DEFAULT_SETTINGS }, cycles: 0, taskId: null, session: null, owner: null, updatedAt: 0 };
  }
}

// Tells this browser apart from the user's other signed-in devices.
function readDeviceId() {
  const fresh = () => crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) { id = fresh(); localStorage.setItem(DEVICE_KEY, id); }
    return id;
  } catch {
    return fresh();
  }
}

export function installPomodoroModule(store) {
  const deviceId = readDeviceId();
  const stored = readStored();
  let settings = stored.settings;
  let cycles = stored.cycles;
  let taskId = stored.taskId;
  // session: { phase, endsAt } while running, { phase, remaining } while paused.
  let session = null;
  // The device where the timer was last started or resumed. Only it runs the
  // task clock, so a block followed on two devices is logged once.
  let owner = stored.owner || deviceId;
  // When this state was last published. Of two copies, the newer one wins.
  let updatedAt = stored.updatedAt;
  let audioContext = null;
  // True while this module moves the task clock itself, so the activeTimer
  // listener only follows clocks started or stopped from somewhere else.
  let steering = false;
  const baseTitle = document.title;

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, cycles, taskId, session, owner, updatedAt }));
    } catch { /* storage full or blocked; the timer still runs in memory */ }
  }

  const sharedState = () => ({
    session,
    cycles,
    taskId: taskId || null,
    owner,
    settings: Object.fromEntries(SYNCED_SETTINGS.map((key) => [key, settings[key]])),
    updatedAt
  });

  // Save, and hand the new state to the user's other devices (index.html
  // writes it to Firestore when signed in).
  function publish() {
    updatedAt = Date.now();
    persist();
    window.savePomodoroState?.(sharedState());
  }

  // Starting or resuming here makes this the device that logs focus time.
  function claim() { owner = deviceId; }

  function phaseMinutes(phase) {
    if (phase === 'work') return settings.work;
    return phase === 'long' ? settings.long : settings.short;
  }

  const isRunning = () => Boolean(session?.endsAt);
  const remainingMs = () => {
    if (!session) return phaseMinutes('work') * 60_000;
    return session.endsAt ? Math.max(0, session.endsAt - Date.now()) : session.remaining;
  };
  const currentPhase = () => session?.phase || 'work';

  // --- task link -------------------------------------------------------------
  const openTasks = () => (window.tasks || []).filter((task) => task.status !== 'done');

  function resolveTaskId() {
    const tasks = openTasks();
    if (taskId && tasks.some((task) => task.id === taskId)) return taskId;
    const active = window.SoloFlowTimer?.activeTaskId;
    if (active && tasks.some((task) => task.id === active)) return active;
    return tasks.find((task) => task.status === 'inprogress')?.id || tasks[0]?.id || null;
  }

  function linkedTask() {
    return (window.tasks || []).find((task) => task.id === taskId) || null;
  }

  function steer(action) {
    steering = true;
    try { action(); } finally { steering = false; }
  }

  function attachTaskClock() {
    const clock = window.SoloFlowTimer;
    if (!clock || owner !== deviceId) return;
    taskId = resolveTaskId(); // never log to a finished or deleted task
    if (!taskId || clock.activeTaskId === taskId) return;
    steer(() => {
      if (clock.activeTaskId) clock.stop();
      clock.start(taskId);
    });
  }

  // Any running task clock belongs to this timer; see the activeTimer listener.
  function detachTaskClock() {
    if (window.SoloFlowTimer?.activeTaskId) steer(() => window.SoloFlowTimer.stop());
  }

  // --- feedback --------------------------------------------------------------
  function chime() {
    if (!settings.sound) return;
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      const now = audioContext.currentTime;
      [0, 0.18].forEach((offset, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = index ? 660 : 880;
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.22, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.16);
        oscillator.connect(gain).connect(audioContext.destination);
        oscillator.start(now + offset);
        oscillator.stop(now + offset + 0.2);
      });
    } catch { /* audio unavailable; the toast still reports the transition */ }
  }

  // --- transitions -----------------------------------------------------------
  // `completed` counts the focus block that just finished, so with a long break
  // every 4 it follows the 4th block, not the 3rd.
  function nextPhase(finished, completed) {
    if (finished !== 'work') return 'work';
    return completed % Math.max(1, settings.longEvery) === 0 ? 'long' : 'short';
  }

  function startPhase(phase) {
    claim();
    session = { phase, endsAt: Date.now() + phaseMinutes(phase) * 60_000 };
    if (phase === 'work') attachTaskClock(); else detachTaskClock();
    publish();
    paint();
    startTicker();
    store.bus.emit('pomodoro:start', { phase, taskId, auto: false });
  }

  function completePhase() {
    const finished = currentPhase();
    const endedAt = session.endsAt;
    const late = Date.now() - endedAt > LATE_MS;
    // Stop the task clock while the session still ends at endedAt, so it logs
    // no further than the block itself.
    detachTaskClock();
    stopTicker();
    if (finished === 'work') cycles += 1;
    const upcoming = nextPhase(finished, cycles);
    const length = phaseMinutes(upcoming) * 60_000;
    // Timed from the scheduled end rather than from now, so every device that
    // watches the interval end arrives at the same next one.
    session = settings.autoStart && !late
      ? { phase: upcoming, endsAt: endedAt + length }
      : { phase: upcoming, remaining: length };
    store.bus.emit('pomodoro:complete', { phase: finished, cycles, taskId });

    if (late) {
      // Kept to this device: one that saw the end live has the better copy.
      persist();
      window.showToast?.(`Your ${PHASES[finished].label.toLowerCase()} interval ended while SoloFlow was away.`, 'info');
    } else {
      chime();
      const task = linkedTask();
      window.showToast?.(finished === 'work'
        ? `Focus block done${task ? ` — ${task.title}` : ''}. ${PHASES[upcoming].label} next.`
        : 'Break over. Back to focus.', 'success');
      publish();
    }
    if (isRunning()) {
      if (upcoming === 'work') attachTaskClock();
      startTicker();
      store.bus.emit('pomodoro:start', { phase: upcoming, taskId, auto: true });
    }
    paint();
  }

  function pause() {
    if (!isRunning()) return;
    detachTaskClock();
    session = { phase: session.phase, remaining: remainingMs() };
    stopTicker();
    publish();
    paint();
  }

  function resume() {
    if (!session || isRunning()) return;
    claim();
    session = { phase: session.phase, endsAt: Date.now() + session.remaining };
    if (session.phase === 'work') attachTaskClock();
    publish();
    paint();
    startTicker();
  }

  function reset() {
    const phase = currentPhase();
    detachTaskClock();
    stopTicker();
    session = { phase, remaining: phaseMinutes(phase) * 60_000 };
    publish();
    paint();
  }

  function skip() {
    const finished = currentPhase();
    detachTaskClock();
    stopTicker();
    const upcoming = nextPhase(finished, cycles + 1);
    session = { phase: upcoming, remaining: phaseMinutes(upcoming) * 60_000 };
    publish();
    paint();
  }

  function toggle() {
    if (isRunning()) return pause();
    if (session && session.remaining > 0) return resume();
    startPhase(currentPhase());
  }

  // Put a task on the focus clock: retarget a running focus block, otherwise
  // resume the paused one or start a fresh block (ending any break early).
  function focusOn(id) {
    claim();
    taskId = id;
    if (isRunning() && currentPhase() === 'work') { attachTaskClock(); publish(); paint(); }
    else if (session?.phase === 'work' && session.remaining > 0) resume();
    else startPhase('work');
    if (dialog.open) paintTaskSelect();
  }

  // A copy from another device (via index.html's Firestore listener). The newer
  // copy wins; an older one means this device has news, so it is sent back.
  function receive(remote) {
    if (!remote) { if (updatedAt) window.savePomodoroState?.(sharedState()); return; }
    const remoteAt = Number(remote.updatedAt) || 0;
    if (remoteAt < updatedAt) { window.savePomodoroState?.(sharedState()); return; }
    if (remoteAt === updatedAt) return; // the copy this device already has

    const next = validSession(remote.session);
    const nextOwner = typeof remote.owner === 'string' ? remote.owner : null;
    const nextTask = remote.taskId || null;
    const keepsClock = Boolean(next?.endsAt) && next.phase === 'work' && nextOwner === deviceId
      && nextTask === window.SoloFlowTimer?.activeTaskId;
    if (!keepsClock) detachTaskClock();

    session = next;
    cycles = Number(remote.cycles) || 0;
    taskId = nextTask;
    owner = nextOwner;
    SYNCED_SETTINGS.forEach((key) => {
      const value = remote.settings?.[key];
      if (value === undefined) return;
      settings[key] = key === 'autoStart' ? Boolean(value) : clampMinutes(value, DEFAULT_SETTINGS[key]);
    });
    updatedAt = remoteAt;
    persist();

    stopTicker();
    if (isRunning()) {
      if (currentPhase() === 'work' && remainingMs() > 0) attachTaskClock();
      startTicker(); // an interval that has already ended completes on the first tick
    }
    paintSettings();
    paint();
    if (dialog.open) paintTaskSelect();
  }

  // Wall-clock driven, so a late tick shortens the wait, never the block.
  const heartbeat = createHeartbeat(() => {
    if (!isRunning()) return;
    if (remainingMs() <= 0) completePhase();
    else paint();
  });
  const startTicker = () => heartbeat.start();
  const stopTicker = () => heartbeat.stop();

  // --- interface -------------------------------------------------------------
  const fab = document.createElement('button');
  fab.type = 'button';
  fab.id = 'pomodoroFab';
  fab.className = 'pomodoro-fab';
  fab.setAttribute('aria-label', 'Open the Pomodoro timer');
  fab.innerHTML = `
    <svg class="pomodoro-fab-ring" viewBox="0 0 100 100" aria-hidden="true">
      <circle class="pomodoro-fab-track" cx="50" cy="50" r="44"></circle>
      <circle class="pomodoro-fab-progress" cx="50" cy="50" r="44"></circle>
    </svg>
    <span class="pomodoro-fab-face">
      <span class="pomodoro-fab-time">25:00</span>
      <span class="pomodoro-fab-phase">Focus</span>
    </span>`;

  const dialog = document.createElement('dialog');
  dialog.id = 'pomodoroDialog';
  dialog.className = 'pomodoro-dialog';
  dialog.setAttribute('aria-labelledby', 'pomodoroDialogTitle');
  dialog.innerHTML = `
    <div class="pomodoro-shell">
      <div class="pomodoro-head">
        <h2 id="pomodoroDialogTitle" class="pomodoro-title">Pomodoro</h2>
        <button type="button" class="pomodoro-close" data-action="close" aria-label="Close the Pomodoro timer">✕</button>
      </div>

      <div class="pomodoro-stage">
        <svg class="pomodoro-ring" viewBox="0 0 100 100" aria-hidden="true">
          <circle class="pomodoro-ring-track" cx="50" cy="50" r="45"></circle>
          <circle class="pomodoro-ring-progress" cx="50" cy="50" r="45"></circle>
        </svg>
        <div class="pomodoro-readout">
          <span class="pomodoro-phase" data-role="phase">Focus</span>
          <strong class="pomodoro-clock" data-role="clock" role="timer" aria-live="off">25:00</strong>
          <span class="pomodoro-cycles" data-role="cycles">0 completed today</span>
        </div>
      </div>

      <div class="pomodoro-task">
        <label for="pomodoroTask">Working on</label>
        <select id="pomodoroTask" data-role="task"></select>
        <p class="pomodoro-task-note" data-role="task-note">Focus time is logged to this task.</p>
      </div>

      <div class="pomodoro-actions">
        <button type="button" class="btn-primary pomodoro-primary" data-action="toggle">Start focus</button>
        <button type="button" class="btn-alt" data-action="reset">Reset</button>
        <button type="button" class="btn-alt" data-action="skip">Skip</button>
      </div>

      <details class="pomodoro-settings">
        <summary>Intervals</summary>
        <div class="pomodoro-settings-grid">
          <label>Focus <input type="number" min="1" max="180" data-setting="work"></label>
          <label>Short break <input type="number" min="1" max="180" data-setting="short"></label>
          <label>Long break <input type="number" min="1" max="180" data-setting="long"></label>
          <label>Long break every <input type="number" min="1" max="12" data-setting="longEvery"></label>
        </div>
        <label class="pomodoro-check"><input type="checkbox" data-setting="autoStart"> Start the next interval automatically</label>
        <label class="pomodoro-check"><input type="checkbox" data-setting="sound"> Play a chime when an interval ends</label>
      </details>
    </div>`;

  document.body.append(fab, dialog);

  const el = (role) => dialog.querySelector(`[data-role="${role}"]`);
  const taskSelect = el('task');
  const primaryButton = dialog.querySelector('[data-action="toggle"]');
  const fabProgress = fab.querySelector('.pomodoro-fab-progress');
  const ringProgress = dialog.querySelector('.pomodoro-ring-progress');
  const FAB_CIRCUMFERENCE = 2 * Math.PI * 44;
  const RING_CIRCUMFERENCE = 2 * Math.PI * 45;

  function paintTaskSelect() {
    const tasks = openTasks();
    const selected = resolveTaskId();
    if (selected !== taskId) { taskId = selected; persist(); }
    taskSelect.innerHTML = tasks.length
      ? tasks.map((task) => `<option value="${task.id}"></option>`).join('')
      : '<option value="">No open tasks</option>';
    tasks.forEach((task, index) => { taskSelect.options[index].textContent = `${task.title} · ${task.category}`; });
    taskSelect.value = taskId || '';
    taskSelect.disabled = !tasks.length;
    const note = el('task-note');
    if (note) {
      note.textContent = tasks.length
        ? 'Focus time is logged to this task while the focus interval runs.'
        : 'Add a task to log focus time against it.';
    }
  }

  function paint() {
    const phase = currentPhase();
    const remaining = remainingMs();
    const total = phaseMinutes(phase) * 60_000;
    const progress = total > 0 ? 1 - Math.min(1, remaining / total) : 0;
    const clock = formatClock(remaining);
    const running = isRunning();

    fab.dataset.phase = PHASES[phase].accent;
    fab.dataset.running = String(running);
    fab.querySelector('.pomodoro-fab-time').textContent = clock;
    fab.querySelector('.pomodoro-fab-phase').textContent = PHASES[phase].label;
    fab.setAttribute('aria-label', running
      ? `${PHASES[phase].label} — ${clock} remaining. Open the Pomodoro timer.`
      : 'Open the Pomodoro timer');
    fabProgress.style.strokeDasharray = String(FAB_CIRCUMFERENCE);
    fabProgress.style.strokeDashoffset = String(FAB_CIRCUMFERENCE * (1 - progress));

    dialog.dataset.phase = PHASES[phase].accent;
    el('phase').textContent = PHASES[phase].label;
    el('clock').textContent = clock;
    el('cycles').textContent = `${cycles} focus block${cycles === 1 ? '' : 's'} completed`;
    ringProgress.style.strokeDasharray = String(RING_CIRCUMFERENCE);
    ringProgress.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - progress));
    primaryButton.textContent = running ? 'Pause' : (session && session.remaining < total ? 'Resume' : `Start ${PHASES[phase].label.toLowerCase()}`);

    document.title = running ? `${clock} · ${PHASES[phase].label} — ${baseTitle}` : baseTitle;
  }

  function paintSettings() {
    dialog.querySelectorAll('[data-setting]').forEach((input) => {
      const key = input.dataset.setting;
      if (input.type === 'checkbox') input.checked = Boolean(settings[key]);
      else input.value = settings[key];
    });
  }

  function open() {
    paintTaskSelect();
    paintSettings();
    paint();
    if (!dialog.open) dialog.showModal();
  }

  fab.addEventListener('click', open);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => { document.title = isRunning() ? document.title : baseTitle; });

  dialog.querySelector('[data-action="close"]').addEventListener('click', () => dialog.close());
  primaryButton.addEventListener('click', () => { toggle(); paint(); });
  dialog.querySelector('[data-action="reset"]').addEventListener('click', () => reset());
  dialog.querySelector('[data-action="skip"]').addEventListener('click', () => skip());

  taskSelect.addEventListener('change', () => {
    taskId = taskSelect.value || null;
    if (isRunning() && currentPhase() === 'work') { claim(); attachTaskClock(); }
    publish();
    paint();
  });

  dialog.querySelectorAll('[data-setting]').forEach((input) => {
    input.addEventListener('change', () => {
      const key = input.dataset.setting;
      if (input.type === 'checkbox') settings[key] = input.checked;
      else settings[key] = clampMinutes(input.value, DEFAULT_SETTINGS[key]);
      paintSettings();
      // A length change only takes effect on the next interval, never mid-run.
      if (!isRunning()) session = { phase: currentPhase(), remaining: phaseMinutes(currentPhase()) * 60_000 };
      publish();
      paint();
    });
  });

  // Restore whatever was running before the reload. An interval that ended
  // meanwhile completes on the first tick, as it would have live.
  session = stored.session;
  if (isRunning()) {
    if (currentPhase() === 'work' && remainingMs() > 0) attachTaskClock();
    startTicker();
  }

  paintTaskSelect();
  paintSettings();
  paint();

  // Schedule chips hand a task straight to the timer, without cutting a running break short.
  window.focusTaskInPomodoro = (id) => {
    if (isRunning() && currentPhase() !== 'work') { taskId = id; publish(); }
    else focusOn(id);
    open();
  };

  window.openPomodoro = open;
  window.SoloFlowPomodoro = {
    open, toggle, reset, skip, receive,
    get phase() { return currentPhase(); },
    get running() { return isRunning(); },
    get taskId() { return taskId; },
    // The task clock logs no further than this, even if the tab slept through it.
    get focusEndsAt() { return isRunning() && currentPhase() === 'work' ? session.endsAt : null; }
  };
  // The first cloud snapshot can land before this module is installed.
  if ('soloflowPomodoroCloud' in window) receive(window.soloflowPomodoroCloud);

  ['tasks', 'state:change'].forEach((topic) => store.subscribe(topic, () => {
    if (dialog.open) paintTaskSelect();
  }));

  // Task cards, the Productivity Hub, the context menu and shortcuts all start
  // and stop the task clock directly. Follow them so this clock never disagrees:
  // a clock started anywhere runs a focus block, and one stopped anywhere
  // (Stop, or finishing, deleting or clearing the task) pauses it.
  store.subscribe('activeTimer', ({ value }) => {
    if (steering) return;
    if (value?.taskId) focusOn(value.taskId);
    else if (isRunning() && currentPhase() === 'work') pause();
  });

  return () => { stopTicker(); fab.remove(); dialog.remove(); };
}
