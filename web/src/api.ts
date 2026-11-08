const TOKEN_KEY = 'shop.token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

interface ErrorBody {
  error?: { code?: string; message?: string; details?: { path: string; message: string }[] };
}

export class ApiFailure extends Error {
  status: number;
  code: string;
  details: { path: string; message: string }[];

  constructor(status: number, body: ErrorBody) {
    super(body.error?.message ?? 'Request failed');
    this.status = status;
    this.code = body.error?.code ?? 'unknown';
    this.details = body.error?.details ?? [];
  }
}

export const unauthorizedEvent = 'shop:unauthorized';

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? 'GET',
      headers: {
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiFailure(0, { error: { code: 'internal', message: 'Network error, try again' } });
  }

  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event(unauthorizedEvent));
    throw new ApiFailure(res.status, body ?? {});
  }
  return body as T;
}

export const money = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
