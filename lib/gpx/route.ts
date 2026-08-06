import {
  cloneAllSequences,
  extractBetweenAnchors,
  extractFromAnchorToEnd,
  extractFromStartToAnchor,
} from './extract.ts';
import { distanceWgs84Metres } from './geometry.ts';
import { GpxContractError } from './parser.ts';
import type { GpxAnchor, GpxDocument, GpxPoint } from './types.ts';

export type GpxJunctionStatus = 'proposed' | 'exact' | 'accepted_gap' | 'blocked' | 'stale';

export interface GpxJunction {
  status: GpxJunctionStatus;
  sourceSha256: string;
  nextSourceSha256: string;
  gapMetres: number;
  reviewNote?: string | null;
}

export interface GpxRouteChapter {
  slug: string;
  sourceSha256: string;
  document: GpxDocument;
  junctionAfter: GpxJunction;
}

export interface GpxRoutePosition {
  chapterIndex: number;
  anchor: GpxAnchor;
}

export interface GpxRouteWarning {
  code: 'accepted_gap';
  afterChapterSlug: string;
  gapMetres: number;
}

export interface GpxRoutePortion {
  sequences: GpxPoint[][];
  chapterSlugs: string[];
  usesLoopOrigin: boolean;
  warnings: GpxRouteWarning[];
}

export const EXACT_JUNCTION_TOLERANCE_METRES = 1;
const JUNCTION_REPORT_TOLERANCE_METRES = 2;

function validatePosition(
  chapters: readonly GpxRouteChapter[],
  position: GpxRoutePosition
): GpxRouteChapter {
  if (!Number.isInteger(position.chapterIndex)) {
    throw new GpxContractError('invalid_selection', 'A chapter position is invalid.');
  }
  const chapter = chapters[position.chapterIndex];
  if (!chapter) {
    throw new GpxContractError('invalid_selection', 'A selected chapter does not exist.');
  }
  if (position.anchor.sourceSha256 !== chapter.sourceSha256) {
    throw new GpxContractError('stale_anchor', 'An anchor references another GPX revision.');
  }
  return chapter;
}

function buildVisitIndexes(
  chapterCount: number,
  start: GpxRoutePosition,
  end: GpxRoutePosition
): { indexes: number[]; usesLoopOrigin: boolean } {
  const directInSameChapter = start.chapterIndex === end.chapterIndex
    && end.anchor.chainageMetres >= start.anchor.chainageMetres;
  if (directInSameChapter) {
    return { indexes: [start.chapterIndex], usesLoopOrigin: false };
  }

  const indexes = [start.chapterIndex];
  let current = start.chapterIndex;
  for (let visit = 0; visit < chapterCount; visit += 1) {
    current = (current + 1) % chapterCount;
    indexes.push(current);
    if (current === end.chapterIndex) {
      return {
        indexes,
        usesLoopOrigin: end.chapterIndex <= start.chapterIndex,
      };
    }
  }

  throw new GpxContractError('invalid_selection', 'The selected portion exceeds one loop.');
}

function endpoint(sequence: readonly GpxPoint[], side: 'first' | 'last'): GpxPoint {
  const point = side === 'first' ? sequence[0] : sequence[sequence.length - 1];
  if (!point) {
    throw new GpxContractError('missing_geometry', 'A generated GPX sequence is empty.');
  }
  return point;
}

function isSameGpxPoint(first: GpxPoint, second: GpxPoint): boolean {
  return first.latitude === second.latitude
    && first.longitude === second.longitude
    && first.elevation === second.elevation;
}

