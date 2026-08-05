import type { GeoPoint, ProximityIndexChapter } from './proximity-types';

const EARTH_RADIUS_METERS = 6_371_008.8;
const DEGREES_TO_RADIANS = Math.PI / 180;

export const PROXIMITY_THRESHOLDS = Object.freeze({
  nearDistanceMeters: 1_000,
  maximumDistanceMeters: 50_000,
  minimumAmbiguityMeters: 250,
  maximumUsableAccuracyMeters: 5_000,
  maximumNearAccuracyMeters: 1_000,
  maximumResults: 3,
});

export interface ChapterDistance {
  documentId: string;
  slug: string;
  displayOrder: number;
  distanceMeters: number;
}

export type ProximityStatus =
  | 'unavailable'
  | 'imprecise'
  | 'out-of-area'
  | 'single'
  | 'ambiguous';

export interface ProximityClassification {
  status: ProximityStatus;
  results: ChapterDistance[];
  nearestIsNear: boolean;
  accuracyIsImprecise: boolean;
}

function isValidPoint(point: GeoPoint): boolean {
  return Number.isFinite(point[0])
    && Number.isFinite(point[1])
    && point[0] >= -180
    && point[0] <= 180
    && point[1] >= -90
    && point[1] <= 90;
}

function angularDistance(first: GeoPoint, second: GeoPoint): number {
  const firstLatitude = first[1] * DEGREES_TO_RADIANS;
  const secondLatitude = second[1] * DEGREES_TO_RADIANS;
  const latitudeDelta = secondLatitude - firstLatitude;
  const longitudeDelta = (second[0] - first[0]) * DEGREES_TO_RADIANS;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude)
      * Math.cos(secondLatitude)
      * Math.sin(longitudeDelta / 2) ** 2;
  const clampedHaversine = Math.min(1, Math.max(0, haversine));

  return 2 * Math.atan2(
    Math.sqrt(clampedHaversine),
    Math.sqrt(1 - clampedHaversine)
  );
}

function initialBearing(from: GeoPoint, to: GeoPoint): number {
  const fromLatitude = from[1] * DEGREES_TO_RADIANS;
  const toLatitude = to[1] * DEGREES_TO_RADIANS;
  const longitudeDelta = (to[0] - from[0]) * DEGREES_TO_RADIANS;

  return Math.atan2(
    Math.sin(longitudeDelta) * Math.cos(toLatitude),
    Math.cos(fromLatitude) * Math.sin(toLatitude)
      - Math.sin(fromLatitude)
        * Math.cos(toLatitude)
        * Math.cos(longitudeDelta)
  );
}

export function distanceToSegmentMeters(
  point: GeoPoint,
  start: GeoPoint,
  end: GeoPoint
): number {
  const segmentLength = angularDistance(start, end);
  const distanceFromStart = angularDistance(start, point);

  if (segmentLength === 0) {
    return distanceFromStart * EARTH_RADIUS_METERS;
  }

  const bearingDelta = initialBearing(start, point) - initialBearing(start, end);
  const crossTrackAngle = Math.asin(
    Math.sin(distanceFromStart) * Math.sin(bearingDelta)
  );
  const alongTrackAngle = Math.atan2(
    Math.sin(distanceFromStart) * Math.cos(bearingDelta),
    Math.cos(distanceFromStart)
  );

  if (alongTrackAngle < 0) {
    return distanceFromStart * EARTH_RADIUS_METERS;
  }

  if (alongTrackAngle > segmentLength) {
    return angularDistance(end, point) * EARTH_RADIUS_METERS;
  }

  return Math.abs(crossTrackAngle) * EARTH_RADIUS_METERS;
}

function distanceToPointMeters(first: GeoPoint, second: GeoPoint): number {
  return angularDistance(first, second) * EARTH_RADIUS_METERS;
}

/**
 * Returns the closest distance across every trace while preserving each GPX
 * segment boundary. A one-point segment remains usable as a point.
 */
export function distanceToChapterMeters(
  point: GeoPoint,
  chapter: ProximityIndexChapter
): number | null {
  if (!isValidPoint(point)) {
    return null;
  }

  let closestDistance = Number.POSITIVE_INFINITY;

  for (const trace of chapter.traces) {
    for (const segment of trace.segments) {
      let previousPoint: GeoPoint | null = null;

      for (const currentPoint of segment) {
        if (!isValidPoint(currentPoint)) {
          previousPoint = null;
          continue;
        }

        const distance = previousPoint
          ? distanceToSegmentMeters(point, previousPoint, currentPoint)
          : distanceToPointMeters(point, currentPoint);

        closestDistance = Math.min(closestDistance, distance);
        previousPoint = currentPoint;
      }
    }
  }

  return Number.isFinite(closestDistance) ? closestDistance : null;
}

