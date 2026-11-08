import type { z } from 'zod';
import { HttpError } from './errors.ts';

export function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  throw new HttpError(
    400,
    'validation_error',
    'Request validation failed',
    result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  );
}
