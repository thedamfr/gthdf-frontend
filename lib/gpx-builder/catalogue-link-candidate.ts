import type {
  GuardedItinerary,
  ItineraryReferenceSegment,
  ItineraryRouteAnchor,
} from '../itineraries/types.ts';
import type {
  BuilderCatalogueAnchorMatch,
  BuilderCatalogueChapterMatch,
  BuilderCatalogueJunctionMatch,
  CatalogueItineraryMatchCandidate,
} from './catalogue-link-core.ts';

const SHA_256_PATTERN = /^[a-f0-9]{64}$/i;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function normalizedHash(value: unknown): string | null {
  return typeof value === 'string' && SHA_256_PATTERN.test(value)
    ? value.toLowerCase()
    : null;
}

function normalizeAnchor(
  anchor: ItineraryRouteAnchor | null | undefined,
  routeSegments: readonly ItineraryReferenceSegment[]
): BuilderCatalogueAnchorMatch | null {
  const sourceSha256 = normalizedHash(anchor?.sourceHash);
  const routeSegment = isNonNegativeInteger(anchor?.sourceSegmentIndex)
    ? routeSegments[anchor.sourceSegmentIndex]
    : undefined;
  if (
    anchor?.validationStatus !== 'validated'
    || anchor.sourceDirection !== 'ab'
    || !sourceSha256
    || !isNonEmptyString(anchor.chapter?.documentId)
    || !isNonNegativeInteger(anchor.sourceSegmentIndex)
    || !routeSegment
    || routeSegment.chapter?.documentId !== anchor.chapter.documentId
    || routeSegment.direction !== 'ab'
    || normalizedHash(routeSegment.sourceSha256) !== sourceSha256
    || !isNonNegativeInteger(anchor.trackIndex)
    || !isNonNegativeInteger(anchor.sourceTrackSegmentIndex)
    || !isNonNegativeInteger(anchor.sourcePointIndex)
    || typeof anchor.sourceFraction !== 'number'
    || !Number.isFinite(anchor.sourceFraction)
    || anchor.sourceFraction < 0
    || anchor.sourceFraction > 1
  ) {
    return null;
  }

  return {
    chapterDocumentId: anchor.chapter.documentId,
    sourceSha256,
    trackIndex: anchor.trackIndex,
    segmentIndex: anchor.sourceTrackSegmentIndex,
    pointIndex: anchor.sourcePointIndex,
    fraction: anchor.sourceFraction,
  };
}

function normalizeJunction(segment: ItineraryReferenceSegment): BuilderCatalogueJunctionMatch | null {
  const sourceSha256 = normalizedHash(segment.sourceSha256);
  const nextSourceSha256 = normalizedHash(segment.nextSourceSha256);
  if (
    (segment.junctionAfterStatus !== 'exact' && segment.junctionAfterStatus !== 'accepted_gap')
    || !sourceSha256
    || !nextSourceSha256
    || !isFiniteNonNegative(segment.junctionAfterGapMetres)
  ) {
    return null;
  }
  return {
    status: segment.junctionAfterStatus,
    sourceSha256,
    nextSourceSha256,
    gapMetres: segment.junctionAfterGapMetres,
  };
}

function normalizeChapters(
  guarded: GuardedItinerary
): BuilderCatalogueChapterMatch[] | null {
  const routeSegments = guarded.record.route?.segments;
  const revisionChapters = guarded.revision.chaptersOnRoute;
  if (
    !Array.isArray(routeSegments)
    || !Array.isArray(revisionChapters)
    || revisionChapters.length === 0
  ) {
    return null;
  }

  const ordered = [...revisionChapters].sort((first, second) => (
    Number(first.routeOrder) - Number(second.routeOrder)
  ));
  if (ordered.some((entry, index) => entry.routeOrder !== index)) {
    return null;
  }

  const chapters: BuilderCatalogueChapterMatch[] = [];
  for (const [visitIndex, entry] of ordered.entries()) {
    const chapterDocumentId = entry.chapter?.documentId;
    if (!isNonEmptyString(chapterDocumentId)) {
      return null;
    }
    const routeSegmentIndex = routeSegments.findIndex((segment) => (
      segment.chapter?.documentId === chapterDocumentId
    ));
    const segment = routeSegments[routeSegmentIndex];
    const sourceSha256 = normalizedHash(segment?.sourceSha256);
    if (
      routeSegmentIndex < 0
      || !segment
      || !sourceSha256
      || entry.direction !== segment.direction
    ) {
      return null;
    }

    const hasFollowingChapter = visitIndex < ordered.length - 1;
    const junctionAfter = hasFollowingChapter ? normalizeJunction(segment) : null;
    if (hasFollowingChapter && !junctionAfter) {
      return null;
    }
    if (junctionAfter) {
      const nextDocumentId = ordered[visitIndex + 1]?.chapter?.documentId;
      const nextSegment = routeSegments.find((candidate) => (
        candidate.chapter?.documentId === nextDocumentId
      ));
      if (junctionAfter.nextSourceSha256 !== normalizedHash(nextSegment?.sourceSha256)) {
        return null;
      }
    }

    chapters.push({
      chapterDocumentId,
      sourceSha256,
      junctionAfter,
    });
  }
  return chapters;
}

export function catalogueCandidateFromGuardedItinerary(
  guarded: GuardedItinerary
): CatalogueItineraryMatchCandidate | null {
  const routeKey = guarded.record.route?.routeKey;
  const slug = guarded.dto.slug;
  const departureCityDocumentId = guarded.revision.departure?.documentId;
  const arrivalCityDocumentId = guarded.revision.arrival?.documentId;
  const routeSegments = guarded.record.route?.segments ?? [];
  const departureAnchor = normalizeAnchor(guarded.revision.departureAnchor, routeSegments);
  const arrivalAnchor = normalizeAnchor(guarded.revision.arrivalAnchor, routeSegments);
  const chapters = normalizeChapters(guarded);
  const directions = new Set(guarded.revision.chaptersOnRoute?.map((entry) => entry.direction));
  const direction = directions.size === 1 && directions.has('ab')
    ? 'AB'
    : directions.size === 1 && directions.has('ba')
      ? 'BA'
      : null;

  if (
    !isNonEmptyString(routeKey)
    || !isNonEmptyString(slug)
    || !isNonEmptyString(departureCityDocumentId)
    || !isNonEmptyString(arrivalCityDocumentId)
    || !departureAnchor
    || !arrivalAnchor
    || !chapters
    || !direction
    || typeof guarded.revision.usesLoopOrigin !== 'boolean'
  ) {
    return null;
  }

  return {
    routeKey,
    direction,
    departureCityDocumentId,
    arrivalCityDocumentId,
    departureAnchor,
    arrivalAnchor,
    chapters,
    usesLoopOrigin: guarded.revision.usesLoopOrigin,
    warnings: guarded.dto.junctionWarnings.map((warning) => ({
      code: warning.code,
      afterChapterSlug: warning.afterChapterSlug,
      gapMetres: warning.gapMetres,
    })),
    slug,
  };
}
