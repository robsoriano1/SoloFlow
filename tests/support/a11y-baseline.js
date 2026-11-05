// Compares axe results with the recorded baseline (tests/a11y-baseline.json).
// The baseline stores, per view, how many elements fail each axe rule. A run
// fails when a rule appears that was not there or affects more elements;
// fixing things never fails. Pure functions, unit-tested in tests/unit.

// axe violations → { ruleId: number of failing elements }, sorted by rule.
export function summarizeViolations(violations) {
  return Object.fromEntries(
    violations
      .map((violation) => [violation.id, violation.nodes.length])
      .sort(([a], [b]) => a.localeCompare(b))
  );
}

// Returns what got worse and what got better between two summaries.
export function compareWithBaseline(baseline = {}, current = {}) {
  const rules = [...new Set([...Object.keys(baseline), ...Object.keys(current)])].sort();
  const regressions = [];
  const improvements = [];
  for (const rule of rules) {
    const before = baseline[rule] || 0;
    const now = current[rule] || 0;
    if (now > before) regressions.push({ rule, baseline: before, current: now });
    else if (now < before) improvements.push({ rule, baseline: before, current: now });
  }
  return { regressions, improvements };
}

// Readable failure message, with axe's help text and the failing elements.
export function describeRegressions(regressions, violations) {
  return regressions.map(({ rule, baseline, current }) => {
    const violation = violations.find((item) => item.id === rule);
    const targets = violation ? violation.nodes.map((node) => `    ${node.target.join(' ')}`).join('\n') : '';
    return `${rule}: ${baseline} → ${current} elements. ${violation?.help || ''}\n${targets}`;
  }).join('\n');
}
