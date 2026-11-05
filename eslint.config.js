import js from '@eslint/js';
import globals from 'globals';

// index.html's inline script is not linted yet: production-readiness Phase 3
// moves it into app/legacy-core.js, which this config then covers.
export default [
  {
    ignores: ['node_modules/', 'test-results/', 'playwright-report/', 'blob-report/']
  },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser }
    },
    rules: {
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none' }]
    }
  },
  {
    files: ['service-worker.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.serviceworker } }
  },
  {
    files: ['scripts/**', 'tests/**', '*.config.js'],
    languageOptions: { globals: { ...globals.node } }
  },
  {
    // Playwright fixtures must destructure their first argument, even when
    // they use none of it.
    files: ['tests/e2e/**'],
    rules: { 'no-empty-pattern': 'off' }
  }
];
