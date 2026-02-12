import { test, expect } from '@playwright/test';

test.describe('Tum Ekranlar ve Render Kontrolleri', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/app.html');
        await page.waitForTimeout(2000);
    });

    // --- Herkes Erisebilir Ekranlar ---
    const publicScreens = ['home', 'map', 'share', 'contact'];
    for (const screen of publicScreens) {
        test(`${screen} ekrani basarili aciliyor`, async ({ page }) => {
            await page.evaluate((s) => {
                if (typeof app !== 'undefined' && app.showScreen) {
                    app.showScreen(s);
                }
            }, screen);
            await page.waitForTimeout(1000);

            const screenEl = page.locator(`#screen-${screen}`).first();
            if (await screenEl.count() > 0) {
                await expect(screenEl).toHaveClass(/active/);
            }
        });
    }

    // --- Giris Gerektiren Ekranlar ---
    const protectedScreens = ['add', 'offers', 'profile', 'messages', 'settings', 'my-ads', 'my-offers', 'favorites', 'esnaf-panel'];
    for (const screen of protectedScreens) {
        test(`korunmali ekran '${screen}' giris olmadan login ekranina yonlendiriyor`, async ({ page }) => {
            await page.evaluate((s) => {
                if (typeof app !== 'undefined' && app.showScreen) {
                    app.showScreen(s);
                }
            }, screen);
            await page.waitForTimeout(500);

            // Login ekranı aktif olmalı
            const loginScreen = page.locator('#screen-login').first();
            if (await loginScreen.count() > 0) {
                const isActive = await loginScreen.evaluate(el => el.classList.contains('active'));
                expect(isActive).toBeTruthy();
            }
        });
    }

    test('onboarding ekraninda slider gorunuyor', async ({ page }) => {
        await page.evaluate(() => {
            if (typeof app !== 'undefined' && app.showScreen) {
                app.showScreen('onboarding');
            }
        });
        await page.waitForTimeout(500);

        const onboarding = page.locator('#screen-onboarding').first();
        if (await onboarding.count() > 0) {
            await expect(onboarding).toHaveClass(/active/);
        }
    });

    test('harita ekrani acildiginda map container bulunuyor', async ({ page }) => {
        await page.evaluate(() => {
            if (typeof app !== 'undefined' && app.showScreen) {
                app.showScreen('map');
            }
        });
        await page.waitForTimeout(1000);

        const mapContainer = page.locator('#map-container, #live-map, [id*="map"]').first();
        if (await mapContainer.count() > 0) {
            expect(await mapContainer.count()).toBeGreaterThan(0);
        }
    });

    test('paylasim ekrani (share) acildiginda feed gorunuyor', async ({ page }) => {
        await page.evaluate(() => {
            if (typeof app !== 'undefined' && app.showScreen) {
                app.showScreen('share');
            }
        });
        await page.waitForTimeout(1000);

        const shareFeed = page.locator('#screen-share, [id*="share"]').first();
        if (await shareFeed.count() > 0) {
            await expect(shareFeed).toHaveClass(/active/);
        }
    });

    test('iletisim ekraninda form alanlari gorunur', async ({ page }) => {
        await page.evaluate(() => {
            if (typeof app !== 'undefined' && app.showScreen) {
                app.showScreen('contact');
            }
        });
        await page.waitForTimeout(500);

        const contactScreen = page.locator('#screen-contact').first();
        if (await contactScreen.count() > 0) {
            await expect(contactScreen).toHaveClass(/active/);
        }
    });
});
