import type {
  ItineraryDisplayGeometry,
  ItineraryDisplaySequence,
  ItineraryElevationPoint,
  ItineraryElevationSequence,
} from './types';

const MAX_SEQUENCES = 128;
const MAX_COORDINATES = 50_000;
const MAX_ELEVATION_POINTS = 20_000;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseCoordinate(value: unknown): [number, number] | [number, number, number] | null {
  if (!Array.isArray(value) || (value.length !== 2 && value.length !== 3)) {
    return null;
  }
  const [longitude, latitude, elevation] = value;
  if (
    !isFiniteNumber(longitude)
    || !isFiniteNumber(latitude)
    || longitude < -180
    || longitude > 180
    || latitude < -90
    || latitude > 90
    || (value.length === 3 && !isFiniteNumber(elevation))
  ) {
    return null;
  }

  return value.length === 3
    ? [longitude, latitude, elevation as number]
    : [longitude, latitude];
}

function parseElevationPoints(value: unknown): ItineraryElevationPoint[] | undefined {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_ELEVATION_POINTS) {
    return undefined;
  }

  let previousDistance = -1;
  const points: ItineraryElevationPoint[] = [];
  for (const candidate of value) {
    if (
      !isPlainObject(candidate)
      || !hasExactKeys(candidate, ['distanceMetres', 'elevationMetres'])
      || !isFiniteNumber(candidate.distanceMetres)
      || candidate.distanceMetres < 0
      || candidate.distanceMetres <= previousDistance
      || !isFiniteNumber(candidate.elevationMetres)
    ) {
      return undefined;
    }
    previousDistance = candidate.distanceMetres;
    points.push({
      distanceMetres: candidate.distanceMetres,
      elevationMetres: candidate.elevationMetres,
    });
  }
  return points;
}

function parseElevationProfile(
  value: unknown,
  sequenceCount: number
): ItineraryElevationSequence[] | null | undefined {
  if (value === null) {
    return null;
  }
  if (!Array.isArray(value) || value.length !== sequenceCount) {
    return undefined;
  }

  let totalPoints = 0;
  let previousSequenceEnd: number | null = null;
  const profile: ItineraryElevationSequence[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const candidate = value[index];
    if (
      !isPlainObject(candidate)
      || !hasExactKeys(candidate, ['sequenceIndex', 'points'])
      || candidate.sequenceIndex !== index
    ) {
      return undefined;
    }
    const points = parseElevationPoints(candidate.points);
    if (!points) {
      return undefined;
    }
    if (
      (index === 0 && points[0].distanceMetres !== 0)
      || (previousSequenceEnd !== null
        && Math.abs(points[0].distanceMetres - previousSequenceEnd) > 1e-6)
    ) {
      return undefined;
    }
    previousSequenceEnd = points[points.length - 1].distanceMetres;
    totalPoints += points.length;
    if (totalPoints > MAX_ELEVATION_POINTS) {
      return undefined;
    }
    profile.push({
      sequenceIndex: index,
      points,
    });
  }
  return profile;
}

export function parseItineraryDisplayGeometry(
  value: unknown,
  expected?: { revisionKey?: string; algorithmVersion?: string; distanceMetres?: number }
): ItineraryDisplayGeometry | null {
  if (
    !isPlainObject(value)
    || !hasExactKeys(value, [
      'version',
      'revisionKey',
      'algorithmVersion',
      'sequences',
      'elevationProfile',
    ])
    || value.version !== 1
    || typeof value.revisionKey !== 'string'
    || value.revisionKey.length === 0
    || typeof value.algorithmVersion !== 'string'
    || value.algorithmVersion.length === 0
    || (expected?.revisionKey !== undefined && value.revisionKey !== expected.revisionKey)
    || (expected?.algorithmVersion !== undefined
      && value.algorithmVersion !== expected.algorithmVersion)
    || !Array.isArray(value.sequences)
    || value.sequences.length === 0
    || value.sequences.length > MAX_SEQUENCES
  ) {
    return null;
  }

  let totalCoordinates = 0;
  const sequences: ItineraryDisplaySequence[] = [];
  for (const candidate of value.sequences) {
    if (
      !isPlainObject(candidate)
      || !hasExactKeys(candidate, ['coordinates'])
      || !Array.isArray(candidate.coordinates)
      || candidate.coordinates.length < 1
    ) {
      return null;
    }

    totalCoordinates += candidate.coordinates.length;
    if (totalCoordinates > MAX_COORDINATES) {
      return null;
    }

    const coordinates = candidate.coordinates.map(parseCoordinate);
    if (coordinates.some((coordinate) => coordinate === null)) {
      return null;
    }
    sequences.push({
      coordinates: coordinates as ItineraryDisplaySequence['coordinates'],
    });
  }

  const elevationProfile = parseElevationProfile(value.elevationProfile, sequences.length);
  if (elevationProfile === undefined) {
    return null;
  }
  if (elevationProfile && expected?.distanceMetres !== undefined) {
    const finalDistance = elevationProfile[elevationProfile.length - 1]
      .points.at(-1)?.distanceMetres;
    const tolerance = Math.max(1, expected.distanceMetres * 0.0001);
    if (
      finalDistance === undefined
      || !Number.isFinite(expected.distanceMetres)
      || expected.distanceMetres < 0
      || Math.abs(finalDistance - expected.distanceMetres) > tolerance
    ) {
      return null;
    }
  }

  return {
    version: 1,
    revisionKey: value.revisionKey,
    algorithmVersion: value.algorithmVersion,
    sequences,
    elevationProfile,
  };
}

export function geometryBounds(geometry: ItineraryDisplayGeometry): {
  minLongitude: number;
  maxLongitude: number;
  minLatitude: number;
  maxLatitude: number;
} {
  const coordinates = geometry.sequences.flatMap((sequence) => sequence.coordinates);
  return coordinates.reduce((bounds, coordinate) => ({
    minLongitude: Math.min(bounds.minLongitude, coordinate[0]),
    maxLongitude: Math.max(bounds.maxLongitude, coordinate[0]),
    minLatitude: Math.min(bounds.minLatitude, coordinate[1]),
    maxLatitude: Math.max(bounds.maxLatitude, coordinate[1]),
  }), {
    minLongitude: Number.POSITIVE_INFINITY,
    maxLongitude: Number.NEGATIVE_INFINITY,
    minLatitude: Number.POSITIVE_INFINITY,
    maxLatitude: Number.NEGATIVE_INFINITY,
  });
}
