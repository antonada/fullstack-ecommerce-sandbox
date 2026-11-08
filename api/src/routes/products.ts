import { Router } from 'express';
import { ProductBody, ProductListQuery, ProductPatch } from '@shop/shared';
import { db, newId } from '../store.ts';
import { requireAdmin } from '../auth.ts';
import { notFound } from '../errors.ts';
import { parse } from '../validate.ts';

export const productsRouter = Router();

productsRouter.get('/', (req, res) => {
  const { q, category, sort, page, pageSize } = parse(ProductListQuery, req.query);

  let items = [...db.products.values()];
  if (q) {
    const needle = q.toLowerCase();
    items = items.filter((p) => `${p.name} ${p.description}`.toLowerCase().includes(needle));
  }
  if (category) items = items.filter((p) => p.category.toLowerCase() === category.toLowerCase());

  items.sort((a, b) => {
    if (sort === 'price_asc') return a.priceCents - b.priceCents;
    if (sort === 'price_desc') return b.priceCents - a.priceCents;
    return a.name.localeCompare(b.name);
  });

  const start = (page - 1) * pageSize;
  res.json({ items: items.slice(start, start + pageSize), total: items.length, page, pageSize });
});

productsRouter.get('/:id', (req, res) => {
  const product = db.products.get(String(req.params.id));
  if (!product) throw notFound('Product');
  res.json(product);
});

productsRouter.post('/', requireAdmin, (req, res) => {
  const product = { id: newId(), ...parse(ProductBody, req.body) };
  db.products.set(product.id, product);
  res.status(201).json(product);
});

productsRouter.patch('/:id', requireAdmin, (req, res) => {
  const product = db.products.get(String(req.params.id));
  if (!product) throw notFound('Product');
  const updated = { ...product, ...parse(ProductPatch, req.body) };
  db.products.set(product.id, updated);
  res.json(updated);
});

productsRouter.delete('/:id', requireAdmin, (req, res) => {
  if (!db.products.delete(String(req.params.id))) throw notFound('Product');
  res.status(204).end();
});
