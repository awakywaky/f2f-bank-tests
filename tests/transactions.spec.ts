import { test, expect } from './fixtures';

test.describe('Транзакции и баланс', () => {
  test('пополнение увеличивает баланс и создаёт транзакцию', async ({ authenticatedPage: page, request }) => {
    const before = await (await request.get('/api/users/balance')).json();

    await page.goto('/transactions');
    await page.getByRole('button', { name: 'Add balance' }).click();
    await page.locator('input[name="balance"]').fill('500');
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Balance:' })).toHaveText(`Balance: ${before.amount + 500}`);

    const rows = page.locator('table tbody tr, tr');
    await expect(rows.first()).toBeVisible();
  });

  test('у нового пользователя история транзакций пуста', async ({ authenticatedPage: page }) => {
    await page.goto('/transactions');

    await expect(page.getByText('No transactions yet')).toBeVisible();
  });

  test('история отображает и пополнение, и списание', async ({ authenticatedPage: page, request }) => {
    await request.post('/api/users/balance/add', { data: { amount: 1000 } });
    await request.post('/api/users/transfer', {
      data: { phone: '+7 999 123-45-67', amount: 200, purpose: 'Test' },
    });

    await page.goto('/transactions');

    await expect(page.getByText('No transactions yet')).not.toBeVisible();
    const transactions = await (await request.get('/api/users/transactions')).json();
    expect(transactions.length).toBe(2);
  });

  test('отрицательная сумма пополнения отклоняется API', async ({ authenticatedPage: page, request }) => {
    const response = await request.post('/api/users/balance/add', { data: { amount: -100 } });
    expect(response.status()).toBe(400);
  });

  test('пополнение на 0 через UI не меняет баланс', async ({ authenticatedPage: page, request }) => {
    const before = await (await request.get('/api/users/balance')).json();

    await page.goto('/transactions');
    await page.getByRole('button', { name: 'Add balance' }).click();
    await page.locator('input[name="balance"]').fill('0');
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    await expect(page.locator('.modal-overlay')).toBeVisible();

    const after = await (await request.get('/api/users/balance')).json();
    expect(after.amount).toBe(before.amount);
  });
});
