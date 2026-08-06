import { distanceWgs84Metres, sequenceDistanceMetres } from './geometry.ts';
import type { GpxPoint } from './types.ts';

export interface RouteMetrics {
  distanceMetres: number;
  elevationAvailable: boolean;
  elevationCoverageRatio: number;
  elevationGainMetres: number | null;
  elevationLossMetres: number | null;
}

interface ElevationSample {
  distance: number;
  elevation?: number;
}

const RESAMPLE_INTERVAL_METRES = 25;
const SMOOTHING_WINDOW_METRES = 100;
const MINIMUM_ELEVATION_COVERAGE = 0.95;
const MAXIMUM_INTERPOLATED_GAP_METRES = 250;

function interpolateShortElevationGaps(
  sequence: readonly GpxPoint[]
): GpxPoint[] {
  const points = sequence.map((point) => ({ ...point }));
  let previousKnownIndex = -1;

  for (let index = 0; index < points.length; index += 1) {
    if (points[index].elevation === undefined) {
      continue;
    }
    if (previousKnownIndex >= 0 && index - previousKnownIndex > 1) {
      const cumulativeDistances = [0];
      for (let cursor = previousKnownIndex + 1; cursor <= index; cursor += 1) {
        cumulativeDistances.push(
          cumulativeDistances[cumulativeDistances.length - 1]
          + distanceWgs84Metres(points[cursor - 1], points[cursor])
        );
      }
      const gapDistance = cumulativeDistances[cumulativeDistances.length - 1];
      if (gapDistance <= MAXIMUM_INTERPOLATED_GAP_METRES && gapDistance > 0) {
        const firstElevation = points[previousKnownIndex].elevation as number;
        const lastElevation = points[index].elevation as number;
        for (let cursor = previousKnownIndex + 1; cursor < index; cursor += 1) {
          const fraction = cumulativeDistances[cursor - previousKnownIndex]
            / gapDistance;
          points[cursor].elevation = firstElevation
            + (lastElevation - firstElevation) * fraction;
        }
      }
    }
    previousKnownIndex = index;
  }

  return points;
}

function interpolateElevation(first: GpxPoint, second: GpxPoint, fraction: number): number | undefined {
  if (first.elevation === undefined || second.elevation === undefined) {
    return undefined;
  }
  return first.elevation + (second.elevation - first.elevation) * fraction;
}

function resampleElevation(sequence: readonly GpxPoint[]): ElevationSample[] {
  if (sequence.length === 0) {
    return [];
  }
  if (sequence.length === 1) {
    return [{ distance: 0, elevation: sequence[0].elevation }];
  }

  const cumulativeDistances = [0];
  for (let index = 1; index < sequence.length; index += 1) {
    cumulativeDistances.push(
      cumulativeDistances[index - 1]
      + distanceWgs84Metres(sequence[index - 1], sequence[index])
    );
  }
  const totalDistance = cumulativeDistances[cumulativeDistances.length - 1];
  const targets: number[] = [];
  for (let distance = 0; distance < totalDistance; distance += RESAMPLE_INTERVAL_METRES) {
    targets.push(distance);
  }
  if (targets.length === 0 || targets[targets.length - 1] !== totalDistance) {
    targets.push(totalDistance);
  }

  const samples: ElevationSample[] = [];
  let edgeIndex = 0;
  for (const target of targets) {
    while (
      edgeIndex < cumulativeDistances.length - 2
      && cumulativeDistances[edgeIndex + 1] < target
    ) {
      edgeIndex += 1;
    }
    const edgeStartDistance = cumulativeDistances[edgeIndex];
    const edgeEndDistance = cumulativeDistances[edgeIndex + 1];
    const fraction = edgeEndDistance === edgeStartDistance
      ? 0
      : (target - edgeStartDistance) / (edgeEndDistance - edgeStartDistance);
    samples.push({
      distance: target,
      elevation: interpolateElevation(
        sequence[edgeIndex],
        sequence[edgeIndex + 1],
        Math.max(0, Math.min(1, fraction))
      ),
    });
  }
  return samples;
}

function smoothKnownRuns(samples: readonly ElevationSample[]): number[][] {
  const runs: ElevationSample[][] = [];
  let current: ElevationSample[] = [];

  for (const sample of samples) {
    if (sample.elevation === undefined) {
      if (current.length > 0) {
        runs.push(current);
        current = [];
      }
    } else {
      current.push(sample);
    }
  }
  if (current.length > 0) {
    runs.push(current);
  }

  const radius = SMOOTHING_WINDOW_METRES / 2;
  return runs.map((run) => {
    const prefixSums = [0];
    for (const sample of run) {
      prefixSums.push(prefixSums[prefixSums.length - 1] + (sample.elevation as number));
    }
    let left = 0;
    let right = 0;

    return run.map((sample) => {
      while (run[left]?.distance < sample.distance - radius) {
        left += 1;
      }
      while (
        right + 1 < run.length
        && run[right + 1].distance <= sample.distance + radius
      ) {
        right += 1;
      }
      return (prefixSums[right + 1] - prefixSums[left]) / (right - left + 1);
    });
  });
}

function elevationCoverage(sequences: readonly (readonly GpxPoint[])[]): {
  coveredDistance: number;
  maximumGapDistance: number;
} {
  let coveredDistance = 0;
  let maximumGapDistance = 0;

  for (const sequence of sequences) {
    let currentGapDistance = 0;
    for (let index = 1; index < sequence.length; index += 1) {
      const edgeDistance = distanceWgs84Metres(sequence[index - 1], sequence[index]);
      if (
        sequence[index - 1].elevation !== undefined
        && sequence[index].elevation !== undefined
      ) {
        coveredDistance += edgeDistance;
        maximumGapDistance = Math.max(maximumGapDistance, currentGapDistance);
        currentGapDistance = 0;
      } else {
        currentGapDistance += edgeDistance;
      }
    }
    maximumGapDistance = Math.max(maximumGapDistance, currentGapDistance);
  }

  return { coveredDistance, maximumGapDistance };
}

export function computeRouteMetrics(
  sequences: readonly (readonly GpxPoint[])[]
): RouteMetrics {
  const distanceMetres = sequences.reduce(
    (total, sequence) => total + sequenceDistanceMetres(sequence),
    0
  );
  const { coveredDistance, maximumGapDistance } = elevationCoverage(sequences);
  const elevationCoverageRatio = distanceMetres === 0
    ? 0
    : coveredDistance / distanceMetres;
  const elevationAvailable = distanceMetres > 0
    && elevationCoverageRatio >= MINIMUM_ELEVATION_COVERAGE
    && maximumGapDistance <= MAXIMUM_INTERPOLATED_GAP_METRES;

  if (!elevationAvailable) {
    return {
      distanceMetres,
      elevationAvailable: false,
      elevationCoverageRatio,
      elevationGainMetres: null,
      elevationLossMetres: null,
    };
  }

  let elevationGainMetres = 0;
  let elevationLossMetres = 0;
  for (const sequence of sequences) {
    const runs = smoothKnownRuns(
      resampleElevation(interpolateShortElevationGaps(sequence))
    );
    for (const run of runs) {
      for (let index = 1; index < run.length; index += 1) {
        const difference = run[index] - run[index - 1];
        if (difference > 0) {
          elevationGainMetres += difference;
        } else {
          elevationLossMetres += Math.abs(difference);
        }
      }
    }
  }

  return {
    distanceMetres,
    elevationAvailable: true,
    elevationCoverageRatio,
    elevationGainMetres,
    elevationLossMetres,
  };
}
