import { computeRouteMetrics } from '../gpx/metrics.ts';
import { extractRoutePortion, type GpxRouteChapter } from '../gpx/route.ts';
import { safeGpxFilename, serializeGpxPortion } from '../gpx/serialize.ts';
import type { GpxDirection, GpxDocument } from '../gpx/types.ts';
import type {
  GpxBuilderManifest,
  GpxBuilderMedia,
  GpxBuilderStop,
} from './manifest.ts';
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
  direction: GpxDirection;
  departureId: string;
  arrivalId: string;
  revision: string;
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

function findStop(stops: readonly GpxBuilderStop[], id: string): GpxBuilderStop {
  const stop = stops.find((candidate) => candidate.id === id);
  if (!stop) {
    throw new GpxBuilderError('invalid_selection', 'La ville sélectionnée est indisponible.');
  }
  return stop;
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
    filename: safeGpxFilename(departure.name, arrival.name, selection.direction),
    gpx,
  };
}
