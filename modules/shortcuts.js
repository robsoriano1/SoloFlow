const localDate = (value) => value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unscheduled';
const duration = (seconds) => `${Math.floor((seconds || 0) / 3600)}h ${Math.floor(((seconds || 0) % 3600) / 60)}m`;

function reportData() {
  const tasks = window.tasks || [];
  const completed = tasks.filter((task) => task.status === 'done');
  const focusSeconds = tasks.reduce((sum, task) => sum + (Number(task.timeSpent) || 0), 0);
  const projects = (window.financeProjects || []).map((project) => {
    const projectTasks = tasks.filter((task) => task.projectId === project.id);
    return { ...project, totalTasks: projectTasks.length, completedTasks: projectTasks.filter((task) => task.status === 'done').length };
  });
  return { generatedAt: new Date(), tasks, completed, focusSeconds, projects };
}

function markdown(data) {
  const lines = [
    '# SoloFlow Sprint Summary', '',
    `Generated: ${data.generatedAt.toLocaleString()}`, '',
    '## Executive summary', '',
    `- Completed deliverables: ${data.completed.length}`,
    `- Active backlog: ${data.tasks.length - data.completed.length}`,
    `- Logged focus time: ${duration(data.focusSeconds)}`, '',
    '## Completed deliverables', ''
  ];
  if (!data.completed.length) lines.push('- No completed deliverables in the current workspace.');
  data.completed.forEach((task) => lines.push(`- **${task.title || 'Untitled task'}** — ${task.category || 'Uncategorized'}; due ${localDate(task.dueDate)}; focus ${duration(task.timeSpent)}`));
  lines.push('', '## Project delivery and budget', '');
  if (!data.projects.length) lines.push('- No finance project budgets configured.');
  data.projects.forEach((project) => {
    const completion = project.totalTasks ? project.completedTasks / project.totalTasks * 100 : 0;
    const burn = project.budgetCents ? (project.spentCents || 0) / project.budgetCents * 100 : 0;
    lines.push(`- **${project.name}** — ${completion.toFixed(0)}% delivery; ${burn.toFixed(0)}% budget burn; milestone: ${project.milestone || 'Not set'}`);
  });
  return lines.join('\n');
}

function downloadText(filename, text) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 500);
}

function renderReport(modal, data) {
  const body = modal.querySelector('.report-body');
  body.replaceChildren();
  const title = document.createElement('h1');
  title.textContent = 'SoloFlow Sprint Summary';
  const meta = document.createElement('p');
  meta.className = 'report-meta';
  meta.textContent = `Generated ${data.generatedAt.toLocaleString()}`;
  const metrics = document.createElement('div');
  metrics.className = 'report-metrics';
  [[data.completed.length, 'Completed'], [data.tasks.length - data.completed.length, 'Open'], [duration(data.focusSeconds), 'Focus logged']].forEach(([value, label]) => {
    const card = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = String(value);
    const span = document.createElement('span');
    span.textContent = label;
    card.append(strong, span);
    metrics.append(card);
  });
  const heading = document.createElement('h2');
  heading.textContent = 'Completed deliverables';
  const list = document.createElement('ul');
  if (!data.completed.length) {
    const item = document.createElement('li');
    item.textContent = 'No completed deliverables in the current workspace.';
    list.append(item);
  }
  data.completed.forEach((task) => {
    const item = document.createElement('li');
    item.textContent = `${task.title || 'Untitled task'} — ${task.category || 'Uncategorized'} · ${duration(task.timeSpent)}`;
    list.append(item);
  });
  const projectHeading = document.createElement('h2');
  projectHeading.textContent = 'Project delivery and budget';
  const projectList = document.createElement('ul');
  if (!data.projects.length) {
    const item = document.createElement('li');
    item.textContent = 'No finance project budgets configured.';
    projectList.append(item);
  }
  data.projects.forEach((project) => {
    const completion = project.totalTasks ? project.completedTasks / project.totalTasks * 100 : 0;
    const burn = project.budgetCents ? (project.spentCents || 0) / project.budgetCents * 100 : 0;
    const item = document.createElement('li');
    item.textContent = `${project.name}: ${completion.toFixed(0)}% delivery · ${burn.toFixed(0)}% budget burn`;
    projectList.append(item);
  });
  body.append(title, meta, metrics, heading, list, projectHeading, projectList);
}

export function installReportModule() {
  const modal = document.createElement('dialog');
  modal.id = 'summary-report-modal';
  modal.className = 'summary-report-modal';
  const shell = document.createElement('div');
  shell.className = 'report-shell';
  const actions = document.createElement('div');
  actions.className = 'report-actions';
  const download = document.createElement('button');
  download.className = 'btn-small';
  download.textContent = 'Download Markdown';
  download.addEventListener('click', () => downloadText(`soloflow-report-${new Date().toISOString().slice(0, 10)}.md`, markdown(reportData())));
  const print = document.createElement('button');
  print.className = 'btn-small';
  print.textContent = 'Print / Save PDF';
  print.addEventListener('click', () => printReport());
  const close = document.createElement('button');
  close.className = 'btn-small';
  close.textContent = 'Close';
  close.addEventListener('click', () => modal.close());
  actions.append(download, print, close);
  const body = document.createElement('article');
  body.className = 'report-body';
  shell.append(actions, body);
  modal.append(shell);
  document.body.append(modal);
  modal.addEventListener('click', (event) => { if (event.target === modal) modal.close(); });

  window.openSummaryReport = () => { renderReport(modal, reportData()); modal.showModal(); };
  window.printReport = () => { renderReport(modal, reportData()); modal.showModal(); document.body.classList.add('printing-report'); requestAnimationFrame(() => { print(); document.body.classList.remove('printing-report'); }); };
  window.downloadSummaryMarkdown = () => downloadText(`soloflow-report-${new Date().toISOString().slice(0, 10)}.md`, markdown(reportData()));

  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'btn-summary-report';
  button.className = 'btn-alt report-launcher';
  button.textContent = 'Generate summary';
  button.addEventListener('click', window.openSummaryReport);
  document.querySelector('.control-panel')?.append(button);
}
