import { defineConfig, devices } from '@playwright/test';
import baseConfig from './playwright.config.ts';

// Slowed-down run with video for the clip in docs/media. Not part of the regular suite: npm run demo:record
export default defineConfig({
  ...baseConfig,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: 'demo-results',
  grep: [/signing in through the form/, /a full purchase ends/, /stock that ran out/, /expired token sends/],
  projects: [
    {
      name: 'demo',
      testDir: './e2e',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        video: { mode: 'on', size: { width: 1280, height: 720 } },
        launchOptions: { slowMo: 600 },
      },
    },
  ],
});
