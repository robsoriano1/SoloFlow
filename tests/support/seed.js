// Deterministic workspace data for tests and screenshots. Everything is
// relative to FIXED_NOW, so dates like "overdue" and "today" stay stable.
// Pure data: no DOM, no Playwright, safe to import from unit tests.

// Thursday 5 November 2026, 10:30 in Manila (UTC+8, no daylight saving).
export const FIXED_NOW = new Date('2026-11-05T10:30:00+08:00');
export const TODAY = '2026-11-05';

const DAY_MS = 86_400_000;

// ISO date (YYYY-MM-DD) `offset` days from TODAY, computed in UTC so the
// result never depends on the machine's time zone.
export function isoDay(offset = 0) {
  const base = Date.UTC(2026, 10, 5);
  return new Date(base + offset * DAY_MS).toISOString().slice(0, 10);
}

// Noon in Manila on an ISO date, as the app stores transaction dates.
function manilaNoon(iso) {
  return new Date(`${iso}T12:00:00+08:00`).toISOString();
}

// Small seeded PRNG (mulberry32) so "random" data is identical on every run.
function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function task(id, title, fields = {}) {
  const createdAt = manilaNoon(isoDay(-20));
  return {
    id,
    title,
    category: 'General',
    priority: 'Medium',
    status: 'todo',
    description: '',
    subtasks: [],
    assignee: '',
    dateAssigned: isoDay(-20),
    dueDate: '',
    dueTime: '',
    blockedBy: '',
    financeSynced: false,
    timeSpent: 0,
    metadata: { createdAt, updatedAt: createdAt, source: 'seed' },
    ...fields
  };
}

export function seedTasks() {
  return [
    task('seed-task-01', 'Send Halcyon invoice', { category: 'Client', priority: 'High', dueDate: isoDay(-2) }),
    task('seed-task-02', 'Renew domain', { category: 'Admin', dueDate: isoDay(-1) }),
    task('seed-task-03', 'Draft proposal for Ortega Studio', { category: 'Client', priority: 'High', dueDate: TODAY, dueTime: '15:00' }),
    task('seed-task-04', 'Review contract redlines', { category: 'Client', dueDate: TODAY }),
    task('seed-task-05', 'Plan Q1 content calendar', { category: 'Marketing', priority: 'Low', dueDate: isoDay(6) }),
    task('seed-task-06', 'Update portfolio case study', { category: 'Marketing' }),
    task('seed-task-07', 'Research accounting software', { category: 'Admin', priority: 'Low' }),
    task('seed-task-08', 'Build landing page wireframes', {
      category: 'Client', priority: 'High', status: 'inprogress', dueDate: isoDay(2), timeSpent: 5400,
      focusLog: { [isoDay(-1)]: 3600, [TODAY]: 1800 },
      subtasks: [{ text: 'Hero section', completed: true }, { text: 'Pricing table', completed: false }]
    }),
    task('seed-task-09', 'Write onboarding email sequence', {
      category: 'Marketing', status: 'inprogress', dueDate: isoDay(1), timeSpent: 2700, focusLog: { [isoDay(-2)]: 2700 }
    }),
    task('seed-task-10', 'Reconcile October expenses', {
      category: 'Admin', status: 'done', dueDate: isoDay(-3), timeSpent: 3600,
      startedAt: manilaNoon(isoDay(-5)), completedAt: manilaNoon(isoDay(-3)), focusLog: { [isoDay(-4)]: 3600 }
    }),
    task('seed-task-11', 'Logo revisions for Halcyon', {
      category: 'Client', priority: 'High', status: 'done', dueDate: isoDay(-1), timeSpent: 7200,
      startedAt: manilaNoon(isoDay(-4)), completedAt: manilaNoon(isoDay(-1)), focusLog: { [isoDay(-2)]: 3600, [isoDay(-1)]: 3600 }
    }),
    task('seed-task-12', 'Book dentist appointment', { category: 'Personal', status: 'done', completedAt: manilaNoon(TODAY) })
  ];
}

export function seedEvents() {
  return [
    { id: 'seed-event-01', title: 'Client call with Halcyon', date: TODAY, time: '11:00', endTime: '11:45', location: '', link: 'https://meet.google.com/abc-defg-hij', notes: '', repeat: 'none', repeatUntil: '', color: 'blue' },
    { id: 'seed-event-02', title: 'Weekly planning', date: isoDay(-3), time: '09:00', endTime: '09:30', location: 'Home office', link: '', notes: '', repeat: 'weekly', repeatUntil: '', color: 'green' },
    { id: 'seed-event-03', title: 'Design review', date: isoDay(1), time: '14:00', endTime: '15:00', location: '', link: '', notes: 'Bring the wireframes', repeat: 'none', repeatUntil: '', color: '' },
    { id: 'seed-event-04', title: 'Quarterly tax filing', date: isoDay(10), time: '', endTime: '', location: '', link: '', notes: '', repeat: 'none', repeatUntil: '', color: 'red' },
    { id: 'seed-event-05', title: 'Coffee with mentor', date: isoDay(-6), time: '16:00', endTime: '17:00', location: 'Cafe', link: '', notes: '', repeat: 'none', repeatUntil: '', color: '' }
  ];
}

