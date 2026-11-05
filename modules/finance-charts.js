// Finance charts: cash flow by month, spending pace, and a daily spending calendar.
// Plain SVG and DOM, no dependencies. Colours come from the --viz-* custom
// properties in styles/architecture.css, which carry separate validated steps
// for light and dark themes. Every chart has hover and keyboard read-outs and a
// table view, so no value is reachable only by hovering.

const SVG_NS = 'http://www.w3.org/2000/svg';
const DAY_MS = 86_400_000;
const CURRENCY = 'PHP';

const wholeMoney = new Intl.NumberFormat(undefined, { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 });
const compactMoney = new Intl.NumberFormat(undefined, { style: 'currency', currency: CURRENCY, notation: 'compact', maximumFractionDigits: 1 });
export const money = (cents) => wholeMoney.format(Math.round(Math.abs(cents || 0) / 100));
// Compact only from ₱1,000 up, so small amounts never show a stray decimal.
export const moneyCompact = (cents) => (Math.abs(cents || 0) < 100_000 ? money(cents) : compactMoney.format(Math.abs(cents || 0) / 100));
const signed = (cents, format = money) => `${cents < 0 ? '−' : '+'}${format(cents)}`;

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
// Rounded, so a 23- or 25-hour DST day still counts as one.
const daysBetween = (from, to) => Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
const dayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const shortDate = (date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const longDate = (date) => date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

function svg(tag, attributes = {}, text) {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  if (text != null) node.textContent = text;
  return node;
}

function html(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// Clean axis steps: 1, 2, 2.5 or 5 times a power of ten.
function niceScale(max, count = 4) {
  if (!(max > 0)) return { top: 100, ticks: [0, 100] };
  const raw = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / magnitude;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * magnitude;
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let value = 0; value <= top + step / 2; value += step) ticks.push(value);
  return { top, ticks };
}

// A column with a 4px rounded data end and a square foot on the baseline.
function columnPath(x, y, width, height, radius = 4) {
  if (height <= 0.5) return '';
  const r = Math.min(radius, width / 2, height);
  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`;
}

function toneOf(diff, goodWhenUp) {
  if (!diff) return 'flat';
  return (diff > 0) === goodWhenUp ? 'good' : 'bad';
}

// ---------------------------------------------------------------- tooltip

function createTooltip(host) {
  const tip = html('div', 'viz-tooltip');
  tip.setAttribute('aria-hidden', 'true');
  tip.hidden = true;
  host.append(tip);
  return {
    show(title, rows, x, y) {
      tip.replaceChildren();
      tip.append(html('div', 'viz-tooltip-title', title));
      rows.forEach((row) => {
        const line = html('div', 'viz-tooltip-row');
        const key = html('span', `viz-key viz-key-${row.shape || 'line'}`);
        if (row.color) key.style.setProperty('--key', row.color);
        else key.classList.add('is-blank');
        line.append(key, html('strong', 'viz-tooltip-value', row.value), html('span', 'viz-tooltip-label', row.label));
        tip.append(line);
      });
      tip.hidden = false;
      const hostWidth = host.clientWidth;
      const tipWidth = tip.offsetWidth;
      const left = x + 14 + tipWidth > hostWidth ? Math.max(0, x - 14 - tipWidth) : x + 14;
      tip.style.left = `${left}px`;
      tip.style.top = `${Math.max(0, Math.min(y - 12, host.clientHeight - tip.offsetHeight))}px`;
    },
    hide() { tip.hidden = true; }
  };
}

// --------------------------------------------------------------- panel shell

function buildPanel({ id, title, legend = [], extraClass = '' }) {
  const panel = html('section', `finance-panel finance-chart-panel ${extraClass}`.trim());
  panel.id = id;
  const header = html('div', 'finance-panel-header');
  const copy = html('div');
  const heading = html('h3', null, title);
  heading.id = `${id}-title`;
  const sub = html('p', 'finance-panel-sub viz-sub');
  copy.append(heading, sub);
  const toggle = html('button', 'btn-small viz-table-toggle', 'Table');
  toggle.type = 'button';
  toggle.setAttribute('aria-pressed', 'false');
  toggle.setAttribute('aria-label', `Show ${title.toLowerCase()} as a table`);
  header.append(copy, toggle);

  const legendRow = html('div', 'viz-legend');
  const body = html('div', 'viz-body');
  const host = html('div', 'viz-host');
  body.append(host);
  const table = html('div', 'viz-table');
  table.hidden = true;
  panel.append(header, legendRow, body, table);

  const state = { panel, sub, legendRow, body, host, table, toggle, data: null, draw: null, tabulate: null, lastWidth: 0 };
  state.setLegend = (items) => {
    legendRow.replaceChildren();
    items.forEach((item) => {
      const entry = html('span', 'viz-legend-item');
      const key = html('span', `viz-key viz-key-${item.shape || 'rect'}`);
      key.style.setProperty('--key', item.color);
      entry.append(key, document.createTextNode(item.label));
      legendRow.append(entry);
    });
    legendRow.hidden = !items.length || !table.hidden;
  };
  state.setLegend(legend);

  toggle.addEventListener('click', () => {
    const showTable = toggle.getAttribute('aria-pressed') !== 'true';
    toggle.setAttribute('aria-pressed', String(showTable));
    toggle.textContent = showTable ? 'Chart' : 'Table';
    toggle.setAttribute('aria-label', `Show ${title.toLowerCase()} as a ${showTable ? 'chart' : 'table'}`);
    body.hidden = showTable;
    legendRow.hidden = showTable || !legendRow.childElementCount;
    table.hidden = !showTable;
    if (showTable) state.renderTable(); else state.redraw(true);
  });

  state.renderTable = () => {
    if (!state.data || !state.tabulate) return;
    const { columns, rows, caption } = state.tabulate(state.data);
    const element = html('table', 'finance-table viz-data-table');
    if (caption) element.append(html('caption', 'sr-only', caption));
    const head = html('thead');
    const headRow = html('tr');
    columns.forEach((column) => {
      const cell = html('th', column.numeric ? 'numeric' : '', column.label);
      cell.scope = 'col';
      headRow.append(cell);
    });
    head.append(headRow);
    const bodyRows = html('tbody');
    rows.forEach((row) => {
      const tr = html('tr');
      row.forEach((value, index) => tr.append(html('td', columns[index].numeric ? 'numeric' : '', value)));
      bodyRows.append(tr);
    });
    element.append(head, bodyRows);
    table.replaceChildren(element);
  };

  state.redraw = (force = false) => {
    if (!state.data || !state.draw || body.hidden) return;
    const width = host.clientWidth;
    if (!width) return; // Hidden view; the ResizeObserver redraws once it shows.
    if (!force && width === state.lastWidth && state.drawnData === state.data) return;
    state.lastWidth = width;
    state.drawnData = state.data;
    state.draw(state, width);
  };

  new ResizeObserver(() => requestAnimationFrame(() => state.redraw())).observe(host);
  return state;
}

// ------------------------------------------------------------- data helpers

function financeApi() {
  return window.SoloFlowFinance;
}

function spendingTransactions() {
  const api = financeApi();
  return (window.financeTransactions || []).filter((tx) => {
    const date = new Date(tx.date);
    return !Number.isNaN(date.getTime()) && (!api || api.matchesFilters(tx));
  });
}

// --------------------------------------------------------- 1. by-month chart

function monthlyData(now) {
  const months = Array.from({ length: 6 }, (_, index) => {
    const offset = 5 - index;
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 1), income: 0, spending: 0, count: 0, partial: offset === 0 };
  });
  const first = months[0].start;
  const last = months.at(-1).end;
  spendingTransactions().forEach((tx) => {
    const date = new Date(tx.date);
    if (date < first || date >= last) return;
    const bucket = months[(date.getFullYear() - first.getFullYear()) * 12 + date.getMonth() - first.getMonth()];
    if (!bucket) return;
    bucket.count += 1;
    if (tx.amountCents > 0) bucket.income += tx.amountCents;
    else bucket.spending += Math.abs(tx.amountCents);
  });
  months.forEach((month) => { month.net = month.income - month.spending; });
  return { months };
}

function monthLabel(month, style = 'long') {
  return month.start.toLocaleDateString(undefined, style === 'long' ? { month: 'long', year: 'numeric' } : { month: 'short' });
}

function describeMonthly(state) {
  const full = state.data.months.filter((month) => !month.partial && month.count);
  if (!full.length) {
    const current = state.data.months.at(-1);
    state.sub.textContent = current.count ? `${monthLabel(current)} so far: net ${signed(current.net)}` : 'Income and spending for the last six months';
    return;
  }
  const average = full.reduce((sum, month) => sum + month.net, 0) / full.length;
  state.sub.textContent = `Average net ${signed(average, moneyCompact)} a month over the last ${full.length} full month${full.length === 1 ? '' : 's'}`;
}

function drawMonthly(state, width) {
  const { months } = state.data;
  const host = state.host;
  host.replaceChildren();
  const tooltip = createTooltip(host);
  const height = 236;
  const margin = { top: 12, right: 6, bottom: 40, left: 50 };
  const plotW = Math.max(60, width - margin.left - margin.right);
  const plotH = height - margin.top - margin.bottom;
  const { top, ticks } = niceScale(Math.max(...months.flatMap((month) => [month.income, month.spending])));
  const y = (value) => margin.top + plotH - (value / top) * plotH;
  const band = plotW / months.length;
  const barW = Math.max(6, Math.min(24, (band - 18) / 2));
  const pairW = barW * 2 + 2; // 2px surface gap between the pair

  const root = svg('svg', { width, height, viewBox: `0 0 ${width} ${height}`, class: 'viz-svg', role: 'group', 'aria-labelledby': `${state.panel.id}-title` });
  const highlight = svg('rect', { x: 0, y: margin.top, width: band, height: plotH, rx: 6, class: 'viz-band-highlight', opacity: 0 });
  root.append(highlight);

  ticks.forEach((tick) => {
    const ty = y(tick);
    root.append(svg('line', { x1: margin.left, x2: width - margin.right, y1: ty, y2: ty, class: tick === 0 ? 'viz-baseline' : 'viz-grid' }));
    root.append(svg('text', { x: margin.left - 8, y: ty, class: 'viz-tick', 'text-anchor': 'end', 'dominant-baseline': 'middle' }, tick === 0 ? '0' : moneyCompact(tick)));
  });

  months.forEach((month, index) => {
    const x0 = margin.left + index * band + (band - pairW) / 2;
    const incomeTop = y(month.income);
    const spendTop = y(month.spending);
    root.append(svg('path', { d: columnPath(x0, incomeTop, barW, y(0) - incomeTop), class: 'viz-fill-income' }));
    root.append(svg('path', { d: columnPath(x0 + barW + 2, spendTop, barW, y(0) - spendTop), class: 'viz-fill-spend' }));
    const cx = margin.left + index * band + band / 2;
    root.append(svg('text', { x: cx, y: height - margin.bottom + 18, class: 'viz-tick viz-tick-x', 'text-anchor': 'middle' }, monthLabel(month, 'short')));
    if (month.partial) root.append(svg('text', { x: cx, y: height - margin.bottom + 32, class: 'viz-tick viz-tick-note', 'text-anchor': 'middle' }, 'so far'));

    const label = `${monthLabel(month)}${month.partial ? ' (so far)' : ''}: income ${money(month.income)}, spending ${money(month.spending)}, net ${signed(month.net)}`;
    const hit = svg('rect', { x: margin.left + index * band, y: margin.top, width: band, height: plotH + 24, class: 'viz-hit', tabindex: 0, role: 'img', 'aria-label': label });
    const show = (px, py) => {
      highlight.setAttribute('x', margin.left + index * band);
      highlight.setAttribute('opacity', 1);
      tooltip.show(`${monthLabel(month)}${month.partial ? ' · so far' : ''}`, [
        { color: 'var(--viz-income)', shape: 'rect', value: money(month.income), label: 'Income' },
        { color: 'var(--viz-spend)', shape: 'rect', value: money(month.spending), label: 'Spending' },
        { value: signed(month.net), label: 'Net' }
      ], px, py);
    };
    const hide = () => { highlight.setAttribute('opacity', 0); tooltip.hide(); };
    hit.addEventListener('pointermove', (event) => { const box = host.getBoundingClientRect(); show(event.clientX - box.left, event.clientY - box.top); });
    hit.addEventListener('pointerleave', hide);
    hit.addEventListener('focus', () => show(margin.left + index * band + band / 2, margin.top + 10));
    hit.addEventListener('blur', hide);
    root.append(hit);
  });
  host.prepend(root);
}

function tabulateMonthly({ months }) {
  return {
    caption: 'Income, spending and net by month',
    columns: [{ label: 'Month' }, { label: 'Income', numeric: true }, { label: 'Spending', numeric: true }, { label: 'Net', numeric: true }],
    rows: months.map((month) => [`${monthLabel(month)}${month.partial ? ' (so far)' : ''}`, money(month.income), money(month.spending), signed(month.net)])
  };
}

// ------------------------------------------------------- 2. spending pace

const PERIOD_NAMES = {
  month: ['This month', 'Last month'],
  '30d': ['Last 30 days', 'Previous 30 days'],
  qtd: ['This quarter', 'Last quarter'],
  ytd: ['This year', 'Last year'],
  custom: ['Selected range', 'Previous range']
};

function paceData(now) {
  const api = financeApi();
  const preferences = window.financePreferences || {};
  const range = api.getRange(preferences, now);
  const previous = api.getPreviousRange(range, preferences);
  const periodDays = daysBetween(range.start, range.end) + 1;
  const previousDays = daysBetween(previous.start, previous.end) + 1;
  const elapsed = now < range.start ? 0 : Math.min(periodDays, daysBetween(range.start, now) + 1);
  const current = new Array(periodDays).fill(0);
  const prior = new Array(previousDays).fill(0);
  spendingTransactions().forEach((tx) => {
    if (tx.amountCents >= 0) return;
    const date = new Date(tx.date);
    const amount = Math.abs(tx.amountCents);
    if (date >= range.start && date <= range.end) current[daysBetween(range.start, date)] += amount;
    else if (date >= previous.start && date <= previous.end) prior[daysBetween(previous.start, date)] += amount;
  });
  const cumulative = (values) => values.reduce((out, value, index) => { out.push((out[index - 1] || 0) + value); return out; }, []);
  const target = preferences.dailyTargetCents > 0 ? preferences.dailyTargetCents : 0;
  const [currentName, previousName] = PERIOD_NAMES[preferences.rangePreset] || PERIOD_NAMES.month;
  return {
    range, previous, periodDays, previousDays, elapsed, target, currentName, previousName,
    current: cumulative(current).slice(0, elapsed),
    // The x-axis is this period's days; a longer previous period stops at its edge.
    prior: cumulative(prior).slice(0, periodDays)
  };
}

function describePace(state) {
  const data = state.data;
  const sub = state.sub;
  sub.replaceChildren();
  if (!data.elapsed) { sub.textContent = 'This period has not started yet'; return; }
  const spent = data.current.at(-1) || 0;
  const comparable = data.prior[Math.min(data.elapsed, data.prior.length) - 1] || 0;
  sub.append(document.createTextNode(`${money(spent)} spent so far`));
  // No spending at all last period (e.g. a new user): there is nothing to compare.
  if (!(data.prior.at(-1) > 0)) return;
  const diff = spent - comparable;
  const delta = html('span', 'viz-delta viz-delta-line');
  delta.dataset.tone = toneOf(diff, false);
  const pct = comparable ? Math.abs(diff) / comparable * 100 : null;
  const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '–';
  const noun = data.previous.noun || 'last period';
  delta.append(html('span', 'viz-delta-arrow', arrow));
  delta.append(document.createTextNode(diff === 0
    ? ` same as this point ${noun}`
    : ` ${money(diff)}${pct != null ? ` (${pct.toFixed(0)}%)` : ''} ${diff > 0 ? 'more' : 'less'} than this point ${noun}`));
  sub.append(delta);
}

function drawPace(state, width) {
  const data = state.data;
  const host = state.host;
  host.replaceChildren();
  const tooltip = createTooltip(host);
  const height = 236;
  const margin = { top: 16, right: 16, bottom: 30, left: 50 };
  const plotW = Math.max(60, width - margin.left - margin.right);
  const plotH = height - margin.top - margin.bottom;
  const domain = Math.max(data.periodDays, 2);
  const targetEnd = data.target * domain;
  const { top, ticks } = niceScale(Math.max(data.current.at(-1) || 0, data.prior.at(-1) || 0, targetEnd));
  const x = (index) => margin.left + (index / (domain - 1)) * plotW;
  const y = (value) => margin.top + plotH - (value / top) * plotH;

  const root = svg('svg', { width, height, viewBox: `0 0 ${width} ${height}`, class: 'viz-svg', role: 'group', 'aria-labelledby': `${state.panel.id}-title` });
  ticks.forEach((tick) => {
    const ty = y(tick);
    root.append(svg('line', { x1: margin.left, x2: width - margin.right, y1: ty, y2: ty, class: tick === 0 ? 'viz-baseline' : 'viz-grid' }));
    root.append(svg('text', { x: margin.left - 8, y: ty, class: 'viz-tick', 'text-anchor': 'end', 'dominant-baseline': 'middle' }, tick === 0 ? '0' : moneyCompact(tick)));
  });

  // About five date ticks along the bottom, dated in the current period.
  const tickCount = Math.max(2, Math.min(6, Math.floor(plotW / 90)));
  for (let i = 0; i < tickCount; i += 1) {
    const index = Math.round((i / (tickCount - 1)) * (domain - 1));
    root.append(svg('text', { x: x(index), y: height - 10, class: 'viz-tick viz-tick-x', 'text-anchor': i === 0 ? 'start' : i === tickCount - 1 ? 'end' : 'middle' }, shortDate(addDays(data.range.start, index))));
  }

  const points = (values) => values.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(' ');
  if (data.target) {
    root.append(svg('line', { x1: x(0), y1: y(0), x2: x(domain - 1), y2: y(targetEnd), class: 'viz-line-target' }));
  }
  if (data.prior.length > 1) root.append(svg('polyline', { points: points(data.prior), class: 'viz-line-context' }));
  if (data.current.length) {
    if (data.current.length > 1) {
      root.append(svg('polygon', { points: `${x(0)},${y(0)} ${points(data.current)} ${x(data.current.length - 1)},${y(0)}`, class: 'viz-area-spend' }));
      root.append(svg('polyline', { points: points(data.current), class: 'viz-line-spend' }));
    }
    const lastIndex = data.current.length - 1;
    const endX = x(lastIndex);
    const endY = y(data.current[lastIndex]);
    root.append(svg('circle', { cx: endX, cy: endY, r: 4, class: 'viz-dot-spend' }));
    const nearRight = endX > width - margin.right - 70;
    root.append(svg('text', { x: nearRight ? endX - 9 : endX + 9, y: endY - 9, class: 'viz-direct-label', 'text-anchor': nearRight ? 'end' : 'start' }, moneyCompact(data.current[lastIndex])));
  }

  // Crosshair: snaps to the nearest day; arrow keys move it when focused.
  const cross = svg('line', { y1: margin.top, y2: margin.top + plotH, class: 'viz-crosshair', opacity: 0 });
  const dotCurrent = svg('circle', { r: 4, class: 'viz-dot-spend', opacity: 0 });
  const dotPrior = svg('circle', { r: 4, class: 'viz-dot-context', opacity: 0 });
  root.append(cross, dotPrior, dotCurrent);
  let activeIndex = Math.max(0, data.current.length - 1);
  const show = (index, px, py) => {
    activeIndex = Math.max(0, Math.min(domain - 1, index));
    const cx = x(activeIndex);
    cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('opacity', 1);
    const rows = [];
    if (activeIndex < data.current.length) {
      dotCurrent.setAttribute('cx', cx); dotCurrent.setAttribute('cy', y(data.current[activeIndex])); dotCurrent.setAttribute('opacity', 1);
      rows.push({ color: 'var(--viz-spend)', value: money(data.current[activeIndex]), label: data.currentName });
    } else dotCurrent.setAttribute('opacity', 0);
    if (activeIndex < data.prior.length) {
      dotPrior.setAttribute('cx', cx); dotPrior.setAttribute('cy', y(data.prior[activeIndex])); dotPrior.setAttribute('opacity', 1);
      rows.push({ color: 'var(--viz-context)', value: money(data.prior[activeIndex]), label: data.previousName });
    } else dotPrior.setAttribute('opacity', 0);
    if (data.target) rows.push({ color: 'var(--viz-target)', value: money(data.target * (activeIndex + 1)), label: 'Target pace' });
    tooltip.show(`Day ${activeIndex + 1} · ${shortDate(addDays(data.range.start, activeIndex))}`, rows, px ?? cx, py ?? margin.top + 8);
  };
  const hide = () => { [cross, dotCurrent, dotPrior].forEach((node) => node.setAttribute('opacity', 0)); tooltip.hide(); };
  const overlay = svg('rect', {
    x: margin.left, y: margin.top, width: plotW, height: plotH, class: 'viz-hit', tabindex: 0, role: 'img',
    'aria-label': `Cumulative spending by day. ${state.sub.textContent}. Use the left and right arrow keys to read each day.`
  });
  overlay.addEventListener('pointermove', (event) => {
    const box = host.getBoundingClientRect();
    const px = event.clientX - box.left;
    show(Math.round(((px - margin.left) / plotW) * (domain - 1)), px, event.clientY - box.top);
  });
  overlay.addEventListener('pointerleave', hide);
  overlay.addEventListener('focus', () => show(activeIndex));
  overlay.addEventListener('blur', hide);
  overlay.addEventListener('keydown', (event) => {
    const step = { ArrowRight: 1, ArrowLeft: -1, End: domain, Home: -domain }[event.key];
    if (!step) return;
    event.preventDefault();
    show(activeIndex + step);
  });
  root.append(overlay);
  host.prepend(root);
}

function tabulatePace(data) {
  const rows = [];
  const length = Math.max(data.current.length, data.prior.length);
  for (let index = 0; index < length; index += 1) {
    rows.push([
      `Day ${index + 1} · ${shortDate(addDays(data.range.start, index))}`,
      index < data.current.length ? money(data.current[index]) : '—',
      index < data.prior.length ? money(data.prior[index]) : '—',
      ...(data.target ? [money(data.target * (index + 1))] : [])
    ]);
  }
  return {
    caption: 'Cumulative spending by day',
    columns: [{ label: 'Day' }, { label: data.currentName, numeric: true }, { label: data.previousName, numeric: true }, ...(data.target ? [{ label: 'Target pace', numeric: true }] : [])],
    rows
  };
}

// --------------------------------------------------- 3. spending calendar

const MAX_WEEKS = 53; // Up to a year on wide screens; phones show fewer weeks.
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function calendarData(now) {
  const today = startOfDay(now);
  const mondayOffset = (today.getDay() + 6) % 7;
  const firstMonday = addDays(today, -mondayOffset - (MAX_WEEKS - 1) * 7);
  const totals = new Map();
  spendingTransactions().forEach((tx) => {
    if (tx.amountCents >= 0) return;
    const date = new Date(tx.date);
    if (date < firstMonday || date > now) return;
    const key = dayKey(date);
    const entry = totals.get(key) || { amount: 0, count: 0 };
    entry.amount += Math.abs(tx.amountCents);
    entry.count += 1;
    totals.set(key, entry);
  });
  return { today, firstMonday, totals };
}

function calendarWindow(data, weeks) {
  const start = addDays(data.firstMonday, (MAX_WEEKS - weeks) * 7);
  const days = [];
  for (let date = start; date <= data.today; date = addDays(date, 1)) {
    const entry = data.totals.get(dayKey(date)) || { amount: 0, count: 0 };
    days.push({ date, amount: entry.amount, count: entry.count, week: Math.floor(daysBetween(start, date) / 7), weekday: (date.getDay() + 6) % 7 });
  }
  return days;
}

function quantileThresholds(values) {
  const sorted = values.filter((value) => value > 0).sort((a, b) => a - b);
  if (!sorted.length) return [Infinity, Infinity, Infinity];
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  return [at(0.25), at(0.5), at(0.75)];
}

const levelOf = (amount, thresholds) => (amount <= 0 ? 0 : amount <= thresholds[0] ? 1 : amount <= thresholds[1] ? 2 : amount <= thresholds[2] ? 3 : 4);

function renderCalendarStats(state, days) {
  const stats = state.stats;
  stats.replaceChildren();
  const spendDays = days.filter((day) => day.amount > 0);
  const tile = (label, value, meta) => {
    const item = html('div', 'viz-stat');
    item.append(html('span', 'viz-stat-label', label), html('strong', 'viz-stat-value', value));
    if (meta) item.append(html('span', 'viz-stat-meta', meta));
    stats.append(item);
  };
  tile('No-spend days', `${days.length - spendDays.length}`, `of ${days.length} days shown`);
  const biggest = spendDays.reduce((best, day) => (!best || day.amount > best.amount ? day : best), null);
  tile('Biggest day', biggest ? money(biggest.amount) : '—', biggest ? longDate(biggest.date) : 'No spending yet');
  const byWeekday = WEEKDAYS.map((_, weekday) => {
    const matching = days.filter((day) => day.weekday === weekday);
    return matching.length ? matching.reduce((sum, day) => sum + day.amount, 0) / matching.length : 0;
  });
  const top = byWeekday.indexOf(Math.max(...byWeekday));
  const weekdayName = new Date(2026, 0, 5 + top).toLocaleDateString(undefined, { weekday: 'long' });
  tile('Priciest weekday', spendDays.length ? weekdayName : '—', spendDays.length ? `${money(byWeekday[top])} on average` : '');
}

function drawCalendar(state, width) {
  const host = state.host;
  host.replaceChildren();
  const tooltip = createTooltip(host);
  const gap = 3;
  const labelW = 30;
  const headerH = 18;
  const minCell = 13;
  const weeks = Math.max(6, Math.min(MAX_WEEKS, Math.floor((width - labelW + gap) / (minCell + gap))));
  const cell = Math.max(minCell, Math.min(20, Math.floor((width - labelW - (weeks - 1) * gap) / weeks)));
  const days = calendarWindow(state.data, weeks);
  const thresholds = quantileThresholds(days.map((day) => day.amount));
  state.sub.textContent = `Daily spending over the last ${weeks} weeks`;
  renderCalendarStats(state, days);
  state.legendNote.textContent = thresholds[0] === Infinity ? '' : `Steps at ${moneyCompact(thresholds[0])}, ${moneyCompact(thresholds[1])}, ${moneyCompact(thresholds[2])}`;

  const gridW = labelW + weeks * (cell + gap) - gap;
  const height = headerH + 7 * (cell + gap) - gap;
  const root = svg('svg', { width: gridW, height, viewBox: `0 0 ${gridW} ${height}`, class: 'viz-svg', role: 'group', 'aria-labelledby': `${state.panel.id}-title` });
  [0, 2, 4].forEach((weekday) => root.append(svg('text', { x: 0, y: headerH + weekday * (cell + gap) + cell / 2, class: 'viz-tick', 'dominant-baseline': 'middle' }, WEEKDAYS[weekday])));
  // Month names over the week each month starts in, skipping one that would
  // crowd its neighbour (e.g. a partial first month).
  let lastLabelX = -Infinity;
  days.forEach((day) => {
    if (day.weekday !== 0 || day.date.getDate() > 7) return;
    const labelX = labelW + day.week * (cell + gap);
    if (labelX - lastLabelX < 32) return;
    root.append(svg('text', { x: labelX, y: 11, class: 'viz-tick' }, day.date.toLocaleDateString(undefined, { month: 'short' })));
    lastLabelX = labelX;
  });
  const cells = days.map((day) => {
    const rect = svg('rect', {
      x: labelW + day.week * (cell + gap), y: headerH + day.weekday * (cell + gap), width: cell, height: cell, rx: 3,
      class: `viz-heat viz-heat-${levelOf(day.amount, thresholds)}`
    });
    root.append(rect);
    return rect;
  });

  let active = days.length - 1;
  const show = (index, px, py) => {
    active = Math.max(0, Math.min(days.length - 1, index));
    cells.forEach((rect, i) => rect.classList.toggle('is-active', i === active));
    const day = days[active];
    const cx = labelW + day.week * (cell + gap) + cell / 2;
    const cy = headerH + day.weekday * (cell + gap);
    tooltip.show(longDate(day.date), [
      { value: day.amount ? money(day.amount) : 'No spending', label: day.count ? `${day.count} transaction${day.count === 1 ? '' : 's'}` : '' }
    ], px ?? cx, py ?? cy);
  };
  const hide = () => { cells.forEach((rect) => rect.classList.remove('is-active')); tooltip.hide(); };
  const overlay = svg('rect', {
    x: labelW, y: headerH, width: gridW - labelW, height: height - headerH, class: 'viz-hit', tabindex: 0, role: 'img',
    'aria-label': `Spending calendar for the last ${weeks} weeks. Use arrow keys to move between days.`
  });
  overlay.addEventListener('pointermove', (event) => {
    const box = root.getBoundingClientRect();
    const px = event.clientX - box.left;
    const py = event.clientY - box.top;
    const week = Math.floor((px - labelW) / (cell + gap));
    const weekday = Math.floor((py - headerH) / (cell + gap));
    const index = days.findIndex((day) => day.week === week && day.weekday === weekday);
    if (index < 0) { hide(); return; }
    const hostBox = host.getBoundingClientRect();
    show(index, event.clientX - hostBox.left, event.clientY - hostBox.top);
  });
  overlay.addEventListener('pointerleave', hide);
  overlay.addEventListener('focus', () => show(active));
  overlay.addEventListener('blur', hide);
  overlay.addEventListener('keydown', (event) => {
    const step = { ArrowRight: 7, ArrowLeft: -7, ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    show(active + step);
  });
  root.append(overlay);
  host.prepend(root);
  state.shownDays = days;
}

function tabulateCalendar(data, state) {
  const days = (state.shownDays || calendarWindow(data, 12)).filter((day) => day.amount > 0).reverse();
  return {
    caption: 'Days with spending, newest first',
    columns: [{ label: 'Date' }, { label: 'Spending', numeric: true }, { label: 'Transactions', numeric: true }],
    rows: days.length ? days.map((day) => [longDate(day.date), money(day.amount), String(day.count)]) : [['No spending in this window', '—', '—']]
  };
}

// ---------------------------------------------------------------- install

export function installFinanceCharts() {
  const shell = document.querySelector('#finance-container .finance-command-shell');
  if (!shell) return () => {};

  const monthly = buildPanel({
    id: 'finance-monthly-chart', title: 'Cash flow by month',
    legend: [{ label: 'Income', color: 'var(--viz-income)' }, { label: 'Spending', color: 'var(--viz-spend)' }]
  });
  monthly.draw = drawMonthly;
  monthly.tabulate = tabulateMonthly;

  const pace = buildPanel({ id: 'finance-pace-chart', title: 'Spending pace' });
  pace.draw = drawPace;
  pace.tabulate = tabulatePace;

  const calendar = buildPanel({ id: 'finance-calendar-chart', title: 'Spending calendar', extraClass: 'finance-calendar-panel' });
  calendar.draw = drawCalendar;
  calendar.tabulate = (data) => tabulateCalendar(data, calendar);
  // Heat legend: a 0 swatch, four steps, and the step boundaries in words.
  calendar.legendRow.replaceChildren();
  calendar.legendRow.classList.add('viz-heat-legend');
  calendar.legendRow.append(html('span', 'viz-legend-item', 'Less'));
  for (let level = 0; level <= 4; level += 1) {
    const swatch = html('span', `viz-heat-swatch viz-heat-${level}`);
    swatch.title = level === 0 ? 'No spending' : `Level ${level} of 4`;
    calendar.legendRow.append(swatch);
  }
  calendar.legendRow.append(html('span', 'viz-legend-item', 'More'));
  calendar.legendNote = html('span', 'viz-legend-note');
  calendar.legendRow.append(calendar.legendNote);
  calendar.stats = html('div', 'viz-stats');
  calendar.body.classList.add('viz-calendar-layout');
  calendar.body.append(calendar.stats);

  const trendGrid = html('section', 'finance-trend-grid');
  trendGrid.setAttribute('aria-label', 'Spending trends');
  trendGrid.append(monthly.panel, pace.panel);
  const kpis = shell.querySelector('.finance-kpi-grid');
  (kpis?.nextElementSibling ? kpis.parentNode.insertBefore(trendGrid, kpis.nextElementSibling) : shell.append(trendGrid));
  const panelGrid = shell.querySelector('.finance-panel-grid');
  if (panelGrid) panelGrid.after(calendar.panel); else shell.append(calendar.panel);

  return function renderFinanceCharts() {
    if (!financeApi()) return;
    const now = new Date();
    monthly.data = monthlyData(now);
    describeMonthly(monthly);
    pace.data = paceData(now);
    pace.setLegend([
      { label: pace.data.currentName, color: 'var(--viz-spend)', shape: 'line' },
      { label: pace.data.previousName, color: 'var(--viz-context)', shape: 'line' },
      ...(pace.data.target ? [{ label: 'Daily target pace', color: 'var(--viz-target)', shape: 'dash' }] : [])
    ]);
    describePace(pace);
    calendar.data = calendarData(now);
    [monthly, pace, calendar].forEach((chart) => {
      if (chart.table.hidden) chart.redraw(true);
      else chart.renderTable();
    });
  };
}
