import { expect, expectApiError, test } from '../support/fixtures.ts';
import { client } from '../support/client.ts';
import { productData, shippingData, signToken } from '../support/factories.ts';

test.describe('token checks', () => {
  test('a token signed with another secret is rejected', async ({ request, shopper }) => {
    const forged = signToken(shopper.user.id, { secret: 'not-the-secret' });
    const error = await expectApiError(await client(request, forged).get('/auth/me'), 401, 'unauthorized');
    expect(error.message).toBe('Invalid token');
  });

  test('an expired token is rejected with its own message', async ({ request, shopper }) => {
    const expired = signToken(shopper.user.id, { expiresIn: -60 });
    const error = await expectApiError(await client(request, expired).get('/cart'), 401, 'unauthorized');
    expect(error.message).toBe('Token expired');
  });

  test('a valid token for a user that does not exist is rejected', async ({ request }) => {
    const token = signToken('no-such-user');
    await expectApiError(await client(request, token).get('/auth/me'), 401, 'unauthorized');
  });

  test('a token with a changed payload fails the signature check', async ({ request, shopper }) => {
    const [header, , signature] = shopper.token.split('.');
    const payload = Buffer.from(JSON.stringify({ sub: 'user-admin', role: 'admin' })).toString('base64url');
    const tampered = `${header}.${payload}.${signature}`;
    await expectApiError(await client(request, tampered).post('/products', productData()), 401, 'unauthorized');
  });

  test('a header without the Bearer prefix is rejected', async ({ request, shopper }) => {
    const res = await request.get('/api/auth/me', { headers: { authorization: shopper.token } });
    await expectApiError(res, 401, 'unauthorized');
  });
});

test.describe('roles and ownership', () => {
  test('a customer cannot change or delete products', async ({ shopper }) => {
    await expectApiError(await shopper.api.patch('/products/prod-001', { stock: 999 }), 403, 'forbidden');
    await expectApiError(await shopper.api.delete('/products/prod-001'), 403, 'forbidden');
  });

  test('a role claim inside the token does not make a customer an admin', async ({ request, shopper }) => {
    const token = signToken(shopper.user.id, { role: 'admin' });
    const res = await client(request, token).post('/products', productData());
    await expectApiError(res, 403, 'forbidden');
  });

  test('carts are separate for each user', async ({ request, shopper, newProduct }) => {
    const product = await newProduct();
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 1 });

    const other = client(
      request,
      (
        await (
          await client(request).post('/auth/register', {
            email: `other-${Date.now()}@shop.test`,
            password: 'Passw0rd!',
            name: 'Other',
          })
        ).json()
      ).token,
    );
    expect((await (await other.get('/cart')).json()).items).toEqual([]);
  });

  test('another user gets 404 for an order that is not theirs', async ({ request, shopper, newProduct }) => {
    const product = await newProduct();
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 1 });
    const order = await (await shopper.api.post('/orders', { shipping: shippingData() })).json();

    const stranger = client(
      request,
      (
        await (
          await client(request).post('/auth/register', {
            email: `stranger-${Date.now()}@shop.test`,
            password: 'Passw0rd!',
            name: 'Stranger',
          })
        ).json()
      ).token,
    );
    await expectApiError(await stranger.get(`/orders/${order.id}`), 404, 'not_found');
    expect((await (await stranger.get('/orders')).json()).items).toEqual([]);
  });
});
