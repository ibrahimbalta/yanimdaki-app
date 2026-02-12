import { test, expect } from '@playwright/test';

test.describe('Responsive Tasarim ve Performans', () => {

    test('masaustu gorunumde duzgun render', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/app.html');
        await page.waitForTimeout(2000);
        const body = page.locator('body');
        await expect(body).toBeVisible();
        // Yatay kacma kontrolu
        const bodyWidth = await body.evaluate(el => el.scrollWidth);
        expect(bodyWidth).toBeLessThanOrEqual(1500);
    });

    test('tablet gorunumde duzgun render', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/app.html');
        await page.waitForTimeout(2000);
        const body = page.locator('body');
        await expect(body).toBeVisible();
    });

    test('mobil gorunumde duzgun render', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/app.html');
        await page.waitForTimeout(2000);
        const body = page.locator('body');
        await expect(body).toBeVisible();
    });

    test('kucuk mobil gorunumde icerik tasmasi yok', async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 568 });
        await page.goto('/app.html');
        await page.waitForTimeout(2000);
        const hasOverflow = await page.evaluate(() => {
            return document.body.scrollWidth > document.body.clientWidth;
        });
        expect(hasOverflow).toBeFalsy();
    });

    test('sayfa 5 saniyeden az surede yukleniyor', async ({ page }) => {
        const start = Date.now();
        await page.goto('/app.html', { waitUntil: 'domcontentloaded' });
        const duration = Date.now() - start;
        expect(duration).toBeLessThan(5000);
    });

    test('CSS dosyasi basarili yukleniyor', async ({ page }) => {
        await page.goto('/app.html');
        const stylesheets = await page.evaluate(() => {
            return Array.from(document.styleSheets).length;
        });
        expect(stylesheets).toBeGreaterThan(0);
    });

    test('JavaScript hata (console error) icermiyor', async ({ page }) => {
        const errors = [];
        page.on('pageerror', (err) => errors.push(err.message));
        await page.goto('/app.html');
        await page.waitForTimeout(3000);
        // Firebase veya harici kutuphanelerden kaynaklanan hatalari dislayalim
        const criticalErrors = errors.filter(e =>
            !e.includes('Firebase') &&
            !e.includes('firebase') &&
            !e.includes('network') &&
            !e.includes('Failed to fetch')
        );
        expect(criticalErrors.length).toBe(0);
    });
});
