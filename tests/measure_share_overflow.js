const { chromium } = require('@playwright/test');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 360, height: 800 },
    isMobile: true
  });
  const page = await context.newPage();
  const filePath = 'file:///' + path.resolve(__dirname, '../app.html').replace(/\\/g, '/');
  await page.goto(filePath, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Navigate to share screen
  await page.evaluate(() => {
    window.app.showScreen('share');
  });
  await page.waitForTimeout(500);

  const measurements = await page.evaluate(() => {
    const screen = document.getElementById('screen-share');
    const searchBar = document.querySelector('.share-search-bar');
    const filterBtn = document.querySelector('.share-filter-toggle-btn');
    const wrapper = document.querySelector('.share-search-input-wrapper');
    const input = document.getElementById('share-search-input');
    const alertBtn = document.getElementById('share-search-alert-btn');

    return {
      viewportWidth: window.innerWidth,
      screenWidth: screen ? screen.clientWidth : 0,
      screenScrollWidth: screen ? screen.scrollWidth : 0,
      searchBarWidth: searchBar ? searchBar.offsetWidth : 0,
      searchBarRight: searchBar ? searchBar.getBoundingClientRect().right : 0,
      filterBtnRight: filterBtn ? filterBtn.getBoundingClientRect().right : 0,
      wrapperWidth: wrapper ? wrapper.offsetWidth : 0,
      inputWidth: input ? input.offsetWidth : 0,
      alertBtnWidth: alertBtn ? alertBtn.offsetWidth : 0,
    };
  });

  console.log('Measurements on 360px viewport:', measurements);
  await page.screenshot({ path: path.resolve(__dirname, '../tests/share_screen_360.png') });
  await browser.close();
})();
