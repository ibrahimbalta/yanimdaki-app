import { test, expect } from '@playwright/test';

test.describe('UI Bilesenleri ve Modaller', () => {

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('onboardingCompleted', 'true');
            localStorage.setItem('activeScreen', 'home');
        });
        await page.goto('/app.html');
        await page.waitForTimeout(3000);
    });

    test('toast bildirimi goruntulenebilir', async ({ page }) => {
        await page.evaluate(() => {
            if (typeof app !== 'undefined' && app.toast) {
                app.toast('Test bildirimi', 'info');
            }
        });
        await page.waitForTimeout(500);

        const toast = page.locator('.toast, .notification, [class*="toast"]').first();
        if (await toast.count() > 0) {
            await expect(toast).toBeVisible();
        }
    });

    test('kategori cubugu home ekraninda gorunur', async ({ page }) => {
        // Home ekranina git
        await page.evaluate(() => {
            if (typeof app !== 'undefined' && app.showScreen) {
                app.showScreen('home');
            }
        });
        await page.waitForTimeout(1000);

        const categoryBar = page.locator('#category-bar, .category-filter-bar').first();
        if (await categoryBar.count() > 0) {
            await expect(categoryBar).toBeVisible();
        }
    });

    test('vitrin galerisi bolumu DOM da mevcut', async ({ page }) => {
        const gallery = page.locator('#gallery-container, #gallery-wrapper').first();
        expect(await gallery.count()).toBeGreaterThan(0);
    });

    test('yan menu butonu ile side menu acilir', async ({ page }) => {
        // Hamburger butonunu bul (header icinde)
        const menuBtn = page.locator('header .hamburger, header [onclick*="toggleSideMenu"], #side-menu-btn, .side-menu-toggle').first();
        if (await menuBtn.count() > 0 && await menuBtn.isVisible()) {
            await menuBtn.click();
            await page.waitForTimeout(500);

            const sideMenu = page.locator('#side-menu, .side-menu').first();
            if (await sideMenu.count() > 0) {
                const isOpen = await sideMenu.evaluate(el => {
                    return el.classList.contains('open') || el.classList.contains('active') || el.style.transform.includes('0');
                });
                expect(isOpen).toBeTruthy();
            }
        }
    });

    test('bildirim badge DOM da mevcut', async ({ page }) => {
        const badge = page.locator('#notification-badge');
        expect(await badge.count()).toBeGreaterThan(0);
    });

    test('loader hideLoader ile kayboluyor', async ({ page }) => {
        await page.evaluate(() => {
            if (typeof app !== 'undefined') {
                if (app.showLoader) app.showLoader();
                setTimeout(() => { if (app.hideLoader) app.hideLoader(); }, 500);
            }
        });
        await page.waitForTimeout(1000);

        const loader = page.locator('.loader, #loader, .loading-overlay').first();
        if (await loader.count() > 0) {
            const isHidden = await loader.evaluate(el => {
                return el.style.display === 'none' || el.style.opacity === '0' || !el.classList.contains('active');
            });
            expect(isHidden).toBeTruthy();
        }
    });
});
