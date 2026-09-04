import { ICONS } from './icons.js';

const STATUS_LABELS = { todo: 'To-Do', inprogress: 'In Progress', done: 'Done' };
const PRIORITIES = ['Low', 'Medium', 'High'];

function makeOption(value, label = value) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  return option;
}

function makeSelect(label, options, onChange) {
  const wrapper = document.createElement('label');
  wrapper.className = 'batch-field';
  const caption = document.createElement('span');
  caption.textContent = label;
  const select = document.createElement('select');
  select.append(makeOption('', 'Choose…'));
  options.forEach(([value, text]) => select.append(makeOption(value, text)));
  select.addEventListener('change', () => {
    if (!select.value) return;
    onChange(select.value);
    select.value = '';
  });
  wrapper.append(caption, select);
  return wrapper;
}

function saveGranular(store, task, patch, source = 'inline-edit') {
  Object.assign(task, patch);
  store.patchCollection('tasks', task.id, patch, { source });
  window.saveTasks(true);
  window.calculateAnalytics?.();
}

function parseInlineValue(field, value) {
  const trimmed = String(value || '').trim();
  if (field === 'priority') {
    const match = PRIORITIES.find((priority) => priority.toLowerCase() === trimmed.toLowerCase());
    return match || null;
  }
  if (field === 'dueDate') return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) || !trimmed ? trimmed : null;
  if (field === 'dueTime') return /^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed) || !trimmed ? trimmed : null;
  return trimmed || (field === 'category' ? 'General' : '');
}

function clone(value) { return structuredClone(value); }

