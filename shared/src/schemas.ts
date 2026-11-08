import { z } from 'zod';

export const Role = z.enum(['customer', 'admin']);

export const User = z
  .object({
    id: z.string(),
    email: z.email(),
    name: z.string(),
    role: Role,
  })
  .meta({ id: 'User' });

export const RegisterBody = z.object({
  email: z.email(),
  password: z.string().min(8).max(72),
  name: z.string().trim().min(2).max(60),
});

export const LoginBody = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const AuthResponse = z
  .object({
    token: z.string(),
    user: User,
  })
  .meta({ id: 'AuthResponse' });

export const Product = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.string(),
    priceCents: z.number().int().positive(),
    stock: z.number().int().nonnegative(),
  })
  .meta({ id: 'Product' });

export const ProductBody = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(1).max(500),
  category: z.string().trim().min(2).max(30),
  priceCents: z.number().int().positive().max(1_000_000),
  stock: z.number().int().nonnegative().max(10_000),
});

export const ProductPatch = ProductBody.partial().refine((v) => Object.keys(v).length > 0, {
  message: 'At least one field is required',
});

export const ProductListQuery = z.object({
  q: z.string().trim().optional(),
  category: z.string().trim().optional(),
  sort: z.enum(['name', 'price_asc', 'price_desc']).default('name'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(8),
});

export const ProductList = z
  .object({
    items: z.array(Product),
    total: z.number().int().nonnegative(),
    page: z.number().int(),
    pageSize: z.number().int(),
  })
  .meta({ id: 'ProductList' });

export const CartLine = z
  .object({
    productId: z.string(),
    name: z.string(),
    priceCents: z.number().int(),
    quantity: z.number().int().positive(),
    lineTotalCents: z.number().int(),
  })
  .meta({ id: 'CartLine' });

export const Cart = z
  .object({
    items: z.array(CartLine),
    totalCents: z.number().int().nonnegative(),
  })
  .meta({ id: 'Cart' });

export const AddCartItemBody = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
});

export const UpdateCartItemBody = z.object({
  quantity: z.number().int().min(1).max(20),
});

export const Shipping = z
  .object({
    fullName: z.string().trim().min(2).max(60),
    address: z.string().trim().min(5).max(120),
    city: z.string().trim().min(2).max(60),
    postalCode: z.string().regex(/^\d{2}-\d{3}$/, 'Use the format 12-345'),
  })
  .meta({ id: 'Shipping' });

export const CreateOrderBody = z.object({ shipping: Shipping });

export const OrderLine = z
  .object({
    productId: z.string(),
    name: z.string(),
    priceCents: z.number().int(),
    quantity: z.number().int().positive(),
  })
  .meta({ id: 'OrderLine' });

export const Order = z
  .object({
    id: z.string(),
    userId: z.string(),
    items: z.array(OrderLine).min(1),
    totalCents: z.number().int().positive(),
    status: z.literal('confirmed'),
    shipping: Shipping,
    createdAt: z.iso.datetime(),
  })
  .meta({ id: 'Order' });

export const OrderList = z.object({ items: z.array(Order) }).meta({ id: 'OrderList' });

export const ApiError = z
  .object({
    error: z.object({
      code: z.enum([
        'validation_error',
        'unauthorized',
        'forbidden',
        'not_found',
        'conflict',
        'out_of_stock',
        'empty_cart',
      ]),
      message: z.string(),
      details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
    }),
  })
  .meta({ id: 'ApiError' });

export type UserT = z.infer<typeof User>;
export type ProductT = z.infer<typeof Product>;
export type CartT = z.infer<typeof Cart>;
export type OrderT = z.infer<typeof Order>;
export type ShippingT = z.infer<typeof Shipping>;
export type ApiErrorT = z.infer<typeof ApiError>;