export function seedSchedule() {
  return {
    'Monday-09:00': { text: 'Deep work', bg: '', span: 2, hidden: false },
    'Wednesday-14:00': { text: 'Admin & email', bg: '', span: 1, hidden: false },
    [`${TODAY}-13:00`]: { text: 'Proposal writing', bg: '', span: 2, hidden: false }
  };
}

const EXPENSES = [
  { payee: 'Jollibee', category: 'Food & Dining', min: 150, max: 650, allocationClass: 'needs', spendingType: 'Essential' },
  { payee: 'Grab', category: 'Transport', min: 120, max: 480, allocationClass: 'needs', spendingType: 'Essential' },
  { payee: 'SM Supermarket', category: 'Food & Dining', min: 900, max: 3200, allocationClass: 'needs', spendingType: 'Essential' },
  { payee: 'Steam', category: 'Entertainment', min: 300, max: 1500, allocationClass: 'wants', spendingType: 'Discretionary' },
  { payee: 'Starbucks', category: 'Food & Dining', min: 180, max: 420, allocationClass: 'wants', spendingType: 'Discretionary' },
  { payee: 'Lazada', category: 'Shopping', min: 400, max: 2800, allocationClass: 'wants', spendingType: 'Discretionary' }
];

const MONTHLY = [
  { day: 3, payee: 'Rent', category: 'Housing & Utilities', amount: -18000, allocationClass: 'needs', spendingType: 'Essential' },
  { day: 8, payee: 'Meralco', category: 'Housing & Utilities', amount: -2400, allocationClass: 'needs', spendingType: 'Essential' },
  { day: 12, payee: 'Figma', category: 'Software & Tools', amount: -900, allocationClass: 'needs', spendingType: 'Essential' },
  { day: 15, payee: 'Spotify', category: 'Subscriptions', amount: -279, allocationClass: 'wants', spendingType: 'Discretionary' },
  { day: 20, payee: 'Emergency fund', category: 'Savings', amount: -5000, allocationClass: 'savings', spendingType: 'Essential' },
  { day: 1, payee: 'Halcyon retainer', category: 'Income', amount: 45000, income: true },
  { day: 16, payee: 'Ortega Studio', category: 'Income', amount: 28000, income: true }
];

// About 120 transactions from early July to today: daily spending, monthly
// bills and two income sources a month.
export function seedTransactions() {
  const random = createRandom(20261105);
  const transactions = [];
  let counter = 0;
  const push = (iso, payee, category, amount, extra = {}) => {
    counter += 1;
    const income = amount > 0;
    transactions.push({
      id: `seed-tx-${String(counter).padStart(3, '0')}`,
      payee,
      category,
      amountCents: Math.round(amount * 100),
      spendingType: income ? 'N/A' : extra.spendingType || 'Essential',
      allocationClass: income ? 'savings' : extra.allocationClass || 'needs',
      transactionNature: income ? 'income' : 'expense',
      frequency: extra.frequency || 'one-time',
      date: manilaNoon(iso)
    });
  };

  for (let offset = -122; offset <= 0; offset += 1) {
    const iso = isoDay(offset);
    const dayOfMonth = Number(iso.slice(8, 10));
    MONTHLY.filter((item) => item.day === dayOfMonth).forEach((item) => {
      push(iso, item.payee, item.category, item.amount, { ...item, frequency: 'monthly' });
    });
    // Roughly every other day there is one everyday expense.
    if (random() < 0.55) {
      const pick = EXPENSES[Math.floor(random() * EXPENSES.length)];
      const amount = Math.round(pick.min + random() * (pick.max - pick.min));
      push(iso, pick.payee, pick.category, -amount, pick);
    }
  }
  return transactions;
}

export function seedBudgets() {
  return [
    { id: 'seed-budget-01', category: 'Food & Dining', allocatedCents: 1_200_000 },
    { id: 'seed-budget-02', category: 'Entertainment', allocatedCents: 300_000 }
  ];
}

// localStorage contents for a realistic workspace, keyed as the app reads them.
export function seededWorkspace() {
  return {
    tasks: seedTasks(),
    trackerEvents: seedEvents(),
    weeklySchedule: seedSchedule(),
    soloflow_finance: seedTransactions(),
    soloflow_finance_budgets: seedBudgets(),
    soloflow_finance_preferences: { rangePreset: 'month', liquidCashCents: 12_000_000, dailyTargetCents: 150_000 }
  };
}
