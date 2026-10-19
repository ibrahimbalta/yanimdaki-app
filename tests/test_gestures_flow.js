const { chromium } = require('@playwright/test');
const assert = require('assert');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();
  const filePath = 'file:///' + path.resolve(__dirname, '../app.html').replace(/\\/g, '/');
  await page.goto(filePath, { waitUntil: 'domcontentloaded' });
  
  // Verify initModalGestures is registered
  const hasGestures = await page.evaluate(() => typeof window.initModalGestures === 'function');
  assert.strictEqual(hasGestures, true, 'initModalGestures must be defined on window');
  
  console.log('Gestures registration test passed successfully');
  await browser.close();
})();
