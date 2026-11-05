import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.SOLOFLOW_TEST_PORT || 4173);
const baseURL = `http://127.0.0.1:${PORT}`;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: 0,
  workers: isCI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: isCI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    timezoneId: 'Asia/Manila',
    locale: 'en-US',
    // A registered service worker would bypass request routing.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }
    },
    {
      name: 'phone',
      // iPhone 13 size, touch and user agent, rendered by Chromium so CI only
      // needs one browser.
      use: { ...devices['iPhone 13'], browserName: 'chromium' }
    }
  ],
  webServer: {
    command: `node scripts/serve.mjs --port ${PORT}`,
    url: `${baseURL}/index.html`,
    reuseExistingServer: !isCI,
    stdout: 'ignore',
    stderr: 'pipe'
  }
});
