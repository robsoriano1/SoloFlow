// Smoke tests: the core flows work on desktop and phone with no uncaught
// page errors (the fixture fails any test that ends with one).

import { test, expect, openApp, setView, dismissToasts, VIEWS, VIEW_CONTAINERS } from './fixtures.js';
import { seededWorkspace, TODAY } from '../support/seed.js';

// On phones the board shows one column at a time behind segment buttons.
async function showColumn(page, column) {
  const segment = page.locator(`.board-segment[data-column="${column}"]`);
  if (await segment.isVisible()) await segment.click();
}

test('the app boots without errors', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('.view-tab[data-view="all"]')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.board')).toBeVisible();
  await expect(page.locator('#taskTitle')).toBeVisible();
});

// On phones this takes ~15 s: the "Moved to …" toast and the Pomodoro button
// cover the card's buttons, and Playwright waits for the toast to time out
// (finding U2). It speeds up once U2 is fixed.
test('a task can be added, started, completed, deleted and restored', async ({ page }) => {
  const title = 'Prepare client brief';
  await openApp(page);
  await dismissToasts(page);

  await page.locator('#taskTitle').fill(title);
  await page.locator('.quick-add-submit').click();
  const todoCard = page.locator('#col-todo .task-card', { hasText: title });
  await expect(todoCard).toBeVisible();
  // Click away first so the capture bar folds before the card is clicked
  // (see the capture-bar test in regressions.spec.js).
  await page.locator('#col-todo').click({ position: { x: 12, y: 12 } });

  await todoCard.getByRole('button', { name: /^Start/ }).click();
  await showColumn(page, 'inprogress');
  const activeCard = page.locator('#col-inprogress .task-card', { hasText: title });
  await expect(activeCard).toBeVisible();
  await expect(page.locator('#col-todo .task-card', { hasText: title })).toHaveCount(0);

  await activeCard.getByRole('button', { name: /Complete/ }).click();
  await showColumn(page, 'done');
  const doneCard = page.locator('#col-done .task-card', { hasText: title });
  await expect(doneCard).toBeVisible();
  expect(await page.evaluate(() => window.tasks[0].status)).toBe('done');

  await doneCard.locator('.task-expand-toggle').click();
  await doneCard.locator('.task-action-delete').click();
  await expect(page.locator('.task-card', { hasText: title })).toHaveCount(0);
  expect(await page.evaluate(() => window.tasks.length)).toBe(0);

  await page.locator('.toast-deck-item', { hasText: 'Task deleted' }).getByRole('button', { name: 'Undo' }).click();
  await expect(page.locator('#col-done .task-card', { hasText: title })).toBeVisible();
  expect(await page.evaluate(() => window.tasks.map((task) => [task.title, task.status]))).toEqual([[title, 'done']]);
  // The restored task is saved, not only shown.
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('tasks')).length)).toBe(1);
});

test('an event can be added', async ({ page }) => {
  await openApp(page);
  await dismissToasts(page);
  await setView(page, 'events');

  await page.locator('#eventsNewToggle').click();
  await page.locator('#eventTitle').fill('Studio walkthrough');
  const form = page.locator('#eventForm');
  await form.locator('input[name="date"]').fill(TODAY);
  await form.locator('input[name="time"]').fill('15:30');
  await form.getByRole('button', { name: 'Add event' }).click();

  await expect(page.locator('#events-list .event-card', { hasText: 'Studio walkthrough' })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('trackerEvents')));
  expect(saved).toEqual([expect.objectContaining({ title: 'Studio walkthrough', date: TODAY, time: '15:30' })]);
});

test('a finance transaction can be recorded', async ({ page }) => {
  await openApp(page);
  await dismissToasts(page);
  await setView(page, 'finance');

  await page.locator('#financePayee').fill('Coworking day pass');
  await page.locator('#financeAmount').fill('450');
  await page.locator('#financeCategory').fill('Workspace');
  await page.getByRole('button', { name: 'Record transaction' }).click();

  await expect(page.locator('.finance-ledger-row', { hasText: 'Coworking day pass' })).toBeAttached();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('soloflow_finance')));
  expect(saved).toEqual([expect.objectContaining({ payee: 'Coworking day pass', amountCents: -45000, category: 'Workspace' })]);
});

test.describe('with a realistic workspace', () => {
  test.use({ storage: seededWorkspace() });

  test('every view renders', async ({ page }) => {
    await openApp(page);
    for (const view of VIEWS) {
      await setView(page, view);
      await expect(page.locator(VIEW_CONTAINERS[view]), `${view} view`).toBeVisible();
    }
  });

  test('no view scrolls sideways on a phone', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
    await openApp(page);
    for (const view of VIEWS) {
      await setView(page, view);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${view} view scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(0);
    }
  });

  test('each finance chart draws and has a table view', async ({ page }) => {
    await openApp(page);
    await dismissToasts(page);
    await setView(page, 'finance');

    const charts = page.locator('#finance-container [id^="finance-"][id$="-chart"]');
    await expect(charts.first()).toBeVisible();
    const ids = await charts.evaluateAll((elements) => elements.map((element) => element.id));
    expect(ids.length).toBeGreaterThanOrEqual(3);

    for (const id of ids) {
      const chart = page.locator(`#${id}`);
      await expect(chart.locator('svg').first(), `${id} draws an SVG`).toBeVisible();
      await chart.locator('.viz-table-toggle').click();
      const rows = chart.locator('table tbody tr');
      await expect(rows.first(), `${id} table has rows`).toBeVisible();
      expect(await rows.count()).toBeGreaterThan(0);
    }
  });
});

test.describe('keyboard shortcuts', () => {
  test('N focuses quick capture', async ({ page }) => {
    await openApp(page);
    await setView(page, 'finance');
    await page.locator('body').press('n');
    await expect(page.locator('.view-tab[data-view="all"]')).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('#taskTitle')).toBeFocused();
  });

  test('Cmd/Ctrl+K opens the command palette', async ({ page }) => {
    await openApp(page);
    await page.locator('body').press('ControlOrMeta+k');
    await expect(page.locator('#commandPalette')).toBeVisible();
    await expect(page.locator('#commandPaletteInput')).toBeFocused();
    await page.locator('#commandPaletteInput').fill('finance');
    await expect(page.locator('#commandPaletteResults .command-result').first()).toBeVisible();
  });
});
