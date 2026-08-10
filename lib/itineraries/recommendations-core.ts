import type { PublicItinerary } from './types.ts';

export const CITY_PAGE_ITINERARY_LIMIT = 5;
export const RELATED_DEPARTURE_ITINERARY_LIMIT = 3;

const frenchCollator = new Intl.Collator('fr-FR', {
  numeric: true,
  sensitivity: 'base',
});

function editorialOrder(itinerary: PublicItinerary): number {
  return itinerary.editorialOrder ?? Number.POSITIVE_INFINITY;
}

function compareRecommendations(
  first: PublicItinerary,
  second: PublicItinerary
): number {
  return Number(second.featuredOnCityPages) - Number(first.featuredOnCityPages)
    || editorialOrder(first) - editorialOrder(second)
    || first.distanceMetres - second.distanceMetres
    || frenchCollator.compare(first.title, second.title)
    || frenchCollator.compare(first.slug, second.slug);
}

function isPublicIndexable(itinerary: PublicItinerary): boolean {
  return itinerary.seoStatus === 'indexable' && !itinerary.isPreview;
}

export function selectCityPageItineraries(
  itineraries: readonly PublicItinerary[],
  cityDocumentId: string
): PublicItinerary[] {
  return itineraries
    .filter((itinerary) => (
      isPublicIndexable(itinerary)
      && (
        itinerary.departure.documentId === cityDocumentId
        || itinerary.arrival.documentId === cityDocumentId
      )
    ))
    .sort(compareRecommendations)
    .slice(0, CITY_PAGE_ITINERARY_LIMIT);
}

export function selectRelatedDepartureItineraries(
  itineraries: readonly PublicItinerary[],
  currentItinerary: PublicItinerary
): PublicItinerary[] {
  return itineraries
    .filter((itinerary) => (
      itinerary.documentId !== currentItinerary.documentId
      && isPublicIndexable(itinerary)
      && itinerary.departure.documentId === currentItinerary.departure.documentId
    ))
    .sort(compareRecommendations)
    .slice(0, RELATED_DEPARTURE_ITINERARY_LIMIT);
}