function compareChapterDistances(
  first: ChapterDistance,
  second: ChapterDistance
): number {
  return first.distanceMeters - second.distanceMeters
    || first.displayOrder - second.displayOrder
    || first.documentId.localeCompare(second.documentId);
}

export function rankChapterDistances(
  point: GeoPoint,
  chapters: readonly ProximityIndexChapter[]
): ChapterDistance[] {
  return chapters
    .flatMap((chapter) => {
      const distanceMeters = distanceToChapterMeters(point, chapter);

      return distanceMeters === null
        ? []
        : [{
            documentId: chapter.documentId,
            slug: chapter.slug,
            displayOrder: chapter.displayOrder,
            distanceMeters,
          }];
    })
    .sort(compareChapterDistances);
}

function emptyClassification(
  status: Extract<ProximityStatus, 'unavailable' | 'imprecise' | 'out-of-area'>,
  accuracyIsImprecise: boolean
): ProximityClassification {
  return {
    status,
    results: [],
    nearestIsNear: false,
    accuracyIsImprecise,
  };
}

/**
 * Classifies precomputed distances. Keeping this step separate makes every
 * inclusive PRD boundary deterministic and independently testable.
 */
export function classifyChapterDistances(
  distances: readonly ChapterDistance[],
  accuracyMeters: number
): ProximityClassification {
  const rankedDistances = distances
    .filter(({ distanceMeters }) => Number.isFinite(distanceMeters) && distanceMeters >= 0)
    .sort(compareChapterDistances);
  const validAccuracy = Number.isFinite(accuracyMeters) && accuracyMeters >= 0
    ? accuracyMeters
    : Number.POSITIVE_INFINITY;
  const accuracyIsImprecise = validAccuracy >= PROXIMITY_THRESHOLDS.minimumAmbiguityMeters;

  if (rankedDistances.length === 0) {
    return emptyClassification('unavailable', accuracyIsImprecise);
  }

  if (validAccuracy > PROXIMITY_THRESHOLDS.maximumUsableAccuracyMeters) {
    return emptyClassification('imprecise', true);
  }

  const nearest = rankedDistances[0];

  if (nearest.distanceMeters > PROXIMITY_THRESHOLDS.maximumDistanceMeters) {
    return emptyClassification('out-of-area', accuracyIsImprecise);
  }

  const ambiguityDistance = Math.max(
    PROXIMITY_THRESHOLDS.minimumAmbiguityMeters,
    Math.min(validAccuracy, PROXIMITY_THRESHOLDS.maximumNearAccuracyMeters)
  );
  const results = rankedDistances
    .filter(({ distanceMeters }) => (
      distanceMeters <= nearest.distanceMeters + ambiguityDistance
      && distanceMeters <= PROXIMITY_THRESHOLDS.maximumDistanceMeters
    ))
    .slice(0, PROXIMITY_THRESHOLDS.maximumResults);
  const nearestIsNear = nearest.distanceMeters + validAccuracy
      <= PROXIMITY_THRESHOLDS.nearDistanceMeters
    && validAccuracy <= PROXIMITY_THRESHOLDS.maximumNearAccuracyMeters;

  return {
    status: results.length > 1 ? 'ambiguous' : 'single',
    results,
    nearestIsNear,
    accuracyIsImprecise,
  };
}

/** Client Component facade: position + browser accuracy + public index. */
export function classifyChapterProximity(
  point: GeoPoint,
  accuracyMeters: number,
  chapters: readonly ProximityIndexChapter[]
): ProximityClassification {
  return classifyChapterDistances(
    rankChapterDistances(point, chapters),
    accuracyMeters
  );
}

export function formatProximityDistance(distanceMeters: number): string {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
    throw new RangeError('Distance must be a finite positive number.');
  }

  if (distanceMeters < 1_000) {
    const roundedMeters = Math.round(distanceMeters / 50) * 50;
    const formattedMeters = String(roundedMeters).replace(
      /\B(?=(\d{3})+(?!\d))/g,
      ' '
    );

    return `${formattedMeters} m`;
  }

  if (distanceMeters < 10_000) {
    const roundedKilometers = Math.round(distanceMeters / 100) / 10;

    return `${roundedKilometers.toFixed(1).replace('.', ',')} km`;
  }

  return `${Math.round(distanceMeters / 1_000)} km`;
}
