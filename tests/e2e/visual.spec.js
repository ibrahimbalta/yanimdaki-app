import { test, expect } from '@playwright/test';

test('Landing Page Görsel Karşılaştırma', async ({ page }) => {
    await page.goto('/');
    // Wait for animations to settle
    await page.waitForTimeout(2000);

    // Baseline ile karşılaştır
    await expect(page).toHaveScreenshot('landing-page.png', {
        fullPage: true
    });
});

test('App Ana Ekran Görsel Karşılaştırma', async ({ page }) => {
    await page.goto('/app.html');
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('app-main.png', {
        mask: [page.locator('#time-display'), page.locator('.dynamic-content')] // Değişken alanları maskele
    });
});
