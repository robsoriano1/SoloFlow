const money = (cents) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format((cents || 0) / 100);
const dateKey = (value) => new Date(value).toISOString().slice(0, 10);

function buildCashFlowSeries(transactions) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const dates = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - 29 + index);
    return date.toISOString().slice(0, 10);
  });
  const perDay = new Map(dates.map((date) => [date, { income: 0, expense: 0 }]));
  transactions.forEach((transaction) => {
    const bucket = perDay.get(dateKey(transaction.date));
    if (!bucket) return;
    if (transaction.amountCents >= 0) bucket.income += transaction.amountCents;
    else bucket.expense += Math.abs(transaction.amountCents);
  });
  let income = 0;
  let expense = 0;
  return dates.map((date) => {
    const day = perDay.get(date);
    income += day.income;
    expense += day.expense;
    return { date, income, expense };
  });
}

function svgNode(name, attributes = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

function renderCashFlowChart() {
  const host = document.getElementById('cash-flow-visualization');
  if (!host) return;
  host.replaceChildren();
  const data = buildCashFlowSeries(window.financeTransactions || []);
  const width = 760;
  const height = 250;
  const pad = 28;
  const max = Math.max(1, ...data.flatMap((point) => [point.income, point.expense]));
  const x = (index) => pad + index * ((width - pad * 2) / (data.length - 1));
  const y = (value) => height - pad - value / max * (height - pad * 2);
  const points = (key) => data.map((point, index) => `${x(index)},${y(point[key])}`).join(' ');
  const svg = svgNode('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': 'Rolling 30-day cumulative income and expense chart' });
  [0, .25, .5, .75, 1].forEach((ratio) => {
    svg.append(svgNode('line', { x1: pad, x2: width - pad, y1: y(max * ratio), y2: y(max * ratio), class: 'cash-gridline' }));
  });
  const expenseArea = svgNode('polygon', { points: `${pad},${height - pad} ${points('expense')} ${width - pad},${height - pad}`, class: 'cash-area expense' });
  const incomeLine = svgNode('polyline', { points: points('income'), class: 'cash-line income' });
  const expenseLine = svgNode('polyline', { points: points('expense'), class: 'cash-line expense' });
  svg.append(expenseArea, incomeLine, expenseLine);
  const legend = document.createElement('div');
  legend.className = 'cash-chart-legend';
  const incomeLabel = document.createElement('span');
  incomeLabel.textContent = `Income ${money(data.at(-1)?.income)}`;
  const expenseLabel = document.createElement('span');
  expenseLabel.textContent = `Expenses ${money(data.at(-1)?.expense)}`;
  legend.append(incomeLabel, expenseLabel);
  host.append(svg, legend);
}

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

function ensurePanels() {
  const container = document.getElementById('finance-container');
  if (!container || document.getElementById('cash-flow-visualization')) return;
  const section = document.createElement('section');
  section.className = 'command-visual-grid';
  const chartPanel = document.createElement('article');
  chartPanel.className = 'performance-panel';
  const chartHeading = document.createElement('h3');
  chartHeading.textContent = '30-day cumulative cash flow';
  const chart = document.createElement('div');
  chart.id = 'cash-flow-visualization';
  chart.className = 'cash-flow-chart';
  chartPanel.append(chartHeading, chart);
  const projectPanel = document.createElement('article');
  projectPanel.className = 'performance-panel';
  const projectHeading = document.createElement('h3');
  projectHeading.textContent = 'Project delivery vs. burn';
  const projectMatrix = document.createElement('div');
  projectMatrix.id = 'project-delivery-matrix';
  projectPanel.append(projectHeading, projectMatrix);
  section.append(chartPanel, projectPanel);
  container.append(section);
}

export function installFinanceModule(store) {
  const render = window.renderFinance;
  if (typeof render !== 'function') return;
  window.renderFinance = function renderFinanceModule(...args) {
    const result = render.apply(this, args);
    ensurePanels();
    renderCashFlowChart();
    renderProjectDelivery();
    store.bus.emit('finance:rendered', { at: Date.now() });
    return result;
  };
  ensurePanels();
  renderCashFlowChart();
  renderProjectDelivery();
}

