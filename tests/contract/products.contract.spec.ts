import { Product, ProductList } from '@shop/shared/schemas';
import { expect, expectApiError, matches, test } from '../support/fixtures.ts';
import { productData } from '../support/factories.ts';

test.describe('products contract', () => {
  test('GET /products 200 returns a page of products', async ({ anonymous }) => {
    const res = await anonymous.get('/products');
    expect(res.status()).toBe(200);
    const body = matches(ProductList, await res.json());
    expect(body.items.length).toBeLessThanOrEqual(body.pageSize);
    expect(body.total).toBeGreaterThanOrEqual(body.items.length);
  });

  test('GET /products 400 for a page below 1', async ({ anonymous }) => {
    await expectApiError(await anonymous.get('/products?page=0'), 400, 'validation_error');
  });

  test('GET /products 400 for an unknown sort value', async ({ anonymous }) => {
    await expectApiError(await anonymous.get('/products?sort=rating'), 400, 'validation_error');
  });

  test('GET /products/{id} 200 returns one product', async ({ anonymous }) => {
    const res = await anonymous.get('/products/prod-001');
    expect(res.status()).toBe(200);
    expect(matches(Product, await res.json()).id).toBe('prod-001');
  });

  test('GET /products/{id} 404 for an unknown id', async ({ anonymous }) => {
    await expectApiError(await anonymous.get('/products/missing'), 404, 'not_found');
  });

  test('POST /products 201 as admin', async ({ admin }) => {
    const res = await admin.post('/products', productData());
    expect(res.status()).toBe(201);
    const created = matches(Product, await res.json());
    await admin.delete(`/products/${created.id}`);
  });

  test('POST /products 400 for a negative price', async ({ admin }) => {
    const res = await admin.post('/products', productData({ priceCents: -5 }));
    const error = await expectApiError(res, 400, 'validation_error');
    expect(error.details?.[0].path).toBe('priceCents');
  });

  test('POST /products 401 without a token', async ({ anonymous }) => {
    await expectApiError(await anonymous.post('/products', productData()), 401, 'unauthorized');
  });

  test('POST /products 403 for a customer', async ({ shopper }) => {
    await expectApiError(await shopper.api.post('/products', productData()), 403, 'forbidden');
  });

  test('PATCH /products/{id} 200 changes the given fields only', async ({ admin, newProduct }) => {
    const product = await newProduct();
    const res = await admin.patch(`/products/${product.id}`, { priceCents: 2500 });
    expect(res.status()).toBe(200);
    expect(matches(Product, await res.json())).toEqual({ ...product, priceCents: 2500 });
  });

  test('PATCH /products/{id} 400 for an empty body', async ({ admin, newProduct }) => {
    const product = await newProduct();
    await expectApiError(await admin.patch(`/products/${product.id}`, {}), 400, 'validation_error');
  });

  test('PATCH /products/{id} 404 for an unknown id', async ({ admin }) => {
    await expectApiError(await admin.patch('/products/missing', { stock: 1 }), 404, 'not_found');
  });

  test('DELETE /products/{id} 204 then 404', async ({ admin, newProduct }) => {
    const product = await newProduct();
    expect((await admin.delete(`/products/${product.id}`)).status()).toBe(204);
    await expectApiError(await admin.delete(`/products/${product.id}`), 404, 'not_found');
  });

  test('DELETE /products/{id} 403 for a customer', async ({ shopper }) => {
    await expectApiError(await shopper.api.delete('/products/prod-001'), 403, 'forbidden');
  });
});
