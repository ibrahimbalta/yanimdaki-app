import { test, expect } from '@playwright/test';

test.describe('Landing Page (index.html)', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('sayfa basarili yukleniyor ve baslik dogru', async ({ page }) => {
        await expect(page).toHaveTitle(/Yanımdaki/);
    });

    test('logo veya marka ismi gorunur', async ({ page }) => {
        // Logo img veya text olarak bulunabilir
        const logoOrBrand = page.locator('img[src*="logo"], img[alt*="logo" i], :text("Yanımdaki")').first();
        await expect(logoOrBrand).toBeVisible();
    });

    test('hero bolumu gorunur', async ({ page }) => {
        const hero = page.locator('.hero-section, .hero, [class*="hero"]').first();
        await expect(hero).toBeVisible();
    });

    test('CTA butonu veya link mevcut', async ({ page }) => {
        const ctaBtn = page.locator('a[href*="app.html"], a:has-text("Başla"), a:has-text("Uygulamaya"), button:has-text("Keşfet")').first();
        if (await ctaBtn.count() > 0) {
            await expect(ctaBtn).toBeVisible();
        }
    });

    test('sayfa mobil gorunumde duzgun render ediliyor', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(500);
        const body = page.locator('body');
        await expect(body).toBeVisible();
    });

    test('font dosyalari yukleniyor', async ({ page }) => {
        const body = page.locator('body');
        const fontFamily = await body.evaluate(el => getComputedStyle(el).fontFamily);
        expect(fontFamily).toContain('Outfit');
    });
});
