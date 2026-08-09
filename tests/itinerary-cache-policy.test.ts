import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  guardedPublicCacheControl,
  itineraryStrapiCacheOptions,
} from '../lib/itineraries/cache-policy.ts';

test('publication guards never cache beyond sixty seconds', () => {
  assert.deepEqual(itineraryStrapiCacheOptions('feature-switch'), { cache: 'no-store' });
  assert.deepEqual(itineraryStrapiCacheOptions('guard'), { next: { revalidate: 60 } });
  assert.deepEqual(itineraryStrapiCacheOptions('builder-lookup'), { cache: 'no-store' });
  assert.match(guardedPublicCacheControl(), /s-maxage=60/);
});

test('all catalogue publication surfaces stay dynamic while accepting new slugs', () => {
  const pageSource = readFileSync(
    new URL('../app/itineraires-velo/[slug]/page.tsx', import.meta.url),
    'utf8'
  );
  const cityPageSource = readFileSync(
    new URL('../app/villes/[slug]/page.tsx', import.meta.url),
    'utf8'
  );
  const sitemapSource = readFileSync(new URL('../app/sitemap.ts', import.meta.url), 'utf8');

  assert.match(pageSource, /export const dynamic = ['"]force-dynamic['"];?/);
  assert.match(pageSource, /export const dynamicParams = true;?/);
  assert.match(cityPageSource, /export const dynamic = ['"]force-dynamic['"];?/);
  assert.match(cityPageSource, /export const dynamicParams = true;?/);
  assert.match(sitemapSource, /export const dynamic = ['"]force-dynamic['"];?/);
});

test('editorial content is separate and preview stays private', () => {
  assert.deepEqual(itineraryStrapiCacheOptions('editorial'), { next: { revalidate: 300 } });
  assert.deepEqual(itineraryStrapiCacheOptions('editorial', true), { cache: 'no-store' });
  assert.equal(guardedPublicCacheControl(true), 'private, no-store');
});
