import { createHash } from 'node:crypto';

import type {
  CityItineraryRecord,
  GuardedItinerary,
  ItineraryCity,
  ItineraryRevision,
  PublicItinerary,
  PublicItineraryCity,
  PublicJunctionWarning,
} from './types';

export type ItineraryGuardFailure =
  | 'catalogue_disabled'
  | 'route_unavailable'
  | 'city_unavailable'
  | 'itinerary_unavailable'
  | 'editorial_review_required'
  | 'revision_missing'
  | 'revision_mismatch'
  | 'revision_not_publishable'
  | 'revision_stale'
  | 'ineligible'
  | 'artifact_unavailable'
  | 'invalid_public_data';

export type ItineraryGuardResult =
  | { ok: true; value: GuardedItinerary }
  | { ok: false; reason: ItineraryGuardFailure };

const SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const SAFE_SLUG_PATTERN = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isSha256(value: unknown): value is string {
  return isNonEmptyString(value) && SHA256_PATTERN.test(value);
}

export function computeArtifactIntegrityHash(input: {
  sourceHash: string;
  generatedGpxSha256: string;
  displayGeometrySha256: string;
}): string {
  const canonicalPayload = JSON.stringify({
    displayGeometrySha256: input.displayGeometrySha256.toLowerCase(),
    generatedGpxSha256: input.generatedGpxSha256.toLowerCase(),
    sourceHash: input.sourceHash.toLowerCase(),
    version: 1,
  });
  return createHash('sha256').update(canonicalPayload).digest('hex');
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isValidDate(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function publicCity(city: ItineraryCity): PublicItineraryCity | null {
  if (!isNonEmptyString(city.documentId) || !isNonEmptyString(city.name)) {
    return null;
  }

  const hasPublicHub = city.hasPublicPage === true
    && isNonEmptyString(city.slug)
    && SAFE_SLUG_PATTERN.test(city.slug)
    && isValidDate(city.publishedAt);

  return {
    documentId: city.documentId,
    name: city.name,
    href: hasPublicHub ? `/villes/${city.slug}` : null,
  };
}

function parseJunctionWarnings(value: unknown): PublicJunctionWarning[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const warnings: PublicJunctionWarning[] = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object') {
      return null;
    }

    const warning = candidate as Record<string, unknown>;
    if (
      warning.code !== 'accepted_gap'
      || !isNonEmptyString(warning.afterChapterSlug)
      || !SAFE_SLUG_PATTERN.test(warning.afterChapterSlug)
      || !isNonEmptyString(warning.beforeChapterSlug)
      || !SAFE_SLUG_PATTERN.test(warning.beforeChapterSlug)
      || !isFiniteNonNegative(warning.gapMetres)
    ) {
      return null;
    }

    warnings.push({
      code: 'accepted_gap',
      afterChapterSlug: warning.afterChapterSlug,
      beforeChapterSlug: warning.beforeChapterSlug,
      gapMetres: warning.gapMetres,
      message: `La portion traverse une rupture connue et validée d’environ ${Math.round(warning.gapMetres)} m. Le GPX conserve deux segments distincts.`,
    });
  }
  return warnings;
}

function hasContiguousRouteOrder(entries: Array<{ routeOrder?: number }>): boolean {
  const orders = entries.map((entry) => entry.routeOrder);
  if (orders.some((order) => !Number.isSafeInteger(order) || (order as number) < 0)) {
    return false;
  }
  const sorted = [...orders as number[]].sort((left, right) => left - right);
  return sorted[0] === 0 && sorted.every((order, index) => order === index);
}

function hasMatchingPair(record: CityItineraryRecord, revision: ItineraryRevision): boolean {
  const pair = [record.cityA?.documentId, record.cityB?.documentId].sort();
  const revisionPair = [revision.departure?.documentId, revision.arrival?.documentId].sort();

  return pair.length === 2
    && pair.every(isNonEmptyString)
    && revisionPair.length === 2
    && revisionPair.every(isNonEmptyString)
    && pair[0] === revisionPair[0]
    && pair[1] === revisionPair[1]
    && pair[0] !== pair[1];
}

