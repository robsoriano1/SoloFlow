const isTyping = (target) => target instanceof HTMLElement && (
  target.matches('input, textarea, select, [contenteditable="true"]') || target.closest('[contenteditable="true"]')
);

function fuzzyScore(query, text) {
  const needle = query.toLowerCase().trim();
  const haystack = text.toLowerCase();
  if (!needle) return 1;
  if (haystack.includes(needle)) return 100 - haystack.indexOf(needle);
  let score = 0;
  let cursor = 0;
  let streak = 0;
  for (const character of needle) {
    const index = haystack.indexOf(character, cursor);
    if (index < 0) return -1;
    streak = index === cursor ? streak + 1 : 0;
    score += 4 + streak * 3 - Math.min(3, index - cursor);
    cursor = index + 1;
  }
  return score;
}

function closeOverlays(taskModule) {
  window.closeGCalEventModal?.();
  document.querySelectorAll('.format-toolbar, .modal-backdrop, dialog[open]').forEach((element) => {
    if (element instanceof HTMLDialogElement) element.close();
    else element.classList.remove('visible', 'active', 'open');
  });
  document.querySelectorAll('details[open]').forEach((details) => details.removeAttribute('open'));
  taskModule?.closeContextMenu?.();
}

export function installShortcutManager(taskModule) {
  const dialog = document.getElementById('commandPalette');
  const input = document.getElementById('commandPaletteInput');
  const results = document.getElementById('commandPaletteResults');
  const trigger = document.getElementById('commandPaletteTrigger');
  let activeIndex = 0;
  let visibleItems = [];

  const commands = [
    { icon: '+', title: '> New Task', detail: 'Open quick capture', kind: 'Command', keywords: 'create add capture n', run: () => { window.setView('all'); requestAnimationFrame(() => document.getElementById('taskTitle')?.focus()); } },
    { icon: '▶', title: '> Start Focus Timer', detail: 'Start the selected or next active task', kind: 'Command', keywords: 'pomodoro timer focus p', run: () => {
      const taskId = window.SoloFlowTimer?.activeTaskId || window.SoloFlowStore?.state.selection?.[0] || window.tasks?.find((task) => task.status === 'inprogress')?.id || window.tasks?.find((task) => task.status !== 'done')?.id;
      if (taskId) window.toggleTimer?.(taskId); else window.showToast?.('No active task is available.', 'info');
    } },
    { icon: '₱', title: '> Go to Finance', detail: 'Open the Financial Command Center', kind: 'Command', keywords: 'money ledger budget cash', run: () => window.setView('finance') },
    { icon: '◐', title: '> Toggle Theme', detail: 'Cycle through accessible colorways', kind: 'Command', keywords: 'appearance palette dark light', run: () => window.cycleSoloFlowTheme?.() },
    { icon: '▤', title: '> Go to Schedule', detail: 'Open the weekly schedule matrix', kind: 'Command', keywords: 'week time blocks', run: () => window.setView('schedule') },
    { icon: '◫', title: '> Go to Calendar', detail: 'Open monthly events', kind: 'Command', keywords: 'month dates gcal', run: () => window.setView('calendar') }
  ];

  function workspaceItems() {
    const taskItems = (window.tasks || []).filter((task) => task.status !== 'done').map((task) => ({
      icon: task.status === 'done' ? '✓' : '□', title: task.title || 'Untitled task', detail: `${task.category || 'General'} · ${task.priority || 'Medium'} · ${task.status}`, kind: 'Task', keywords: `${task.description || ''} ${task.assignee || ''}`,
      run: () => {
        window.setView('all');
        const search = document.getElementById('searchInput');
        if (search) search.value = task.title || '';
        window.renderTasks?.();
        requestAnimationFrame(() => document.querySelector(`.task-card[data-task-id="${CSS.escape(task.id)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      }
    }));
    const eventItems = (window.events || []).map((event) => ({ icon: '◫', title: event.title || 'Untitled event', detail: `${event.date || 'No date'} ${event.time || ''}`.trim(), kind: 'Event', keywords: event.link || '', run: () => window.setView('calendar') }));
    const financeItems = (window.financeTransactions || []).map((transaction) => ({
      icon: transaction.amountCents >= 0 ? '↗' : '↘', title: transaction.payee || 'Finance record', detail: `${transaction.category || 'Uncategorized'} · ${new Intl.NumberFormat(undefined, { style: 'currency', currency: 'PHP' }).format(Math.abs(transaction.amountCents || 0) / 100)}`, kind: 'Finance', keywords: `${transaction.date || ''} ${transaction.nature || ''}`, run: () => window.setView('finance')
    }));
    return [...commands, ...taskItems, ...eventItems, ...financeItems];
  }

  function runItem(item) {
    dialog?.close();
    item?.run?.();
  }

  function renderResults() {
    if (!results) return;
    const query = input?.value || '';
    visibleItems = workspaceItems().map((item) => ({ item, score: fuzzyScore(query, `${item.title} ${item.detail} ${item.kind} ${item.keywords || ''}`) }))
      .filter(({ score }) => score >= 0).sort((a, b) => b.score - a.score).slice(0, 14).map(({ item }) => item);
    activeIndex = Math.min(activeIndex, Math.max(0, visibleItems.length - 1));
    results.replaceChildren();
    if (!visibleItems.length) {
      const empty = document.createElement('div');
      empty.className = 'command-palette-empty';
      empty.textContent = 'No matching tasks, events, finance records, or commands.';
      results.append(empty);
      return;
    }
    visibleItems.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'command-result';
      button.classList.toggle('is-active', index === activeIndex);
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(index === activeIndex));
      const icon = document.createElement('span');
      icon.className = 'command-result-icon';
      icon.textContent = item.icon;
      const copy = document.createElement('span');
      copy.className = 'command-result-copy';
      const title = document.createElement('strong');
      title.textContent = item.title;
      const detail = document.createElement('small');
      detail.textContent = item.detail;
      copy.append(title, detail);
      const kind = document.createElement('span');
      kind.className = 'command-result-kind';
      kind.textContent = item.kind;
      button.append(icon, copy, kind);
      button.addEventListener('mouseenter', () => {
        activeIndex = index;
        results.querySelectorAll('.command-result').forEach((result, resultIndex) => {
          result.classList.toggle('is-active', resultIndex === activeIndex);
          result.setAttribute('aria-selected', String(resultIndex === activeIndex));
        });
      });
      button.addEventListener('click', () => runItem(item));
      results.append(button);
    });
  }

  function openPalette() {
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    input.value = '';
    activeIndex = 0;
    renderResults();
    requestAnimationFrame(() => input.focus());
  }

  trigger?.addEventListener('click', openPalette);
  input?.addEventListener('input', () => { activeIndex = 0; renderResults(); });
  input?.addEventListener('keydown', (event) => {
    if (!visibleItems.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); activeIndex = (activeIndex + 1) % visibleItems.length; renderResults(); }
    if (event.key === 'ArrowUp') { event.preventDefault(); activeIndex = (activeIndex - 1 + visibleItems.length) % visibleItems.length; renderResults(); }
    if (event.key === 'Enter') { event.preventDefault(); runItem(visibleItems[activeIndex]); }
  });
  dialog?.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });

  const views = { '1': 'all', '2': 'today', '3': 'backlog', '4': 'schedule', '5': 'calendar', '6': 'finance' };
  addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openPalette(); return; }
    if (event.key === 'Escape') { closeOverlays(taskModule); taskModule?.clearSelection(); return; }
    if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === '/') { event.preventDefault(); openPalette(); return; }
    if (views[event.key]) { event.preventDefault(); window.setView?.(views[event.key]); return; }
    if (event.key.toLowerCase() === 'n') { event.preventDefault(); window.setView?.('all'); document.getElementById('taskTitle')?.focus(); return; }
    if (event.key.toLowerCase() === 'f') { event.preventDefault(); document.getElementById('searchInput')?.focus(); return; }
    if (event.code === 'Space' || event.key.toLowerCase() === 'p') {
      event.preventDefault();
      const taskId = window.SoloFlowTimer?.activeTaskId || window.SoloFlowStore?.state.selection?.[0] || window.tasks?.find((task) => task.status === 'inprogress')?.id || window.tasks?.find((task) => task.status !== 'done')?.id;
      if (taskId) window.toggleTimer?.(taskId); else window.showToast?.('Select or start a task first.', 'info');
    }
  });

  window.openCommandPalette = openPalette;
}
