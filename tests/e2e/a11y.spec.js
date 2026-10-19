import { test, expect } from '@playwright/test';
const { injectAxe, checkA11y } = require('axe-playwright');

test.describe('Erişilebilirlik (a11y) Denetimleri', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await injectAxe(page);
    });

    test('Ana Sayfa WCAG 2.1 AA Uyumluluğu', async ({ page }) => {
        await checkA11y(page, null, {
            axeOptions: {
                runOnly: {
                    type: 'tag',
                    values: ['wcag2aa']
                }
            },
            detailedReport: true,
            detailedReportOptions: { html: true }
        });
    });

    test('App Ekranı Erişilebilirlik Denetimi', async ({ page }) => {
        await page.goto('/app.html');
        await injectAxe(page);
        await checkA11y(page);
    });

    test('Navigasyon Menüsü Klavye Erişimi', async ({ page }) => {
        await page.keyboard.press('Tab');
        const activeElement = await page.evaluate(() => document.activeElement.tagName);
        expect(activeElement).not.toBe('BODY');
    });
});
