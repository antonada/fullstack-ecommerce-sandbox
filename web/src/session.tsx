import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { CartT, UserT } from '@shop/shared/schemas';
import { api, clearToken, getToken, setToken, unauthorizedEvent } from './api';

interface Session {
  user: UserT | null;
  ready: boolean;
  expired: boolean;
  cart: CartT;
  cartCount: number;
  signIn: (token: string, user: UserT) => void;
  signOut: () => void;
  setCart: (cart: CartT) => void;
  refreshCart: () => Promise<void>;
}

const emptyCart: CartT = { items: [], totalCents: 0 };
const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserT | null>(null);
  const [ready, setReady] = useState(!getToken());
  const [expired, setExpired] = useState(false);
  const [cart, setCart] = useState<CartT>(emptyCart);

  const refreshCart = useCallback(async () => {
    setCart(await api<CartT>('/cart'));
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
    setCart(emptyCart);
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    api<UserT>('/auth/me')
      .then((me) => {
        setUser(me);
        return refreshCart();
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [refreshCart]);

  useEffect(() => {
    const onUnauthorized = () => {
      signOut();
      setExpired(true);
    };
    window.addEventListener(unauthorizedEvent, onUnauthorized);
    return () => window.removeEventListener(unauthorizedEvent, onUnauthorized);
  }, [signOut]);

  const signIn = (token: string, nextUser: UserT) => {
    setToken(token);
    setExpired(false);
    setUser(nextUser);
    refreshCart().catch(() => {});
  };

  const cartCount = cart.items.reduce((n, i) => n + i.quantity, 0);

  return (
    <Ctx.Provider value={{ user, ready, expired, cart, cartCount, signIn, signOut, setCart, refreshCart }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSession() {
  const value = useContext(Ctx);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