function hasMatchingItinerary(record: CityItineraryRecord, revision: ItineraryRevision): boolean {
  return isNonEmptyString(record.documentId)
    && isNonEmptyString(record.businessKey)
    && revision.itinerary?.documentId === record.documentId
    && revision.itinerary?.businessKey === record.businessKey;
}

function warningIsApproved(revision: ItineraryRevision): boolean {
  return revision.warningApproved === true
    && isValidDate(revision.warningApprovedAt)
    && isNonEmptyString(revision.warningApprovedBy);
}

function readyHasNoWarningApproval(revision: ItineraryRevision): boolean {
  return revision.warningApproved === false
    && revision.warningApprovedAt == null
    && revision.warningApprovedBy == null;
}

function revisionIsPublishable(revision: ItineraryRevision, preview: boolean): boolean {
  if (revision.calculationStatus === 'ready') {
    return readyHasNoWarningApproval(revision);
  }

  if (revision.calculationStatus === 'warning') {
    return preview || warningIsApproved(revision);
  }

  return false;
}

function hasVerifiedArtifacts(revision: ItineraryRevision): boolean {
  if (
    revision.artifactIntegrityStatus !== 'verified'
    || !isSha256(revision.artifactIntegrityHash)
    || !isSha256(revision.sourceHash)
    || !isSha256(revision.generatedGpxSha256)
    || !isSha256(revision.displayGeometrySha256)
  ) {
    return false;
  }

  const expectedIntegrityHash = computeArtifactIntegrityHash({
    sourceHash: revision.sourceHash,
    generatedGpxSha256: revision.generatedGpxSha256,
    displayGeometrySha256: revision.displayGeometrySha256,
  });

  return revision.artifactIntegrityHash.toLowerCase() === expectedIntegrityHash
    && isNonEmptyString(revision.generatedGpx?.url)
    && isNonEmptyString(revision.generatedGpx.name)
    && revision.generatedGpx.name.endsWith('.gpx')
    && revision.generatedGpx.mime?.toLowerCase() === 'application/gpx+xml'
    && isNonEmptyString(revision.generatedGpx.hash)
    && isNonEmptyString(revision.displayGeometry?.url)
    && isNonEmptyString(revision.displayGeometry.name)
    && revision.displayGeometry.name.endsWith('.json')
    && revision.displayGeometry.mime?.toLowerCase() === 'application/json'
    && isNonEmptyString(revision.displayGeometry.hash);
}

