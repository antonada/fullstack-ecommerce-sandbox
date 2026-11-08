import { Router } from 'express';
import { CreateOrderBody } from '@shop/shared';
import type { OrderT } from '@shop/shared';
import { db, newId } from '../store.ts';
import { currentUser, requireAuth } from '../auth.ts';
import { HttpError, notFound } from '../errors.ts';
import { parse } from '../validate.ts';
import { cartView } from './cart.ts';

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

ordersRouter.post('/', (req, res) => {
  const { shipping } = parse(CreateOrderBody, req.body);
  const user = currentUser(res);
  const cart = cartView(user.id);
  if (cart.items.length === 0) throw new HttpError(409, 'empty_cart', 'Cart is empty');

  // check every line before touching stock so a failed order changes nothing
  for (const line of cart.items) {
    const product = db.products.get(line.productId)!;
    if (line.quantity > product.stock) {
      throw new HttpError(409, 'out_of_stock', `Only ${product.stock} of "${product.name}" in stock`);
    }
  }
  for (const line of cart.items) {
    const product = db.products.get(line.productId)!;
    db.products.set(product.id, { ...product, stock: product.stock - line.quantity });
  }

  const order: OrderT = {
    id: newId(),
    userId: user.id,
    items: cart.items.map(({ productId, name, priceCents, quantity }) => ({ productId, name, priceCents, quantity })),
    totalCents: cart.totalCents,
    status: 'confirmed',
    shipping,
    createdAt: new Date().toISOString(),
  };
  db.orders.set(order.id, order);
  db.carts.delete(user.id);
  res.status(201).json(order);
});

ordersRouter.get('/', (_req, res) => {
  const mine = [...db.orders.values()]
    .filter((o) => o.userId === currentUser(res).id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ items: mine });
});

ordersRouter.get('/:id', (req, res) => {
  const order = db.orders.get(String(req.params.id));
  if (!order || order.userId !== currentUser(res).id) throw notFound('Order');
  res.json(order);
});
