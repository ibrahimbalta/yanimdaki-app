const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();
  await page.goto('https://yanimdaki.com/app.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  
  const cssHref = await page.evaluate(() => {
    const link = document.querySelector('link[rel="stylesheet"][href*="style.css"]');
    return link ? link.href : 'none';
  });
  console.log('Loaded CSS href:', cssHref);

  const modalInfo = await page.evaluate(() => {
    const el = document.getElementById('seller-profile-modal');
    if (!el) return 'no modal';
    el.style.display = 'flex';
    const content = el.querySelector('.modal-content');
    const comp = window.getComputedStyle(content);
    return {
      position: comp.position,
      left: comp.left,
      bottom: comp.bottom,
      transform: comp.transform,
      animationName: comp.animationName,
      animationDuration: comp.animationDuration
    };
  });
  console.log('Modal style on live yanimdaki.com:', JSON.stringify(modalInfo, null, 2));
  await browser.close();
})();
