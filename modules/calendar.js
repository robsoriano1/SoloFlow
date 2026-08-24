export function installCalendarModule(store) {
  const render = window.renderCalendar;
  if (typeof render === 'function') {
    window.renderCalendar = function renderCalendarModule(...args) {
      const result = render.apply(this, args);
      store.bus.emit('calendar:rendered', { at: Date.now() });
      return result;
    };
  }
  store.subscribe('events', () => {
    if (document.getElementById('calendar-container')?.offsetParent) window.renderCalendar?.();
  });
}

