import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import * as s from './schemas.ts';

type Method = 'get' | 'post' | 'patch' | 'delete';

export interface Operation {
  id: string;
  method: Method;
  path: string;
  summary: string;
  auth: 'none' | 'user' | 'admin';
  success: number;
  body?: z.ZodType;
  query?: z.ZodObject;
  response?: z.ZodType;
  errors: number[];
}

const idParam = z.object({ id: z.string() });
const productIdParam = z.object({ productId: z.string() });

export const operations: Operation[] = [
  { id: 'register', method: 'post', path: '/auth/register', summary: 'Create a customer account', auth: 'none', success: 201, body: s.RegisterBody, response: s.AuthResponse, errors: [400, 409] },
  { id: 'login', method: 'post', path: '/auth/login', summary: 'Sign in and get a JWT', auth: 'none', success: 200, body: s.LoginBody, response: s.AuthResponse, errors: [400, 401] },
  { id: 'me', method: 'get', path: '/auth/me', summary: 'Current user', auth: 'user', success: 200, response: s.User, errors: [401] },
  { id: 'listProducts', method: 'get', path: '/products', summary: 'Search and page through products', auth: 'none', success: 200, query: s.ProductListQuery, response: s.ProductList, errors: [400] },
  { id: 'getProduct', method: 'get', path: '/products/{id}', summary: 'Get one product', auth: 'none', success: 200, response: s.Product, errors: [404] },
  { id: 'createProduct', method: 'post', path: '/products', summary: 'Add a product (admin)', auth: 'admin', success: 201, body: s.ProductBody, response: s.Product, errors: [400, 401, 403] },
  { id: 'updateProduct', method: 'patch', path: '/products/{id}', summary: 'Change a product (admin)', auth: 'admin', success: 200, body: s.ProductPatch, response: s.Product, errors: [400, 401, 403, 404] },
  { id: 'deleteProduct', method: 'delete', path: '/products/{id}', summary: 'Remove a product (admin)', auth: 'admin', success: 204, errors: [401, 403, 404] },
  { id: 'getCart', method: 'get', path: '/cart', summary: 'Current cart', auth: 'user', success: 200, response: s.Cart, errors: [401] },
  { id: 'addCartItem', method: 'post', path: '/cart/items', summary: 'Add a product to the cart', auth: 'user', success: 200, body: s.AddCartItemBody, response: s.Cart, errors: [400, 401, 404, 409] },
  { id: 'updateCartItem', method: 'patch', path: '/cart/items/{productId}', summary: 'Change the quantity of a cart line', auth: 'user', success: 200, body: s.UpdateCartItemBody, response: s.Cart, errors: [400, 401, 404, 409] },
  { id: 'removeCartItem', method: 'delete', path: '/cart/items/{productId}', summary: 'Remove a cart line', auth: 'user', success: 200, response: s.Cart, errors: [401, 404] },
  { id: 'createOrder', method: 'post', path: '/orders', summary: 'Turn the cart into an order', auth: 'user', success: 201, body: s.CreateOrderBody, response: s.Order, errors: [400, 401, 409] },
  { id: 'listOrders', method: 'get', path: '/orders', summary: 'Orders of the current user', auth: 'user', success: 200, response: s.OrderList, errors: [401] },
  { id: 'getOrder', method: 'get', path: '/orders/{id}', summary: 'One order of the current user', auth: 'user', success: 200, response: s.Order, errors: [401, 404] },
];

const errorText: Record<number, string> = {
  400: 'Validation failed',
  401: 'Missing, invalid or expired token',
  403: 'Not allowed for this role',
  404: 'Not found',
  409: 'Conflict with the current state',
};

export function buildOpenApi() {
  const registry = new OpenAPIRegistry();
  registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });

  for (const op of operations) {
    const pathParams = op.path.includes('{productId}') ? productIdParam : op.path.includes('{id}') ? idParam : undefined;
    const responses: Record<string, unknown> = {
      [op.success]: op.response
        ? { description: 'Success', content: { 'application/json': { schema: op.response } } }
        : { description: 'Success, no content' },
    };
    for (const code of op.errors) {
      responses[code] = {
        description: errorText[code],
        content: { 'application/json': { schema: s.ApiError } },
      };
    }
    registry.registerPath({
      method: op.method,
      path: op.path,
      operationId: op.id,
      summary: op.summary,
      tags: [op.path.split('/')[1]],
      security: op.auth === 'none' ? [] : [{ bearerAuth: [] }],
      request: {
        params: pathParams,
        query: op.query,
        body: op.body ? { content: { 'application/json': { schema: op.body } } } : undefined,
      },
      responses,
    } as Parameters<typeof registry.registerPath>[0]);
  }

  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Shop API',
      version: '1.0.0',
      description: 'Small shop API used as a test target. Admin: admin@shop.test / Admin123!',
    },
    servers: [{ url: '/api' }],
  });
}
