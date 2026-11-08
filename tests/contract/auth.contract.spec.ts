import { AuthResponse, User } from '@shop/shared/schemas';
import { expect, expectApiError, matches, test } from '../support/fixtures.ts';
import { userData } from '../support/factories.ts';

test.describe('auth contract', () => {
  test('POST /auth/register 201 returns a token and a customer', async ({ anonymous }) => {
    const res = await anonymous.post('/auth/register', userData());
    expect(res.status()).toBe(201);
    const body = matches(AuthResponse, await res.json());
    expect(body.user.role).toBe('customer');
  });

  test('POST /auth/register 400 lists the invalid fields', async ({ anonymous }) => {
    const res = await anonymous.post('/auth/register', { email: 'nope', password: 'short', name: '' });
    const error = await expectApiError(res, 400, 'validation_error');
    expect(error.details?.map((d) => d.path).sort()).toEqual(['email', 'name', 'password']);
  });

  test('POST /auth/register 409 when the email is taken', async ({ anonymous, shopper }) => {
    const res = await anonymous.post('/auth/register', userData({ email: shopper.email }));
    await expectApiError(res, 409, 'conflict');
  });

  test('POST /auth/login 200 returns a token', async ({ anonymous, shopper }) => {
    const res = await anonymous.post('/auth/login', { email: shopper.email, password: shopper.password });
    expect(res.status()).toBe(200);
    matches(AuthResponse, await res.json());
  });

  test('POST /auth/login 401 for a wrong password', async ({ anonymous, shopper }) => {
    const res = await anonymous.post('/auth/login', { email: shopper.email, password: 'wrong-password' });
    await expectApiError(res, 401, 'unauthorized');
  });

  test('POST /auth/login 400 without a body', async ({ anonymous }) => {
    const res = await anonymous.post('/auth/login', {});
    await expectApiError(res, 400, 'validation_error');
  });

  test('GET /auth/me 200 returns the signed in user', async ({ shopper }) => {
    const res = await shopper.api.get('/auth/me');
    expect(res.status()).toBe(200);
    const body = matches(User, await res.json());
    expect(body.id).toBe(shopper.user.id);
  });

  test('GET /auth/me 401 without a token', async ({ anonymous }) => {
    await expectApiError(await anonymous.get('/auth/me'), 401, 'unauthorized');
  });
});