function buildPublicDto(
  record: CityItineraryRecord,
  revision: ItineraryRevision,
  preview: boolean
): PublicItinerary | null {
  if (
    !isNonEmptyString(record.documentId)
    || !isNonEmptyString(record.businessKey)
    || !isNonEmptyString(record.slug)
    || !SAFE_SLUG_PATTERN.test(record.slug)
    || !isNonEmptyString(record.title)
    || !isNonEmptyString(record.route?.name)
    || !isNonEmptyString(record.route.routeKey)
    || !record.businessKey.startsWith(`${record.route.routeKey}:`)
    || !record.cityA
    || !record.cityB
    || !revision.departure
    || !revision.arrival
    || !isNonEmptyString(revision.documentId)
    || !isNonEmptyString(revision.revisionKey)
    || !isFiniteNonNegative(revision.distanceMetres)
    || revision.distanceMetres === 0
    || !isFiniteNonNegative(revision.asTheCrowFliesMetres)
    || revision.asTheCrowFliesMetres === 0
    || !isFiniteNonNegative(revision.detourRatio)
    || typeof revision.elevationAvailable !== 'boolean'
    || typeof revision.usesLoopOrigin !== 'boolean'
    || !isValidDate(revision.updatedAt ?? record.updatedAt)
  ) {
    return null;
  }

  const departure = publicCity(revision.departure);
  const arrival = publicCity(revision.arrival);
  if (!departure || !arrival) {
    return null;
  }

  const chapterEntries = revision.chaptersOnRoute ?? [];
  if (!hasContiguousRouteOrder(chapterEntries)) {
    return null;
  }
  const chapters = [...chapterEntries]
    .sort((left, right) => (left.routeOrder ?? 0) - (right.routeOrder ?? 0))
    .map((entry) => {
      const chapter = entry.chapter;
      if (
        !chapter
        || !isNonEmptyString(chapter.documentId)
        || !isNonEmptyString(chapter.title)
        || !isNonEmptyString(chapter.slug)
        || !SAFE_SLUG_PATTERN.test(chapter.slug)
        || (entry.direction !== 'ab' && entry.direction !== 'ba')
        || !isFiniteNonNegative(entry.distanceMetres)
        || (!preview && !isValidDate(chapter.publishedAt))
      ) {
        return null;
      }

      return {
        documentId: chapter.documentId,
        title: chapter.title,
        href: `/chapitres/${chapter.slug}`,
        distanceMetres: entry.distanceMetres,
        direction: entry.direction,
      };
    });

  if (chapters.length === 0 || chapters.some((chapter) => chapter === null)) {
    return null;
  }
  const publicChapters = chapters as PublicItinerary['chapters'];
  if (new Set(publicChapters.map((chapter) => chapter.documentId)).size !== publicChapters.length) {
    return null;
  }

  const chapterDistance = publicChapters.reduce(
    (total, chapter) => total + chapter.distanceMetres,
    0
  );
  const distanceTolerance = Math.max(1, revision.distanceMetres * 0.0001);
  if (Math.abs(chapterDistance - revision.distanceMetres) > distanceTolerance) {
    return null;
  }

  const cityEntries = revision.citiesOnRoute ?? [];
  if (
    !hasContiguousRouteOrder(cityEntries)
    || cityEntries.some((entry) => (
      !Number.isSafeInteger(entry.occurrenceIndex)
      || (entry.occurrenceIndex as number) < 0
      || !isFiniteNonNegative(entry.chainageFromDepartureMetres)
    ))
  ) {
    return null;
  }
  const sortedCityEntries = [...cityEntries]
    .sort((left, right) => (left.routeOrder ?? 0) - (right.routeOrder ?? 0))
  const cities = sortedCityEntries.map((entry) => entry.city ? publicCity(entry.city) : null);

  if (cities.length < 2 || cities.some((city) => city === null)) {
    return null;
  }
  const publicCities = cities as PublicItinerary['cities'];
  if (
    publicCities[0].documentId !== departure.documentId
    || publicCities.at(-1)?.documentId !== arrival.documentId
    || new Set(publicCities.map((city) => city.documentId)).size !== publicCities.length
  ) {
    return null;
  }
  const cityChainages = sortedCityEntries.map((entry) => entry.chainageFromDepartureMetres!);
  if (
    Math.abs(cityChainages[0]) > distanceTolerance
    || Math.abs(cityChainages.at(-1)! - revision.distanceMetres) > distanceTolerance
    || cityChainages.some((chainage, index) => index > 0 && chainage < cityChainages[index - 1])
  ) {
    return null;
  }

  const elevationAvailable = revision.elevationAvailable;
  if (
    (elevationAvailable
      && (!isFiniteNonNegative(revision.elevationGainMetres)
        || !isFiniteNonNegative(revision.elevationLossMetres)))
    || (!elevationAvailable
      && (revision.elevationGainMetres != null || revision.elevationLossMetres != null))
  ) {
    return null;
  }

  const junctionWarnings = parseJunctionWarnings(revision.junctionWarnings);
  if (!junctionWarnings) {
    return null;
  }

  return {
    documentId: record.documentId,
    businessKey: record.businessKey,
    slug: record.slug,
    title: record.title,
    routeName: record.route.name,
    departure,
    arrival,
    distanceMetres: revision.distanceMetres,
    asTheCrowFliesMetres: revision.asTheCrowFliesMetres,
    elevationGainMetres: elevationAvailable ? revision.elevationGainMetres! : null,
    elevationLossMetres: elevationAvailable ? revision.elevationLossMetres! : null,
    elevationAvailable,
    eligibleByRoute: revision.eligibleByRoute === true,
    eligibleByDirect: revision.eligibleByDirect === true,
    detourRatio: revision.detourRatio,
    usesLoopOrigin: revision.usesLoopOrigin,
    junctionWarnings,
    chapters: publicChapters,
    cities: publicCities,
    introduction: isNonEmptyString(record.introduction) ? record.introduction : null,
    blocks: Array.isArray(record.blocks) ? record.blocks : [],
    seo: {
      metaTitle: isNonEmptyString(record.seo?.metaTitle) ? record.seo.metaTitle : null,
      metaDescription: isNonEmptyString(record.seo?.metaDescription)
        ? record.seo.metaDescription
        : null,
      shareImageUrl: isNonEmptyString(record.seo?.shareImage?.url)
        ? record.seo.shareImage.url
        : null,
    },
    seoStatus: record.seoStatus === 'indexable' ? 'indexable' : 'noindex',
    featuredOnCityPages: record.featuredOnCityPages === true,
    editorialOrder: typeof record.editorialOrder === 'number'
      && Number.isFinite(record.editorialOrder)
      ? record.editorialOrder
      : null,
    revisionUpdatedAt: (revision.updatedAt ?? record.updatedAt)!,
    downloadPath: `/itineraires-velo/${record.slug}/gpx`,
    geometryPath: `/itineraires-velo/${record.slug}/geometry`,
    isPreview: preview,
  };
}

