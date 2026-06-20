import { test, expect } from '@playwright/test';

// Walks the main flow against the live myshows SMD schema and records a video.
test('browse and call a JSON-RPC method', async ({ page }) => {
  await page.goto('/e2e/demo.html');

  // Setup screen: the SMD url is preconfigured; wait for it to validate.
  const createBtn = page.getByRole('button', { name: 'Create' });
  await expect(createBtn).toBeEnabled({ timeout: 30_000 });
  await page.waitForTimeout(500);
  await createBtn.click();

  // Sidebar with methods should appear.
  const methods = page.locator('.sb-sidebar a');
  await expect(methods.first()).toBeVisible({ timeout: 20_000 });
  const count = await methods.count();
  expect(count).toBeGreaterThan(0);
  await page.waitForTimeout(500);

  // No-match search shows an empty state.
  await page.getByLabel('Methods search').fill('zzz-no-such-method');
  await expect(page.getByText('No methods found')).toBeVisible();
  await page.waitForTimeout(500);

  // Search narrows the list (by name or description).
  const searchBox = page.getByLabel('Methods search');
  await searchBox.fill('list');
  await page.waitForTimeout(800);

  // Keyboard navigation: ArrowDown from the search box focuses the first method.
  await searchBox.focus();
  await searchBox.press('ArrowDown');
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.classList.contains('sb-sidebar__link')))
    .toBe(true);
  await page.waitForTimeout(300);

  // Open the first matching method.
  await page.locator('.sb-sidebar__link').first().click();
  await expect(page.locator('.sb-method-viewer__title').first()).toBeVisible();
  // Deep link reflects the selection.
  await expect.poll(() => page.url()).toContain('#/method/');
  await page.waitForTimeout(600);

  // Export the request as curl.
  await page.getByRole('button', { name: 'curl', exact: true }).click();
  await page.waitForTimeout(500);

  // Favorite the selected method (favorites group shows when search is empty).
  await page.getByLabel('Methods search').fill('');
  await page.waitForTimeout(300);
  await page.locator('.sb-sidebar__star').first().click();
  await expect(page.getByText('★ Favorites')).toBeVisible();
  await page.waitForTimeout(400);

  // Toggle dark theme.
  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect.poll(() => page.locator('html').getAttribute('data-bs-theme')).toBe('dark');
  await page.waitForTimeout(600);

  // Flip through the documentation tabs.
  await page.getByRole('tab', { name: 'Output' }).click();
  await page.waitForTimeout(500);
  await page.getByRole('tab', { name: 'Input' }).click();
  await page.waitForTimeout(500);

  // Best-effort: trigger a call to show request/response handling.
  const tryBtn = page.getByRole('button', { name: 'Try', exact: true }).first();
  if (await tryBtn.isVisible().catch(() => false)) {
    await tryBtn.click();
    await page.waitForTimeout(1500);
  }

  // History modal.
  await page.getByRole('button', { name: 'History' }).click();
  await expect(page.getByText('Request history')).toBeVisible();
  await page.waitForTimeout(800);
  await page.locator('.modal .btn-close').click();
  await page.waitForTimeout(400);

  // Settings modal.
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByText('Project settings')).toBeVisible();
  await page.waitForTimeout(800);
});

// Proves the OpenRPC -> SMD normalization works end-to-end on a live schema.
test('load an OpenRPC schema and browse a method', async ({ page }) => {
  await page.goto('/e2e/demo-openrpc.html');

  const createBtn = page.getByRole('button', { name: 'Create' });
  await expect(createBtn).toBeEnabled({ timeout: 30_000 });
  await page.waitForTimeout(500);
  await createBtn.click();

  const methods = page.locator('.sb-sidebar a');
  await expect(methods.first()).toBeVisible({ timeout: 20_000 });
  expect(await methods.count()).toBeGreaterThan(0);
  await page.waitForTimeout(400);

  await methods.first().click();
  await expect(page.locator('.sb-method-viewer__title').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Output' }).click();
  await page.waitForTimeout(800);
});
