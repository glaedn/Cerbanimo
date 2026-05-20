import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'line',
  use: {
    baseURL: 'http://localhost:3004',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          executablePath: '/home/jules/.cache/ms-playwright/firefox-1509/firefox/firefox'
        }
      },
    },
  ],
});
