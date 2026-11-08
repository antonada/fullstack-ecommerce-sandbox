import { expect, test } from '../support/fixtures.ts';
import { signToken, userData } from '../support/factories.ts';

test.describe('sign in and out', () => {
  test('signing in through the form shows the user name @smoke', async ({ page, shopper }) => {
    await page.goto('/login');
    await page.getByTestId('login-email').fill(shopper.email);
    await page.getByTestId('login-password').fill(shopper.password);
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('user-name')).toHaveText(shopper.user.name);
    expect(await page.evaluate(() => localStorage.getItem('shop.token'))).toBeTruthy();
  });

  test('a wrong password shows an error and keeps the user signed out', async ({ page, shopper }) => {
    await page.goto('/login');
    await page.getByTestId('login-email').fill(shopper.email);
    await page.getByTestId('login-password').fill('not-the-password');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('auth-error')).toHaveText('Wrong email or password');
    await expect(page.getByTestId('user-name')).toHaveCount(0);
  });

  test('registering signs the new user in', async ({ page }) => {
    const user = userData({ name: 'Maya Novak' });
    await page.goto('/register');
    await page.getByTestId('register-name').fill(user.name);
    await page.getByTestId('register-email').fill(user.email);
    await page.getByTestId('register-password').fill(user.password);
    await page.getByTestId('register-submit').click();
    await expect(page.getByTestId('user-name')).toHaveText('Maya Novak');
  });

  test('registration shows the server message for each bad field', async ({ page }) => {
    await page.goto('/register');
    await page.getByTestId('register-email').fill('not-an-email');
    await page.getByTestId('register-password').fill('short');
    await page.getByTestId('register-submit').click();
    await expect(page.getByText('Too small: expected string to have >=8 characters')).toBeVisible();
    await expect(page.getByTestId('user-name')).toHaveCount(0);
  });

  test('a visitor is sent to the login page and comes back to the cart after signing in', async ({ page, shopper }) => {
    await page.goto('/cart');
    await expect(page).toHaveURL(/\/login$/);
    await page.getByTestId('login-email').fill(shopper.email);
    await page.getByTestId('login-password').fill(shopper.password);
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/cart$/);
  });

  test('add to cart sends a visitor to the login page', async ({ page }) => {
    await page.goto('/?q=aloe');
    await page.getByTestId('add-to-cart').click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('signing out clears the token and the cart badge', async ({ signedInPage: page, shopper, newProduct }) => {
    const product = await newProduct();
    await shopper.api.post('/cart/items', { productId: product.id, quantity: 2 });
    await page.goto('/');
    await expect(page.getByTestId('cart-count')).toHaveText('2');

    await page.getByTestId('sign-out').click();
    await expect(page.getByTestId('cart-count')).toHaveText('0');
    expect(await page.evaluate(() => localStorage.getItem('shop.token'))).toBeNull();
  });

  test('an expired token sends the user to login with a message', async ({ page, shopper }) => {
    const expired = signToken(shopper.user.id, { expiresIn: -60 });
    await page.addInitScript((token) => localStorage.setItem('shop.token', token), expired);
    await page.goto('/cart');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId('session-expired')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('shop.token'))).toBeNull();
  });
});
