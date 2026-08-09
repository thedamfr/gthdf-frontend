import 'server-only';

import { getGuardedBuilderItineraries } from '../itineraries/server.ts';
import { catalogueCandidateFromGuardedItinerary } from './catalogue-link-candidate.ts';
import {
  resolveCatalogueItineraryLink,
  type BuilderCatalogueMatch,
  type CatalogueItineraryLink,
  type CatalogueItineraryMatchCandidate,
} from './catalogue-link-core.ts';

export async function getCatalogueItineraryLink(
  match: BuilderCatalogueMatch
): Promise<CatalogueItineraryLink | null> {
  const guarded = await getGuardedBuilderItineraries(
    match.departureCityDocumentId,
    match.arrivalCityDocumentId
  );
  const candidates: CatalogueItineraryMatchCandidate[] = guarded.flatMap((itinerary) => {
    const candidate = catalogueCandidateFromGuardedItinerary(itinerary);
    return candidate ? [candidate] : [];
  });

  return resolveCatalogueItineraryLink(match, candidates);
}
