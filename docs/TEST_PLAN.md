# Test plan

The suite has three layers that share one running server. IDs below are stable, so a failing test in the report can be traced back here.

Test data rules: every test makes its own user and its own products, never touches the seeded catalog and never depends on test order. That is what lets the files run in parallel.

## Contract tests

Every response is parsed with the shared Zod schema, for the success status and for each documented error status.

### `tests/contract/auth.contract.spec.ts`

| ID    | Case                                                   | Smoke |
| ----- | ------------------------------------------------------ | :---: |
| CT-01 | POST /auth/register 201 returns a token and a customer |       |
| CT-02 | POST /auth/register 400 lists the invalid fields       |       |
| CT-03 | POST /auth/register 409 when the email is taken        |       |
| CT-04 | POST /auth/login 200 returns a token                   |       |
| CT-05 | POST /auth/login 401 for a wrong password              |       |
| CT-06 | POST /auth/login 400 without a body                    |       |
| CT-07 | GET /auth/me 200 returns the signed in user            |       |
| CT-08 | GET /auth/me 401 without a token                       |       |

### `tests/contract/cart.contract.spec.ts`

| ID    | Case                                                                 | Smoke |
| ----- | -------------------------------------------------------------------- | :---: |
| CT-09 | GET /cart 200 is empty for a new user                                |       |
| CT-10 | GET /cart 401 without a token                                        |       |
| CT-11 | POST /cart/items 200 returns the updated cart                        |       |
| CT-12 | POST /cart/items 400 for quantity 0                                  |       |
| CT-13 | POST /cart/items 404 for an unknown product                          |       |
| CT-14 | POST /cart/items 409 when the product is sold out                    |       |
| CT-15 | PATCH /cart/items/{productId} 200 sets the quantity                  |       |
| CT-16 | PATCH /cart/items/{productId} 404 when the line is not in the cart   |       |
| CT-17 | PATCH /cart/items/{productId} 409 above the stock                    |       |
| CT-18 | DELETE /cart/items/{productId} 200 returns the cart without the line |       |
| CT-19 | DELETE /cart/items/{productId} 404 when the line is missing          |       |

### `tests/contract/openapi.contract.spec.ts`

| ID    | Case                                                                      | Smoke |
| ----- | ------------------------------------------------------------------------- | :---: |
| CT-20 | is a valid OpenAPI 3.1 document                                           |       |
| CT-21 | documents every operation with its success and error statuses             |       |
| CT-22 | marks protected operations with the bearer scheme and public ones without |       |
| CT-23 | swagger ui is served on /docs                                             |       |

### `tests/contract/orders.contract.spec.ts`

| ID    | Case                                         | Smoke |
| ----- | -------------------------------------------- | :---: |
| CT-24 | POST /orders 201 returns the confirmed order |       |
| CT-25 | POST /orders 400 for a bad postal code       |       |
| CT-26 | POST /orders 409 when the cart is empty      |       |
| CT-27 | POST /orders 401 without a token             |       |
| CT-28 | GET /orders 200 lists the orders of the user |       |
| CT-29 | GET /orders/{id} 200 returns one order       |       |
| CT-30 | GET /orders/{id} 404 for an unknown id       |       |
| CT-31 | GET /orders 401 without a token              |       |

### `tests/contract/products.contract.spec.ts`

| ID    | Case                                                   | Smoke |
| ----- | ------------------------------------------------------ | :---: |
| CT-32 | GET /products 200 returns a page of products           |       |
| CT-33 | GET /products 400 for a page below 1                   |       |
| CT-34 | GET /products 400 for an unknown sort value            |       |
| CT-35 | GET /products/{id} 200 returns one product             |       |
| CT-36 | GET /products/{id} 404 for an unknown id               |       |
| CT-37 | POST /products 201 as admin                            |       |
| CT-38 | POST /products 400 for a negative price                |       |
| CT-39 | POST /products 401 without a token                     |       |
| CT-40 | POST /products 403 for a customer                      |       |
| CT-41 | PATCH /products/{id} 200 changes the given fields only |       |
| CT-42 | PATCH /products/{id} 400 for an empty body             |       |
| CT-43 | PATCH /products/{id} 404 for an unknown id             |       |
| CT-44 | DELETE /products/{id} 204 then 404                     |       |
| CT-45 | DELETE /products/{id} 403 for a customer               |       |

## API tests

Business rules and access control, checked on the HTTP level. Test data is created through the admin API.

### `tests/api/auth-flow.api.spec.ts`

| ID     | Case                                                       | Smoke |
| ------ | ---------------------------------------------------------- | :---: |
| API-01 | a token from register works on protected routes right away |       |
| API-02 | login ignores the case of the email                        |       |
| API-03 | registering the same email in another case is a conflict   |       |
| API-04 | a seven character password is rejected                     |       |
| API-05 | wrong password and unknown email get the same answer       |       |
| API-06 | the seeded admin signs in with the admin role              |       |
| API-07 | malformed JSON gets a 400 with an error body               |       |

