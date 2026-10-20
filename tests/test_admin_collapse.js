const { chromium } = require('@playwright/test');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();
  const filePath = 'file:///' + path.resolve(__dirname, '../admin.html').replace(/\\/g, '/');

  await page.goto(filePath, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Hide login overlay for testing visual dashboard
  await page.evaluate(() => {
    const login = document.getElementById('admin-login');
    if (login) login.style.display = 'none';
  });

  // Take screenshot of expanded state
  await page.screenshot({ path: path.resolve(__dirname, '../tests/admin_expanded.png') });

  // Check initial width of sidebar
  const initialWidth = await page.$eval('.sidebar', el => el.offsetWidth);
  const initialMainMargin = await page.$eval('.main', el => window.getComputedStyle(el).marginLeft);
  console.log('Initial Sidebar Width:', initialWidth, '| Main margin-left:', initialMainMargin);

  // Click collapse button
  await page.click('#sidebar-collapse-btn');
  await page.waitForTimeout(500);

  // Take screenshot of collapsed state
  await page.screenshot({ path: path.resolve(__dirname, '../tests/admin_collapsed.png') });

  const collapsedWidth = await page.$eval('.sidebar', el => el.offsetWidth);
  const collapsedMainMargin = await page.$eval('.main', el => window.getComputedStyle(el).marginLeft);
  const isBodyCollapsed = await page.evaluate(() => document.body.classList.contains('sidebar-collapsed'));
  const storedPref = await page.evaluate(() => localStorage.getItem('admin_sidebar_collapsed'));

  console.log('Collapsed Sidebar Width:', collapsedWidth, '| Main margin-left:', collapsedMainMargin);
  console.log('Body has sidebar-collapsed:', isBodyCollapsed, '| LocalStorage:', storedPref);

  // Click header toggle button to expand back
  await page.click('#header-sidebar-toggle-btn');
  await page.waitForTimeout(500);

  const reExpandedWidth = await page.$eval('.sidebar', el => el.offsetWidth);
  console.log('Re-expanded Sidebar Width:', reExpandedWidth);

  await browser.close();
  console.log('Test completed successfully!');
})();
