import { createHash } from 'node:crypto';

import type { GpxAnchor, GpxDirection } from '../gpx/types.ts';
import type { GpxJunction } from '../gpx/route.ts';

const SHA_256 = /^[a-f0-9]{64}$/;
const DECIMAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

export interface GpxBuilderMedia {
  url: string;
  documentId?: string;
  updatedAt?: string;
}

export interface GpxBuilderCity {
  documentId: string;
  name: string;
  alternativeNames?: string[];
  publishedAt?: string | null;
}

export interface GpxBuilderPassage {
  id: number;
  city: GpxBuilderCity;
  gpxAnchorAB: GpxAnchor;
  gpxAnchorBA: GpxAnchor;
}

export interface GpxBuilderChapterInput {
  documentId: string;
  title: string;
  slug: string;
  displayOrder: number;
  startStation: string;
  endStation: string;
  gpxFileAB: GpxBuilderMedia;
  gpxFileBA: GpxBuilderMedia;
  cityPassages: GpxBuilderPassage[];
  gpxJunctionAfterAB: GpxJunction;
  gpxJunctionAfterBA: GpxJunction;
}

export interface GpxBuilderStopMember {
  chapterIndex: number;
  passageId: number;
  anchor: GpxAnchor;
}

export interface GpxBuilderStop {
  id: string;
  cityDocumentId: string;
  name: string;
  alternativeNames: string[];
  context: string | null;
  members: GpxBuilderStopMember[];
}

export interface GpxBuilderChapter {
  documentId: string;
  slug: string;
  title: string;
  media: GpxBuilderMedia;
  sourceSha256: string;
  junctionAfter: GpxJunction;
}

export interface GpxBuilderDirectionManifest {
  label: string;
  chapters: GpxBuilderChapter[];
  stops: GpxBuilderStop[];
}

export interface GpxBuilderManifest {
  enabled: boolean;
  revision: string;
  directions: Record<GpxDirection, GpxBuilderDirectionManifest>;
}

export interface PublicGpxBuilderStop {
  id: string;
  name: string;
  alternativeNames: string[];
  context: string | null;
}

export interface PublicGpxBuilderDirection {
  label: string;
  stops: PublicGpxBuilderStop[];
}

export interface PublicGpxBuilderManifest {
  enabled: boolean;
  revision: string;
  directions: Record<GpxDirection, PublicGpxBuilderDirection>;
}

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string' || !DECIMAL.test(value.trim())) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeAnchor(value: unknown, label: string): GpxAnchor {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`L’ancrage ${label} est absent.`);
  }
  const anchor = value as Record<string, unknown>;
  const fraction = finiteNumber(anchor.fraction);
  const chainageMetres = finiteNumber(anchor.chainageMetres);
  const projectedLatitude = finiteNumber(anchor.projectedLatitude);
  const projectedLongitude = finiteNumber(anchor.projectedLongitude);
  const distanceToCityMetres = finiteNumber(anchor.distanceToCityMetres);
  if (
    anchor.status !== 'validated'
    || typeof anchor.sourceSha256 !== 'string'
    || !SHA_256.test(anchor.sourceSha256.toLowerCase())
    || !Number.isInteger(anchor.trackIndex)
    || Number(anchor.trackIndex) < 0
    || !Number.isInteger(anchor.segmentIndex)
    || Number(anchor.segmentIndex) < 0
    || !Number.isInteger(anchor.pointIndex)
    || Number(anchor.pointIndex) < 0
    || fraction === null || fraction < 0 || fraction > 1
    || chainageMetres === null || chainageMetres < 0
    || projectedLatitude === null || projectedLatitude < -90 || projectedLatitude > 90
    || projectedLongitude === null || projectedLongitude < -180 || projectedLongitude > 180
    || distanceToCityMetres === null || distanceToCityMetres < 0
    || typeof anchor.algorithmVersion !== 'string'
    || !anchor.algorithmVersion.trim()
  ) {
    throw new Error(`L’ancrage ${label} n’est pas qualifié.`);
  }
  return {
    status: 'validated',
    sourceSha256: anchor.sourceSha256.toLowerCase(),
    trackIndex: Number(anchor.trackIndex),
    segmentIndex: Number(anchor.segmentIndex),
    pointIndex: Number(anchor.pointIndex),
    fraction,
    chainageMetres,
    projectedLatitude,
    projectedLongitude,
    distanceToCityMetres,
    algorithmVersion: anchor.algorithmVersion,
    ...(typeof anchor.reviewNote === 'string' ? { reviewNote: anchor.reviewNote } : {}),
  };
}

function stableStopId(
  direction: GpxDirection,
  cityDocumentId: string,
  chapterDocumentId: string,
  passageId: number
): string {
  return `stop_${digest(
    `${direction}:${cityDocumentId}:${chapterDocumentId}:${passageId}`
  ).slice(0, 16)}`;
}

