import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { ErrorRequestHandler } from 'express';
import swaggerUi from 'swagger-ui-express';
import { buildOpenApi } from '@shop/shared';
import { HttpError, notFound } from './errors.ts';
import { resetStore } from './store.ts';
import { authRouter } from './routes/auth.ts';
import { productsRouter } from './routes/products.ts';
import { cartRouter } from './routes/cart.ts';
import { ordersRouter } from './routes/orders.ts';

const here = path.dirname(fileURLToPath(import.meta.url));

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'validation_error', message: 'Body is not valid JSON' } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: 'internal', message: 'Something went wrong' } });
};

export function createApp() {
  resetStore();
  const app = express();
  const spec = buildOpenApi();

  const api = express.Router();
  api.use(express.json());
  api.get('/health', (_req, res) => void res.json({ status: 'ok' }));
  api.get('/openapi.json', (_req, res) => void res.json(spec));
  api.use('/auth', authRouter);
  api.use('/products', productsRouter);
  api.use('/cart', cartRouter);
  api.use('/orders', ordersRouter);

  if (process.env.ENABLE_TEST_ROUTES === 'true') {
    api.post('/test/reset', (_req, res) => {
      resetStore();
      res.status(204).end();
    });
  }
  api.use(() => {
    throw notFound('Route');
  });

  app.use('/api', api);
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));

  const webDist = process.env.WEB_DIST ?? path.resolve(here, '../../web/dist');
  if (existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get('/{*splat}', (_req, res) => void res.sendFile(path.join(webDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
