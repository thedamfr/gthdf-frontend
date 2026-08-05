import { createHash } from 'node:crypto';

import { XMLParser, XMLValidator } from 'fast-xml-parser';

import type {
  BoundingBox,
  GeoPoint,
  ProximityIndex,
  ProximityIndexChapter,
  ProximityTrace,
  TraceDirection,
} from './proximity-types';

type XmlNode = Record<string, unknown>;

interface MetricPoint {
  x: number;
  y: number;
}

export interface GpxMediaMetadata {
  id: string | number;
  documentId?: string;
  hash?: string;
  updatedAt: string;
  size?: number;
  url?: string;
}

export interface GpxTraceSource {
  xml: string;
  media: GpxMediaMetadata;
}

export interface GpxChapterSource {
  documentId: string;
  slug: string;
  displayOrder: number;
  traces: Partial<Record<TraceDirection, GpxTraceSource>>;
}

export interface BuildProximityIndexOptions {
  simplificationToleranceMeters?: number;
}

export const SIMPLIFICATION_TOLERANCE_METERS = 20;

const EARTH_RADIUS_METERS = 6_371_008.8;
const DEGREES_TO_RADIANS = Math.PI / 180;
const TRACE_DIRECTIONS: readonly TraceDirection[] = ['AB', 'BA'];
const DECIMAL_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

export class GpxParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GpxParseError';
  }
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  removeNSPrefix: true,
  parseAttributeValue: false,
  parseTagValue: false,
  processEntities: false,
  trimValues: true,
});

function isNode(value: unknown): value is XmlNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function readCoordinate(point: unknown): GeoPoint | null {
  if (!isNode(point)) {
    return null;
  }

  const latitude = readFiniteNumber(point.lat);
  const longitude = readFiniteNumber(point.lon);

  if (
    latitude === null
    || longitude === null
    || latitude < -90
    || latitude > 90
    || longitude < -180
    || longitude > 180
  ) {
    return null;
  }

  return [longitude, latitude];
}

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string' || !DECIMAL_NUMBER.test(value.trim())) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function readPoints(value: unknown): GeoPoint[] {
  return asArray(value)
    .map(readCoordinate)
    .filter((point): point is GeoPoint => point !== null);
}

export function parseGpxSegments(xml: string): GeoPoint[][] {
  const validation = XMLValidator.validate(xml);

  if (validation !== true) {
    throw new GpxParseError('The GPX source is not valid XML.');
  }

  let parsed: unknown;

  try {
    parsed = parser.parse(xml);
  } catch {
    throw new GpxParseError('The GPX source could not be parsed.');
  }

  if (!isNode(parsed) || !isNode(parsed.gpx)) {
    throw new GpxParseError('The XML source does not contain a GPX document.');
  }

  const gpx = parsed.gpx;
  const trackSegments = asArray(gpx.trk)
    .filter(isNode)
    .flatMap((track) => asArray(track.trkseg))
    .filter(isNode)
    .map((segment) => readPoints(segment.trkpt))
    .filter((segment) => segment.length > 0);
  const routeSegments = asArray(gpx.rte)
    .filter(isNode)
    .map((route) => readPoints(route.rtept))
    .filter((segment) => segment.length > 0);

  return [...trackSegments, ...routeSegments];
}

function normalizeLongitudeDelta(delta: number): number {
  return ((delta + 540) % 360) - 180;
}

function projectSegment(segment: readonly GeoPoint[]): MetricPoint[] {
  const originLongitude = segment[0][0];
  const originLatitude = segment.reduce(
    (sum, point) => sum + point[1],
    0
  ) / segment.length;
  const originLatitudeRadians = originLatitude * DEGREES_TO_RADIANS;

  return segment.map(([longitude, latitude]) => ({
    x: EARTH_RADIUS_METERS
      * normalizeLongitudeDelta(longitude - originLongitude)
      * DEGREES_TO_RADIANS
      * Math.cos(originLatitudeRadians),
    y: EARTH_RADIUS_METERS
      * (latitude - originLatitude)
      * DEGREES_TO_RADIANS,
  }));
}

function pointToMetricSegmentDistance(
  point: MetricPoint,
  start: MetricPoint,
  end: MetricPoint
): number {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const squaredLength = deltaX ** 2 + deltaY ** 2;

  if (squaredLength === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const fraction = Math.max(0, Math.min(1,
    ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY)
      / squaredLength
  ));
  const closestX = start.x + fraction * deltaX;
  const closestY = start.y + fraction * deltaY;

  return Math.hypot(point.x - closestX, point.y - closestY);
}

/** Douglas–Peucker in a local metric projection, independently per GPX segment. */
export function simplifyGpxSegment(
  segment: readonly GeoPoint[],
  toleranceMeters = SIMPLIFICATION_TOLERANCE_METERS
): GeoPoint[] {
  if (!Number.isFinite(toleranceMeters) || toleranceMeters < 0) {
    throw new RangeError('Simplification tolerance must be a finite non-negative number.');
  }

  if (segment.length <= 2) {
    return segment.map(([longitude, latitude]) => [longitude, latitude]);
  }

  const projected = projectSegment(segment);
  const retained = new Uint8Array(segment.length);
  const pendingRanges: Array<[start: number, end: number]> = [
    [0, segment.length - 1],
  ];
  retained[0] = 1;
  retained[segment.length - 1] = 1;

  while (pendingRanges.length > 0) {
    const [startIndex, endIndex] = pendingRanges.pop()!;
    let furthestIndex = -1;
    let furthestDistance = -1;

    for (let index = startIndex + 1; index < endIndex; index += 1) {
      const distance = pointToMetricSegmentDistance(
        projected[index],
        projected[startIndex],
        projected[endIndex]
      );

      if (distance > furthestDistance) {
        furthestDistance = distance;
        furthestIndex = index;
      }
    }

    if (furthestIndex !== -1 && furthestDistance > toleranceMeters) {
      retained[furthestIndex] = 1;
      pendingRanges.push(
        [startIndex, furthestIndex],
        [furthestIndex, endIndex]
      );
    }
  }

  return segment
    .filter((_, index) => retained[index] === 1)
    .map(([longitude, latitude]) => [longitude, latitude]);
}

