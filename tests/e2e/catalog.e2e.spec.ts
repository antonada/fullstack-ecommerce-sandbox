import { expect, test } from '../support/fixtures.ts';
import { uid } from '../support/factories.ts';

test.describe('catalog', () => {
  test('search narrows the list and keeps the term in the URL @smoke', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('search-input').fill('monstera');
    await expect(page.getByTestId('product-card')).toHaveCount(1);
    await expect(page.getByTestId('product-name')).toHaveText('Monstera Deliciosa');
    await expect(page).toHaveURL(/q=monstera/);
  });

  test('a search with no matches says so', async ({ page }) => {
    await page.goto('/?q=orchid');
    await expect(page.getByTestId('no-results')).toBeVisible();
    await expect(page.getByTestId('product-card')).toHaveCount(0);
  });

  test('category filter shows only that category', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('category-filter').selectOption('Pots');
    await expect(page.getByTestId('product-card')).toHaveCount(3);
    await expect(page.getByTestId('product-name')).toContainText([
      'Ceramic Pot 18 cm',
      'Hanging Planter',
      'Terracotta Pot 12 cm',
    ]);
  });

  test('sorting by price puts the cheapest plant first', async ({ page }) => {
    await page.goto('/?category=Plants&sort=price_asc');
    await expect(page.getByTestId('product-name').first()).toHaveText('Aloe Vera');
    await page.getByTestId('sort-select').selectOption('price_desc');
    await expect(page.getByTestId('product-name').first()).toHaveText('Fiddle Leaf Fig');
  });

  test('the pager moves between pages', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('page-info')).toContainText('Page 1 of');
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByRole('button', { name: 'Previous' })).toBeEnabled();
  });

  test('a sold out product cannot be added', async ({ page }) => {
    await page.goto('/?q=rubber');
    const card = page.getByTestId('product-card');
    await expect(card.getByTestId('product-stock')).toHaveText('Sold out');
    await expect(card.getByTestId('add-to-cart')).toBeDisabled();
  });

  test('a product created through the API shows up in the shop', async ({ page, newProduct }) => {
    const name = `Pilea ${uid()}`;
    await newProduct({ name, priceCents: 1234, stock: 2 });
    await page.goto(`/?q=${name}`);
    const card = page.getByTestId('product-card');
    await expect(card).toHaveCount(1);
    await expect(card.getByTestId('product-price')).toHaveText('$12.34');
    await expect(card.getByTestId('product-stock')).toHaveText('Only 2 left');
  });
});
