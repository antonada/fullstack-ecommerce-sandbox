import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
const ownServer = !process.env.BASE_URL;

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'results/junit.xml' }]]
    : [['list'], ['html', { open: 'never' }]],
  globalSetup: './support/global-setup.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'contract', testDir: './contract' },
    { name: 'api', testDir: './api' },
    { name: 'e2e-chromium', testDir: './e2e', use: { ...devices['Desktop Chrome'] } },
    { name: 'e2e-firefox', testDir: './e2e', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: ownServer
    ? {
        command: 'npm run build && npm start',
        cwd: '..',
        url: `${baseURL}/api/health`,
        reuseExistingServer: !process.env.CI,
        env: { PORT: '3000', ENABLE_TEST_ROUTES: 'true', BCRYPT_ROUNDS: '4' },
      }
    : undefined,
});