### `tests/api/cart-rules.api.spec.ts`

| ID     | Case                                                                      | Smoke |
| ------ | ------------------------------------------------------------------------- | :---: |
| API-08 | adding the same product twice merges the lines                            |       |
| API-09 | the total is the sum of price times quantity over all lines               |       |
| API-10 | adding more than the stock is refused and the cart keeps its old quantity |       |
| API-11 | a quantity of zero is not a valid update                                  |       |
| API-12 | more than 20 of one product is not accepted                               |       |
| API-13 | a price change by the admin shows up in the cart                          |       |
| API-14 | a product deleted by the admin disappears from the cart                   |       |

### `tests/api/catalog.api.spec.ts`

| ID     | Case                                                                   | Smoke |
| ------ | ---------------------------------------------------------------------- | :---: |
| API-15 | search looks at the name and the description                           |       |
| API-16 | search ignores the case of the text                                    |       |
| API-17 | category filter ignores case and unknown categories give an empty page |       |
| API-18 | sorting by price works in both directions                              |       |
| API-19 | pages do not overlap and together cover the filtered list              |       |
| API-20 | a page past the end is empty but still reports the total               |       |

### `tests/api/orders-rules.api.spec.ts`

| ID     | Case                                                                       | Smoke |
| ------ | -------------------------------------------------------------------------- | :---: |
| API-21 | placing an order lowers the stock and empties the cart                     |       |
| API-22 | the server prices the order from the catalog at the time of checkout       |       |
| API-23 | a finished order keeps its prices when the catalog changes later           |       |
| API-24 | a stock drop between cart and checkout fails the order and changes nothing |       |
| API-25 | one short line fails the whole order, even when other lines are fine       |       |
| API-26 | a second order with the same empty cart is refused                         |       |
| API-27 | orders are listed newest first                                             |       |
| API-28 | shipping fields are validated one by one                                   |       |

### `tests/api/permissions.api.spec.ts`

| ID     | Case                                                            | Smoke |
| ------ | --------------------------------------------------------------- | :---: |
| API-29 | a token signed with another secret is rejected                  |       |
| API-30 | an expired token is rejected with its own message               |       |
| API-31 | a valid token for a user that does not exist is rejected        |       |
| API-32 | a token with a changed payload fails the signature check        |       |
| API-33 | a header without the Bearer prefix is rejected                  |       |
| API-34 | a customer cannot change or delete products                     |       |
| API-35 | a role claim inside the token does not make a customer an admin |       |
| API-36 | carts are separate for each user                                |       |
| API-37 | another user gets 404 for an order that is not theirs           |       |

## UI tests

Run in Chromium and Firefox. Carts and users are prepared through the API, the browser only does what a customer does.

### `tests/e2e/auth.e2e.spec.ts`

| ID    | Case                                                                            | Smoke |
| ----- | ------------------------------------------------------------------------------- | :---: |
| UI-01 | signing in through the form shows the user name                                 |  yes  |
| UI-02 | a wrong password shows an error and keeps the user signed out                   |       |
| UI-03 | registering signs the new user in                                               |       |
| UI-04 | registration shows the server message for each bad field                        |       |
| UI-05 | a visitor is sent to the login page and comes back to the cart after signing in |       |
| UI-06 | add to cart sends a visitor to the login page                                   |       |
| UI-07 | signing out clears the token and the cart badge                                 |       |
| UI-08 | an expired token sends the user to login with a message                         |       |

### `tests/e2e/catalog.e2e.spec.ts`

| ID    | Case                                                   | Smoke |
| ----- | ------------------------------------------------------ | :---: |
| UI-09 | search narrows the list and keeps the term in the URL  |  yes  |
| UI-10 | a search with no matches says so                       |       |
| UI-11 | category filter shows only that category               |       |
| UI-12 | sorting by price puts the cheapest plant first         |       |
| UI-13 | the pager moves between pages                          |       |
| UI-14 | a sold out product cannot be added                     |       |
| UI-15 | a product created through the API shows up in the shop |       |

### `tests/e2e/checkout.e2e.spec.ts`

| ID    | Case                                                                 | Smoke |
| ----- | -------------------------------------------------------------------- | :---: |
| UI-16 | lines and the total come from a cart prepared through the API        |  yes  |
| UI-17 | plus and minus change the quantity and the total                     |       |
| UI-18 | the plus button stops at the stock and shows why                     |       |
| UI-19 | removing the last line shows the empty cart                          |       |
| UI-20 | adding from the shop updates the badge                               |       |
| UI-21 | a full purchase ends on the confirmed order and lands in the history |  yes  |
| UI-22 | empty fields show an error under each input and nothing is sent      |       |
| UI-23 | a postal code without the dash is rejected                           |       |
| UI-24 | stock that ran out after the cart was filled blocks the order        |       |
| UI-25 | an empty cart cannot reach the checkout form                         |       |
| UI-26 | the place order button is disabled while the request runs            |       |
| UI-27 | an unknown order id shows an error                                   |       |
