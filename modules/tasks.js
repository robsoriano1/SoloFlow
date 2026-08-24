const STATUS_LABELS = { todo: 'To-Do', inprogress: 'In Progress', done: 'Done' };

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

export function installTaskModule(store) {
  const selected = new Set();
  let anchorId = null;
  let taskOrder = [];

  const bar = document.createElement('aside');
  bar.id = 'batch-action-bar';
  bar.className = 'batch-action-bar';
  bar.hidden = true;
  bar.setAttribute('aria-live', 'polite');
  const count = document.createElement('strong');

  const save = () => {
    store.set('selection', [...selected], { source: 'batch' });
    window.saveTasks();
  };

  const mutateSelected = (patch) => {
    window.tasks.forEach((task) => {
      if (selected.has(task.id)) Object.assign(task, patch);
    });
    save();
  };

  const projectOptions = () => (window.financeProjects || []).map((project) => [project.id, project.name]);
  bar.append(
    count,
    makeSelect('Move', Object.entries(STATUS_LABELS), (status) => mutateSelected({ status })),
    makeSelect('Priority', [['High', 'High'], ['Medium', 'Medium'], ['Low', 'Low']], (priority) => mutateSelected({ priority })),
    makeSelect('Category', [['Development', 'Development'], ['Study', 'Study'], ['Finance', 'Finance'], ['Operations', 'Operations'], ['Personal', 'Personal']], (category) => mutateSelected({ category })),
    makeSelect('Project', projectOptions(), (projectId) => mutateSelected({ projectId }))
  );
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'btn-small btn-danger';
  remove.textContent = 'Delete selected';
  remove.addEventListener('click', () => {
    if (!confirm(`Delete ${selected.size} selected tasks?`)) return;
    window.tasks = window.tasks.filter((task) => !selected.has(task.id));
    selected.forEach((id) => window.expandedCards?.delete(id));
    selected.clear();
    save();
  });
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'btn-small';
  clear.textContent = 'Clear selection';
  clear.addEventListener('click', () => { selected.clear(); updateSelectionUI(); });
  bar.append(remove, clear);
  document.body.append(bar);

  function findCard(id) { return document.querySelector(`.task-card[data-task-id="${CSS.escape(id)}"]`); }

  function decorateCards() {
    const cards = [...document.querySelectorAll('#todo-list .task-card, #inprogress-list .task-card, #done-list .task-card')];
    taskOrder = [];
    cards.forEach((card) => {
      if (!card.dataset.taskId) {
        const control = card.querySelector('[onclick*="toggleTimer"], [onclick*="deleteTask"], [onclick*="toggleCard"]');
        const id = control?.getAttribute('onclick')?.match(/\('([^']+)'/)?.[1];
        if (id) card.dataset.taskId = id;
      }
      const id = card.dataset.taskId;
      if (!id) return;
      taskOrder.push(id);
      card.classList.toggle('batch-selected', selected.has(id));
      card.setAttribute('aria-selected', String(selected.has(id)));
      const task = window.tasks.find((item) => item.id === id);
      if (task?.projectId && !card.querySelector('.project-epic-badge')) {
        const project = (window.financeProjects || []).find((item) => item.id === task.projectId);
        if (project) {
          const badge = document.createElement('span');
          badge.className = 'badge project-epic-badge';
          badge.textContent = `Epic · ${project.name}`;
          card.querySelector('.task-title')?.after(badge);
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
    count.textContent = `${selected.size} selected`;
    bar.hidden = selected.size < 2;
    store.set('selection', [...selected], { source: 'selection' });
  }

  document.addEventListener('click', (event) => {
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

  const legacyRender = window.renderTasks;
  window.renderTasks = function renderTasksWithPatches(...args) {
    const result = legacyRender.apply(this, args);
    requestAnimationFrame(decorateCards);
    return result;
  };
  window.patchTaskCard = (taskId, patch) => {
    const task = window.tasks.find((item) => item.id === taskId);
    if (!task) return false;
    if (patch.status && patch.status !== task.status) {
      window.moveTask(taskId, patch.status);
      delete patch.status;
    }
    Object.assign(task, patch);
    store.patchCollection('tasks', taskId, patch, { source: 'patchTaskCard' });
    const card = findCard(taskId);
    if (card) {
      if ('title' in patch) card.querySelector('.task-title').textContent = patch.title;
      if ('description' in patch) card.querySelector('.task-desc').textContent = patch.description;
      if ('priority' in patch) {
        const badge = card.querySelector('.badges .badge');
        if (badge) { badge.className = `badge ${String(patch.priority).toLowerCase()}`; badge.textContent = patch.priority; }
      }
      if ('category' in patch) {
        const badge = card.querySelectorAll('.badges .badge')[1];
        if (badge) badge.textContent = patch.category;
      }
    }
    window.saveTasks(true);
    window.calculateAnalytics?.();
    return true;
  };
  decorateCards();
  return { selected, decorateCards, clearSelection: () => { selected.clear(); updateSelectionUI(); } };
}
