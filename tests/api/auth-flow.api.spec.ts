import { User } from '@shop/shared/schemas';
import { expect, expectApiError, matches, test } from '../support/fixtures.ts';
import { adminLogin, userData } from '../support/factories.ts';

test.describe('accounts and tokens', () => {
  test('a token from register works on protected routes right away', async ({ shopper }) => {
    const me = matches(User, await (await shopper.api.get('/auth/me')).json());
    expect(me.email).toBe(shopper.email);
  });

  test('login ignores the case of the email', async ({ anonymous, shopper }) => {
    const res = await anonymous.post('/auth/login', { email: shopper.email.toUpperCase(), password: shopper.password });
    expect(res.status()).toBe(200);
  });

  test('registering the same email in another case is a conflict', async ({ anonymous, shopper }) => {
    const res = await anonymous.post('/auth/register', userData({ email: shopper.email.toUpperCase() }));
    await expectApiError(res, 409, 'conflict');
  });

  test('a seven character password is rejected', async ({ anonymous }) => {
    const res = await anonymous.post('/auth/register', userData({ password: '1234567' }));
    const error = await expectApiError(res, 400, 'validation_error');
    expect(error.details?.[0].path).toBe('password');
  });

  test('wrong password and unknown email get the same answer', async ({ anonymous, shopper }) => {
    const wrongPassword = await anonymous.post('/auth/login', { email: shopper.email, password: 'wrong-password' });
    const unknownEmail = await anonymous.post('/auth/login', { email: 'nobody@shop.test', password: 'wrong-password' });
    expect(wrongPassword.status()).toBe(401);
    expect(await wrongPassword.json()).toEqual(await unknownEmail.json());
  });

  test('the seeded admin signs in with the admin role', async ({ anonymous }) => {
    const res = await anonymous.post('/auth/login', adminLogin);
    expect((await res.json()).user.role).toBe('admin');
  });

  test('malformed JSON gets a 400 with an error body', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      headers: { 'content-type': 'application/json' },
      data: '{"email": ',
    });
    await expectApiError(res, 400, 'validation_error');
  });
});
