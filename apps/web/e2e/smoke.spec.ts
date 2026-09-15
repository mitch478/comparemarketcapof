import { expect, test } from '@playwright/test';

test('home → pick pair → comparison page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Compare market cap');

  // Open picker A and search by symbol
  await page.getByRole('button', { name: /Asset to reprice/ }).click();
  const box = page.getByRole('combobox', { name: /Asset to reprice/ });
  await expect(box).toBeFocused();
  await box.fill('eth');
  const option = page.getByRole('option', { name: /Ethereum/ }).first();
  await expect(option).toBeVisible();
  await option.click();

  await page.waitForURL(/\/ethereum\/with-the-market-cap-of\/bitcoin$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ethereum with the market cap of Bitcoin');
  const price = page.locator('[data-implied-price]');
  await expect(price).toContainText('$');
  await expect(price).not.toContainText(/NaN|undefined/);
});

test('keyboard-only picker', async ({ page }) => {
  await page.goto('/solana/with-the-market-cap-of/bitcoin');
  await page.getByRole('button', { name: /Market cap to use/ }).focus();
  await page.keyboard.press('Enter');
  const box = page.getByRole('combobox', { name: /Market cap to use/ });
  await expect(box).toBeFocused();
  await box.fill('tether');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/solana\/with-the-market-cap-of\/tether$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Solana with the market cap of Tether');
});

test('hub, index, 404 and same-asset redirect', async ({ page }) => {
  await page.goto('/solana');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Solana');
  await page.goto('/coins');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('cryptocurrencies by market cap');
  const res404 = await page.goto('/not-a-coin');
  expect(res404?.status()).toBe(404);
  await page.goto('/bitcoin/with-the-market-cap-of/bitcoin');
  await expect(page).toHaveURL(/\/bitcoin$/);
});
