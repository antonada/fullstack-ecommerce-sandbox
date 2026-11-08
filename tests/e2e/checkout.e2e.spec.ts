import { expect, test } from '../support/fixtures.ts';
import type { Page } from '@playwright/test';
import { shippingData } from '../support/factories.ts';

async function fillShipping(page: Page, values = shippingData()) {
  await page.getByTestId('field-fullName').fill(values.fullName);
  await page.getByTestId('field-address').fill(values.address);
  await page.getByTestId('field-city').fill(values.city);
  await page.getByTestId('field-postalCode').fill(values.postalCode);
}

test.describe('cart', () => {
  test('lines and the total come from a cart prepared through the API @smoke', async ({ signedInPage: page, shopper, newProduct }) => {
    const plant = await newProduct({ name: 'Cart test plant', priceCents: 2000 });
    const pot = await newProduct({ name: 'Cart test pot', priceCents: 550 });
    await shopper.api.post('/cart/items', { productId: plant.id, quantity: 2 });
    await shopper.api.post('/cart/items', { productId: pot.id, quantity: 1 });

    await page.goto('/cart');
    await expect(page.getByTestId('cart-line')).toHaveCount(2);
    await expect(page.getByTestId('cart-total')).toHaveText('$45.50');
    await expect(page.getByTestId('cart-count')).toHaveText('3');
  });

  test('plus and minus change the quantity and the total', async ({ signedInPage: page, shopper, newProduct }) => {
    const product = await newProduct({ name: 'Qty test plant', priceCents: 1000, stock: 5 });
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 1 });

    await page.goto('/cart');
    await page.getByRole('button', { name: 'Increase Qty test plant' }).click();
    await expect(page.getByTestId('line-qty')).toHaveText('2');
    await expect(page.getByTestId('cart-total')).toHaveText('$20.00');

    await page.getByRole('button', { name: 'Decrease Qty test plant' }).click();
    await expect(page.getByTestId('line-qty')).toHaveText('1');
  });

  test('the plus button stops at the stock and shows why', async ({ signedInPage: page, shopper, newProduct }) => {
    const product = await newProduct({ name: 'Limit test plant', stock: 1 });
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 1 });

    await page.goto('/cart');
    await page.getByRole('button', { name: 'Increase Limit test plant' }).click();
    await expect(page.getByTestId('cart-error')).toContainText('Only 1');
    await expect(page.getByTestId('line-qty')).toHaveText('1');
  });

  test('removing the last line shows the empty cart', async ({ signedInPage: page, shopper, newProduct }) => {
    const product = await newProduct();
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 1 });
    await page.goto('/cart');
    await page.getByTestId('remove-line').click();
    await expect(page.getByTestId('cart-empty')).toBeVisible();
  });

  test('adding from the shop updates the badge', async ({ signedInPage: page, newProduct }) => {
    await newProduct({ name: 'Badge test plant' });
    await page.goto('/?q=Badge test plant');
    await page.getByTestId('add-to-cart').click();
    await expect(page.getByTestId('cart-notice')).toHaveText('Badge test plant added to the cart');
    await expect(page.getByTestId('cart-count')).toHaveText('1');
  });
});

test.describe('checkout', () => {
  test('a full purchase ends on the confirmed order and lands in the history @smoke', async ({ signedInPage: page, shopper, newProduct }) => {
    const product = await newProduct({ name: 'Checkout test plant', priceCents: 1850, stock: 4 });
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 2 });

    await page.goto('/cart');
    await page.getByTestId('go-checkout').click();
    await expect(page.getByTestId('checkout-total')).toHaveText('$37.00');
    await fillShipping(page);
    await page.getByTestId('place-order').click();

    await expect(page.getByTestId('order-success')).toBeVisible();
    await expect(page.getByTestId('order-line')).toHaveText('2 x Checkout test plant ($18.50)');
    await expect(page.getByTestId('order-total')).toHaveText('$37.00');
    await expect(page.getByTestId('cart-count')).toHaveText('0');

    await page.getByRole('link', { name: 'Orders' }).click();
    await expect(page.getByTestId('order-row')).toHaveCount(1);
  });

  test('empty fields show an error under each input and nothing is sent', async ({ signedInPage: page, shopper, newProduct }) => {
    const product = await newProduct();
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 1 });
    let orderRequests = 0;
    page.on('request', (req) => req.url().endsWith('/api/orders') && req.method() === 'POST' && orderRequests++);

    await page.goto('/checkout');
    await page.getByTestId('place-order').click();
    for (const field of ['fullName', 'address', 'city', 'postalCode']) {
      await expect(page.getByTestId(`error-${field}`)).toBeVisible();
    }
    expect(orderRequests).toBe(0);
  });

  test('a postal code without the dash is rejected', async ({ signedInPage: page, shopper, newProduct }) => {
    const product = await newProduct();
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 1 });
    await page.goto('/checkout');
    await fillShipping(page, shippingData({ postalCode: '30001' }));
    await page.getByTestId('place-order').click();
    await expect(page.getByTestId('error-postalCode')).toHaveText('Use the format 12-345');
    await expect(page.getByTestId('error-city')).toHaveCount(0);
  });

  test('stock that ran out after the cart was filled blocks the order', async ({ signedInPage: page, shopper, admin, newProduct }) => {
    const product = await newProduct({ name: 'Last chance plant', stock: 3 });
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 3 });
    await page.goto('/checkout');
    await admin.patch(`/products/${product.id}`, { stock: 1 });

    await fillShipping(page);
    await page.getByTestId('place-order').click();
    await expect(page.getByTestId('checkout-error')).toHaveText('Only 1 of "Last chance plant" in stock');
    await expect(page).toHaveURL(/\/checkout$/);
    expect((await (await shopper.api.get('/orders')).json()).items).toEqual([]);
  });

  test('an empty cart cannot reach the checkout form', async ({ signedInPage: page }) => {
    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByTestId('cart-empty')).toBeVisible();
  });

  test('the place order button is disabled while the request runs', async ({ signedInPage: page, shopper, newProduct }) => {
    const product = await newProduct();
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 1 });
    await page.route('**/api/orders', async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.continue();
    });

    await page.goto('/checkout');
    await fillShipping(page);
    await page.getByTestId('place-order').click();
    await expect(page.getByTestId('place-order')).toBeDisabled();
    await expect(page.getByTestId('order-success')).toBeVisible();
  });

  test('an unknown order id shows an error', async ({ signedInPage: page }) => {
    await page.goto('/orders/00000000-0000-0000-0000-000000000000');
    await expect(page.getByTestId('order-error')).toHaveText('Order not found');
  });
});
