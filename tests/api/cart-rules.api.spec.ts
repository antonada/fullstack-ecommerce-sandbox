import { Cart } from '@shop/shared/schemas';
import { expect, expectApiError, matches, test } from '../support/fixtures.ts';

test.describe('cart rules', () => {
  test('adding the same product twice merges the lines', async ({ shopper, newProduct }) => {
    const product = await newProduct();
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 2 });
    const cart = matches(Cart, await (await shopper.api.post('/cart/items', { productId: product.id, quantity: 3 })).json());
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(5);
  });

  test('the total is the sum of price times quantity over all lines', async ({ shopper, newProduct }) => {
    const a = await newProduct({ priceCents: 1999 });
    const b = await newProduct({ priceCents: 350 });
    await shopper.api.post('/cart/items', { productId: a.id, quantity: 2 });
    const cart = matches(Cart, await (await shopper.api.post('/cart/items', { productId: b.id, quantity: 3 })).json());
    expect(cart.totalCents).toBe(2 * 1999 + 3 * 350);
  });

  test('adding more than the stock is refused and the cart keeps its old quantity', async ({ shopper, newProduct }) => {
    const product = await newProduct({ stock: 3 });
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 2 });
    const error = await expectApiError(await shopper.api.post('/cart/items', { productId: product.id, quantity: 2 }), 409, 'out_of_stock');
    expect(error.message).toContain('Only 3');
    const cart = matches(Cart, await (await shopper.api.get('/cart')).json());
    expect(cart.items[0].quantity).toBe(2);
  });

  test('a quantity of zero is not a valid update', async ({ shopper, newProduct }) => {
    const product = await newProduct();
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 1 });
    await expectApiError(await shopper.api.patch(`/cart/items/${product.id}`, { quantity: 0 }), 400, 'validation_error');
  });

  test('more than 20 of one product is not accepted', async ({ shopper, newProduct }) => {
    const product = await newProduct({ stock: 100 });
    await expectApiError(await shopper.api.post('/cart/items', { productId: product.id, quantity: 21 }), 400, 'validation_error');
  });

  test('a price change by the admin shows up in the cart', async ({ shopper, admin, newProduct }) => {
    const product = await newProduct({ priceCents: 1000 });
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 2 });
    await admin.patch(`/products/${product.id}`, { priceCents: 1500 });
    const cart = matches(Cart, await (await shopper.api.get('/cart')).json());
    expect(cart.totalCents).toBe(3000);
  });

  test('a product deleted by the admin disappears from the cart', async ({ shopper, admin, newProduct }) => {
    const product = await newProduct();
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 1 });
    await admin.delete(`/products/${product.id}`);
    const cart = matches(Cart, await (await shopper.api.get('/cart')).json());
    expect(cart).toEqual({ items: [], totalCents: 0 });
  });
});
