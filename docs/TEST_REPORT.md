# Test report

Latest full run on GitHub Actions. The interactive HTML report (steps, traces, screenshots) is published at
https://antonada.github.io/fullstack-ecommerce-sandbox/, and every run is listed on the
[Actions page](https://github.com/antonada/fullstack-ecommerce-sandbox/actions/workflows/ci.yml).

## Summary

|              |                                                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Date         | 8 November 2026                                                                                                                   |
| Commit       | `f40bb55`                                                                                                                         |
| CI run       | [#42498355628](https://github.com/antonada/fullstack-ecommerce-sandbox/actions/runs/42498355628)                                  |
| Environment  | GitHub Actions, `ubuntu-26.04`, Docker Compose (shop and test runner in separate containers), Node 22, Playwright 1.65, 2 workers |
| Result       | **136 passed**, 0 failed, 0 flaky, 0 skipped                                                                                      |
| Duration     | 26 s for the tests, about 2 min 45 s for the whole job including the image builds                                                 |
| Retries used | none (one retry is allowed in CI, no test needed it)                                                                              |

## Results by project

| Project      | Browser / client     |   Tests |  Passed | Failed |
| ------------ | -------------------- | ------: | ------: | -----: |
| contract     | Playwright `request` |      45 |      45 |      0 |
| api          | Playwright `request` |      37 |      37 |      0 |
| e2e-chromium | Desktop Chrome       |      27 |      27 |      0 |
| e2e-firefox  | Desktop Firefox      |      27 |      27 |      0 |
| **Total**    |                      | **136** | **136** |  **0** |

## Results by area

| Area                            | Spec                                       | Tests | Status |
| ------------------------------- | ------------------------------------------ | ----: | ------ |
| Auth contracts                  | `tests/contract/auth.contract.spec.ts`     |     8 | Passed |
| Product contracts               | `tests/contract/products.contract.spec.ts` |    14 | Passed |
| Cart contracts                  | `tests/contract/cart.contract.spec.ts`     |    11 | Passed |
| Order contracts                 | `tests/contract/orders.contract.spec.ts`   |     8 | Passed |
| OpenAPI document                | `tests/contract/openapi.contract.spec.ts`  |     4 | Passed |
| Accounts and tokens             | `tests/api/auth-flow.api.spec.ts`          |     7 | Passed |
| Token checks, roles             | `tests/api/permissions.api.spec.ts`        |     9 | Passed |
| Catalog queries                 | `tests/api/catalog.api.spec.ts`            |     6 | Passed |
| Cart rules                      | `tests/api/cart-rules.api.spec.ts`         |     7 | Passed |
| Order rules                     | `tests/api/orders-rules.api.spec.ts`       |     8 | Passed |
| Catalog UI (per browser)        | `tests/e2e/catalog.e2e.spec.ts`            |     7 | Passed |
| Sign in and out (per browser)   | `tests/e2e/auth.e2e.spec.ts`               |     8 | Passed |
| Cart and checkout (per browser) | `tests/e2e/checkout.e2e.spec.ts`           |    12 | Passed |

Case IDs and descriptions are in the [test plan](TEST_PLAN.md).

## Stability

Before the first push the suite was run three times locally, once with one worker and twice with four: 109 of 109 passed each time (contract, API and Chromium). I also broke the app on purpose twice. A cart total that was off by one made 12 tests fail. Stock that was not lowered after an order, together with a removed admin check, made 6 fail. So the checks do catch real regressions.

The CI run above needed no retries.

## Defects found

None open. Two things came up while building and were fixed:

- After placing an order the checkout page redirected back to the cart, because the cart had just been emptied. The page now remembers that the order went through.
- The first Compose setup named the app service `app`. Chromium forces https for hosts under the `.app` domain, so every UI test failed with an SSL error in CI. The service is now called `shop`.

## Known limitations

- Data is in memory and payments are not real.
- Firefox ran in CI only. The local sandbox used during development had just Chromium.
- WebKit is not in the matrix.
