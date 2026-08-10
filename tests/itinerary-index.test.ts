import assert from 'node:assert/strict';
import test from 'node:test';

import { catalogueIndexEntries } from '../lib/itineraries/index-core.ts';
import type { PublicItinerary } from '../lib/itineraries/types.ts';

function itinerary(
  slug: string,
  departure: string,
  arrival: string,
  options: { seoStatus?: 'indexable' | 'noindex'; isPreview?: boolean } = {}
): PublicItinerary {
  return {
    slug,
    departure: { name: departure },
    arrival: { name: arrival },
    seoStatus: options.seoStatus ?? 'indexable',
    isPreview: options.isPreview ?? false,
  } as PublicItinerary;
}

test('the public index keeps only indexable published routes in deterministic city order', () => {
  const source = [
    itinerary('bethune-a-lens', 'Béthune', 'Lens'),
    itinerary('arras-a-lens', 'Arras', 'Lens'),
    itinerary('arras-a-douai', 'Arras', 'Douai'),
    itinerary('draft-route', 'Amiens', 'Arras', { isPreview: true }),
    itinerary('private-route', 'Abbeville', 'Amiens', { seoStatus: 'noindex' }),
  ];

  assert.deepEqual(
    catalogueIndexEntries(source).map((entry) => entry.slug),
    ['arras-a-douai', 'arras-a-lens', 'bethune-a-lens']
  );
  assert.equal(source[0].slug, 'bethune-a-lens');
});
