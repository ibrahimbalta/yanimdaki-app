import { test, expect } from '@playwright/test';

test.describe('App Navigasyon ve Ekran Gecisleri', () => {

    test.beforeEach(async ({ page }) => {
        // Onboarding tamamlanmis olarak isaretle ki direkt home acilsin
        await page.addInitScript(() => {
            localStorage.setItem('onboardingCompleted', 'true');
            localStorage.setItem('activeScreen', 'home');
        });
        await page.goto('/app.html');
        await page.waitForTimeout(3000); // Firebase ve init tamamlansin
    });

    test('app.html basarili yukleniyor', async ({ page }) => {
        await expect(page).toHaveTitle(/Yanımdaki/);
    });

    test('alt navigasyon cubugu gorunur', async ({ page }) => {
        const nav = page.locator('#main-nav').first();
        await expect(nav).toBeVisible();
    });

    test('ana sayfa ekrani varsayilan olarak gorunur', async ({ page }) => {
        const homeScreen = page.locator('#screen-home');
        await expect(homeScreen).toHaveClass(/active/);
    });

    test('urun listesi alani DOM da mevcut', async ({ page }) => {
        const productList = page.locator('#product-list');
        expect(await productList.count()).toBeGreaterThan(0);
    });

    test('header bolumu gorunur', async ({ page }) => {
        const header = page.locator('header').first();
        await expect(header).toBeVisible();
    });

    test('arama cubugu islevsel', async ({ page }) => {
        const searchInput = page.locator('#main-search-input-field');
        if (await searchInput.count() > 0) {
            // Elementin gorunur olmasini bekle
            await expect(searchInput).toBeVisible();
            await searchInput.fill('test');
            const value = await searchInput.inputValue();
            expect(value).toBe('test');
        }
    });
});
