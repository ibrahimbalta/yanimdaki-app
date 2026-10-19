const { chromium } = require('@playwright/test');
const assert = require('assert');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true
  });
  const page = await context.newPage();
  const filePath = 'file:///' + path.resolve(__dirname, '../app.html').replace(/\\/g, '/');
  
  await page.goto(filePath, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Navigate to add screen
  await page.evaluate(() => {
    // Mock user if needed so screen add displays
    window.app.state.user = { uid: 'test-user', displayName: 'Test', phone: '05555555555' };
    window.app.showScreen('add');
    window.app.loadAddLocationData();
  });

  await page.waitForTimeout(1500);

  // Check if add-city has options
  const cityCount = await page.evaluate(() => {
    const el = document.getElementById('add-city');
    return el ? el.options.length : 0;
  });
  console.log('City options count in #add-city:', cityCount);
  assert(cityCount > 1, 'add-city should have provinces populated');

  // Select Istanbul (value = 34 or name = 'İstanbul')
  await page.evaluate(async () => {
    const cityEl = document.getElementById('add-city');
    // Find Istanbul option
    for (let opt of cityEl.options) {
      if (opt.text.includes('İstanbul')) {
        cityEl.value = opt.value;
        break;
      }
    }
    // Trigger onchange
    await window.app.handleAddCityChange();
  });

  await page.waitForTimeout(2000);

  // Check if add-district has options populated
  const districtInfo = await page.evaluate(() => {
    const el = document.getElementById('add-district');
    if (!el) return { count: 0, options: [] };
    const options = Array.from(el.options).map(o => o.text);
    return {
      count: el.options.length,
      options: options.slice(0, 5)
    };
  });

  console.log('Districts populated:', districtInfo);
  assert(districtInfo.count > 1, 'add-district should have districts loaded');
  assert(districtInfo.options.some(o => o !== 'Yükleniyor...' && o !== 'İlçe Seçin' && o !== 'İlçe yüklenemedi'), 'Should contain real district names');

  console.log('UI City and District selection test PASSED with 100% success!');
  await browser.close();
})();