function appendChapterSequences(
  target: GpxPoint[][],
  incoming: readonly (readonly GpxPoint[])[],
  junction: GpxJunction | null,
  afterChapterSlug: string | null,
  warnings: GpxRouteWarning[]
): void {
  const sequences = incoming
    .filter((sequence) => sequence.length > 0)
    .map((sequence) => sequence.map((point) => ({ ...point })));
  if (sequences.length === 0) {
    throw new GpxContractError('missing_geometry', 'A selected chapter has no GPX geometry.');
  }
  if (target.length === 0 || !junction) {
    target.push(...sequences);
    return;
  }

  const previousSequence = target[target.length - 1];
  const previousPoint = endpoint(previousSequence, 'last');
  const nextPoint = endpoint(sequences[0], 'first');
  const actualGapMetres = distanceWgs84Metres(previousPoint, nextPoint);

  if (
    !Number.isFinite(junction.gapMetres)
    || Math.abs(junction.gapMetres - actualGapMetres) > JUNCTION_REPORT_TOLERANCE_METRES
  ) {
    throw new GpxContractError(
      'stale_junction',
      'A junction no longer matches the qualified GPX sources.'
    );
  }

  if (junction.status === 'exact') {
    if (actualGapMetres > EXACT_JUNCTION_TOLERANCE_METRES) {
      throw new GpxContractError('invalid_junction', 'An exact GPX junction is no longer exact.');
    }
    previousSequence.push(...(
      isSameGpxPoint(previousPoint, nextPoint) ? sequences[0].slice(1) : sequences[0]
    ));
    target.push(...sequences.slice(1));
    return;
  }

  if (junction.status === 'accepted_gap') {
    target.push(...sequences);
    warnings.push({
      code: 'accepted_gap',
      afterChapterSlug: afterChapterSlug ?? 'unknown',
      gapMetres: actualGapMetres,
    });
    return;
  }

  throw new GpxContractError('blocked_junction', 'The selected portion crosses an unavailable junction.');
}

function uniqueInOrder(values: readonly string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}

export function extractRoutePortion(
  chapters: readonly GpxRouteChapter[],
  start: GpxRoutePosition,
  end: GpxRoutePosition
): GpxRoutePortion {
  // A route has at most ten distinct chapters. Crossing the loop origin can
  // visit the departure chapter a second time at the end of the extraction.
  if (chapters.length === 0 || chapters.length > 11) {
    throw new GpxContractError('invalid_manifest', 'The route chapter count is invalid.');
  }
  validatePosition(chapters, start);
  validatePosition(chapters, end);
  const { indexes, usesLoopOrigin } = buildVisitIndexes(chapters.length, start, end);
  const sequences: GpxPoint[][] = [];
  const warnings: GpxRouteWarning[] = [];

  indexes.forEach((chapterIndex, visitIndex) => {
    const chapter = chapters[chapterIndex];
    const isFirst = visitIndex === 0;
    const isLast = visitIndex === indexes.length - 1;
    const chapterSequences = isFirst && isLast
      ? extractBetweenAnchors(chapter.document, start.anchor, end.anchor)
      : isFirst
        ? extractFromAnchorToEnd(chapter.document, start.anchor)
        : isLast
          ? extractFromStartToAnchor(chapter.document, end.anchor)
          : cloneAllSequences(chapter.document);
    let junction: GpxJunction | null = null;
    let previousChapterSlug: string | null = null;

    if (!isFirst) {
      const previousIndex = indexes[visitIndex - 1];
      const previousChapter = chapters[previousIndex];
      junction = previousChapter.junctionAfter;
      previousChapterSlug = previousChapter.slug;
      if (
        junction.sourceSha256 !== previousChapter.sourceSha256
        || junction.nextSourceSha256 !== chapter.sourceSha256
      ) {
        throw new GpxContractError('stale_junction', 'A junction references another GPX revision.');
      }
    }

    appendChapterSequences(
      sequences,
      chapterSequences,
      junction,
      previousChapterSlug,
      warnings
    );
  });

  return {
    sequences,
    chapterSlugs: uniqueInOrder(indexes.map((index) => chapters[index].slug)),
    usesLoopOrigin,
    warnings,
  };
}
