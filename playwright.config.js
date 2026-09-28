import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: { baseURL: process.env.GAME_BASE_URL || 'http://127.0.0.1:5000' },
  reporter: [['line'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
});
