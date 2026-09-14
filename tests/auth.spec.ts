import { test, expect } from './fixtures';
import { generateUser, registerUser } from './fixtures';

test.describe('Регистрация', () => {
  test('успешная регистрация редиректит на страницу входа', async ({ page }) => {
    const user = generateUser();

    await page.goto('/register');
    await page.locator('input[name="name"]').fill(user.name);
    await page.locator('input[name="surname"]').fill(user.surname);
    await page.locator('input[type="email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page).toHaveURL('http://localhost/login');
  });

  test('регистрация с уже занятым email показывает ошибку', async ({ page, request }) => {
    const user = generateUser();
    await registerUser(request, user);

    await page.goto('/register');
    await page.locator('input[name="name"]').fill(user.name);
    await page.locator('input[name="surname"]').fill(user.surname);
    await page.locator('input[type="email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page.locator('.error')).toContainText('already exists');
    await expect(page).toHaveURL('http://localhost/register');
  });

  test('пустые обязательные поля блокируют отправку формы регистрации', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page).toHaveURL('http://localhost/register');
    await expect(page.locator('input[name="name"]')).toHaveJSProperty('validity.valid', false);
  });

  test('невалидный формат email блокирует отправку формы', async ({ page }) => {
    const user = generateUser();

    await page.goto('/register');
    await page.locator('input[name="name"]').fill(user.name);
    await page.locator('input[name="surname"]').fill(user.surname);
    await page.locator('input[type="email"]').fill('not-an-email');
    await page.locator('input[type="password"]').fill(user.password);
    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page).toHaveURL('http://localhost/register');
    await expect(page.locator('input[type="email"]')).toHaveJSProperty('validity.valid', false);
  });

  test('HTML-теги в имени экранируются, а не выполняются', async ({ page, request }) => {
    const user = generateUser();
    user.name = '<script>window.__xss = true</script>';
    await registerUser(request, user);

    await page.goto('/login');
    await page.locator('input[name="email"]').fill(user.email);
    await page.locator('input[name="password"]').fill(user.password);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL('http://localhost/');
    await page.goto('/profile');

    await expect(page.getByText(user.name)).toBeVisible();
    const xssExecuted = await page.evaluate(() => (window as unknown as { __xss?: boolean }).__xss);
    expect(xssExecuted).toBeUndefined();
  });
});

test.describe('Вход', () => {
  test('успешный вход ведёт на главную страницу', async ({ page, request }) => {
    const user = generateUser();
    await registerUser(request, user);

    await page.goto('/login');
    await page.locator('input[name="email"]').fill(user.email);
    await page.locator('input[name="password"]').fill(user.password);
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page).toHaveURL('http://localhost/');
    await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
  });

  test('вход с неверным паролем отклоняется', async ({ page, request }) => {
    const user = generateUser();
    await registerUser(request, user);

    await page.goto('/login');
    await page.locator('input[name="email"]').fill(user.email);
    await page.locator('input[name="password"]').fill('WrongPassword1!');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.locator('.snackbar')).toContainText('Login failed');
    await expect(page).toHaveURL('http://localhost/login');
  });

  test('вход с незарегистрированным email отклоняется', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[name="email"]').fill('no.such.user@example.com');
    await page.locator('input[name="password"]').fill('Password123!');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.locator('.snackbar')).toContainText('Login failed');
    await expect(page).toHaveURL('http://localhost/login');
  });

  test('пустые обязательные поля блокируют отправку формы входа', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page).toHaveURL('http://localhost/login');
    await expect(page.locator('input[name="email"]')).toHaveJSProperty('validity.valid', false);
  });
});

test.describe('Защита маршрутов', () => {
  for (const path of ['/', '/profile', '/transactions']) {
    test(`неавторизованный доступ к ${path} редиректит на страницу входа`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL('http://localhost/login');
    });
  }
});

test.describe('Сессия', () => {
  test('обновление страницы сохраняет сессию', async ({ authenticatedPage: page }) => {
    await page.goto('/transactions');
    await page.reload();

    await expect(page).toHaveURL('http://localhost/transactions');
    await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
  });
});
