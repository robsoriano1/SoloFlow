export function installScheduleModule(store) {
  const render = window.renderSchedule;
  if (typeof render === 'function') {
    window.renderSchedule = function renderScheduleModule(...args) {
      const result = render.apply(this, args);
      store.bus.emit('schedule:rendered', { at: Date.now() });
      return result;
    };
  }
  const refresh = () => {
    const grid = document.getElementById('schedule-grid');
    if (grid && grid.offsetParent && typeof window.updateScheduleTimeMarker === 'function') window.updateScheduleTimeMarker();
  };
  const interval = setInterval(refresh, 60_000);
  refresh();
  return () => clearInterval(interval);
}

