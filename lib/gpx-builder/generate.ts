import { computeRouteMetrics } from '../gpx/metrics.ts';
import { extractRoutePortion, type GpxRouteChapter } from '../gpx/route.ts';
import { safeGpxFilename, serializeGpxPortion } from '../gpx/serialize.ts';
import type { GpxDirection, GpxDocument } from '../gpx/types.ts';
import type {
  GpxBuilderManifest,
  GpxBuilderMedia,
  GpxBuilderStop,
} from './manifest.ts';
import {
  GTHF_CATALOGUE_ROUTE_KEY,
  type BuilderCatalogueAnchorMatch,
  type BuilderCatalogueMatch,
} from './catalogue-link-core.ts';
import { GpxSourceError } from './source-loader-core.ts';

const MAXIMUM_CHAPTERS = 10;
const SOURCE_CONCURRENCY = 4;

export type GpxBuilderErrorCode =
  | 'disabled'
  | 'stale_revision'
  | 'invalid_selection'
  | 'invalid_manifest'
  | 'source_unavailable'
  | 'source_invalid'
  | 'source_stale'
  | 'generation_failed';

export class GpxBuilderError extends Error {
  readonly code: GpxBuilderErrorCode;

  constructor(
    code: GpxBuilderErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'GpxBuilderError';
    this.code = code;
  }
}

export interface GpxBuilderSelection {
  departureId: string;
  arrivalId: string;
  revision: string;
}

interface DirectionalGpxBuilderSelection extends GpxBuilderSelection {
  direction: GpxDirection;
}

export interface GpxBuilderSummary {
  departureName: string;
  arrivalName: string;
  direction: GpxDirection;
  distanceMetres: number;
  elevationAvailable: boolean;
  elevationGainMetres: number | null;
  elevationLossMetres: number | null;
  chapterCount: number;
  chapterTitles: string[];
  sequenceCount: number;
  usesLoopOrigin: boolean;
  warnings: Array<{
    code: 'accepted_gap';
    afterChapterSlug: string;
    gapMetres: number;
  }>;
}

export interface GeneratedGpxSelection {
  summary: GpxBuilderSummary;
  catalogueMatch: BuilderCatalogueMatch;
  filename: string;
  gpx: string;
}

export interface GenerateGpxSelectionInput {
  manifest: GpxBuilderManifest;
  selection: GpxBuilderSelection;
  generatedAt: Date;
  loadSource: (
    media: GpxBuilderMedia,
    expectedSha256: string
  ) => Promise<GpxDocument>;
}

interface GenerateDirectionalGpxSelectionInput extends Omit<GenerateGpxSelectionInput, 'selection'> {
  selection: DirectionalGpxBuilderSelection;
}

function findStop(stops: readonly GpxBuilderStop[], id: string): GpxBuilderStop {
  const stop = stops.find((candidate) => candidate.id === id);
  if (!stop) {
    throw new GpxBuilderError('invalid_selection', 'La ville sélectionnée est indisponible.');
  }
  return stop;
}

function catalogueAnchorMatch(
  manifest: GpxBuilderManifest,
  directionValue: GpxDirection,
  member: GpxBuilderStop['members'][number]
): BuilderCatalogueAnchorMatch {
  const chapter = manifest.directions[directionValue].chapters[member.chapterIndex];
  if (!chapter) {
    throw new GpxBuilderError('invalid_manifest', 'Une ancre référence un chapitre absent.');
  }
  return {
    chapterDocumentId: chapter.documentId,
    sourceSha256: member.anchor.sourceSha256,
    trackIndex: member.anchor.trackIndex,
    segmentIndex: member.anchor.segmentIndex,
    pointIndex: member.anchor.pointIndex,
    fraction: member.anchor.fraction,
  };
}

function visitIndexes(
  chapterCount: number,
  startChapterIndex: number,
  endChapterIndex: number,
  crossesOrigin: boolean
): number[] {
  if (startChapterIndex === endChapterIndex && !crossesOrigin) {
    return [startChapterIndex];
  }
  const indexes = [startChapterIndex];
  let current = startChapterIndex;
  for (let visit = 0; visit < chapterCount; visit += 1) {
    current = (current + 1) % chapterCount;
    indexes.push(current);
    if (current === endChapterIndex) {
      return indexes;
    }
  }
  throw new GpxBuilderError('invalid_selection', 'La portion dépasse un tour de boucle.');
}

