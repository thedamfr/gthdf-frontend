import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from '../app/api/health/route.ts';

test('health identifies the serving revision without allowing cached proof', async () => {
  const previous = process.env.GTHDF_REVISION;
  process.env.GTHDF_REVISION = 'a'.repeat(40);
  try {
    const response = GET();
    assert.deepEqual(await response.json(), { status: 'ok', revision: 'a'.repeat(40) });
    assert.match(response.headers.get('cache-control') ?? '', /no-store/);
  } finally {
    if (previous === undefined) delete process.env.GTHDF_REVISION;
    else process.env.GTHDF_REVISION = previous;
  }
});
