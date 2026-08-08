import assert from 'node:assert/strict';
import test from 'node:test';

import {
  catalogueFeatureIsOpen,
  CatalogueUnavailableError,
  readCatalogueFeatureState,
  resolveCatalogueItineraryCore,
} from '../lib/itineraries/server-core.ts';
import { verifiedItineraryFixture } from './itinerary-fixtures.ts';

test('an explicit false feature flag is authoritative while missing data fails closed', async () => {
  assert.deepEqual(
    await readCatalogueFeatureState(async () => ({
      data: { publishCityItinerariesToNext: false },
    })),
    { kind: 'authoritative_closed' }
  );
  assert.deepEqual(
    await readCatalogueFeatureState(async () => ({ data: {} })),
    { kind: 'missing', reason: 'missing_feature_switch' }
  );
  assert.equal(catalogueFeatureIsOpen({ kind: 'authoritative_closed' }), false);
});

test('network and Strapi 500 failures remain distinguishable from an authoritative 404', async () => {
  for (const reason of ['fetch failed', 'strapi_500']) {
    const state = await readCatalogueFeatureState(async () => {
      throw new Error(reason);
    });
    assert.deepEqual(state, { kind: 'upstream_error', reason });
    assert.throws(
      () => catalogueFeatureIsOpen(state),
      (error) => error instanceof CatalogueUnavailableError && error.message === reason
    );
  }
});

test('a configuration failure is missing rather than an upstream response', async () => {
  class ConfigurationError extends Error {}
  const state = await readCatalogueFeatureState(
    async () => { throw new ConfigurationError('missing_private_token'); },
    (error) => error instanceof ConfigurationError
  );
  assert.deepEqual(state, { kind: 'missing', reason: 'missing_private_token' });
});

test('an authoritative closed flag resolves a public slug as not found', async () => {
  let redirectLookups = 0;
  const resolution = await resolveCatalogueItineraryCore('ancien-slug', false, {
    getItinerary: async () => null,
    getFeatureState: async () => ({ kind: 'authoritative_closed' }),
    getRedirectTargetSlug: async () => {
      redirectLookups += 1;
      return 'calais-boulogne-sur-mer';
    },
  });
  assert.deepEqual(resolution, { kind: 'not_found' });
  assert.equal(redirectLookups, 0);
});

test('an explicit redirect only resolves after its target passes the shared guard', async () => {
  const { guarded } = verifiedItineraryFixture();
  const calls: Array<{ slug: string; editorial: boolean }> = [];
  const resolution = await resolveCatalogueItineraryCore('ancien-slug', false, {
    getItinerary: async (slug, options) => {
      calls.push({ slug, editorial: options.editorial });
      return slug === guarded.dto.slug ? guarded : null;
    },
    getFeatureState: async () => ({ kind: 'open' }),
    getRedirectTargetSlug: async () => guarded.dto.slug,
  });

  assert.deepEqual(resolution, { kind: 'redirect', slug: guarded.dto.slug });
  assert.deepEqual(calls, [
    { slug: 'ancien-slug', editorial: true },
    { slug: guarded.dto.slug, editorial: false },
  ]);

  const refused = await resolveCatalogueItineraryCore('ancien-slug', false, {
    getItinerary: async () => null,
    getFeatureState: async () => ({ kind: 'open' }),
    getRedirectTargetSlug: async () => guarded.dto.slug,
  });
  assert.deepEqual(refused, { kind: 'not_found' });
});
