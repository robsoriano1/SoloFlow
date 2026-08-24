const categoryColor = (category) => {
  let hash = 0;
  for (const character of String(category)) hash = character.charCodeAt(0) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360} 72% 56%)`;
};

function calendarContext() {
  const label = document.getElementById('calendar-month-year')?.textContent?.trim();
  if (!label) return null;
  const parsed = new Date(`${label} 1`);
  return Number.isNaN(parsed.getTime()) ? null : { year: parsed.getFullYear(), month: parsed.getMonth() };
}

function decorateCalendarDensity() {
  const context = calendarContext();
  if (!context) return;
  document.querySelectorAll('#calendar-grid .calendar-day').forEach((dayCell) => {
    dayCell.querySelector('.calendar-density-dots')?.remove();
    const day = Number(dayCell.querySelector('.calendar-date')?.textContent);
    if (!day) return;
    const date = `${context.year}-${String(context.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const categories = [];
    (window.events || []).filter((event) => event.date === date).forEach(() => categories.push('Event'));
    (window.tasks || []).filter((task) => task.syncedToCalendar && task.dueDate === date).forEach((task) => categories.push(task.category || 'Task'));
    (window.gcalEvents || []).filter((event) => (event.start?.dateTime || event.start?.date || '').slice(0, 10) === date).forEach(() => categories.push('Google Calendar'));
    if (!categories.length) return;
    const unique = [...new Set(categories)];
    const cluster = document.createElement('div');
    cluster.className = 'calendar-density-dots';
    cluster.title = `${categories.length} item${categories.length === 1 ? '' : 's'} · ${unique.join(', ')}`;
    unique.slice(0, 6).forEach((category) => {
      const dot = document.createElement('span');
      dot.className = 'calendar-density-dot';
      dot.style.setProperty('--dot-color', categoryColor(category));
      dot.title = category;
      cluster.append(dot);
    });
    dayCell.querySelector('.calendar-date')?.after(cluster);
  });
}

export function installCalendarModule(store) {
  const render = window.renderCalendar;
  if (typeof render === 'function') {
    window.renderCalendar = function renderCalendarModule(...args) {
      const result = render.apply(this, args);
      requestAnimationFrame(() => {
        decorateCalendarDensity();
        store.bus.emit('calendar:rendered', { at: Date.now() });
      });
      return result;
    };
  }
  ['events', 'tasks'].forEach((topic) => store.subscribe(topic, () => {
    if (document.getElementById('calendar-container')?.offsetParent) window.renderCalendar?.();
  }));
  window.decorateCalendarDensity = decorateCalendarDensity;
}
