import { test, expect } from 'playwright/test';

test('Buckland Blocks loads without page, console or network failures', async ({ page }) => {
  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('requestfailed', request => failedRequests.push(`${request.url()} — ${request.failure()?.errorText}`));

  await page.goto(process.env.GAME_PATH || '/', { waitUntil: 'networkidle' });
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1);
  expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
  expect(failedRequests, failedRequests.join('\n')).toEqual([]);
});