export function guardCityItinerary(
  record: CityItineraryRecord,
  options: { catalogueEnabled: boolean; preview?: boolean }
): ItineraryGuardResult {
  const preview = options.preview === true;

  if (!preview && !options.catalogueEnabled) {
    return { ok: false, reason: 'catalogue_disabled' };
  }

  if (
    !record.route
    || !isSha256(record.route.currentInputFingerprint)
    || !isNonEmptyString(record.route.algorithmVersion)
    || (!preview && (!isValidDate(record.route.publishedAt) || record.route.catalogueEnabled !== true))
  ) {
    return { ok: false, reason: 'route_unavailable' };
  }

  if (
    !record.cityA
    || !record.cityB
    || (!preview && (!isValidDate(record.cityA.publishedAt) || !isValidDate(record.cityB.publishedAt)))
  ) {
    return { ok: false, reason: 'city_unavailable' };
  }

  if (
    !preview
    && (!isValidDate(record.publishedAt) || record.publicationNext !== true)
  ) {
    return { ok: false, reason: 'itinerary_unavailable' };
  }

  if (!preview && record.reviewStatus !== 'approved') {
    return { ok: false, reason: 'editorial_review_required' };
  }

  const revision = record.activeRevision;
  if (!revision) {
    return { ok: false, reason: 'revision_missing' };
  }

  if (
    !hasMatchingItinerary(record, revision)
    || !hasMatchingPair(record, revision)
    || revision.algorithmVersion !== record.route.algorithmVersion
  ) {
    return { ok: false, reason: 'revision_mismatch' };
  }

  if (!revisionIsPublishable(revision, preview)) {
    return { ok: false, reason: 'revision_not_publishable' };
  }

  if (
    !isSha256(record.currentEvaluationHash)
    || !isSha256(revision.lastVerifiedEvaluationHash)
    || revision.lastVerifiedEvaluationHash !== record.currentEvaluationHash
  ) {
    return { ok: false, reason: 'revision_stale' };
  }

  if (
    typeof revision.eligibleByRoute !== 'boolean'
    || typeof revision.eligibleByDirect !== 'boolean'
    || (revision.eligibleByRoute !== true && revision.eligibleByDirect !== true)
  ) {
    return { ok: false, reason: 'ineligible' };
  }

  if (!hasVerifiedArtifacts(revision)) {
    return { ok: false, reason: 'artifact_unavailable' };
  }

  const dto = buildPublicDto(record, revision, preview);
  if (!dto) {
    return { ok: false, reason: 'invalid_public_data' };
  }

  return { ok: true, value: { record, revision, dto } };
}
