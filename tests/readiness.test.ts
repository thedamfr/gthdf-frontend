import assert from 'node:assert/strict';
import test from 'node:test';
import { contentReady } from '../lib/readiness.ts';

test('a frontend with unreachable content is not ready to receive traffic', async () => {
  assert.equal(await contentReady('https://cms.example', 'test-token', async () => { throw new Error('unavailable'); }), false);
  assert.equal(await contentReady('https://cms.example', 'test-token', async () => Response.json({ data: null })), false);
});

test('readiness requires both a private token and published site content', async () => {
  assert.equal(await contentReady('https://cms.example', undefined, async () => assert.fail('No unauthenticated request')), false);
  assert.equal(await contentReady('https://cms.example', 'test-token', async () => Response.json({ data: { siteName: 'GTHF' } })), true);
  assert.equal(await contentReady('https://cms.example', 'test-token', async () => Response.json({ error: 'denied' }, { status: 403 })), false);
});
