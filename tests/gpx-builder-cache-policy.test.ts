import assert from 'node:assert/strict';
import test from 'node:test';

import { gpxBuilderStrapiCacheOptions } from '../lib/gpx-builder/cache-policy.ts';

test('the feature switch is never cached while chapter data is revalidated', () => {
  assert.deepEqual(gpxBuilderStrapiCacheOptions('feature-switch'), {
    cache: 'no-store',
  });
  assert.deepEqual(gpxBuilderStrapiCacheOptions('chapters'), {
    next: { revalidate: 60 },
  });
});
