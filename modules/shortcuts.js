const isTyping = (target) => target instanceof HTMLElement && (
  target.matches('input, textarea, select, [contenteditable="true"]') || target.closest('[contenteditable="true"]')
);

function closeOverlays() {
  window.closeGCalEventModal?.();
  document.querySelectorAll('.format-toolbar, .modal-backdrop, dialog[open]').forEach((element) => {
    if (element instanceof HTMLDialogElement) element.close();
    else element.classList.remove('visible', 'active', 'open');
  });
  document.querySelectorAll('details[open]').forEach((details) => details.removeAttribute('open'));
}

export function installShortcutManager(taskModule) {
  const views = { '1': 'all', '2': 'today', '3': 'backlog', '4': 'schedule', '5': 'calendar', '6': 'finance' };
  addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeOverlays();
      taskModule?.clearSelection();
      return;
    }
    if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
    if (views[event.key]) {
      event.preventDefault();
      window.setView?.(views[event.key]);
      return;
    }
    if (event.key.toLowerCase() === 'n') {
      event.preventDefault();
      window.setView?.('all');
      document.getElementById('taskTitle')?.focus();
      return;
    }
    if (event.key === '/' || event.key.toLowerCase() === 'f') {
      event.preventDefault();
      document.getElementById('searchInput')?.focus();
      return;
    }
    if (event.code === 'Space' || event.key.toLowerCase() === 'p') {
      event.preventDefault();
      const selectedId = window.SoloFlowStore?.state.selection?.[0];
      const activeId = window.SoloFlowTimer?.activeTaskId;
      const fallback = window.tasks?.find((task) => task.status === 'inprogress')?.id || window.tasks?.find((task) => task.status !== 'done')?.id;
      const taskId = activeId || selectedId || fallback;
      if (taskId) window.toggleTimer?.(taskId);
      else window.showToast?.('Select or start a task first.', 'info');
    }
  });
}

