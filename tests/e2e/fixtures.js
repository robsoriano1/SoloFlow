// Shared Playwright fixtures: a hermetic network, a frozen clock, seeded
// storage and a check that no test ends with an uncaught page error.

import { test as base, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { FIXED_NOW } from '../support/seed.js';

export { expect };
export { FIXED_NOW };

export const VIEWS = ['all', 'today', 'backlog', 'schedule', 'calendar', 'events', 'productivity', 'finance'];

// The container each view shows; the three board views share the board.
export const VIEW_CONTAINERS = {
  all: '.board',
  today: '.board',
  backlog: '.board',
  schedule: '#schedule-container',
  calendar: '#calendar-container',
  events: '#events-container',
  productivity: '#productivity-container',
  finance: '#finance-container'
};

const FIREBASE_DIR = fileURLToPath(new URL('../../node_modules/firebase/', import.meta.url));
const FIREBASE_CDN = /^https:\/\/www\.gstatic\.com\/firebasejs\/11\.6\.1\/(firebase-[a-z-]+\.js)$/;
const firebaseFiles = new Map();

async function firebaseFile(name) {
  if (!firebaseFiles.has(name)) firebaseFiles.set(name, readFile(FIREBASE_DIR + name));
  return firebaseFiles.get(name);
}

// Only the test server is reachable. The Firebase SDK is served from
// node_modules (the same files the CDN serves); everything else, including
// googleapis.com, reCAPTCHA and Google Fonts, is aborted so tests never touch
// production services.
async function installNetworkSandbox(context, { appOrigin, blockFirebase }) {
  await context.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith(appOrigin + '/')) return route.continue();
    const match = url.match(FIREBASE_CDN);
    if (match && !blockFirebase) {
      return route.fulfill({ body: await firebaseFile(match[1]), contentType: 'text/javascript; charset=utf-8' });
    }
    return route.abort('blockedbyclient');
  });
}

export const test = base.extend({
  // Abort the Firebase CDN too, to test what happens when it is blocked.
  blockFirebase: [false, { option: true }],
  // Set to true in tests that expect uncaught errors.
  allowPageErrors: [false, { option: true }],
  // localStorage written before the first load: { key: value }. Strings are
  // stored as-is (to plant corrupt values); anything else is JSON-encoded.
  // Reloads within a test keep whatever the app has saved since.
  storage: [null, { option: true }],

  context: async ({ context, baseURL, blockFirebase }, use) => {
    await installNetworkSandbox(context, { appOrigin: new URL(baseURL).origin, blockFirebase });
    await use(context);
  },

  pageErrors: async ({}, use) => {
    await use([]);
  },

  page: async ({ page, storage, allowPageErrors, pageErrors }, use) => {
    page.on('pageerror', (error) => pageErrors.push(`${error.name}: ${error.message}`));
    await page.clock.setFixedTime(FIXED_NOW);
    if (storage) {
      const entries = Object.entries(storage).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]);
      await page.addInitScript((pairs) => {
        if (sessionStorage.getItem('__soloflow_test_seeded')) return;
        pairs.forEach(([key, value]) => localStorage.setItem(key, value));
        sessionStorage.setItem('__soloflow_test_seeded', '1');
      }, entries);
    }
    await use(page);
    if (!allowPageErrors) expect(pageErrors, 'uncaught errors on the page').toEqual([]);
  }
});

// The app is ready once bootstrap.js has run start(): its setView wrapper
// marks the active tab with aria-current as the last step.
export async function openApp(page) {
  await page.goto('/index.html');
  await page.locator('.view-tab[aria-current="page"]').first().waitFor({ state: 'attached' });
}

export async function setView(page, view) {
  await page.evaluate((name) => window.setView(name), view);
  await expect(page.locator(`.view-tab[data-view="${view}"]`)).toHaveAttribute('aria-current', 'page');
}

// Removes toasts that are on screen now, e.g. the "Working offline" notice
// that appears at boot because the tests have no network.
export async function dismissToasts(page) {
  await page.evaluate(() => document.querySelectorAll('#toastDeck .toast-deck-item').forEach((item) => item.remove()));
}
