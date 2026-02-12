import { test, expect } from '@playwright/test';

test('landing page has title', async ({ page }) => {
    // Assuming the app is served locally or we're checking the index.html file
    // For local file testing, we'd need the absolute path, but usually we test a URL.
    // Let's assume we'll test against a local server once started.
    // For now, this is a placeholder showing the syntax.

    await page.goto('http://localhost:5173'); // Vite/Dev server default

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/Yanımdaki/);
});
