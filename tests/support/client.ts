import type { APIRequestContext } from '@playwright/test';

export function client(request: APIRequestContext, token?: string) {
  const headers = token ? { authorization: `Bearer ${token}` } : undefined;
  const url = (path: string) => `/api${path}`;
  return {
    get: (path: string) => request.get(url(path), { headers }),
    post: (path: string, data?: unknown) => request.post(url(path), { headers, data }),
    patch: (path: string, data?: unknown) => request.patch(url(path), { headers, data }),
    delete: (path: string) => request.delete(url(path), { headers }),
  };
}

export type Client = ReturnType<typeof client>;