function sourceHash(anchor: GpxAnchor, label: string): string {
  const hash = anchor.sourceSha256.toLowerCase();
  if (anchor.status !== 'validated' || !SHA_256.test(hash)) {
    throw new Error(`L’ancrage ${label} n’est pas qualifié.`);
  }
  return hash;
}

function directionValue<T>(
  direction: GpxDirection,
  ab: T,
  ba: T
): T {
  return direction === 'AB' ? ab : ba;
}

function buildDirection(
  direction: GpxDirection,
  orderedChapters: readonly GpxBuilderChapterInput[]
): GpxBuilderDirectionManifest {
  const sourceChapters = direction === 'AB'
    ? orderedChapters
    : [...orderedChapters].reverse();
  const chapters: GpxBuilderChapter[] = [];
  const stops: GpxBuilderStop[] = [];

  sourceChapters.forEach((chapter, chapterIndex) => {
    const passages = direction === 'AB'
      ? chapter.cityPassages
      : [...chapter.cityPassages].reverse();
    if (passages.length < 2) {
      throw new Error(`Le chapitre « ${chapter.title} » ne contient pas assez de villes.`);
    }

    const firstAnchor = normalizeAnchor(
      directionValue(
        direction,
        passages[0].gpxAnchorAB,
        passages[0].gpxAnchorBA
      ),
      direction
    );
    const hash = sourceHash(firstAnchor, direction);
    let previousChainage = -Infinity;
    for (const passage of passages) {
      const anchor = normalizeAnchor(
        directionValue(
          direction,
          passage.gpxAnchorAB,
          passage.gpxAnchorBA
        ),
        direction
      );
      if (sourceHash(anchor, direction) !== hash) {
        throw new Error(`Les ancrages ${direction} du chapitre « ${chapter.title} » sont incohérents.`);
      }
      if (
        !Number.isFinite(anchor.chainageMetres)
        || anchor.chainageMetres <= previousChainage
      ) {
        throw new Error(`Les ancrages ${direction} du chapitre « ${chapter.title} » sont désordonnés.`);
      }
      previousChainage = anchor.chainageMetres;
      if (
        !Number.isInteger(passage.id)
        || !passage.city?.documentId
        || !passage.city.name?.trim()
        || !passage.city.publishedAt
      ) {
        throw new Error(`Une ville du chapitre « ${chapter.title} » est incomplète.`);
      }

      const member: GpxBuilderStopMember = {
        chapterIndex,
        passageId: passage.id,
        anchor,
      };
      const previous = stops.at(-1);
      if (
        previous?.cityDocumentId === passage.city.documentId
        && previous.members.at(-1)?.chapterIndex !== chapterIndex
      ) {
        previous.members.push(member);
      } else {
        stops.push({
          id: stableStopId(
            direction,
            passage.city.documentId,
            chapter.documentId,
            passage.id
          ),
          cityDocumentId: passage.city.documentId,
          name: passage.city.name.trim(),
          alternativeNames: Array.isArray(passage.city.alternativeNames)
            ? passage.city.alternativeNames.filter((name) => typeof name === 'string')
            : [],
          context: null,
          members: [member],
        });
      }
    }

    const media = directionValue(direction, chapter.gpxFileAB, chapter.gpxFileBA);
    const rawJunction = directionValue(
      direction,
      chapter.gpxJunctionAfterAB,
      chapter.gpxJunctionAfterBA
    );
    const junctionGapMetres = finiteNumber(rawJunction?.gapMetres);
    if (!media?.url?.trim()) {
      throw new Error(`Le média ${direction} du chapitre « ${chapter.title} » est absent.`);
    }
    if (
      (rawJunction?.status !== 'exact' && rawJunction?.status !== 'accepted_gap')
      || typeof rawJunction.sourceSha256 !== 'string'
      || rawJunction.sourceSha256.toLowerCase() !== hash
      || typeof rawJunction.nextSourceSha256 !== 'string'
      || !SHA_256.test(rawJunction.nextSourceSha256.toLowerCase())
      || junctionGapMetres === null
      || junctionGapMetres < 0
      || (
        rawJunction.status === 'accepted_gap'
        && !rawJunction.reviewNote?.trim()
      )
    ) {
      throw new Error(`La jonction ${direction} du chapitre « ${chapter.title} » n’est pas qualifiée.`);
    }
    const junctionAfter: GpxJunction = {
      status: rawJunction.status,
      sourceSha256: rawJunction.sourceSha256.toLowerCase(),
      nextSourceSha256: rawJunction.nextSourceSha256.toLowerCase(),
      gapMetres: junctionGapMetres,
      ...(rawJunction.reviewNote ? { reviewNote: rawJunction.reviewNote } : {}),
    };

    chapters.push({
      documentId: chapter.documentId,
      slug: chapter.slug,
      title: chapter.title,
      media,
      sourceSha256: hash,
      junctionAfter,
    });
  });

  const firstChapter = sourceChapters[0];
  if (!firstChapter || stops.length < 2) {
    throw new Error(`Le sens ${direction} ne contient pas assez de villes qualifiées.`);
  }
  chapters.forEach((chapter, index) => {
    const next = chapters[(index + 1) % chapters.length];
    if (
      chapter.junctionAfter.nextSourceSha256.toLowerCase()
      !== next.sourceSha256
    ) {
      throw new Error(`La jonction ${direction} après « ${chapter.title} » cible une autre trace.`);
    }
  });
  const occurrenceCounts = new Map<string, number>();
  for (const stop of stops) {
    occurrenceCounts.set(
      stop.cityDocumentId,
      (occurrenceCounts.get(stop.cityDocumentId) ?? 0) + 1
    );
  }
  const occurrenceIndexes = new Map<string, number>();
  for (const stop of stops) {
    const count = occurrenceCounts.get(stop.cityDocumentId) ?? 1;
    if (count > 1) {
      const occurrence = (occurrenceIndexes.get(stop.cityDocumentId) ?? 0) + 1;
      occurrenceIndexes.set(stop.cityDocumentId, occurrence);
      const chapterTitle = chapters[stop.members[0].chapterIndex]?.title;
      stop.context = `${occurrence === 1 ? '1er' : `${occurrence}e`} passage${chapterTitle ? ` · ${chapterTitle}` : ''}`;
    }
  }

  return {
    label: direction === 'AB'
      ? `Sens ${firstChapter.startStation} → ${firstChapter.endStation}`
      : `Sens ${firstChapter.endStation} → ${firstChapter.startStation}`,
    chapters,
    stops,
  };
}

