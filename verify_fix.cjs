const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });

  // Need to be logged in ideally, but we can check the public HomePage
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'verification/homepage_fixed.png' });

  // Try Dashboard (will likely show login/loader but we can see the container)
  await page.goto('http://localhost:3000/dashboard');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'verification/dashboard_fixed.png' });

  await browser.close();
})();
