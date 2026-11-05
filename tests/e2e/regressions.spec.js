// Known bugs, each reproduced by a test marked test.fail with its finding ID
// from docs/production-readiness/ASSESSMENT.md. When a fix lands the test
// starts passing, Playwright reports the unexpected pass, and the fix's PR
// removes the marker.

import { readFile } from 'node:fs/promises';
import { test, expect, openApp, dismissToasts } from './fixtures.js';
import { seedEvents, seedTasks, seededWorkspace } from '../support/seed.js';

// Today's import replaces tasks at once. After Phase 1 it may show a preview
// first; for an empty workspace "Merge" restores everything.
async function confirmImportIfAsked(page) {
  const merge = page.getByRole('button', { name: /^merge/i });
  try {
    await merge.waitFor({ state: 'visible', timeout: 1_500 });
    await merge.click();
  } catch {
    // No preview: the import has already been applied.
  }
}

test.describe('R1: Firebase CDN blocked', () => {
  test.use({ blockFirebase: true, allowPageErrors: true, storage: { tasks: seedTasks() } });

  test.fail('R1: the user sees why the app could not start and can download their data', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.getByText(/couldn.t start/i)).toBeVisible({ timeout: 10_000 });

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: /download my data/i }).click();
    const file = await (await download).path();
    const contents = await readFile(file, 'utf8');
    expect(contents).toContain('Send Halcyon invoice');
  });
});

test.describe('R2: corrupt localStorage', () => {
  test.use({ storage: { tasks: '{bad', trackerEvents: seedEvents() } });

  test.fail('R2: a corrupt tasks value still boots and the bad value is kept aside', async ({ page }) => {
    await page.goto('/index.html');
    await page.locator('#taskTitle').fill('Still works');
    await page.locator('.quick-add-submit').click();
    await expect(page.locator('#col-todo .task-card', { hasText: 'Still works' })).toBeVisible();

    const state = await page.evaluate(() => ({
      events: window.events?.length,
      kept: Object.keys(localStorage)
        .filter((key) => key.startsWith('soloflow_quarantine_tasks'))
        .map((key) => localStorage.getItem(key))
    }));
    expect(state.events).toBe(seedEvents().length);
    expect(state.kept).toContain('{bad');
  });
});

test.fail('S1: an imported task id cannot run code', async ({ page }) => {
  await openApp(page);
  await dismissToasts(page);
  const payload = [{ id: "x'),window.__pwned=1,('", title: 'Imported task', status: 'todo' }];
  await page.locator('#importFile').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(payload))
  });
  await confirmImportIfAsked(page);

  const card = page.locator('#col-todo .task-card', { hasText: 'Imported task' });
  await expect(card).toBeVisible();
  await card.locator('.task-main-action').click();
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
});

test.describe('D6: backup and restore', () => {
  test.use({ storage: { ...seededWorkspace(), trackerSettings: { title: 'Halcyon Studio' } } });

  test.fail('D6: export, wipe and import restores tasks, events, schedule, finance and settings', async ({ page }) => {
    const snapshot = () => page.evaluate(() => ({
      tasks: window.tasks.map((task) => task.id).sort(),
      events: window.events.map((event) => event.id).sort(),
      schedule: Object.keys(window.scheduleData).sort(),
      transactions: window.financeTransactions.length,
      budgets: window.financeBudgets.map((budget) => budget.id).sort(),
      workspaceTitle: window.settings.title
    }));

    await openApp(page);
    const before = await snapshot();
    expect(before.events.length).toBeGreaterThan(0);

    await page.evaluate(() => { document.getElementById('workspaceSettings').open = true; });
    const download = page.waitForEvent('download');
    await page.locator('#workspaceSettings').getByRole('button', { name: /export/i }).click();
    const backup = await readFile(await (await download).path());

    await page.evaluate(() => localStorage.clear());
    await openApp(page);
    expect((await snapshot()).tasks).toEqual([]);

    await page.locator('#importFile').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: backup });
    await confirmImportIfAsked(page);
    await expect.poll(snapshot).toEqual(before);
  });
});

// Found while writing these tests; not in ASSESSMENT.md yet.
// After adding a task the capture bar stays expanded. modules/layout.js folds
// it on the next pointerdown outside it, which moves the board up between
// mousedown and mouseup, so that first click lands on the column instead.
test.fail('Capture bar: the first click on the board after adding a task is not lost', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'The expanded capture row only shifts the desktop board');
  await openApp(page);
  await dismissToasts(page);
  await page.locator('#taskTitle').fill('Prepare client brief');
  await page.locator('.quick-add-submit').click();

  const card = page.locator('#col-todo .task-card', { hasText: 'Prepare client brief' });
  await card.getByRole('button', { name: /^Start/ }).click();
  await expect.poll(() => page.evaluate(() => window.tasks[0].status), { timeout: 2_000 }).toBe('inprogress');
});

// Found while writing these tests; not in ASSESSMENT.md yet.
// In modules/reports.js, window.printReport calls print(), but `print` there
// is the local "Print / Save PDF" button, not window.print. The click throws
// "print is not a function", no print dialog opens, and <body> keeps the
// printing-report class, so a later Ctrl+P prints a blank page.
test.fail('Reports: Print / Save PDF opens the print dialog', async ({ page }) => {
  await openApp(page);
  await dismissToasts(page);
  await page.evaluate(() => {
    window.__printCalls = 0;
    window.print = () => { window.__printCalls += 1; };
  });
  // On phones "Generate summary" is inside the board's "View options" menu.
  const viewOptions = page.locator('#boardToolbarMoreToggle');
  if (await viewOptions.isVisible()) await viewOptions.click();
  await page.getByRole('button', { name: 'Generate summary' }).click();
  await page.getByRole('button', { name: 'Print / Save PDF' }).click();
  await expect.poll(() => page.evaluate(() => window.__printCalls), { timeout: 2_000 }).toBe(1);
  await expect(page.locator('body')).not.toHaveClass(/printing-report/);
});
