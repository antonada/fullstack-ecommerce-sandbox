import { request } from '@playwright/test';
import type { FullConfig } from '@playwright/test';

// Start every run from the seeded data, even if the server was already up
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL;
  const api = await request.newContext({ baseURL });
  const res = await api.post('/api/test/reset');
  if (res.status() !== 204) throw new Error(`Reset failed with ${res.status()}, is ENABLE_TEST_ROUTES set?`);
  await api.dispose();
}
