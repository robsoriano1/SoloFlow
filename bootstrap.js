export function installProductivityModule(store) {
  const render = window.renderProductivityDashboard;
  if (typeof render !== 'function') return;
  window.renderProductivityDashboard = function renderProductivityModule(...args) {
    const result = render.apply(this, args);
    requestAnimationFrame(() => store.bus.emit('productivity:rendered', {
      tasks: window.tasks.length,
      completed: window.tasks.filter((task) => task.status === 'done').length
    }));
    return result;
  };
}

