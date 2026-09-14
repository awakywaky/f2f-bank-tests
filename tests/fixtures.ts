import { test as base, expect, type APIRequestContext } from '@playwright/test';

export type TestUser = {
  name: string;
  surname: string;
  email: string;
  password: string;
};

export function generateUser(): TestUser {
  const unique = `${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: 'Test',
    surname: 'User',
    email: `qa.${unique}@example.com`,
    password: 'Password123!',
  };
}

export async function registerUser(request: APIRequestContext, user: TestUser) {
  const response = await request.post('/api/auth/register', { data: { ...user, role: 'user' } });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

export async function loginUser(request: APIRequestContext, user: Pick<TestUser, 'email' | 'password'>) {
  const response = await request.post('/api/auth/login', { data: user });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.token as string;
}

type Fixtures = {
  registeredUser: TestUser;
  authToken: string;
  authenticatedPage: import('@playwright/test').Page;
};

export const test = base.extend<Fixtures>({
  registeredUser: async ({ request }, use) => {
    const user = generateUser();
    await registerUser(request, user);
    await use(user);
  },

  authToken: async ({ request, registeredUser }, use) => {
    const token = await loginUser(request, registeredUser);
    await use(token);
  },

  authenticatedPage: async ({ page, authToken }, use) => {
    await page.context().addCookies([
      {
        name: 'access_token',
        value: authToken,
        url: 'http://localhost',
      },
    ]);
    await page.goto('/');
    await use(page);
  },
});

export { expect };
