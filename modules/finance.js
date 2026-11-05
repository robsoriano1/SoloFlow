import { installFinanceCharts } from './finance-charts.js';

function renderProjectDelivery() {
  const host = document.getElementById('project-delivery-matrix');
  if (!host) return;
  host.replaceChildren();
  const projects = window.financeProjects || [];
  if (!projects.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'Create a Finance project budget to connect delivery progress with project burn.';
    host.append(empty);
    return;
  }
  projects.forEach((project) => {
    const tasks = (window.tasks || []).filter((task) => task.projectId === project.id);
    const done = tasks.filter((task) => task.status === 'done').length;
    const completion = tasks.length ? done / tasks.length * 100 : 0;
    const burn = project.budgetCents ? project.spentCents / project.budgetCents * 100 : 0;
    const row = document.createElement('article');
    row.className = 'project-delivery-row';
    const title = document.createElement('strong');
    title.textContent = project.name;
    const meta = document.createElement('span');
    meta.textContent = `${done}/${tasks.length} tasks · ${completion.toFixed(0)}% delivery · ${burn.toFixed(0)}% budget burn`;
    const tracks = document.createElement('div');
    tracks.className = 'project-dual-track';
    const delivery = document.createElement('i');
    delivery.className = 'delivery';
    delivery.style.width = `${Math.min(100, completion)}%`;
    const spend = document.createElement('i');
    spend.className = 'spend';
    spend.style.width = `${Math.min(100, burn)}%`;
    tracks.append(delivery, spend);
    row.append(title, meta, tracks);
    host.append(row);
  });
}

function ensureProjectPanel() {
  const shell = document.querySelector('#finance-container .finance-command-shell') || document.getElementById('finance-container');
  if (!shell || document.getElementById('project-delivery-matrix')) return;
  const section = document.createElement('section');
  section.className = 'command-visual-grid finance-project-grid';
  const projectPanel = document.createElement('article');
  projectPanel.className = 'performance-panel';
  const projectHeading = document.createElement('h3');
  projectHeading.textContent = 'Project delivery vs. burn';
  const projectMatrix = document.createElement('div');
  projectMatrix.id = 'project-delivery-matrix';
  projectPanel.append(projectHeading, projectMatrix);
  section.append(projectPanel);
  shell.append(section);
}

export function installFinanceModule(store) {
  const render = window.renderFinance;
  if (typeof render !== 'function') return;
  const renderCharts = installFinanceCharts();
  ensureProjectPanel();
  window.renderFinance = function renderFinanceModule(...args) {
    const result = render.apply(this, args);
    try { renderCharts(); } catch (error) { console.error('SoloFlow finance charts failed to render', error); }
    renderProjectDelivery();
    store.bus.emit('finance:rendered', { at: Date.now() });
    return result;
  };
  renderCharts();
  renderProjectDelivery();
}
