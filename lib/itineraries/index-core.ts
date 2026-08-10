import type { PublicItinerary } from './types.ts';

const frenchCollator = new Intl.Collator('fr-FR', {
  numeric: true,
  sensitivity: 'base',
});

export function catalogueIndexEntries(
  itineraries: readonly PublicItinerary[]
): PublicItinerary[] {
  return itineraries
    .filter((itinerary) => itinerary.seoStatus === 'indexable' && !itinerary.isPreview)
    .toSorted((first, second) => (
      frenchCollator.compare(first.departure.name, second.departure.name)
      || frenchCollator.compare(first.arrival.name, second.arrival.name)
      || frenchCollator.compare(first.slug, second.slug)
    ));
}
