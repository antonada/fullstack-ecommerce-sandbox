import { ProductList } from '@shop/shared/schemas';
import { expect, matches, test } from '../support/fixtures.ts';
import { uid } from '../support/factories.ts';

test.describe('catalog queries', () => {
  test('search looks at the name and the description', async ({ anonymous, newProduct }) => {
    const word = `zz${uid()}`;
    const byName = await newProduct({ name: `Plant ${word}` });
    const byDescription = await newProduct({ description: `Grows well near ${word}` });
    await newProduct();

    const body = matches(ProductList, await (await anonymous.get(`/products?q=${word}`)).json());
    expect(body.items.map((p) => p.id).sort()).toEqual([byName.id, byDescription.id].sort());
    expect(body.total).toBe(2);
  });

  test('search ignores the case of the text', async ({ anonymous }) => {
    const body = await (await anonymous.get('/products?q=MONSTERA')).json();
    expect(body.items.map((p: { id: string }) => p.id)).toEqual(['prod-001']);
  });

  test('category filter ignores case and unknown categories give an empty page', async ({ anonymous }) => {
    const pots = await (await anonymous.get('/products?category=pots')).json();
    expect(pots.total).toBe(3);
    expect(pots.items.every((p: { category: string }) => p.category === 'Pots')).toBe(true);

    const none = await (await anonymous.get('/products?category=Furniture')).json();
    expect(none).toMatchObject({ items: [], total: 0 });
  });

  test('sorting by price works in both directions', async ({ anonymous }) => {
    const asc = (await (await anonymous.get('/products?category=Plants&sort=price_asc')).json()).items;
    const desc = (await (await anonymous.get('/products?category=Plants&sort=price_desc')).json()).items;
    const prices = asc.map((p: { priceCents: number }) => p.priceCents);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(desc.map((p: { id: string }) => p.id)).toEqual(asc.map((p: { id: string }) => p.id).reverse());
  });

  test('pages do not overlap and together cover the filtered list', async ({ anonymous }) => {
    const first = await (await anonymous.get('/products?category=Plants&pageSize=4&page=1')).json();
    const second = await (await anonymous.get('/products?category=Plants&pageSize=4&page=2')).json();
    const ids = [...first.items, ...second.items].map((p: { id: string }) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(first.items).toHaveLength(4);
    expect(ids).toHaveLength(first.total);
  });

  test('a page past the end is empty but still reports the total', async ({ anonymous }) => {
    const body = await (await anonymous.get('/products?category=Pots&pageSize=2&page=99')).json();
    expect(body.items).toEqual([]);
    expect(body.total).toBe(3);
  });
});
