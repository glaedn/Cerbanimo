import { test, expect } from '@playwright/test';

test('check for console errors on load', async ({ page }) => {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => {
    errors.push(err.message);
  });

  await page.goto('http://localhost:3004/');

  // Wait a bit for JS to execute
  await page.waitForTimeout(2000);

  console.log('Console errors:', errors);
  expect(errors.filter(e => !e.includes('Failed to load resource') && !e.includes('Auth0')).length).toBe(0);

  const title = await page.title();
  console.log('Page title:', title);

  const content = await page.content();
  if (content.includes('INITIALIZING_HUD')) {
      console.log('App is initializing...');
  }

  await page.screenshot({ path: '/home/jules/verification/smoke_test.png' });
});
