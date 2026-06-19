import { test, expect } from '@playwright/test';

test.describe('Sync Plugin Settings', () => {
  test('shows setup form when not configured', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-plugin="verstak.sync"]');
    await page.click('[data-action="settings"]');

    await expect(page.locator('.sync-setup')).toBeVisible();
    await expect(page.locator('input[placeholder="https://example.com"]')).toBeVisible();
  });

  test('shows status when configured', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('verstak-sync-settings', JSON.stringify({
        serverUrl: 'https://sync.example.com',
        lastStatus: 'connected',
        deviceName: 'test-device'
      }));
    });

    await page.click('[data-plugin="verstak.sync"]');
    await page.click('[data-action="settings"]');

    await expect(page.locator('.sync-info')).toBeVisible();
    await expect(page.locator('.status-ok')).toBeVisible();
  });
});
