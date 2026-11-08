import type { ApiErrorT } from '@shop/shared';

type Code = ApiErrorT['error']['code'];

export class HttpError extends Error {
  status: number;
  code: Code;
  details?: { path: string; message: string }[];

  constructor(status: number, code: Code, message: string, details?: HttpError['details']) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const notFound = (what: string) => new HttpError(404, 'not_found', `${what} not found`);
export const unauthorized = (message = 'Authentication required') => new HttpError(401, 'unauthorized', message);
export const forbidden = (message = 'Admin role required') => new HttpError(403, 'forbidden', message);
export const conflict = (message: string) => new HttpError(409, 'conflict', message);
