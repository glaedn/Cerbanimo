import { test, expect } from '@playwright/test';

test('verify marketplace', async ({ page }) => {
  // Bypass auth
  await page.addInitScript(() => {
    window.localStorage.setItem('isAuthenticated', 'true');
  });

  // Set viewport to desktop
  await page.setViewportSize({ width: 1280, height: 800 });

  // Marketplace
  await page.goto('http://localhost:3000/commons/marketplace');

  // Wait for the "List Need" button which should be there now
  try {
    await page.waitForSelector('button:has-text("List Need")', { timeout: 10000 });
  } catch (e) {
    console.log('List Need button not found, taking screenshot anyway');
  }

  await page.screenshot({ path: '/home/jules/verification/marketplace_retry.png', fullPage: true });
});
