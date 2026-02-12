import { test, expect } from '@playwright/test';

test.describe('Admin Panel Testleri', () => {

    test('admin.html basarili yukleniyor', async ({ page }) => {
        await page.goto('/admin.html');
        await expect(page).toHaveTitle(/./); // Herhangi bir baslik var mi
    });

    test('admin sayfasi DOM yapisi sağlam', async ({ page }) => {
        await page.goto('/admin.html');
        await page.waitForTimeout(2000);
        const body = page.locator('body');
        await expect(body).toBeVisible();
    });

    test('admin sayfasinda JavaScript hata icerikmiyor', async ({ page }) => {
        const errors = [];
        page.on('pageerror', (err) => errors.push(err.message));
        await page.goto('/admin.html');
        await page.waitForTimeout(3000);
        const criticalErrors = errors.filter(e =>
            !e.includes('Firebase') &&
            !e.includes('firebase') &&
            !e.includes('network') &&
            !e.includes('Failed to fetch')
        );
        expect(criticalErrors.length).toBe(0);
    });
});