export function installTaskModule(store) {
  const selected = new Set();
  let anchorId = null;
  let taskOrder = [];
  let savedRange = null;
  let activeEditable = null;

  const findCard = (id) => document.querySelector(`.task-card[data-task-id="${CSS.escape(id)}"]`);

  const batchBar = document.createElement('aside');
  batchBar.id = 'batch-action-bar';
  batchBar.className = 'batch-action-bar';
  batchBar.hidden = true;
  batchBar.setAttribute('aria-live', 'polite');
  const selectionCount = document.createElement('strong');

  const commitBatch = (before, message) => {
    store.set('selection', [...selected], { source: 'batch' });
    window.saveTasks();
    window.showToast?.(message, 'info', {
      label: 'Undo', action: () => { window.tasks = clone(before); window.saveTasks(); }
    });
  };

  const mutateSelected = (patch) => {
    const before = clone(window.tasks);
    window.tasks.forEach((task) => { if (selected.has(task.id)) Object.assign(task, patch); });
    commitBatch(before, `${selected.size} tasks updated`);
  };

  batchBar.append(
    selectionCount,
    makeSelect('Move', Object.entries(STATUS_LABELS), (status) => mutateSelected({ status, completedAt: status === 'done' ? new Date().toISOString() : null })),
    makeSelect('Priority', PRIORITIES.map((priority) => [priority, priority]), (priority) => mutateSelected({ priority })),
    makeSelect('Category', [['Development', 'Development'], ['Study', 'Study'], ['Finance', 'Finance'], ['Operations', 'Operations'], ['Personal', 'Personal']], (category) => mutateSelected({ category })),
    makeSelect('Project', (window.financeProjects || []).map((project) => [project.id, project.name]), (projectId) => mutateSelected({ projectId }))
  );
  const batchDelete = document.createElement('button');
  batchDelete.type = 'button';
  batchDelete.className = 'btn-small btn-danger';
  batchDelete.textContent = 'Delete selected';
  batchDelete.addEventListener('click', () => {
    if (!confirm(`Delete ${selected.size} selected tasks?`)) return;
    const before = clone(window.tasks);
    const deletedCount = selected.size;
    window.tasks = window.tasks.filter((task) => !selected.has(task.id));
    selected.forEach((id) => window.expandedCards?.delete(id));
    selected.clear();
    commitBatch(before, `${deletedCount} tasks deleted`);
  });
  const clearSelection = document.createElement('button');
  clearSelection.type = 'button';
  clearSelection.className = 'btn-small';
  clearSelection.textContent = 'Clear selection';
  clearSelection.addEventListener('click', () => { selected.clear(); updateSelectionUI(); });
  batchBar.append(batchDelete, clearSelection);
  document.body.append(batchBar);

  const contextMenu = document.createElement('div');
  contextMenu.id = 'taskContextMenu';
  contextMenu.className = 'task-context-menu';
  contextMenu.hidden = true;
  contextMenu.setAttribute('role', 'menu');
  document.body.append(contextMenu);

  function addContextAction(icon, label, action, danger = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'menuitem');
    button.classList.toggle('danger', danger);
    const glyph = document.createElement('span');
    glyph.innerHTML = icon;
    const text = document.createElement('span');
    text.textContent = label;
    button.append(glyph, text);
    button.addEventListener('click', () => { contextMenu.hidden = true; action(); });
    contextMenu.append(button);
  }

  function openContextMenu(taskId, x, y) {
    const task = window.tasks.find((item) => item.id === taskId);
    if (!task) return;
    contextMenu.replaceChildren();
    addContextAction('✓', 'Move to Done', () => window.moveTask(taskId, 'done'));
    addContextAction(ICONS.play, 'Start Focus Timer', () => window.toggleTimer?.(taskId));
    addContextAction('⧉', 'Duplicate Task', () => {
      const copy = clone(task);
      copy.id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      copy.title = `${task.title} (Copy)`;
      copy.status = 'todo';
      copy.completedAt = null;
      copy.syncedToCalendar = false;
      copy.syncedToGCal = false;
      copy.googleEventId = null;
      copy.integrations = {
        internalCalendar: { status: 'idle', eventId: null },
        googleCalendar: { status: 'idle', eventId: null },
        ics: { lastExportedAt: null },
        email: { lastSentAt: null }
      };
      copy.syncStatus = 'idle';
      copy.metadata = {
        ...(copy.metadata || {}),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'duplicate'
      };
      window.tasks.push(window.normalizeTaskSchema ? window.normalizeTaskSchema(copy, 'duplicate') : copy);
      window.saveTasks();
      window.showToast?.('Task duplicated', 'success');
    });
    addContextAction(ICONS.arrowUpRight, 'Copy Task Link', async () => {
      const url = new URL(location.href);
      url.hash = `task-${encodeURIComponent(taskId)}`;
      try { await navigator.clipboard.writeText(url.href); window.showToast?.('Task link copied', 'success'); }
      catch { window.showToast?.('Clipboard permission was unavailable', 'error'); }
    });
    addContextAction('⌫', 'Delete Task', () => window.deleteTask(taskId), true);
    contextMenu.hidden = false;
    const bounds = contextMenu.getBoundingClientRect();
    contextMenu.style.left = `${Math.min(x, innerWidth - bounds.width - 10)}px`;
    contextMenu.style.top = `${Math.min(y, innerHeight - bounds.height - 10)}px`;
    contextMenu.querySelector('button')?.focus();
  }

  function decorateInlineField(element, task, field, placeholder) {
    if (!element || element.dataset.inlineBound === 'true') return;
    element.dataset.inlineBound = 'true';
    element.dataset.inlineField = field;
    element.dataset.placeholder = placeholder;
    element.classList.add('inline-editable', 'editable');
    element.contentEditable = 'true';
    element.spellcheck = field !== 'dueDate' && field !== 'dueTime';
    element.setAttribute('role', 'textbox');
    element.setAttribute('aria-label', `Edit task ${field}`);
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); element.blur(); }
      if (event.key === 'Escape') { event.preventDefault(); element.textContent = task[field] || ''; element.blur(); }
    });
    element.addEventListener('blur', () => {
      const value = parseInlineValue(field, element.textContent);
      if (value === null) {
        element.textContent = task[field] || '';
        window.showToast?.(`Use a valid ${field === 'dueDate' ? 'YYYY-MM-DD date' : field === 'dueTime' ? '24-hour HH:MM time' : 'priority'}.`, 'error');
        return;
      }
      if (value !== task[field]) saveGranular(store, task, { [field]: value });
      element.textContent = value;
      if (field === 'priority') element.className = `badge ${value.toLowerCase()} inline-editable editable`;
    });
  }

  function decorateDates(card, task) {
    if (card.querySelector('.inline-date-cluster')) return;
    const meta = card.querySelector('.task-meta');
    if (!meta) return;
    const dueParagraph = [...meta.querySelectorAll('p')].find((paragraph) => paragraph.textContent.includes('Due:'));
    if (dueParagraph) dueParagraph.hidden = true;
    const cluster = document.createElement('div');
    cluster.className = 'inline-date-cluster';
    const label = document.createElement('span');
    label.textContent = 'Due';
    label.className = 'badge';
    const date = document.createElement('time');
    date.className = 'inline-date-value';
    date.textContent = task.dueDate || '';
    const time = document.createElement('time');
    time.className = 'inline-date-value';
    time.textContent = task.dueTime || '';
    decorateInlineField(date, task, 'dueDate', 'YYYY-MM-DD');
    decorateInlineField(time, task, 'dueTime', 'HH:MM');
    cluster.append(label, date, time);
    const topActions = card.querySelector(':scope > .actions');
    if (topActions) topActions.before(cluster); else card.append(cluster);
  }

  function decorateProgress(card, task) {
    card.querySelector('.subtask-progress-pill')?.remove();
    if (!task.subtasks?.length) return;
    const completed = task.subtasks.filter((subtask) => subtask.completed).length;
    const pill = document.createElement('span');
    pill.className = 'subtask-progress-pill';
    pill.title = `${completed} of ${task.subtasks.length} subtasks complete`;
    const ring = document.createElement('i');
    ring.className = 'subtask-progress-ring';
    ring.style.setProperty('--progress', `${completed / task.subtasks.length * 100}%`);
    const text = document.createElement('span');
    text.textContent = `${completed}/${task.subtasks.length}`;
    pill.append(ring, text);
    const actions = card.querySelector(':scope > .actions');
    actions?.before(pill);
  }

  function decorateCards() {
    const cards = [...document.querySelectorAll('#todo-list .task-card, #inprogress-list .task-card, #done-list .task-card')];
    taskOrder = [];
    cards.forEach((card) => {
      const id = card.dataset.taskId;
      const task = window.tasks.find((item) => item.id === id);
      if (!id || !task) return;
      taskOrder.push(id);
      card.classList.toggle('batch-selected', selected.has(id));
      card.setAttribute('aria-selected', String(selected.has(id)));
      card.setAttribute('aria-label', `${task.title}, ${task.priority} priority, ${STATUS_LABELS[task.status]}`);
      const title = card.querySelector('.task-title');
      const description = card.querySelector('.task-desc');
      [title, description, ...card.querySelectorAll('.subtask-text-container')].forEach((editable) => {
        editable?.classList.add('inline-editable');
        if (editable) editable.dataset.placeholder = editable === title ? 'Untitled task' : editable === description ? 'Add notes…' : 'Subtask';
      });
      const badges = card.querySelectorAll('.badges .badge');
      decorateInlineField(badges[0], task, 'priority', 'Priority');
      decorateInlineField(badges[1], task, 'category', 'Category');
      decorateDates(card, task);
      decorateProgress(card, task);
      if (task.projectId && !card.querySelector('.project-epic-badge')) {
        const project = (window.financeProjects || []).find((item) => item.id === task.projectId);
        if (project) {
          const badge = document.createElement('span');
          badge.className = 'badge project-epic-badge';
          badge.textContent = `Epic · ${project.name}`;
          title?.after(badge);
        }
      }
    });
    updateSelectionUI();
  }

  function updateSelectionUI() {
    document.querySelectorAll('.task-card[data-task-id]').forEach((card) => {
      const active = selected.has(card.dataset.taskId);
      card.classList.toggle('batch-selected', active);
      card.setAttribute('aria-selected', String(active));
    });
    selectionCount.textContent = `${selected.size} selected`;
    batchBar.hidden = selected.size < 2;
    store.set('selection', [...selected], { source: 'selection' });
  }

  document.addEventListener('click', (event) => {
    if (!event.target.closest('#taskContextMenu')) contextMenu.hidden = true;
    const card = event.target.closest('.task-card[data-task-id]');
    if (!card || event.target.closest('button, a, input, select, textarea, [contenteditable="true"]')) return;
    if (!event.shiftKey && !event.metaKey && !event.ctrlKey) return;
    event.preventDefault();
    event.stopPropagation();
    const id = card.dataset.taskId;
    if (event.shiftKey && anchorId) {
      const [start, end] = [taskOrder.indexOf(anchorId), taskOrder.indexOf(id)].sort((a, b) => a - b);
      taskOrder.slice(start, end + 1).forEach((taskId) => selected.add(taskId));
    } else if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    anchorId = id;
    updateSelectionUI();
  });

  document.addEventListener('contextmenu', (event) => {
    const card = event.target.closest('.task-card[data-task-id]');
    if (!card) return;
    event.preventDefault();
    openContextMenu(card.dataset.taskId, event.clientX, event.clientY);
  });

  const dropPlaceholder = document.createElement('div');
  dropPlaceholder.className = 'task-drop-placeholder';
  dropPlaceholder.setAttribute('aria-hidden', 'true');
  document.addEventListener('dragstart', (event) => event.target.closest('.task-card')?.classList.add('is-dragging'));
  document.addEventListener('dragover', (event) => {
    const column = event.target.closest('#todo-list, #inprogress-list, #done-list');
    if (!column || !document.querySelector('.task-card.is-dragging')) return;
    const siblings = [...column.querySelectorAll('.task-card:not(.is-dragging)')];
    const before = siblings.find((card) => event.clientY < card.getBoundingClientRect().top + card.offsetHeight / 2);
    column.insertBefore(dropPlaceholder, before || null);
  });
  const endDrag = () => { document.querySelector('.task-card.is-dragging')?.classList.remove('is-dragging'); dropPlaceholder.remove(); };
  document.addEventListener('dragend', endDrag);
  document.addEventListener('drop', () => setTimeout(endDrag));

  const toolbar = document.getElementById('formatToolbar');
  if (toolbar) document.body.append(toolbar);
  const positionToolbar = () => {
    if (!toolbar || !activeEditable || toolbar.style.display === 'none') return;
    const rect = activeEditable.getBoundingClientRect();
    const toolbarWidth = toolbar.offsetWidth || 270;
    toolbar.style.position = 'fixed';
    toolbar.style.left = `${Math.max(8, Math.min(innerWidth - toolbarWidth - 8, rect.left))}px`;
    toolbar.style.top = `${Math.max(8, rect.top - (toolbar.offsetHeight || 40) - 8)}px`;
  };
  document.addEventListener('selectionchange', () => {
    const selection = document.getSelection();
    if (!selection?.rangeCount) return;
    const node = selection.anchorNode?.nodeType === Node.TEXT_NODE ? selection.anchorNode.parentElement : selection.anchorNode;
    if (node instanceof Element && node.closest('[contenteditable="true"]')) savedRange = selection.getRangeAt(0).cloneRange();
  });
  document.addEventListener('focusin', (event) => {
    const editable = event.target.closest?.('[contenteditable="true"]');
    if (!editable || !toolbar) return;
    activeEditable = editable;
    toolbar.style.display = 'flex';
    document.getElementById('scheduleTools').style.display = editable.classList.contains('schedule-cell') ? 'flex' : 'none';
    requestAnimationFrame(positionToolbar);
  });
  document.addEventListener('focusout', (event) => {
    if (!event.target.closest?.('[contenteditable="true"]')) return;
    setTimeout(() => {
      if (!document.activeElement?.closest?.('#formatToolbar') && !document.activeElement?.matches?.('[contenteditable="true"]')) {
        toolbar.style.display = 'none';
        activeEditable = null;
      }
    }, 120);
  });
  addEventListener('scroll', positionToolbar, true);
  addEventListener('resize', positionToolbar);
  window.formatText = (command, value = null) => {
    if (savedRange) {
      const selection = document.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }
    document.execCommand(command, false, value);
    activeEditable?.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const density = localStorage.getItem('soloflow_density') || 'comfortable';
  const setDensity = (value) => {
    const normalized = value === 'compact' ? 'compact' : 'comfortable';
    document.body.dataset.density = normalized;
    localStorage.setItem('soloflow_density', normalized);
    document.querySelectorAll('.density-button').forEach((button) => {
      const active = button.dataset.density === normalized;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    store.set('density', normalized, { source: 'density' });
  };
  document.getElementById('densitySwitcher')?.addEventListener('click', (event) => {
    const button = event.target.closest('.density-button');
    if (button) setDensity(button.dataset.density);
  });
  setDensity(density);

  const legacyMove = window.moveTask;
  window.moveTask = function reversibleMove(taskId, status) {
    const task = window.tasks.find((item) => item.id === taskId);
    if (!task || task.status === status) return;
    const beforeTask = clone(task);
    const beforeFinance = clone(window.financeTransactions || []);
    const priorStatus = task.status;
    legacyMove(taskId, status);
    window.showToast?.(`Moved to ${STATUS_LABELS[status]}`, 'info', {
      label: 'Undo', action: () => {
        const current = window.tasks.find((item) => item.id === taskId);
        if (current) Object.assign(current, beforeTask);
        window.financeTransactions = beforeFinance;
        window.saveFinance?.();
        window.saveTasks();
      }
    });
    store.bus.emit('tasks:status', { taskId, priorStatus, status });
  };

  const legacyDelete = window.deleteTask;
  window.deleteTask = function reversibleDelete(taskId) {
    const index = window.tasks.findIndex((item) => item.id === taskId);
    if (index < 0) return;
    const snapshot = clone(window.tasks[index]);
    if (window.SoloFlowTimer?.activeTaskId === taskId) window.SoloFlowTimer.stop(true);
    legacyDelete(taskId);
    window.showToast?.('Task deleted', 'info', {
      label: 'Undo', action: () => { window.tasks.splice(Math.min(index, window.tasks.length), 0, snapshot); window.saveTasks(); }
    });
    store.bus.emit('tasks:delete', { taskId });
  };

  const legacyClearCompleted = window.clearCompletedTasks;
  window.clearCompletedTasks = function reversibleClearCompleted() {
    const before = clone(window.tasks);
    const completed = before.filter((task) => task.status === 'done').length;
    legacyClearCompleted?.();
    if (completed && window.tasks.length !== before.length) {
      window.showToast?.(`${completed} completed tasks cleared`, 'info', {
        label: 'Undo', action: () => { window.tasks = before; window.saveTasks(); }
      });
    }
  };

  const legacyRender = window.renderTasks;
  window.renderTasks = function renderTasksWithEnhancements(...args) {
    const result = legacyRender.apply(this, args);
    requestAnimationFrame(decorateCards);
    return result;
  };

  window.patchTaskCard = (taskId, patch) => {
    const task = window.tasks.find((item) => item.id === taskId);
    if (!task) return false;
    if (patch.status && patch.status !== task.status) {
      window.moveTask(taskId, patch.status);
      patch = Object.fromEntries(Object.entries(patch).filter(([key]) => key !== 'status'));
    }
    saveGranular(store, task, patch, 'patchTaskCard');
    const card = findCard(taskId);
    if (card) {
      if ('title' in patch) card.querySelector('.task-title').textContent = patch.title;
      if ('description' in patch) card.querySelector('.task-desc').textContent = patch.description;
      if ('priority' in patch) card.querySelector('.badges .badge').textContent = patch.priority;
      if ('category' in patch) card.querySelectorAll('.badges .badge')[1].textContent = patch.category;
      decorateCards();
    }
    return true;
  };

  decorateCards();
  return {
    selected,
    decorateCards,
    clearSelection: () => { selected.clear(); updateSelectionUI(); },
    closeContextMenu: () => { contextMenu.hidden = true; }
  };
}
