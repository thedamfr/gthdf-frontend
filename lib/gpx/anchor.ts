import { distanceWgs84Metres } from './geometry.ts';
import { GpxContractError } from './parser.ts';
import type { GpxAnchor, GpxDocument, GpxPoint, GpxSegment } from './types.ts';

const ANCHOR_COORDINATE_TOLERANCE_METRES = 1;

export function getAnchorSegment(
  document: GpxDocument,
  anchor: Pick<GpxAnchor, 'trackIndex' | 'segmentIndex'>
): GpxSegment {
  if (!Number.isInteger(anchor.trackIndex) || !Number.isInteger(anchor.segmentIndex)) {
    throw new GpxContractError('invalid_anchor', 'Anchor indexes must be integers.');
  }

  const track = document.tracks[anchor.trackIndex];
  const segment = track?.segments.find(
    (candidate) => candidate.segmentIndex === anchor.segmentIndex
  );

  if (!track || !segment || track.trackIndex !== anchor.trackIndex) {
    throw new GpxContractError('invalid_anchor', 'The anchor source segment does not exist.');
  }

  return segment;
}

function interpolateValue(first: number, second: number, fraction: number): number {
  return first + (second - first) * fraction;
}

export function interpolatePoint(
  first: GpxPoint,
  second: GpxPoint,
  fraction: number
): GpxPoint {
  if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) {
    throw new GpxContractError('invalid_anchor', 'The anchor fraction is outside its segment.');
  }

  return {
    latitude: interpolateValue(first.latitude, second.latitude, fraction),
    longitude: interpolateValue(first.longitude, second.longitude, fraction),
    ...(first.elevation === undefined || second.elevation === undefined
      ? {}
      : { elevation: interpolateValue(first.elevation, second.elevation, fraction) }),
  };
}

export function materializeAnchorPoint(
  document: GpxDocument,
  anchor: GpxAnchor
): GpxPoint {
  if (anchor.status !== 'validated') {
    throw new GpxContractError('unavailable_anchor', 'Only a validated anchor can be used.');
  }
  if (!Number.isInteger(anchor.pointIndex) || anchor.pointIndex < 0) {
    throw new GpxContractError('invalid_anchor', 'The anchor point index is invalid.');
  }
  if (!Number.isFinite(anchor.fraction) || anchor.fraction < 0 || anchor.fraction > 1) {
    throw new GpxContractError('invalid_anchor', 'The anchor fraction is invalid.');
  }

  const segment = getAnchorSegment(document, anchor);
  const first = segment.points[anchor.pointIndex];
  if (!first) {
    throw new GpxContractError('invalid_anchor', 'The anchor point does not exist.');
  }

  const point = anchor.fraction === 0
    ? { ...first }
    : (() => {
        const second = segment.points[anchor.pointIndex + 1];
        if (!second) {
          throw new GpxContractError('invalid_anchor', 'The anchor edge does not exist.');
        }
        return interpolatePoint(first, second, anchor.fraction);
      })();

  if (
    !Number.isFinite(anchor.projectedLatitude)
    || !Number.isFinite(anchor.projectedLongitude)
    || distanceWgs84Metres(point, {
      latitude: anchor.projectedLatitude,
      longitude: anchor.projectedLongitude,
    }) > ANCHOR_COORDINATE_TOLERANCE_METRES
  ) {
    throw new GpxContractError(
      'inconsistent_anchor',
      'The stored anchor coordinate does not match its source position.'
    );
  }

  return point;
}