function revisionPayload(
  enabled: boolean,
  directions: Record<GpxDirection, GpxBuilderDirectionManifest>
): string {
  return JSON.stringify({
    enabled,
    directions: Object.fromEntries(
      (['AB', 'BA'] as const).map((direction) => [
        direction,
        {
          chapters: directions[direction].chapters.map((chapter) => ({
            documentId: chapter.documentId,
            mediaDocumentId: chapter.media.documentId,
            mediaUpdatedAt: chapter.media.updatedAt,
            sourceSha256: chapter.sourceSha256,
            junctionAfter: chapter.junctionAfter,
          })),
          stops: directions[direction].stops.map((stop) => ({
            cityDocumentId: stop.cityDocumentId,
            members: stop.members.map((member) => ({
              chapterIndex: member.chapterIndex,
              passageId: member.passageId,
              anchor: member.anchor,
            })),
          })),
        },
      ])
    ),
  });
}

export function buildGpxBuilderManifest(
  enabled: boolean,
  chapters: readonly GpxBuilderChapterInput[]
): GpxBuilderManifest {
  const ordered = [...chapters].sort((first, second) => (
    first.displayOrder - second.displayOrder
  ));
  if (ordered.length === 0 || ordered.length > 10) {
    throw new Error('Le parcours doit contenir entre un et dix chapitres.');
  }
  if (ordered.some((chapter, index) => (
    chapter.displayOrder !== index + 1
    || !chapter.documentId?.trim()
    || !chapter.slug?.trim()
    || !chapter.title?.trim()
    || !chapter.startStation?.trim()
    || !chapter.endStation?.trim()
  ))) {
    throw new Error('Les chapitres du parcours sont incomplets ou désordonnés.');
  }
  const directions = {
    AB: buildDirection('AB', ordered),
    BA: buildDirection('BA', ordered),
  };

  return {
    enabled,
    revision: digest(revisionPayload(enabled, directions)).slice(0, 24),
    directions,
  };
}

export function createDisabledGpxBuilderManifest(): GpxBuilderManifest {
  return {
    enabled: false,
    revision: digest('gpx-builder-disabled').slice(0, 24),
    directions: {
      AB: { label: 'Sens aller', chapters: [], stops: [] },
      BA: { label: 'Sens retour', chapters: [], stops: [] },
    },
  };
}

export function toPublicGpxBuilderManifest(
  manifest: GpxBuilderManifest
): PublicGpxBuilderManifest {
  return {
    enabled: manifest.enabled,
    revision: manifest.revision,
    directions: Object.fromEntries(
      (['AB', 'BA'] as const).map((direction) => [
        direction,
        {
          label: manifest.directions[direction].label,
          stops: manifest.directions[direction].stops.map((stop) => ({
            id: stop.id,
            name: stop.name,
            alternativeNames: stop.alternativeNames,
            context: stop.context,
          })),
        },
      ])
    ) as Record<GpxDirection, PublicGpxBuilderDirection>,
  };
}