function directionDistanceMetres(
  manifest: GpxBuilderManifest,
  directionValue: GpxDirection,
  departureId: string,
  arrivalId: string
): number {
  const direction = manifest.directions[directionValue];
  const departure = findStop(direction.stops, departureId);
  const arrival = findStop(direction.stops, arrivalId);
  const departureStopIndex = direction.stops.indexOf(departure);
  const arrivalStopIndex = direction.stops.indexOf(arrival);
  const departureMember = departure.members.at(-1);
  const arrivalMember = arrival.members[0];
  if (!departureMember || !arrivalMember) {
    throw new GpxBuilderError('invalid_manifest', 'Une ville ne possède pas d’ancrage utilisable.');
  }
  const crossesOrigin = arrivalStopIndex <= departureStopIndex;
  const indexes = visitIndexes(
    direction.chapters.length,
    departureMember.chapterIndex,
    arrivalMember.chapterIndex,
    crossesOrigin
  );
  if (indexes.length === 1) {
    return arrivalMember.anchor.chainageMetres - departureMember.anchor.chainageMetres;
  }
  return indexes.reduce((total, chapterIndex, visitIndex) => {
    const chapterDistance = direction.chapters[chapterIndex]?.distanceMetres;
    if (!Number.isFinite(chapterDistance) || chapterDistance < 0) {
      throw new GpxBuilderError('invalid_manifest', 'La longueur d’une trace officielle est invalide.');
    }
    if (visitIndex === 0) {
      return total + chapterDistance - departureMember.anchor.chainageMetres;
    }
    if (visitIndex === indexes.length - 1) {
      return total + arrivalMember.anchor.chainageMetres;
    }
    return total + chapterDistance;
  }, 0);
}

export function inferGpxDirection(
  manifest: GpxBuilderManifest,
  departureId: string,
  arrivalId: string
): GpxDirection {
  if (departureId === arrivalId) {
    throw new GpxBuilderError(
      'invalid_selection',
      'Les villes de départ et d’arrivée doivent être différentes.'
    );
  }
  const distanceAB = directionDistanceMetres(manifest, 'AB', departureId, arrivalId);
  const distanceBA = directionDistanceMetres(manifest, 'BA', departureId, arrivalId);
  return distanceAB <= distanceBA ? 'AB' : 'BA';
}

async function loadWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  load: (value: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await load(values[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker())
  );
  return results;
}

