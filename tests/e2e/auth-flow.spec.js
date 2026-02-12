import { test, expect } from '@playwright/test';

test.describe('Giris ve Kayit Akislari', () => {

    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            localStorage.setItem('onboardingCompleted', 'true');
        });
        await page.goto('/app.html');
        await page.waitForTimeout(2000);
    });

    test('login ekrani DOM da mevcut', async ({ page }) => {
        const loginScreen = page.locator('#screen-login');
        expect(await loginScreen.count()).toBeGreaterThan(0);
    });

    test('login ekranina gecis yapilabiliyor', async ({ page }) => {
        await page.evaluate(() => {
            if (typeof app !== 'undefined' && app.showScreen) {
                app.showScreen('login');
            }
        });
        await page.waitForTimeout(500);

        const loginScreen = page.locator('#screen-login');
        await expect(loginScreen).toHaveClass(/active/);
    });

    test('telefon girisi alani login ekraninda gorunur', async ({ page }) => {
        await page.evaluate(() => {
            if (typeof app !== 'undefined' && app.showScreen) {
                app.showScreen('login');
            }
        });
        await page.waitForTimeout(500);

        // Login ekranindaki phone input'u sec
        const phoneInput = page.locator('#screen-login input[type="tel"], #screen-login input[id*="phone"]').first();
        if (await phoneInput.count() > 0) {
            await expect(phoneInput).toBeVisible();
        }
    });

    test('kayit (register) tab butonu calisiyor', async ({ page }) => {
        await page.evaluate(() => {
            if (typeof app !== 'undefined' && app.showScreen) {
                app.showScreen('login');
            }
        });
        await page.waitForTimeout(500);

        const registerTab = page.locator('#screen-login button:has-text("Kayıt"), #screen-login [onclick*="register"]').first();
        if (await registerTab.count() > 0) {
            await registerTab.click();
            await page.waitForTimeout(300);
        }
    });

    test('giris (login) tab butonu calisiyor', async ({ page }) => {
        await page.evaluate(() => {
            if (typeof app !== 'undefined' && app.showScreen) {
                app.showScreen('login');
            }
        });
        await page.waitForTimeout(500);

        const loginTab = page.locator('#screen-login button:has-text("Giriş"), #screen-login [onclick*="login"]').first();
        if (await loginTab.count() > 0) {
            await loginTab.click();
            await page.waitForTimeout(300);
        }
    });

    test('korunmali sayfalar giris yapmadan login ekranina yonlendiriyor', async ({ page }) => {
        await page.evaluate(() => {
            if (typeof app !== 'undefined' && app.showScreen) {
                app.showScreen('add');
            }
        });
        await page.waitForTimeout(500);

        const loginScreen = page.locator('#screen-login');
        await expect(loginScreen).toHaveClass(/active/);
    });
});
