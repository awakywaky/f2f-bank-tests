import { test, expect, generateUser } from './fixtures';

test.describe('Баг 1: валидация телефона пропускает буквы', () => {
  test('перевод на номер с буквами проходит успешно вместо ошибки', async ({ authenticatedPage: page, request }) => {
    await request.post('/api/users/balance/add', { data: { amount: 1000 } });
    await page.reload();

    await page.locator('input[name="phone"]').fill('+7abc9991234567');
    await page.locator('input[name="amount"]').fill('50');
    await page.locator('input[name="purpose"]').fill('letters in phone');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText('Transfer completed', { exact: true })).toBeVisible();
  });
});

test.describe('Баг 2: регистрация не валидирует сложность пароля', () => {
  test('пароль из одного символа принимается при регистрации', async ({ request }) => {
    const user = generateUser();
    user.password = '1';

    const response = await request.post('/api/auth/register', { data: { ...user, role: 'user' } });

    expect(response.status()).toBe(201);
  });

  test('пароль из одних пробелов принимается при регистрации', async ({ request }) => {
    const user = generateUser();
    user.password = '     ';

    const response = await request.post('/api/auth/register', { data: { ...user, role: 'user' } });

    expect(response.status()).toBe(201);
  });
});

test.describe('Баг 3: слишком длинные поля вызывают 500 вместо валидации', () => {
  test('имя длиннее ограничения БД возвращает 500 вместо 400', async ({ request }) => {
    const user = generateUser();
    user.name = 'a'.repeat(300);

    const response = await request.post('/api/auth/register', { data: { ...user, role: 'user' } });

    expect(response.status()).toBe(500);
  });
});

test.describe('Баг 4: перепутаны колонки в истории транзакций', () => {
  test('под заголовком "Operation Type" отображается статус, а не тип операции', async ({ authenticatedPage: page, request }) => {
    await request.post('/api/users/balance/add', { data: { amount: 100 } });
    await page.goto('/transactions');

    const firstRow = page.locator('tbody tr').first();
    const cells = firstRow.locator('td');

    await expect(cells.nth(2)).toHaveText('completed');
    await expect(cells.nth(3)).toHaveText('deposit');
  });
});

test.describe('Баг 5: невалидный токен возвращает нестандартный сырой ответ API', () => {
  test('невалидный токен возвращает 422 с нестандартным телом ответа', async ({ request }) => {
    const response = await request.get('/api/users/current', {
      headers: { Cookie: 'access_token=garbage.invalid.token' },
    });

    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body).toHaveProperty('error_type', 'JWTDecodeError');
  });

  test('UI при этом корректно редиректит на страницу входа', async ({ authenticatedPage: page }) => {
    await page.context().addCookies([{ name: 'access_token', value: 'garbage.invalid.token', url: 'http://localhost' }]);

    await page.goto('/transactions');

    await expect(page).toHaveURL('http://localhost/login');
  });
});

test.describe('Баг 6: двойной быстрый клик на "Отправить" приводит к двум списаниям', () => {
  test('синхронный двойной клик создаёт две транзакции вместо одной', async ({ authenticatedPage: page, request }) => {
    await request.post('/api/users/balance/add', { data: { amount: 1000 } });
    await page.reload();

    await page.locator('input[name="phone"]').fill('+7 999 123-45-67');
    await page.locator('input[name="amount"]').fill('50');
    await page.locator('input[name="purpose"]').fill('race condition test');

    await page.evaluate(() => {
      const button = document.querySelector('button.btn-primary') as HTMLButtonElement;
      button.click();
      button.click();
    });

    await expect(page.getByText('Transfer completed', { exact: true })).toBeVisible();

    const transactions = await (await request.get('/api/users/transactions')).json();
    const withdrawals = transactions.filter((t: { transaction_type: string }) => t.transaction_type === 'withdrawal');

    expect(withdrawals.length).toBe(2);
  });
});
