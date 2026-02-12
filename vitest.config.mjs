import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'happy-dom',
        globals: true,
        include: ['tests/unit/**/*.test.js'],
        reporters: ['default', ['allure-vitest/reporter', { resultsDir: 'allure-results' }]],
    },
});
