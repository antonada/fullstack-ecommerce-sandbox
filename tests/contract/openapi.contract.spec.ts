import SwaggerParser from '@apidevtools/swagger-parser';
import { operations } from '@shop/shared';
import { expect, test } from '../support/fixtures.ts';

interface Spec {
  openapi: string;
  paths: Record<
    string,
    Record<string, { operationId: string; security?: unknown[]; responses: Record<string, unknown> }>
  >;
}

test.describe('openapi document', () => {
  let spec: Spec;

  test.beforeAll(async ({ playwright, baseURL }) => {
    const request = await playwright.request.newContext({ baseURL });
    spec = await (await request.get('/api/openapi.json')).json();
    await request.dispose();
  });

  test('is a valid OpenAPI 3.1 document', async () => {
    expect(spec.openapi).toMatch(/^3\.1/);
    await expect(SwaggerParser.validate(structuredClone(spec) as never)).resolves.toBeDefined();
  });

  test('documents every operation with its success and error statuses', async () => {
    for (const op of operations) {
      const entry = spec.paths[op.path]?.[op.method];
      expect(entry, `${op.method} ${op.path} is missing`).toBeDefined();
      expect(entry.operationId).toBe(op.id);
      const statuses = Object.keys(entry.responses).map(Number).sort();
      expect(statuses, `${op.id} statuses`).toEqual([op.success, ...op.errors].sort());
    }
  });

  test('marks protected operations with the bearer scheme and public ones without', async () => {
    for (const op of operations) {
      const security = spec.paths[op.path][op.method].security ?? [];
      expect(security.length > 0, op.id).toBe(op.auth !== 'none');
    }
  });

  test('swagger ui is served on /docs', async ({ request }) => {
    const res = await request.get('/docs/');
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('swagger-ui');
  });
});
