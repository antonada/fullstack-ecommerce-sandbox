import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { z } from 'zod';
import { ApiError, AuthResponse, Product } from '@shop/shared/schemas';
import type { ProductT, UserT } from '@shop/shared/schemas';
import { client } from './client.ts';
import type { Client } from './client.ts';
import { adminLogin, productData, userData } from './factories.ts';

interface Shopper {
  api: Client;
  token: string;
  user: UserT;
  email: string;
  password: string;
}

interface Fixtures {
  anonymous: Client;
  shopper: Shopper;
  admin: Client;
  // creates a product through the admin API and removes it after the test
  newProduct: (overrides?: Partial<ReturnType<typeof productData>>) => Promise<ProductT>;
  // page that is already signed in as `shopper`, token placed in localStorage
  signedInPage: Page;
}

export const test = base.extend<Fixtures>({
  anonymous: async ({ request }, use) => {
    await use(client(request));
  },

  shopper: async ({ request }, use) => {
    const creds = userData();
    const res = await client(request).post('/auth/register', creds);
    expect(res.status()).toBe(201);
    const { token, user } = AuthResponse.parse(await res.json());
    await use({ api: client(request, token), token, user, email: creds.email, password: creds.password });
  },

  admin: async ({ request }, use) => {
    const res = await client(request).post('/auth/login', adminLogin);
    const { token } = AuthResponse.parse(await res.json());
    await use(client(request, token));
  },

  newProduct: async ({ admin }, use) => {
    const created: string[] = [];
    await use(async (overrides = {}) => {
      const res = await admin.post('/products', productData(overrides));
      expect(res.status()).toBe(201);
      const product = Product.parse(await res.json());
      created.push(product.id);
      return product;
    });
    for (const id of created) await admin.delete(`/products/${id}`);
  },

  signedInPage: async ({ page, shopper }, use) => {
    await page.addInitScript((token) => localStorage.setItem('shop.token', token), shopper.token);
    await use(page);
  },
});

export { expect };

// Parses the body with the shared Zod schema and fails with the list of issues
export function matches<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  expect(result.error?.issues ?? [], 'body does not match the schema').toEqual([]);
  return result.data as z.infer<T>;
}

export async function expectApiError(res: { status(): number; json(): Promise<unknown> }, status: number, code: string) {
  expect(res.status()).toBe(status);
  const body = matches(ApiError, await res.json());
  expect(body.error.code).toBe(code);
  return body.error;
}
