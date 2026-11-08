import jwt from 'jsonwebtoken';

let counter = 0;
export const uid = () =>
  `${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export const jwtSecret = process.env.JWT_SECRET ?? 'dev-secret-change-me';

export const userData = (overrides = {}) => ({
  email: `user-${uid()}@shop.test`,
  password: 'Passw0rd!',
  name: 'Test Shopper',
  ...overrides,
});

export const productData = (overrides = {}) => ({
  name: `Test plant ${uid()}`,
  description: 'Created by the test suite.',
  category: 'Test',
  priceCents: 1500,
  stock: 10,
  ...overrides,
});

export const shippingData = (overrides = {}) => ({
  fullName: 'Ann Lee',
  address: '12 Garden Street',
  city: 'Krakow',
  postalCode: '30-001',
  ...overrides,
});

export const adminLogin = { email: 'admin@shop.test', password: 'Admin123!' };

export function signToken(
  userId: string,
  options: { expiresIn?: number | string; secret?: string; role?: string } = {},
) {
  return jwt.sign({ role: options.role ?? 'customer' }, options.secret ?? jwtSecret, {
    subject: userId,
    expiresIn: (options.expiresIn ?? '1h') as jwt.SignOptions['expiresIn'],
  });
}
