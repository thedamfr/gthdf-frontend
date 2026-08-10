import type { GpxDirection } from '../gpx/types.ts';

const SAFE_SLUG_PATTERN = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;
const DEFAULT_CATALOGUE_LOOKUP_TIMEOUT_MILLISECONDS = 1_000;

export const CATALOGUE_ITINERARY_LINK_LABEL = 'Découvrir cet itinéraire' as const;
// The PRD03 Builder is bound to the single canonical loop published by PRD04.
export const GTHF_CATALOGUE_ROUTE_KEY = 'gthf-main-loop';

export interface CatalogueItineraryLink {
  href: `/itineraires-velo/${string}`;
  label: typeof CATALOGUE_ITINERARY_LINK_LABEL;
}

export interface BuilderCatalogueAnchorMatch {
  chapterDocumentId: string;
  sourceSha256: string;
  trackIndex: number;
  segmentIndex: number;
  pointIndex: number;
  fraction: number;
}

export interface BuilderCatalogueJunctionMatch {
  status: 'exact' | 'accepted_gap';
  sourceSha256: string;
  nextSourceSha256: string;
  gapMetres: number;
}

export interface BuilderCatalogueChapterMatch {
  chapterDocumentId: string;
  sourceSha256: string;
  junctionAfter: BuilderCatalogueJunctionMatch | null;
}

export interface BuilderCatalogueWarningMatch {
  code: 'accepted_gap';
  afterChapterSlug: string;
  gapMetres: number;
}

export interface BuilderCatalogueMatch {
  routeKey: string;
  direction: GpxDirection;
  departureCityDocumentId: string;
  arrivalCityDocumentId: string;
  departureAnchor: BuilderCatalogueAnchorMatch;
  arrivalAnchor: BuilderCatalogueAnchorMatch;
  chapters: BuilderCatalogueChapterMatch[];
  usesLoopOrigin: boolean;
  warnings: BuilderCatalogueWarningMatch[];
}

export interface CatalogueItineraryMatchCandidate extends BuilderCatalogueMatch {
  slug: string;
}

function sameAnchor(
  first: BuilderCatalogueAnchorMatch,
  second: BuilderCatalogueAnchorMatch
): boolean {
  return first.chapterDocumentId === second.chapterDocumentId
    && first.sourceSha256 === second.sourceSha256
    && first.trackIndex === second.trackIndex
    && first.segmentIndex === second.segmentIndex
    && first.pointIndex === second.pointIndex
    && first.fraction === second.fraction;
}

function sameJunction(
  first: BuilderCatalogueJunctionMatch | null,
  second: BuilderCatalogueJunctionMatch | null
): boolean {
  if (!first || !second) {
    return first === second;
  }
  return first.status === second.status
    && first.sourceSha256 === second.sourceSha256
    && first.nextSourceSha256 === second.nextSourceSha256
    && first.gapMetres === second.gapMetres;
}

function sameChapters(
  first: readonly BuilderCatalogueChapterMatch[],
  second: readonly BuilderCatalogueChapterMatch[]
): boolean {
  return first.length === second.length && first.every((chapter, index) => (
    chapter.chapterDocumentId === second[index].chapterDocumentId
    && chapter.sourceSha256 === second[index].sourceSha256
    && sameJunction(chapter.junctionAfter, second[index].junctionAfter)
  ));
}

function sameWarnings(
  first: readonly BuilderCatalogueWarningMatch[],
  second: readonly BuilderCatalogueWarningMatch[]
): boolean {
  return first.length === second.length && first.every((warning, index) => (
    warning.code === second[index].code
    && warning.afterChapterSlug === second[index].afterChapterSlug
    && warning.gapMetres === second[index].gapMetres
  ));
}

function sameMatch(
  match: BuilderCatalogueMatch,
  candidate: CatalogueItineraryMatchCandidate
): boolean {
  return match.routeKey === candidate.routeKey
    && match.direction === candidate.direction
    && match.departureCityDocumentId === candidate.departureCityDocumentId
    && match.arrivalCityDocumentId === candidate.arrivalCityDocumentId
    && sameAnchor(match.departureAnchor, candidate.departureAnchor)
    && sameAnchor(match.arrivalAnchor, candidate.arrivalAnchor)
    && sameChapters(match.chapters, candidate.chapters)
    && match.usesLoopOrigin === candidate.usesLoopOrigin
    && sameWarnings(match.warnings, candidate.warnings);
}

export function resolveCatalogueItineraryLink(
  match: BuilderCatalogueMatch,
  candidates: readonly CatalogueItineraryMatchCandidate[]
): CatalogueItineraryLink | null {
  if (match.direction !== 'AB') {
    return null;
  }

  const exactCandidates = candidates.filter((candidate) => (
    SAFE_SLUG_PATTERN.test(candidate.slug)
    && sameMatch(match, candidate)
  ));
  if (exactCandidates.length !== 1) {
    return null;
  }

  return {
    href: `/itineraires-velo/${exactCandidates[0].slug}`,
    label: CATALOGUE_ITINERARY_LINK_LABEL,
  };
}

export async function loadOptionalCatalogueItineraryLink(
  load: () => Promise<CatalogueItineraryLink | null>,
  timeoutMilliseconds = DEFAULT_CATALOGUE_LOOKUP_TIMEOUT_MILLISECONDS
): Promise<CatalogueItineraryLink | null> {
  if (!Number.isFinite(timeoutMilliseconds) || timeoutMilliseconds <= 0) {
    return null;
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      load(),
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => resolve(null), timeoutMilliseconds);
      }),
    ]);
  } catch {
    return null;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
