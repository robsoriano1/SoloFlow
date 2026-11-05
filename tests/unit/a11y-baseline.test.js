import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareWithBaseline, describeRegressions, summarizeViolations } from '../support/a11y-baseline.js';

const violation = (id, count, help = `${id} help`) => ({
  id,
  help,
  nodes: Array.from({ length: count }, (_, index) => ({ target: [`#node-${index}`] }))
});

test('summarizes violations as sorted rule counts', () => {
  const summary = summarizeViolations([violation('nested-interactive', 2), violation('color-contrast', 3)]);
  assert.deepEqual(summary, { 'color-contrast': 3, 'nested-interactive': 2 });
  assert.deepEqual(Object.keys(summary), ['color-contrast', 'nested-interactive']);
  assert.deepEqual(summarizeViolations([]), {});
});

test('an unchanged page passes', () => {
  assert.deepEqual(compareWithBaseline({ 'color-contrast': 2 }, { 'color-contrast': 2 }), { regressions: [], improvements: [] });
});

test('a new rule or more failing elements is a regression', () => {
  const { regressions } = compareWithBaseline({ 'color-contrast': 2 }, { 'color-contrast': 3, label: 1 });
  assert.deepEqual(regressions, [
    { rule: 'color-contrast', baseline: 2, current: 3 },
    { rule: 'label', baseline: 0, current: 1 }
  ]);
});

test('a view missing from the baseline counts every violation as new', () => {
  assert.equal(compareWithBaseline(undefined, { region: 1 }).regressions.length, 1);
});

test('fixes are improvements, never failures', () => {
  const result = compareWithBaseline({ 'color-contrast': 2, 'nested-interactive': 4 }, { 'color-contrast': 1 });
  assert.deepEqual(result.regressions, []);
  assert.deepEqual(result.improvements, [
    { rule: 'color-contrast', baseline: 2, current: 1 },
    { rule: 'nested-interactive', baseline: 4, current: 0 }
  ]);
});

test('describes regressions with help text and failing elements', () => {
  const text = describeRegressions([{ rule: 'label', baseline: 0, current: 2 }], [violation('label', 2, 'Form elements must have labels')]);
  assert.match(text, /label: 0 → 2 elements\. Form elements must have labels/);
  assert.match(text, /#node-0\n {4}#node-1/);
});
