const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  const verificationDir = path.join(process.cwd(), 'verification');
  if (!fs.existsSync(verificationDir)) {
    fs.mkdirSync(verificationDir);
  }

  try {
    await page.goto('http://localhost:3000/rezzler', { waitUntil: 'networkidle0' });
    await page.setViewport({ width: 390, height: 844 }); // iPhone 13/14 viewport
    await page.screenshot({ path: 'verification/rezzler_final.png' });
    console.log('Screenshot saved to verification/rezzler_final.png');
  } catch (error) {
    console.error('Error taking screenshot:', error);
  } finally {
    await browser.close();
  }
})();
