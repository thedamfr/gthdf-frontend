import type { MetadataRoute } from 'next';

import type { PublicItinerary } from './types';

export function catalogueSitemapRoutes(
  itineraries: readonly PublicItinerary[],
  baseUrl: string
): MetadataRoute.Sitemap {
  return itineraries
    .filter((itinerary) => itinerary.seoStatus === 'indexable')
    .map((itinerary) => ({
      url: `${baseUrl}/itineraires-velo/${itinerary.slug}`,
      lastModified: new Date(itinerary.revisionUpdatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.75,
    }));
}

export async function loadCatalogueSitemapRoutes(
  loadItineraries: () => Promise<readonly PublicItinerary[]>,
  baseUrl: string
): Promise<MetadataRoute.Sitemap> {
  // Intentionally do not catch: ISR must retain its last valid response on
  // an upstream failure instead of caching a false empty catalogue.
  return catalogueSitemapRoutes(await loadItineraries(), baseUrl);
}
