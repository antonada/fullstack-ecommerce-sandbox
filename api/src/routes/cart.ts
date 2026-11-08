import { Router } from 'express';
import type { Response } from 'express';
import { AddCartItemBody, UpdateCartItemBody } from '@shop/shared';
import type { CartT } from '@shop/shared';
import { db } from '../store.ts';
import { currentUser, requireAuth } from '../auth.ts';
import { HttpError, notFound } from '../errors.ts';
import { parse } from '../validate.ts';

export const cartRouter = Router();
cartRouter.use(requireAuth);

function cartOf(userId: string) {
  let cart = db.carts.get(userId);
  if (!cart) {
    cart = new Map();
    db.carts.set(userId, cart);
  }
  return cart;
}

export function cartView(userId: string): CartT {
  const items = [];
  for (const [productId, quantity] of cartOf(userId)) {
    const product = db.products.get(productId);
    if (!product) continue;
    items.push({
      productId,
      name: product.name,
      priceCents: product.priceCents,
      quantity,
      lineTotalCents: product.priceCents * quantity,
    });
  }
  return { items, totalCents: items.reduce((sum, i) => sum + i.lineTotalCents, 0) };
}

function checkStock(productName: string, stock: number, wanted: number) {
  if (wanted > stock) {
    throw new HttpError(409, 'out_of_stock', `Only ${stock} of "${productName}" in stock`);
  }
}

cartRouter.get('/', (_req, res: Response) => {
  res.json(cartView(currentUser(res).id));
});

cartRouter.post('/items', (req, res) => {
  const { productId, quantity } = parse(AddCartItemBody, req.body);
  const product = db.products.get(productId);
  if (!product) throw notFound('Product');

  const cart = cartOf(currentUser(res).id);
  const total = (cart.get(productId) ?? 0) + quantity;
  checkStock(product.name, product.stock, total);
  cart.set(productId, total);
  res.json(cartView(currentUser(res).id));
});

cartRouter.patch('/items/:productId', (req, res) => {
  const { quantity } = parse(UpdateCartItemBody, req.body);
  const cart = cartOf(currentUser(res).id);
  const product = db.products.get(String(req.params.productId));
  if (!product || !cart.has(product.id)) throw notFound('Cart item');

  checkStock(product.name, product.stock, quantity);
  cart.set(product.id, quantity);
  res.json(cartView(currentUser(res).id));
});

cartRouter.delete('/items/:productId', (req, res) => {
  const cart = cartOf(currentUser(res).id);
  if (!cart.delete(String(req.params.productId))) throw notFound('Cart item');
  res.json(cartView(currentUser(res).id));
});
