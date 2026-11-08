import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './store.ts';
import type { UserRecord } from './store.ts';
import { forbidden, unauthorized } from './errors.ts';

const secret = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const ttl = process.env.JWT_TTL ?? '1h';

export function signToken(user: UserRecord) {
  return jwt.sign({ role: user.role }, secret, { subject: user.id, expiresIn: ttl as jwt.SignOptions['expiresIn'] });
}

export const publicUser = ({ id, email, name, role }: UserRecord) => ({ id, email, name, role });

export function currentUser(res: Response): UserRecord {
  return res.locals.user;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw unauthorized();

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, secret) as jwt.JwtPayload;
  } catch (err) {
    const expired = err instanceof jwt.TokenExpiredError;
    throw unauthorized(expired ? 'Token expired' : 'Invalid token');
  }

  const user = db.users.get(String(payload.sub));
  if (!user) throw unauthorized('Invalid token');
  res.locals.user = user;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (currentUser(res).role !== 'admin') throw forbidden();
    next();
  });
}
