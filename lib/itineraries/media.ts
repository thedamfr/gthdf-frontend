import 'server-only';

import {
  loadItineraryArtifactWithDependencies,
  type ItineraryArtifactKind,
  type LoadedItineraryArtifact,
} from './media-core';
import type { GuardedItinerary } from './types';

export {
  contentDispositionAttachment,
  ItineraryArtifactIntegrityError,
  ItineraryArtifactUpstreamError,
  type ItineraryArtifactKind,
  type LoadedItineraryArtifact,
} from './media-core';

function configuredMediaOrigins(): string[] {
  return (process.env.STRAPI_MEDIA_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function strapiBaseUrl(): string {
  return process.env.STRAPI_URL
    ?? process.env.NEXT_PUBLIC_STRAPI_URL
    ?? 'http://localhost:1337';
}

export function loadItineraryArtifact(
  entry: GuardedItinerary,
  kind: ItineraryArtifactKind
): Promise<LoadedItineraryArtifact> {
  return loadItineraryArtifactWithDependencies(entry, kind, {
    fetchImpl: fetch,
    strapiBaseUrl: strapiBaseUrl(),
    allowedOrigins: configuredMediaOrigins(),
    timeoutSignal: AbortSignal.timeout,
  });
}
