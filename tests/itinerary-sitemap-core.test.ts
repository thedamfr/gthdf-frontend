import assert from 'node:assert/strict';
import test from 'node:test';

import {
  catalogueSitemapRoutes,
  loadCatalogueSitemapRoutes,
} from '../lib/itineraries/sitemap-core.ts';
import { verifiedItineraryFixture } from './itinerary-fixtures.ts';

test('the catalogue sitemap contains only guarded indexable DTOs', () => {
  const { guarded } = verifiedItineraryFixture();
  const noindex = {
    ...guarded.dto,
    slug: 'non-indexable',
    seoStatus: 'noindex' as const,
  };
  const routes = catalogueSitemapRoutes(
    [guarded.dto, noindex],
    'https://gthf.test'
  );
  assert.equal(routes.length, 1);
  assert.equal(
    routes[0].url,
    'https://gthf.test/itineraires-velo/calais-boulogne-sur-mer'
  );
  assert.equal(routes[0].priority, 0.75);
});

test('catalogue upstream failures propagate so ISR never caches a false empty sitemap', async () => {
  const failure = new Error('strapi_500');
  await assert.rejects(
    loadCatalogueSitemapRoutes(async () => { throw failure; }, 'https://gthf.test'),
    (error) => error === failure
  );
});
