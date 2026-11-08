import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { ProductT, ShippingT, OrderT } from '@shop/shared';

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'admin';
  passwordHash: string;
}

export const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);

export const db = {
  users: new Map<string, UserRecord>(),
  products: new Map<string, ProductT>(),
  carts: new Map<string, Map<string, number>>(),
  orders: new Map<string, OrderT>(),
};

const seedProducts: Omit<ProductT, 'id'>[] = [
  { name: 'Monstera Deliciosa', description: 'Large split leaves, easy to keep indoors.', category: 'Plants', priceCents: 2490, stock: 15 },
  { name: 'Snake Plant', description: 'Survives low light and missed waterings.', category: 'Plants', priceCents: 1850, stock: 25 },
  { name: 'Peace Lily', description: 'White blooms in spring, likes shade.', category: 'Plants', priceCents: 2100, stock: 12 },
  { name: 'Fiddle Leaf Fig', description: 'Tall statement plant, needs bright light.', category: 'Plants', priceCents: 3900, stock: 6 },
  { name: 'Aloe Vera', description: 'Small succulent for a sunny windowsill.', category: 'Plants', priceCents: 990, stock: 40 },
  { name: 'Rubber Plant', description: 'Glossy dark leaves. Sold out until the next delivery.', category: 'Plants', priceCents: 2750, stock: 0 },
  { name: 'Ceramic Pot 18 cm', description: 'Glazed pot with a drainage hole.', category: 'Pots', priceCents: 1400, stock: 30 },
  { name: 'Terracotta Pot 12 cm', description: 'Classic clay pot, lets soil breathe.', category: 'Pots', priceCents: 650, stock: 50 },
  { name: 'Hanging Planter', description: 'Macrame holder with a ceramic cup.', category: 'Pots', priceCents: 1690, stock: 3 },
  { name: 'Watering Can 1.5 L', description: 'Long spout for hard to reach plants.', category: 'Tools', priceCents: 1290, stock: 20 },
  { name: 'Pruning Shears', description: 'Stainless blades with a safety lock.', category: 'Tools', priceCents: 1990, stock: 18 },
  { name: 'Potting Mix 10 L', description: 'Peat free mix for houseplants.', category: 'Tools', priceCents: 850, stock: 60 },
];

export const seedAccounts = {
  admin: { email: 'admin@shop.test', password: 'Admin123!' },
  customer: { email: 'customer@shop.test', password: 'Customer123!' },
};

export function resetStore() {
  db.users.clear();
  db.products.clear();
  db.carts.clear();
  db.orders.clear();

  db.users.set('user-admin', {
    id: 'user-admin',
    email: seedAccounts.admin.email,
    name: 'Shop Admin',
    role: 'admin',
    passwordHash: bcrypt.hashSync(seedAccounts.admin.password, rounds),
  });
  db.users.set('user-customer', {
    id: 'user-customer',
    email: seedAccounts.customer.email,
    name: 'Sample Customer',
    role: 'customer',
    passwordHash: bcrypt.hashSync(seedAccounts.customer.password, rounds),
  });

  seedProducts.forEach((p, i) => {
    const id = `prod-${String(i + 1).padStart(3, '0')}`;
    db.products.set(id, { id, ...p });
  });
}

export const newId = () => randomUUID();

export type { ShippingT };
