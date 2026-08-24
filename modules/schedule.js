export function installScheduleModule(store) {
  let selection = null;

  function cellsInRange(day, start, end) {
    const [from, to] = [start, end].sort((a, b) => a - b);
    return Array.from({ length: to - from + 1 }, (_, index) => document.getElementById(`cell-${day}-${from + index}`)).filter(Boolean);
  }

  function paintSelection() {
    document.querySelectorAll('.schedule-cell.is-range-selecting').forEach((cell) => cell.classList.remove('is-range-selecting'));
    if (!selection) return;
    cellsInRange(selection.day, selection.start, selection.end).forEach((cell) => cell.classList.add('is-range-selecting'));
  }

  function mergeSelection() {
    if (!selection || selection.start === selection.end) return;
    const cells = cellsInRange(selection.day, selection.start, selection.end);
    if (cells.length < 2) return;
    const before = cells.map((cell) => ({
      time: cell.dataset.time,
      text: cell.textContent,
      display: cell.style.display,
      gridRow: cell.style.gridRow,
      data: structuredClone(window.scheduleData[`${selection.day}-${cell.dataset.time}`] ?? null)
    }));
    const first = cells[0];
    const combinedText = cells.map((cell) => cell.textContent.trim()).filter(Boolean).join('\n');
    first.textContent = combinedText;
    first.style.display = '';
    first.style.gridRow = `${first.dataset.row} / span ${cells.length}`;
    const firstKey = `${selection.day}-${first.dataset.time}`;
    const prior = typeof window.scheduleData[firstKey] === 'object' ? window.scheduleData[firstKey] : {};
    window.scheduleData[firstKey] = { text: combinedText, bg: prior.bg || first.style.backgroundColor || '', span: cells.length, hidden: false };
    cells.slice(1).forEach((cell) => {
      cell.style.display = 'none';
      cell.textContent = '';
      window.scheduleData[`${selection.day}-${cell.dataset.time}`] = { text: '', bg: '', span: 1, hidden: true };
    });
    window.saveSchedule?.();
    store.bus.emit('schedule:block-created', { day: selection.day, start: first.dataset.time, slots: cells.length });
    window.showToast?.(`Created a ${cells.length * 30}-minute schedule block`, 'success', {
      label: 'Undo', action: () => {
        cells.forEach((cell, index) => {
          const snapshot = before[index];
          const key = `${selection?.day || cell.dataset.day}-${snapshot.time}`;
          cell.textContent = snapshot.text;
          cell.style.display = snapshot.display;
          cell.style.gridRow = snapshot.gridRow;
          if (snapshot.data === null) delete window.scheduleData[key]; else window.scheduleData[key] = snapshot.data;
        });
        window.saveSchedule?.();
      }
    });
  }

  function bindDragBlocking() {
    const grid = document.getElementById('schedule-grid');
    if (!grid || grid.dataset.dragBlockingBound === 'true') return;
    grid.dataset.dragBlockingBound = 'true';
    grid.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      const cell = event.target.closest('.schedule-cell');
      if (!cell || cell.style.display === 'none') return;
      selection = { day: cell.dataset.day, start: Number(cell.dataset.tidx), end: Number(cell.dataset.tidx), pointerId: event.pointerId, moved: false };
      grid.classList.add('is-drag-blocking');
      paintSelection();
    });
    grid.addEventListener('pointermove', (event) => {
      if (!selection || selection.pointerId !== event.pointerId) return;
      const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('.schedule-cell');
      if (!cell || cell.dataset.day !== selection.day) return;
      const next = Number(cell.dataset.tidx);
      if (next !== selection.end) {
        selection.end = next;
        selection.moved = selection.moved || next !== selection.start;
        paintSelection();
      }
      if (selection.moved) event.preventDefault();
    });
    const finish = (event) => {
      if (!selection || (event.pointerId !== undefined && selection.pointerId !== event.pointerId)) return;
      if (selection.moved) mergeSelection();
      selection = null;
      grid.classList.remove('is-drag-blocking');
      paintSelection();
    };
    grid.addEventListener('pointerup', finish);
    grid.addEventListener('pointercancel', finish);
  }

  const render = window.renderSchedule;
  if (typeof render === 'function') {
    window.renderSchedule = function renderScheduleModule(...args) {
      const result = render.apply(this, args);
      bindDragBlocking();
      store.bus.emit('schedule:rendered', { at: Date.now() });
      return result;
    };
  }
  const refresh = () => {
    const grid = document.getElementById('schedule-grid');
    if (grid && grid.offsetParent && typeof window.updateScheduleTimeMarker === 'function') window.updateScheduleTimeMarker();
  };
  const interval = setInterval(refresh, 60_000);
  bindDragBlocking();
  refresh();
  return () => clearInterval(interval);
}