export function computeGeometryBoundingBox(
  segments: readonly (readonly GeoPoint[])[]
): BoundingBox | null {
  let minimumLongitude = Number.POSITIVE_INFINITY;
  let minimumLatitude = Number.POSITIVE_INFINITY;
  let maximumLongitude = Number.NEGATIVE_INFINITY;
  let maximumLatitude = Number.NEGATIVE_INFINITY;

  for (const segment of segments) {
    for (const [longitude, latitude] of segment) {
      minimumLongitude = Math.min(minimumLongitude, longitude);
      minimumLatitude = Math.min(minimumLatitude, latitude);
      maximumLongitude = Math.max(maximumLongitude, longitude);
      maximumLatitude = Math.max(maximumLatitude, latitude);
    }
  }

  return Number.isFinite(minimumLongitude)
    ? [
        minimumLongitude,
        minimumLatitude,
        maximumLongitude,
        maximumLatitude,
      ]
    : null;
}

function combineBoundingBoxes(boxes: readonly BoundingBox[]): BoundingBox {
  return [
    Math.min(...boxes.map((box) => box[0])),
    Math.min(...boxes.map((box) => box[1])),
    Math.max(...boxes.map((box) => box[2])),
    Math.max(...boxes.map((box) => box[3])),
  ];
}

function compareChapterSources(
  first: GpxChapterSource,
  second: GpxChapterSource
): number {
  return first.displayOrder - second.displayOrder
    || first.documentId.localeCompare(second.documentId);
}

function createRevision(
  sources: readonly GpxChapterSource[],
  simplificationToleranceMeters: number
): string {
  const revisionPayload = {
    schemaVersion: 1,
    simplificationToleranceMeters,
    chapters: [...sources]
      .sort(compareChapterSources)
      .map((chapter) => ({
        documentId: chapter.documentId,
        slug: chapter.slug,
        displayOrder: chapter.displayOrder,
        traces: TRACE_DIRECTIONS.map((direction) => {
          const source = chapter.traces[direction];

          return {
            direction,
            media: source
              ? {
                  id: String(source.media.id),
                  documentId: source.media.documentId ?? null,
                  hash: source.media.hash ?? null,
                  updatedAt: source.media.updatedAt,
                  size: source.media.size ?? null,
                }
              : null,
          };
        }),
      })),
  };

  return createHash('sha256')
    .update(JSON.stringify(revisionPayload))
    .digest('hex');
}

function buildTrace(
  direction: TraceDirection,
  source: GpxTraceSource,
  simplificationToleranceMeters: number
): ProximityTrace | null {
  let segments: GeoPoint[][];

  try {
    segments = parseGpxSegments(source.xml);
  } catch (error) {
    if (error instanceof GpxParseError) {
      return null;
    }

    throw error;
  }

  const simplifiedSegments = segments.map((segment) => (
    simplifyGpxSegment(segment, simplificationToleranceMeters)
  ));
  const boundingBox = computeGeometryBoundingBox(simplifiedSegments);

  return boundingBox
    ? {
        direction,
        segments: simplifiedSegments,
        boundingBox,
      }
    : null;
}

/**
 * Builds public geometry from XML already fetched via trusted Strapi media
 * URLs. This function deliberately performs no caller-controlled fetch.
 */
export function buildProximityIndex(
  sources: readonly GpxChapterSource[],
  options: BuildProximityIndexOptions = {}
): ProximityIndex {
  const simplificationToleranceMeters = options.simplificationToleranceMeters
    ?? SIMPLIFICATION_TOLERANCE_METERS;

  if (
    !Number.isFinite(simplificationToleranceMeters)
    || simplificationToleranceMeters < 0
  ) {
    throw new RangeError('Simplification tolerance must be a finite non-negative number.');
  }

  const sortedSources = [...sources].sort(compareChapterSources);
  const chapters: ProximityIndexChapter[] = [];
  let partial = false;

  for (const source of sortedSources) {
    const traces: ProximityTrace[] = [];

    for (const direction of TRACE_DIRECTIONS) {
      const traceSource = source.traces[direction];

      if (!traceSource) {
        partial = true;
        continue;
      }

      const trace = buildTrace(
        direction,
        traceSource,
        simplificationToleranceMeters
      );

      if (trace) {
        traces.push(trace);
      } else {
        partial = true;
      }
    }

    if (traces.length === 0) {
      partial = true;
      continue;
    }

    chapters.push({
      documentId: source.documentId,
      slug: source.slug,
      displayOrder: source.displayOrder,
      boundingBox: combineBoundingBoxes(
        traces.map((trace) => trace.boundingBox)
      ),
      traces,
    });
  }

  return {
    schemaVersion: 1,
    revision: createRevision(sortedSources, simplificationToleranceMeters),
    chapters,
    partial,
  };
}
