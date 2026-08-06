import { XMLParser, XMLValidator } from 'fast-xml-parser';

import type { GpxDocument, GpxPoint, GpxSegment } from './types.ts';

type XmlNode = Record<string, unknown>;

export interface GpxParseLimits {
  maximumPoints?: number;
  maximumTracks?: number;
  maximumSegments?: number;
}

export class GpxContractError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'GpxContractError';
    this.code = code;
  }
}

const DEFAULT_MAXIMUM_POINTS = 250_000;
const DEFAULT_MAXIMUM_TRACKS = 16;
const DEFAULT_MAXIMUM_SEGMENTS = 512;
const DECIMAL_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const FORBIDDEN_DECLARATION = /<!\s*(?:DOCTYPE|ENTITY)\b/i;

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

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string' || !DECIMAL_NUMBER.test(value.trim())) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readPoint(value: unknown): GpxPoint {
  if (!isNode(value)) {
    throw new GpxContractError('invalid_point', 'A GPX track point is malformed.');
  }

  const latitude = finiteNumber(value.lat);
  const longitude = finiteNumber(value.lon);
  const elevation = value.ele === undefined ? undefined : finiteNumber(value.ele);

  if (
    latitude === null
    || longitude === null
    || latitude < -90
    || latitude > 90
    || longitude < -180
    || longitude > 180
  ) {
    throw new GpxContractError('invalid_coordinate', 'A GPX coordinate is invalid.');
  }

  if (elevation === null) {
    throw new GpxContractError('invalid_elevation', 'A GPX elevation is invalid.');
  }

  if ('extensions' in value) {
    throw new GpxContractError('unsupported_extensions', 'GPX extensions are not qualified.');
  }

  return {
    latitude,
    longitude,
    ...(elevation === undefined ? {} : { elevation }),
  };
}

function positiveLimit(value: number | undefined, fallback: number): number {
  const limit = value ?? fallback;
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new RangeError('GPX limits must be positive safe integers.');
  }
  return limit;
}

export function parseOfficialGpx(
  xml: string,
  limits: GpxParseLimits = {}
): GpxDocument {
  if (FORBIDDEN_DECLARATION.test(xml)) {
    throw new GpxContractError('unsafe_xml', 'DOCTYPE and ENTITY declarations are forbidden.');
  }

  if (XMLValidator.validate(xml) !== true) {
    throw new GpxContractError('invalid_xml', 'The GPX source is not valid XML.');
  }

  let parsed: unknown;
  try {
    parsed = parser.parse(xml);
  } catch {
    throw new GpxContractError('invalid_xml', 'The GPX source could not be parsed.');
  }

  if (!isNode(parsed) || !isNode(parsed.gpx)) {
    throw new GpxContractError('invalid_root', 'The XML source does not contain a GPX document.');
  }

  const gpx = parsed.gpx;
  if (gpx.wpt !== undefined || gpx.rte !== undefined || gpx.extensions !== undefined) {
    throw new GpxContractError(
      'unsupported_content',
      'Waypoints, routes and extensions are not qualified for official sources.'
    );
  }

  const maximumPoints = positiveLimit(limits.maximumPoints, DEFAULT_MAXIMUM_POINTS);
  const maximumTracks = positiveLimit(limits.maximumTracks, DEFAULT_MAXIMUM_TRACKS);
  const maximumSegments = positiveLimit(limits.maximumSegments, DEFAULT_MAXIMUM_SEGMENTS);
  const sourceTracks = asArray(gpx.trk).filter(isNode);

  if (sourceTracks.length === 0 || sourceTracks.length > maximumTracks) {
    throw new GpxContractError('invalid_track_count', 'The GPX track count is not supported.');
  }

  let pointCount = 0;
  let segmentCount = 0;
  const tracks = sourceTracks.map((track, trackIndex) => {
    if ('extensions' in track) {
      throw new GpxContractError('unsupported_extensions', 'GPX extensions are not qualified.');
    }

    const sourceSegments = asArray(track.trkseg).filter(isNode);
    if (sourceSegments.length === 0) {
      throw new GpxContractError('missing_geometry', 'A GPX track has no usable segment.');
    }

    const segments: GpxSegment[] = sourceSegments.map((segment, segmentIndex) => {
      if ('extensions' in segment) {
        throw new GpxContractError('unsupported_extensions', 'GPX extensions are not qualified.');
      }

      const points = asArray(segment.trkpt).map(readPoint);
      if (points.length === 0) {
        throw new GpxContractError('missing_geometry', 'A GPX segment has no usable point.');
      }

      segmentCount += 1;
      pointCount += points.length;
      if (segmentCount > maximumSegments || pointCount > maximumPoints) {
        throw new GpxContractError('source_too_complex', 'The GPX source exceeds its geometry limits.');
      }

      return { trackIndex, segmentIndex, points };
    });

    return { trackIndex, segments };
  });

  return { tracks, pointCount };
}