export async function generateDirectionalGpxSelection(
  input: GenerateDirectionalGpxSelectionInput
): Promise<GeneratedGpxSelection> {
  const { manifest, selection } = input;
  if (!manifest.enabled) {
    throw new GpxBuilderError('disabled', 'Le générateur GPX est temporairement indisponible.');
  }
  if (selection.revision !== manifest.revision) {
    throw new GpxBuilderError(
      'stale_revision',
      'La liste des villes a été actualisée. Rechargez la page.'
    );
  }
  if (selection.direction !== 'AB' && selection.direction !== 'BA') {
    throw new GpxBuilderError('invalid_selection', 'Le sens sélectionné est invalide.');
  }
  if (selection.departureId === selection.arrivalId) {
    throw new GpxBuilderError(
      'invalid_selection',
      'Les villes de départ et d’arrivée doivent être différentes.'
    );
  }

  const direction = manifest.directions[selection.direction];
  if (
    direction.chapters.length === 0
    || direction.chapters.length > MAXIMUM_CHAPTERS
  ) {
    throw new GpxBuilderError('invalid_manifest', 'Le parcours officiel est incomplet.');
  }

  const departure = findStop(direction.stops, selection.departureId);
  const arrival = findStop(direction.stops, selection.arrivalId);
  const departureStopIndex = direction.stops.indexOf(departure);
  const arrivalStopIndex = direction.stops.indexOf(arrival);
  const departureMember = departure.members.at(-1);
  const arrivalMember = arrival.members[0];
  if (!departureMember || !arrivalMember) {
    throw new GpxBuilderError('invalid_manifest', 'Une ville ne possède pas d’ancrage utilisable.');
  }

  const selectionCrossesLoopOrigin = arrivalStopIndex <= departureStopIndex;
  const selectedVisitIndexes = visitIndexes(
    direction.chapters.length,
    departureMember.chapterIndex,
    arrivalMember.chapterIndex,
    selectionCrossesLoopOrigin
  );
  const sourceIndexes = [...new Set(selectedVisitIndexes)];
  let documents: GpxDocument[];
  try {
    documents = await loadWithConcurrency(
      sourceIndexes,
      SOURCE_CONCURRENCY,
      (chapterIndex) => {
        const chapter = direction.chapters[chapterIndex];
        return input.loadSource(chapter.media, chapter.sourceSha256);
      }
    );
  } catch (error) {
    if (error instanceof GpxSourceError) {
      throw new GpxBuilderError(error.code, error.message);
    }
    throw error;
  }
  const documentsByIndex = new Map(
    sourceIndexes.map((chapterIndex, index) => [chapterIndex, documents[index]])
  );
  const routeChapters: GpxRouteChapter[] = selectedVisitIndexes.map((chapterIndex) => {
    const chapter = direction.chapters[chapterIndex];
    const document = documentsByIndex.get(chapterIndex);
    if (!document) {
      throw new GpxBuilderError('generation_failed', 'Une trace officielle n’a pas pu être chargée.');
    }
    return {
      slug: chapter.slug,
      sourceSha256: chapter.sourceSha256,
      document,
      junctionAfter: chapter.junctionAfter,
    };
  });
  const portion = extractRoutePortion(
    routeChapters,
    {
      chapterIndex: 0,
      anchor: departureMember.anchor,
    },
    {
      chapterIndex: routeChapters.length - 1,
      anchor: arrivalMember.anchor,
    }
  );
  const metrics = computeRouteMetrics(portion.sequences);
  const gpx = serializeGpxPortion({
    departureName: departure.name,
    arrivalName: arrival.name,
    direction: selection.direction,
    generatedAt: input.generatedAt,
    sequences: portion.sequences,
  });

  return {
    summary: {
      departureName: departure.name,
      arrivalName: arrival.name,
      direction: selection.direction,
      distanceMetres: metrics.distanceMetres,
      elevationAvailable: metrics.elevationAvailable,
      elevationGainMetres: metrics.elevationGainMetres,
      elevationLossMetres: metrics.elevationLossMetres,
      chapterCount: portion.chapterSlugs.length,
      chapterTitles: portion.chapterSlugs.map((slug) => (
        direction.chapters.find((chapter) => chapter.slug === slug)?.title ?? slug
      )),
      sequenceCount: portion.sequences.length,
      // routeChapters is already reordered into visit order, so portion.usesLoopOrigin
      // cannot represent a crossing of the original manifest loop boundary.
      usesLoopOrigin: selectionCrossesLoopOrigin,
      warnings: portion.warnings,
    },
    catalogueMatch: {
      routeKey: GTHF_CATALOGUE_ROUTE_KEY,
      direction: selection.direction,
      departureCityDocumentId: departure.cityDocumentId,
      arrivalCityDocumentId: arrival.cityDocumentId,
      departureAnchor: catalogueAnchorMatch(
        manifest,
        selection.direction,
        departureMember
      ),
      arrivalAnchor: catalogueAnchorMatch(
        manifest,
        selection.direction,
        arrivalMember
      ),
      chapters: selectedVisitIndexes.map((chapterIndex, visitIndex) => {
        const chapter = direction.chapters[chapterIndex];
        if (
          chapter.junctionAfter.status !== 'exact'
          && chapter.junctionAfter.status !== 'accepted_gap'
        ) {
          throw new GpxBuilderError(
            'invalid_manifest',
            'Une jonction du parcours officiel n’est pas qualifiée.'
          );
        }
        return {
          chapterDocumentId: chapter.documentId,
          sourceSha256: chapter.sourceSha256,
          junctionAfter: visitIndex < selectedVisitIndexes.length - 1
            ? {
                status: chapter.junctionAfter.status,
                sourceSha256: chapter.junctionAfter.sourceSha256,
                nextSourceSha256: chapter.junctionAfter.nextSourceSha256,
                gapMetres: chapter.junctionAfter.gapMetres,
              }
            : null,
        };
      }),
      usesLoopOrigin: selectionCrossesLoopOrigin,
      warnings: portion.warnings.map((warning) => ({ ...warning })),
    },
    filename: safeGpxFilename(departure.name, arrival.name, selection.direction),
    gpx,
  };
}

export async function generateGpxSelection(
  input: GenerateGpxSelectionInput
): Promise<GeneratedGpxSelection> {
  const { manifest, selection } = input;
  if (!manifest.enabled) {
    throw new GpxBuilderError('disabled', 'Le générateur GPX est temporairement indisponible.');
  }
  if (selection.revision !== manifest.revision) {
    throw new GpxBuilderError(
      'stale_revision',
      'La liste des villes a été actualisée. Rechargez la page.'
    );
  }
  const direction = inferGpxDirection(
    manifest,
    selection.departureId,
    selection.arrivalId
  );
  return generateDirectionalGpxSelection({
    ...input,
    selection: { ...selection, direction },
  });
}
