import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Set viewport to desktop
  await page.setViewportSize({ width: 1280, height: 800 });

  try {
    // Navigate to the app (mocking login if necessary or just checking layout shell)
    // Since I can't easily bypass Auth0 in this environment without specific test accounts,
    // I will check if the ExperienceShell renders its containers correctly if I can reach it.
    // However, I'll try to just render the home page or any public route to see the shell if it wraps them.
    await page.goto('http://localhost:3000/orbit');

    // Wait a bit for potential redirects to login
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'orbit_layout.png', fullPage: true });
    console.log('Screenshot saved: orbit_layout.png');

    await page.goto('http://localhost:3000/signals');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'signals_layout.png', fullPage: true });
    console.log('Screenshot saved: signals_layout.png');

  } catch (err) {
    console.error('Verification failed:', err);
  } finally {
    await browser.close();
  }
})();
