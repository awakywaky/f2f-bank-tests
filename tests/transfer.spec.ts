import { test, expect } from './fixtures';

test.describe('Перевод по номеру телефона', () => {
  test('успешный перевод при достаточном балансе списывает средства', async ({ authenticatedPage: page, request }) => {
    await request.post('/api/users/balance/add', { data: { amount: 1000 } });
    await page.reload();

    await page.locator('input[name="phone"]').fill('+7 999 123-45-67');
    await page.locator('input[name="amount"]').fill('300');
    await page.locator('input[name="purpose"]').fill('Test transfer');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText('Transfer completed', { exact: true })).toBeVisible();

    const balance = await request.get('/api/users/balance');
    expect((await balance.json()).amount).toBe(700);
  });

  test('перевод при недостаточном балансе не проходит', async ({ authenticatedPage: page, request }) => {
    const before = await (await request.get('/api/users/balance')).json();

    await page.locator('input[name="phone"]').fill('+7 999 123-45-67');
    await page.locator('input[name="amount"]').fill(String(before.amount + 1000));
    await page.locator('input[name="purpose"]').fill('Test transfer');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.locator('.snackbar')).toContainText('Transfer failed');

    const after = await (await request.get('/api/users/balance')).json();
    expect(after.amount).toBe(before.amount);
  });

  test('телефон без "+" блокируется валидацией', async ({ authenticatedPage: page }) => {
    await page.locator('input[name="phone"]').fill('79991234567');
    await page.locator('input[name="amount"]').fill('100');
    await page.locator('input[name="purpose"]').fill('Test transfer');
    await page.locator('input[name="phone"]').blur();

    await expect(page.getByText('Must start with + and country code')).toBeVisible();
  });

  test('слишком короткий номер телефона блокируется валидацией', async ({ authenticatedPage: page }) => {
    await page.locator('input[name="phone"]').fill('+7999');
    await page.locator('input[name="amount"]').fill('100');
    await page.locator('input[name="purpose"]').fill('Test transfer');
    await page.locator('input[name="phone"]').blur();

    await expect(page.getByText('Phone must contain 10')).toBeVisible();
  });

  test('сумма перевода 0 блокируется', async ({ authenticatedPage: page, request }) => {
    await request.post('/api/users/balance/add', { data: { amount: 1000 } });

    await page.locator('input[name="phone"]').fill('+7 999 123-45-67');
    await page.locator('input[name="amount"]').fill('0');
    await page.locator('input[name="purpose"]').fill('Test transfer');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.locator('.snackbar')).toContainText('Amount must be greater than zero');
    await expect(page.getByText('Transfer completed')).not.toBeVisible();
  });

  test('пустое назначение платежа блокирует отправку формы', async ({ authenticatedPage: page, request }) => {
    await request.post('/api/users/balance/add', { data: { amount: 1000 } });

    await page.locator('input[name="phone"]').fill('+7 999 123-45-67');
    await page.locator('input[name="amount"]').fill('100');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText('Transfer completed', { exact: true })).not.toBeVisible();
    await expect(page.locator('input[name="purpose"]')).toHaveJSProperty('validity.valid', false);
  });

  test('отрицательная сумма перевода блокируется', async ({ authenticatedPage: page, request }) => {
    await request.post('/api/users/balance/add', { data: { amount: 1000 } });

    await page.locator('input[name="phone"]').fill('+7 999 123-45-67');
    await page.locator('input[name="amount"]').fill('-100');
    await page.locator('input[name="purpose"]').fill('Test transfer');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText('Transfer completed', { exact: true })).not.toBeVisible();

    const balance = await (await request.get('/api/users/balance')).json();
    expect(balance.amount).toBe(1000);
  });

  test('телефон из 10 цифр (нижняя граница) принимается', async ({ authenticatedPage: page, request }) => {
    await request.post('/api/users/balance/add', { data: { amount: 1000 } });
    await page.reload();

    await page.locator('input[name="phone"]').fill('+1234567890');
    await page.locator('input[name="amount"]').fill('10');
    await page.locator('input[name="purpose"]').fill('boundary 10 digits');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText('Transfer completed', { exact: true })).toBeVisible();
  });

  test('телефон из 15 цифр (верхняя граница) принимается', async ({ authenticatedPage: page, request }) => {
    await request.post('/api/users/balance/add', { data: { amount: 1000 } });
    await page.reload();

    await page.locator('input[name="phone"]').fill('+123456789012345');
    await page.locator('input[name="amount"]').fill('10');
    await page.locator('input[name="purpose"]').fill('boundary 15 digits');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText('Transfer completed', { exact: true })).toBeVisible();
  });

  test('телефон из 16 цифр (за верхней границей) блокируется валидацией', async ({ authenticatedPage: page }) => {
    await page.locator('input[name="phone"]').fill('+1234567890123456');
    await page.locator('input[name="amount"]').fill('10');
    await page.locator('input[name="purpose"]').fill('boundary 16 digits');
    await page.locator('input[name="phone"]').blur();

    await expect(page.getByText('Phone must contain 10')).toBeVisible();
  });
});
