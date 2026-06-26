import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for CreatorLink (Spec 001).
 *
 * Boots BOTH the API (:3002) and the web app (:3000). Locally it reuses servers
 * you already have running (`pnpm dev`); in CI it starts them fresh. Auth is done
 * programmatically by reading the magic-link token from Postgres — see
 * `e2e/fixtures/auth.ts`.
 */

const WEB_PORT = 3000;
const API_PORT = Number(process.env.PORT ?? 3002);
const WEB_URL = `http://localhost:${WEB_PORT}`;
const API_URL = process.env.API_URL ?? `http://localhost:${API_PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // the core-loop test mutates shared seeded data
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',

  use: {
    baseURL: WEB_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Start API first, then web. Health-check each root URL before running tests.
  webServer: [
    {
      command: 'pnpm --filter api dev',
      url: API_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'pnpm --filter @repo/web dev',
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
