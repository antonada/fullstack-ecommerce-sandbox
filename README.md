# Full-stack e-commerce sandbox

[![CI](https://github.com/antonada/fullstack-ecommerce-sandbox/actions/workflows/ci.yml/badge.svg)](https://github.com/antonada/fullstack-ecommerce-sandbox/actions/workflows/ci.yml)
![Playwright](https://img.shields.io/badge/Playwright-1.65-45BA4B?logo=playwright&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![OpenAPI](https://img.shields.io/badge/OpenAPI-3.1-6BA539?logo=openapiinitiative&logoColor=white)

A small plant shop with its own backend and a test suite built around it. Testing a public site means living with changing pages and bot protection, so this repo ships the system under test too. Express serves a JWT protected REST API and a React storefront, and Playwright covers it on three levels: API contracts, business rules and the browser.

![UI tests running in Chromium](docs/media/demo.gif)

Full quality video: [docs/media/demo.mp4](docs/media/demo.mp4)

Everything starts with one command:

```bash
docker compose up --build --abort-on-container-exit --exit-code-from tests
```

That builds the shop, waits until it is healthy, runs all tests against it and stops. The exit code is the test result. The HTML report lands in `tests/playwright-report`.

## What's inside

| Part      | Stack                              | Notes                                                                         |
| --------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| `api/`    | Express 5, TypeScript, JWT, bcrypt | Auth, products, cart, orders. Data lives in memory and is seeded on boot      |
| `web/`    | React 19, Vite, react-router       | Catalog, cart, checkout, order history. Token is kept in `localStorage`       |
| `shared/` | Zod 4, zod-to-openapi              | Schemas used by the API, the UI and the tests, and the source of the API docs |
| `tests/`  | Playwright, TypeScript             | Contract, API and UI projects                                                 |

The API docs are generated from the same Zod schemas that validate requests, so they can't drift from the code. Swagger UI is on `/docs` and the raw document on `/api/openapi.json`.

## What the tests check

| Project      | Tests | What it does                                                                                             |
| ------------ | ----: | -------------------------------------------------------------------------------------------------------- |
| contract     |    45 | Parses every response with the Zod schema, success and each documented error. Validates the OpenAPI file |
| api          |    37 | Token checks (forged, expired, tampered), roles, cart and order rules, stock, pricing, search and paging |
| e2e-chromium |    27 | Search, filters, login, registration, cart, checkout, failed orders, expired session                     |
| e2e-firefox  |    27 | The same UI tests in Firefox                                                                             |

That is 136 runs. Each case has an ID in the [test plan](docs/TEST_PLAN.md) and the latest numbers are in the [test report](docs/TEST_REPORT.md).

## How the tests are built

Test data comes from the API, not from clicking. A fixture registers a fresh user through the `request` context, another one signs in as admin, and `newProduct()` creates a product and deletes it after the test. No test shares data with another one, so the files run in parallel.

UI tests skip the login form. The `signedInPage` fixture puts the user's JWT into `localStorage` before the page loads, and the cart is filled through the API. Only the login tests use the real form.

```ts
test('a full purchase ends on the confirmed order', async ({ signedInPage: page, shopper, newProduct }) => {
  const product = await newProduct({ name: 'Checkout test plant', priceCents: 1850, stock: 4 });
  await shopper.api.post('/cart/items', { productId: product.id, quantity: 2 });

  await page.goto('/cart');
  await page.getByTestId('go-checkout').click();
  await expect(page.getByTestId('checkout-total')).toHaveText('$37.00');
  // fill the shipping form, place the order
});
```

Contract checks use the schemas from `shared/`. If the API changes a field, the schema and the test fail together instead of the test silently following the code.

## Running without Docker

You need Node.js 22 or newer.

```bash
npm ci
npx playwright install chromium firefox
npm test              # builds the web app, starts the API and runs everything
```

Handy variants:

```bash
npm run test:smoke -w tests      # tests tagged @smoke
npm run test:contract -w tests   # one project
npm run demo:record -w tests     # slow motion run, rebuilds docs/media
npm run dev:api                  # API on :3000 with reload
npm run dev:web                  # Vite on :5173, proxies /api to :3000
npm run lint
npm run typecheck
```

Set `BASE_URL` to run the tests against a server that is already running. That server needs `ENABLE_TEST_ROUTES=true`, because the suite resets the seed data once at the start.

## Demo accounts

| Role     | Email              | Password     |
| -------- | ------------------ | ------------ |
| Admin    | admin@shop.test    | Admin123!    |
| Customer | customer@shop.test | Customer123! |

## Layout

```
api/src/            app, routes, in-memory store, JWT middleware
web/src/            pages, session context, API client
shared/src/         Zod schemas and the OpenAPI builder
tests/
  contract/         schema and OpenAPI checks
  api/              business rules and access control
  e2e/              browser tests
  support/          fixtures, client, data factories
docs/               test plan and test report
```

## CI

[`ci.yml`](.github/workflows/ci.yml) runs lint, type checks and a Prettier check, then starts the stack with Docker Compose and runs the suite. The HTML report is uploaded as an artifact and published to GitHub Pages from `main`:

https://antonada.github.io/fullstack-ecommerce-sandbox/

## Known limitations

- Data is in memory, so a restart brings back the seed. There is no database and no real payment.
- The JWT secret has a development default. Set `JWT_SECRET` for anything beyond a demo.
- WebKit is not in the browser matrix.

## License

MIT
