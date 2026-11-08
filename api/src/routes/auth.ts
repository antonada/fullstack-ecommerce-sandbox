import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { LoginBody, RegisterBody } from '@shop/shared';
import { db, newId, rounds } from '../store.ts';
import { currentUser, publicUser, requireAuth, signToken } from '../auth.ts';
import { conflict, unauthorized } from '../errors.ts';
import { parse } from '../validate.ts';

export const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const body = parse(RegisterBody, req.body);
  const email = body.email.toLowerCase();
  if ([...db.users.values()].some((u) => u.email === email)) throw conflict('Email is already registered');

  const user = {
    id: newId(),
    email,
    name: body.name,
    role: 'customer' as const,
    passwordHash: await bcrypt.hash(body.password, rounds),
  };
  db.users.set(user.id, user);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

authRouter.post('/login', async (req, res) => {
  const body = parse(LoginBody, req.body);
  const email = body.email.toLowerCase();
  const user = [...db.users.values()].find((u) => u.email === email);
  const ok = user && (await bcrypt.compare(body.password, user.passwordHash));
  if (!user || !ok) throw unauthorized('Wrong email or password');
  res.json({ token: signToken(user), user: publicUser(user) });
});

authRouter.get('/me', requireAuth, (_req, res) => {
  res.json(publicUser(currentUser(res)));
});
