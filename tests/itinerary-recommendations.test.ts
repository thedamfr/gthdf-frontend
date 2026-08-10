import assert from 'node:assert/strict';
import test from 'node:test';

import {
  selectCityPageItineraries,
  selectRelatedDepartureItineraries,
} from '../lib/itineraries/recommendations-core.ts';
import type { PublicItinerary } from '../lib/itineraries/types.ts';

function itinerary(
  slug: string,
  options: {
    departureId?: string;
    arrivalId?: string;
    distanceMetres?: number;
    editorialOrder?: number | null;
    featured?: boolean;
    preview?: boolean;
    seoStatus?: 'indexable' | 'noindex';
  } = {}
): PublicItinerary {
  return {
    documentId: `document-${slug}`,
    slug,
    title: slug,
    departure: {
      documentId: options.departureId ?? 'city-calais',
      name: 'Calais',
    },
    arrival: {
      documentId: options.arrivalId ?? `city-${slug}`,
      name: slug,
    },
    distanceMetres: options.distanceMetres ?? 10_000,
    editorialOrder: options.editorialOrder ?? null,
    featuredOnCityPages: options.featured ?? false,
    isPreview: options.preview ?? false,
    seoStatus: options.seoStatus ?? 'indexable',
  } as PublicItinerary;
}

test('city pages prioritize editorial picks then fill five crawlable routes deterministically', () => {
  const source = [
    itinerary('fallback-30', { distanceMetres: 30_000 }),
    itinerary('featured-2', { featured: true, editorialOrder: 2, distanceMetres: 50_000 }),
    itinerary('fallback-10', { distanceMetres: 10_000 }),
    itinerary('featured-1', { featured: true, editorialOrder: 1, distanceMetres: 60_000 }),
    itinerary('fallback-20', { distanceMetres: 20_000 }),
    itinerary('fallback-40', { distanceMetres: 40_000 }),
    itinerary('private', { seoStatus: 'noindex', distanceMetres: 1 }),
    itinerary('preview', { preview: true, distanceMetres: 2 }),
    itinerary('other-city', {
      departureId: 'city-amiens',
      arrivalId: 'city-arras',
      distanceMetres: 3,
    }),
  ];

  assert.deepEqual(
    selectCityPageItineraries(source, 'city-calais').map((entry) => entry.slug),
    ['featured-1', 'featured-2', 'fallback-10', 'fallback-20', 'fallback-30']
  );
  assert.equal(source[0].slug, 'fallback-30');
});

test('itinerary pages link three other public routes with the exact same departure', () => {
  const current = itinerary('current', {
    departureId: 'city-calais',
    arrivalId: 'city-lens',
    distanceMetres: 25_000,
  });
  const source = [
    itinerary('fallback-30', { distanceMetres: 30_000 }),
    itinerary('featured', { featured: true, editorialOrder: 1, distanceMetres: 60_000 }),
    current,
    itinerary('fallback-10', { distanceMetres: 10_000 }),
    itinerary('fallback-20', { distanceMetres: 20_000 }),
    itinerary('private', { seoStatus: 'noindex', distanceMetres: 1 }),
    itinerary('preview', { preview: true, distanceMetres: 2 }),
    itinerary('calais-as-arrival', {
      departureId: 'city-amiens',
      arrivalId: 'city-calais',
      distanceMetres: 3,
    }),
  ];

  assert.deepEqual(
    selectRelatedDepartureItineraries(
      source,
      current.departure.documentId,
      current.documentId
    ).map((entry) => entry.slug),
    ['featured', 'fallback-10', 'fallback-20']
  );
  assert.equal(source[0].slug, 'fallback-30');
});
