import { Order, OrderList, Product } from '@shop/shared/schemas';
import { expect, expectApiError, matches, test } from '../support/fixtures.ts';
import { shippingData } from '../support/factories.ts';

test.describe('order rules', () => {
  test('placing an order lowers the stock and empties the cart', async ({ shopper, anonymous, newProduct }) => {
    const product = await newProduct({ stock: 5 });
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 2 });
    expect((await shopper.api.post('/orders', { shipping: shippingData() })).status()).toBe(201);

    const after = matches(Product, await (await anonymous.get(`/products/${product.id}`)).json());
    expect(after.stock).toBe(3);
    expect((await (await shopper.api.get('/cart')).json()).items).toEqual([]);
  });

  test('the server prices the order from the catalog at the time of checkout', async ({
    shopper,
    admin,
    newProduct,
  }) => {
    const product = await newProduct({ priceCents: 1000 });
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 2 });
    await admin.patch(`/products/${product.id}`, { priceCents: 1200 });
    const order = matches(Order, await (await shopper.api.post('/orders', { shipping: shippingData() })).json());
    expect(order.totalCents).toBe(2400);
    expect(order.items[0].priceCents).toBe(1200);
  });

  test('a finished order keeps its prices when the catalog changes later', async ({ shopper, admin, newProduct }) => {
    const product = await newProduct({ priceCents: 1000 });
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 1 });
    const order = matches(Order, await (await shopper.api.post('/orders', { shipping: shippingData() })).json());
    await admin.patch(`/products/${product.id}`, { priceCents: 5000 });
    const again = matches(Order, await (await shopper.api.get(`/orders/${order.id}`)).json());
    expect(again.totalCents).toBe(1000);
  });

  test('a stock drop between cart and checkout fails the order and changes nothing', async ({
    shopper,
    admin,
    anonymous,
    newProduct,
  }) => {
    const product = await newProduct({ stock: 5 });
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 4 });
    await admin.patch(`/products/${product.id}`, { stock: 2 });

    await expectApiError(await shopper.api.post('/orders', { shipping: shippingData() }), 409, 'out_of_stock');

    const stock = matches(Product, await (await anonymous.get(`/products/${product.id}`)).json()).stock;
    expect(stock).toBe(2);
    expect((await (await shopper.api.get('/cart')).json()).items).toHaveLength(1);
    expect((await (await shopper.api.get('/orders')).json()).items).toEqual([]);
  });

  test('one short line fails the whole order, even when other lines are fine', async ({
    shopper,
    admin,
    anonymous,
    newProduct,
  }) => {
    const fine = await newProduct({ stock: 5 });
    const short = await newProduct({ stock: 5 });
    await shopper.api.post('/cart/items', { productId: fine.id, quantity: 1 });
    await shopper.api.post('/cart/items', { productId: short.id, quantity: 3 });
    await admin.patch(`/products/${short.id}`, { stock: 1 });

    await expectApiError(await shopper.api.post('/orders', { shipping: shippingData() }), 409, 'out_of_stock');
    expect(matches(Product, await (await anonymous.get(`/products/${fine.id}`)).json()).stock).toBe(5);
  });

  test('a second order with the same empty cart is refused', async ({ shopper, newProduct }) => {
    const product = await newProduct();
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 1 });
    await shopper.api.post('/orders', { shipping: shippingData() });
    await expectApiError(await shopper.api.post('/orders', { shipping: shippingData() }), 409, 'empty_cart');
  });

  test('orders are listed newest first', async ({ shopper, newProduct }) => {
    const product = await newProduct();
    const ids: string[] = [];
    for (const quantity of [1, 2]) {
      await shopper.api.post('/cart/items', { productId: product.id, quantity });
      ids.push((await (await shopper.api.post('/orders', { shipping: shippingData() })).json()).id);
      await new Promise((r) => setTimeout(r, 5));
    }
    const list = matches(OrderList, await (await shopper.api.get('/orders')).json());
    expect(list.items.map((o) => o.id)).toEqual(ids.reverse());
  });

  test('shipping fields are validated one by one', async ({ shopper, newProduct }) => {
    const product = await newProduct();
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 1 });
    const res = await shopper.api.post('/orders', {
      shipping: { fullName: 'A', address: '1', city: '', postalCode: 'abc' },
    });
    const error = await expectApiError(res, 400, 'validation_error');
    expect(error.details?.map((d) => d.path).sort()).toEqual([
      'shipping.address',
      'shipping.city',
      'shipping.fullName',
      'shipping.postalCode',
    ]);
  });
});
