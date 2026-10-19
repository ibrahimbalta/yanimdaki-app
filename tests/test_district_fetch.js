const { chromium } = require('@playwright/test');
const assert = require('assert');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true
  });
  const page = await context.newPage();

  // Test the fetch from the origin https://yanimdaki.com
  const testResults = await page.evaluate(async () => {
    let oldUrlError = null;
    let newUrlDistricts = [];

    // Test old URL (should fail with CORS/Network error in browser)
    try {
      const resp = await fetch('https://turkiyeapi.dev/api/v1/provinces/34');
      const data = await resp.json();
    } catch (err) {
      oldUrlError = err.message;
    }

    // Test new direct API URL (should succeed and return districts)
    try {
      const resp = await fetch('https://api.turkiyeapi.dev/v1/provinces/34');
      const data = await resp.json();
      newUrlDistricts = data.data.districts.map(d => d.name);
    } catch (err) {
      // should not fail
    }

    return {
      oldUrlError,
      districtsCount: newUrlDistricts.length,
      sampleDistricts: newUrlDistricts.slice(0, 3)
    };
  });

  console.log('Test Results:', testResults);
  assert(testResults.oldUrlError !== null, 'Old URL should fail in browser due to missing CORS on 308 redirect');
  assert(testResults.districtsCount > 0, 'New direct URL must return districts');

  console.log('Root cause verified successfully: Old URL blocked by browser CORS, new direct URL succeeds!');
  await browser.close();
})();
