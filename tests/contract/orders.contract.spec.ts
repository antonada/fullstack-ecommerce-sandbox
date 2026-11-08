import { Order, OrderList } from '@shop/shared/schemas';
import { expect, expectApiError, matches, test } from '../support/fixtures.ts';
import { shippingData } from '../support/factories.ts';

test.describe('orders contract', () => {
  test('POST /orders 201 returns the confirmed order', async ({ shopper, newProduct }) => {
    const product = await newProduct({ priceCents: 999 });
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 3 });
    const res = await shopper.api.post('/orders', { shipping: shippingData() });
    expect(res.status()).toBe(201);
    const order = matches(Order, await res.json());
    expect(order.totalCents).toBe(2997);
    expect(order.userId).toBe(shopper.user.id);
  });

  test('POST /orders 400 for a bad postal code', async ({ shopper, newProduct }) => {
    const product = await newProduct();
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 1 });
    const res = await shopper.api.post('/orders', { shipping: shippingData({ postalCode: '30001' }) });
    const error = await expectApiError(res, 400, 'validation_error');
    expect(error.details?.[0].path).toBe('shipping.postalCode');
  });

  test('POST /orders 409 when the cart is empty', async ({ shopper }) => {
    await expectApiError(await shopper.api.post('/orders', { shipping: shippingData() }), 409, 'empty_cart');
  });

  test('POST /orders 401 without a token', async ({ anonymous }) => {
    await expectApiError(await anonymous.post('/orders', { shipping: shippingData() }), 401, 'unauthorized');
  });

  test('GET /orders 200 lists the orders of the user', async ({ shopper, newProduct }) => {
    const product = await newProduct();
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 1 });
    await shopper.api.post('/orders', { shipping: shippingData() });
    const res = await shopper.api.get('/orders');
    expect(res.status()).toBe(200);
    expect(matches(OrderList, await res.json()).items).toHaveLength(1);
  });

  test('GET /orders/{id} 200 returns one order', async ({ shopper, newProduct }) => {
    const product = await newProduct();
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 1 });
    const placed = matches(Order, await (await shopper.api.post('/orders', { shipping: shippingData() })).json());
    const res = await shopper.api.get(`/orders/${placed.id}`);
    expect(res.status()).toBe(200);
    expect(matches(Order, await res.json())).toEqual(placed);
  });

  test('GET /orders/{id} 404 for an unknown id', async ({ shopper }) => {
    await expectApiError(await shopper.api.get('/orders/missing'), 404, 'not_found');
  });

  test('GET /orders 401 without a token', async ({ anonymous }) => {
    await expectApiError(await anonymous.get('/orders'), 401, 'unauthorized');
  });
});
