// Accessibility gate: axe (WCAG 2.0 A/AA and 2.1 AA) on every view, compared
// with tests/a11y-baseline.json. New violations fail; known ones are listed
// in the baseline until they are fixed (production-readiness A1).
//
// After fixing violations, record the new baseline with:
//   npm run test:a11y:update

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { test, expect, openApp, setView, dismissToasts, VIEWS } from './fixtures.js';
import { seededWorkspace } from '../support/seed.js';
import { summarizeViolations, compareWithBaseline, describeRegressions } from '../support/a11y-baseline.js';

const BASELINE_PATH = fileURLToPath(new URL('../a11y-baseline.json', import.meta.url));
const UPDATE = Boolean(process.env.UPDATE_A11Y_BASELINE);

function readBaseline() {
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
}

// Run with --workers=1 when updating, so writes don't overlap.
function recordBaseline(key, summary) {
  const file = readBaseline();
  file.views[key] = summary;
  file.views = Object.fromEntries(Object.entries(file.views).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(BASELINE_PATH, JSON.stringify(file, null, 2) + '\n');
}

test.describe('accessibility', () => {
  test.use({ storage: seededWorkspace(), reducedMotion: 'reduce' });

  for (const view of VIEWS) {
    test(`${view} view has no new axe violations`, async ({ page }, testInfo) => {
      await openApp(page);
      await setView(page, view);
      // Toasts come and go on timers, which would make the counts flaky.
      await dismissToasts(page);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .exclude('#toastDeck')
        .analyze();
      const summary = summarizeViolations(results.violations);
      const key = `${testInfo.project.name}/${view}`;
      await testInfo.attach('axe-violations.json', { body: JSON.stringify(results.violations, null, 2), contentType: 'application/json' });

      if (UPDATE) {
        recordBaseline(key, summary);
        return;
      }
      const { regressions, improvements } = compareWithBaseline(readBaseline().views[key], summary);
      if (improvements.length) {
        testInfo.annotations.push({ type: 'a11y improved', description: `${key}: ${improvements.map((item) => `${item.rule} ${item.baseline} → ${item.current}`).join(', ')}. Run npm run test:a11y:update.` });
      }
      expect(regressions, `New accessibility violations on ${key}:\n${describeRegressions(regressions, results.violations)}`).toEqual([]);
    });
  }
});
