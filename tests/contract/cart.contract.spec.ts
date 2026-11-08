import { Cart } from '@shop/shared/schemas';
import { expect, expectApiError, matches, test } from '../support/fixtures.ts';

test.describe('cart contract', () => {
  test('GET /cart 200 is empty for a new user', async ({ shopper }) => {
    const res = await shopper.api.get('/cart');
    expect(res.status()).toBe(200);
    expect(matches(Cart, await res.json())).toEqual({ items: [], totalCents: 0 });
  });

  test('GET /cart 401 without a token', async ({ anonymous }) => {
    await expectApiError(await anonymous.get('/cart'), 401, 'unauthorized');
  });

  test('POST /cart/items 200 returns the updated cart', async ({ shopper, newProduct }) => {
    const product = await newProduct({ priceCents: 1200 });
    const res = await shopper.api.post('/cart/items', { productId: product.id, quantity: 2 });
    expect(res.status()).toBe(200);
    const cart = matches(Cart, await res.json());
    expect(cart.items).toHaveLength(1);
    expect(cart.totalCents).toBe(2400);
  });

  test('POST /cart/items 400 for quantity 0', async ({ shopper, newProduct }) => {
    const product = await newProduct();
    const res = await shopper.api.post('/cart/items', { productId: product.id, quantity: 0 });
    await expectApiError(res, 400, 'validation_error');
  });

  test('POST /cart/items 404 for an unknown product', async ({ shopper }) => {
    const res = await shopper.api.post('/cart/items', { productId: 'missing', quantity: 1 });
    await expectApiError(res, 404, 'not_found');
  });

  test('POST /cart/items 409 when the product is sold out', async ({ shopper }) => {
    const res = await shopper.api.post('/cart/items', { productId: 'prod-006', quantity: 1 });
    await expectApiError(res, 409, 'out_of_stock');
  });

  test('PATCH /cart/items/{productId} 200 sets the quantity', async ({ shopper, newProduct }) => {
    const product = await newProduct();
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 1 });
    const res = await shopper.api.patch(`/cart/items/${product.id}`, { quantity: 4 });
    expect(res.status()).toBe(200);
    expect(matches(Cart, await res.json()).items[0].quantity).toBe(4);
  });

  test('PATCH /cart/items/{productId} 404 when the line is not in the cart', async ({ shopper, newProduct }) => {
    const product = await newProduct();
    await expectApiError(await shopper.api.patch(`/cart/items/${product.id}`, { quantity: 1 }), 404, 'not_found');
  });

  test('PATCH /cart/items/{productId} 409 above the stock', async ({ shopper, newProduct }) => {
    const product = await newProduct({ stock: 2 });
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 1 });
    await expectApiError(await shopper.api.patch(`/cart/items/${product.id}`, { quantity: 3 }), 409, 'out_of_stock');
  });

  test('DELETE /cart/items/{productId} 200 returns the cart without the line', async ({ shopper, newProduct }) => {
    const product = await newProduct();
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 1 });
    const res = await shopper.api.delete(`/cart/items/${product.id}`);
    expect(res.status()).toBe(200);
    expect(matches(Cart, await res.json()).items).toEqual([]);
  });

  test('DELETE /cart/items/{productId} 404 when the line is missing', async ({ shopper }) => {
    await expectApiError(await shopper.api.delete('/cart/items/prod-001'), 404, 'not_found');
  });
});
