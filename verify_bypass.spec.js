import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1280, height: 720 } });

test('verify orbit page with bypass auth', async ({ page }) => {
  // Go to /orbit - should bypass login if VITE_BYPASS_AUTH is working in dev mode
  await page.goto('http://localhost:3004/orbit');

  // Wait for loading or content
  await page.waitForTimeout(5000);

  await page.screenshot({ path: 'orbit_bypass_check.png', fullPage: true });

  // If we are still on /login or see "Log In with Auth0", it didn't bypass
  const loginText = await page.innerText('body');
  if (loginText.includes('Log In with Auth0')) {
    console.log('Bypass failed - showing login page');
  } else {
    console.log('Successfully bypassed or on another page');
  }
});
