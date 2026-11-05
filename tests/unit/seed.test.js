import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIXED_NOW, TODAY, isoDay, seededWorkspace } from '../support/seed.js';

// The seed must meet the bar the product brief sets for screenshots:
// 10+ tasks across all statuses and due dates, 4+ events with a weekly
// repeat, 100+ transactions over 4 months, and 2 budgets.

test('the fixed clock is 10:30 on Thursday 5 November 2026 in Manila', () => {
  assert.equal(FIXED_NOW.toISOString(), '2026-11-05T02:30:00.000Z');
  assert.equal(TODAY, '2026-11-05');
  assert.equal(isoDay(-5), '2026-10-31');
  assert.equal(isoDay(27), '2026-12-02');
});

test('the seeded workspace is realistic and deterministic', () => {
  const workspace = seededWorkspace();
  assert.deepEqual(workspace, seededWorkspace());

  const { tasks, trackerEvents, soloflow_finance: transactions, soloflow_finance_budgets: budgets } = workspace;
  assert.ok(tasks.length >= 10);
  assert.deepEqual(new Set(tasks.map((task) => task.status)), new Set(['todo', 'inprogress', 'done']));
  assert.ok(tasks.some((task) => task.dueDate && task.dueDate < TODAY));
  assert.ok(tasks.some((task) => task.dueDate === TODAY));
  assert.ok(tasks.some((task) => task.dueDate > TODAY));
  assert.equal(new Set(tasks.map((task) => task.id)).size, tasks.length);

  assert.ok(trackerEvents.length >= 4);
  assert.ok(trackerEvents.some((event) => event.repeat === 'weekly'));

  assert.ok(transactions.length >= 100);
  assert.equal(new Set(transactions.map((tx) => tx.id)).size, transactions.length);
  assert.ok(transactions.every((tx) => Number.isInteger(tx.amountCents) && tx.amountCents !== 0));
  const months = new Set(transactions.map((tx) => tx.date.slice(0, 7)));
  assert.ok(months.size >= 4, `transactions span ${months.size} months`);
  assert.ok(transactions.every((tx) => tx.date <= FIXED_NOW.toISOString().slice(0, 10) + 'T23:59:59Z'));

  assert.equal(budgets.length, 2);
});
