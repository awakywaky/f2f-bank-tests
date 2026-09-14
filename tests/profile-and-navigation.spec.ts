import { test, expect } from './fixtures';

test.describe('Профиль', () => {
  test('профиль показывает корректные данные пользователя', async ({ authenticatedPage: page, registeredUser }) => {
    await page.goto('/profile');

    await expect(page.getByText(registeredUser.name)).toBeVisible();
    await expect(page.getByText(registeredUser.surname)).toBeVisible();
    await expect(page.getByText(registeredUser.email)).toBeVisible();
  });
});

test.describe('Навигация', () => {
  test('ссылки хедера ведут на соответствующие страницы', async ({ authenticatedPage: page }) => {
    await page.getByRole('link', { name: 'Profile' }).click();
    await expect(page).toHaveURL('http://localhost/profile');

    await page.getByRole('link', { name: 'Transactions' }).click();
    await expect(page).toHaveURL('http://localhost/transactions');

    await page.getByRole('link', { name: 'Main' }).click();
    await expect(page).toHaveURL('http://localhost/');
  });

  test('баланс в хедере обновляется после пополнения', async ({ authenticatedPage: page, request }) => {
    const before = await (await request.get('/api/users/balance')).json();

    await page.goto('/transactions');
    await page.getByRole('button', { name: 'Add balance' }).click();
    await page.locator('input[name="balance"]').fill('250');
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    await expect(page.getByRole('heading', { name: `Balance: ${before.amount + 250}` })).toBeVisible();
  });
});

test.describe('Логаут', () => {
  test('после логаута защищённые страницы снова требуют входа', async ({ authenticatedPage: page }) => {
    await page.locator('header').getByRole('button').click();

    await expect(page).toHaveURL('http://localhost/login');

    await page.goto('/');
    await expect(page).toHaveURL('http://localhost/login');
  });
});
