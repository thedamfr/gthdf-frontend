import assert from 'node:assert/strict';
import test from 'node:test';

import {
  guardedPublicCacheControl,
  itineraryStrapiCacheOptions,
} from '../lib/itineraries/cache-policy.ts';

test('publication guards never cache beyond sixty seconds', () => {
  assert.deepEqual(itineraryStrapiCacheOptions('feature-switch'), { cache: 'no-store' });
  assert.deepEqual(itineraryStrapiCacheOptions('guard'), { next: { revalidate: 60 } });
  assert.match(guardedPublicCacheControl(), /s-maxage=60/);
});

test('editorial content is separate and preview stays private', () => {
  assert.deepEqual(itineraryStrapiCacheOptions('editorial'), { next: { revalidate: 300 } });
  assert.deepEqual(itineraryStrapiCacheOptions('editorial', true), { cache: 'no-store' });
  assert.equal(guardedPublicCacheControl(true), 'private, no-store');
});
