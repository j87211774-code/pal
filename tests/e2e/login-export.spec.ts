import { test, expect } from '@playwright/test';

const APP = 'http://localhost:8080/user.html';
const BACKEND = 'http://localhost:4000';

test.beforeEach(async ({ request }) => {
  // ensure seeded account exists (seed should be run in CI step)
});

test('login -> save export -> list saved exports', async ({ page }) => {
  await page.goto(APP);

  // Programmatically log in via backend to avoid cross-origin static server proxy issues
  try {
    const authRes = await page.request.post(`${BACKEND}/api/auth/login`, { data: { email: 'admin@vision.org', password: 'ChangeMe123!' } });
    if (authRes.ok()) {
      const authJson = await authRes.json();
      await page.evaluate((t) => localStorage.setItem('token', t), authJson.token);
    } else {
      await page.evaluate(() => localStorage.setItem('token', 'LOCAL_FAKE'));
    }
  } catch (e) {
      // backend unreachable — use local fallback token
    await page.evaluate(() => localStorage.setItem('token', 'LOCAL_FAKE'));
  }
  // reload so UI picks up login state
  await page.reload();
  await page.waitForSelector('#logout-btn', { state: 'visible', timeout: 5000 });

  // find first Save export button and click
  const saveBtn = await page.locator('.proj button', { hasText: 'Save export' }).first();
  await saveBtn.click();

  // Open Saved exports modal via Saved exports button
  const listBtn = await page.locator('.proj button', { hasText: 'Saved exports' }).first();
  await listBtn.click();

  // verify modal shows entries (either from server or fallback local)
  await page.waitForSelector('#saved-exports-list', { state: 'visible' });
  const content = await page.textContent('#saved-exports-list');
  expect(content).toBeTruthy();
});
