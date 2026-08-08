import { guardedPublicCacheControl } from './cache-policy.ts';
import {
  contentDispositionAttachment,
  ItineraryArtifactIntegrityError,
  ItineraryArtifactUpstreamError,
  type ItineraryArtifactKind,
  type LoadedItineraryArtifact,
} from './media-core.ts';
import { CatalogueUnavailableError } from './server-core.ts';
import type { GuardedItinerary } from './types';

interface ItineraryArtifactHandlerDependencies {
  preview: boolean;
  getItinerary: (
    slug: string,
    options: { preview: boolean; editorial: false }
  ) => Promise<GuardedItinerary | null>;
  loadArtifact: (
    entry: GuardedItinerary,
    kind: ItineraryArtifactKind
  ) => Promise<LoadedItineraryArtifact>;
  reportError?: (message: string) => void;
}

function errorResponse(status: number, message: string, cacheControl = 'private, no-store'): Response {
  return new Response(message, {
    status,
    headers: {
      'Cache-Control': cacheControl,
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function matchesIfNoneMatch(value: string | null, etag: string): boolean {
  if (!value) {
    return false;
  }
  const normalizedEtag = etag.replace(/^W\//, '');
  return value.split(',').some((candidate) => {
    const normalizedCandidate = candidate.trim().replace(/^W\//, '');
    return normalizedCandidate === '*' || normalizedCandidate === normalizedEtag;
  });
}

export async function handleItineraryArtifactGetCore(
  slug: string,
  kind: ItineraryArtifactKind,
  request: Request | undefined,
  dependencies: ItineraryArtifactHandlerDependencies
): Promise<Response> {
  try {
    const entry = await dependencies.getItinerary(slug, {
      preview: dependencies.preview,
      editorial: false,
    });
    if (!entry) {
      return errorResponse(
        404,
        'Itinéraire introuvable.',
        guardedPublicCacheControl(dependencies.preview)
      );
    }

    const artifact = await dependencies.loadArtifact(entry, kind);
    const etag = `"${artifact.sha256}"`;
    const headers = new Headers({
      'Cache-Control': guardedPublicCacheControl(dependencies.preview),
      'Content-Length': String(artifact.bytes.byteLength),
      'Content-Type': artifact.contentType,
      ETag: etag,
      'X-Content-Type-Options': 'nosniff',
    });
    if (kind === 'gpx') {
      headers.set('Content-Disposition', contentDispositionAttachment(artifact.filename));
    }
    if (dependencies.preview) {
      headers.set('X-Robots-Tag', 'noindex, nofollow');
    }

    if (matchesIfNoneMatch(request?.headers.get('if-none-match') ?? null, etag)) {
      headers.delete('Content-Length');
      return new Response(null, { status: 304, headers });
    }

    return new Response(Buffer.from(artifact.bytes), { status: 200, headers });
  } catch (error) {
    if (error instanceof CatalogueUnavailableError || error instanceof ItineraryArtifactUpstreamError) {
      return errorResponse(503, 'Cet itinéraire est momentanément indisponible. Réessayez plus tard.');
    }
    if (error instanceof ItineraryArtifactIntegrityError) {
      dependencies.reportError?.(
        `[catalogue] Refused invalid ${kind} artifact (${error.message}).`
      );
      return errorResponse(404, 'Itinéraire introuvable.');
    }

    dependencies.reportError?.(`[catalogue] Unexpected ${kind} handler failure.`);
    return errorResponse(503, 'Cet itinéraire est momentanément indisponible. Réessayez plus tard.');
  }
}
