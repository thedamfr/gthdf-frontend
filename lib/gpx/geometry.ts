import type { GpxPoint } from './types.ts';

export type GeographicPoint = Pick<GpxPoint, 'latitude' | 'longitude'>;

const WGS84_SEMI_MAJOR_METRES = 6_378_137;
const WGS84_FLATTENING = 1 / 298.257_223_563;
const WGS84_SEMI_MINOR_METRES = WGS84_SEMI_MAJOR_METRES
  * (1 - WGS84_FLATTENING);
const MEAN_EARTH_RADIUS_METRES = 6_371_008.8;
const RADIANS = Math.PI / 180;

function assertCoordinate(point: GeographicPoint): void {
  if (
    !Number.isFinite(point.latitude)
    || !Number.isFinite(point.longitude)
    || point.latitude < -90
    || point.latitude > 90
    || point.longitude < -180
    || point.longitude > 180
  ) {
    throw new RangeError('A WGS84 coordinate is invalid.');
  }
}

function haversineFallback(first: GeographicPoint, second: GeographicPoint): number {
  const latitudeDelta = (second.latitude - first.latitude) * RADIANS;
  const longitudeDelta = (second.longitude - first.longitude) * RADIANS;
  const firstLatitude = first.latitude * RADIANS;
  const secondLatitude = second.latitude * RADIANS;
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude)
      * Math.cos(secondLatitude)
      * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * MEAN_EARTH_RADIUS_METRES
    * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

/** Vincenty's inverse solution on the WGS84 ellipsoid, in metres. */
export function distanceWgs84Metres(
  first: GeographicPoint,
  second: GeographicPoint
): number {
  assertCoordinate(first);
  assertCoordinate(second);

  if (
    first.latitude === second.latitude
    && first.longitude === second.longitude
  ) {
    return 0;
  }

  const reducedLatitudeFirst = Math.atan(
    (1 - WGS84_FLATTENING) * Math.tan(first.latitude * RADIANS)
  );
  const reducedLatitudeSecond = Math.atan(
    (1 - WGS84_FLATTENING) * Math.tan(second.latitude * RADIANS)
  );
  const sineFirst = Math.sin(reducedLatitudeFirst);
  const cosineFirst = Math.cos(reducedLatitudeFirst);
  const sineSecond = Math.sin(reducedLatitudeSecond);
  const cosineSecond = Math.cos(reducedLatitudeSecond);
  const longitudeDifference = (second.longitude - first.longitude) * RADIANS;
  let lambda = longitudeDifference;
  let sineSigma = 0;
  let cosineSigma = 0;
  let sigma = 0;
  let sineAlpha = 0;
  let cosineSquaredAlpha = 0;
  let cosineDoubleSigmaMidpoint = 0;
  let converged = false;

  for (let iteration = 0; iteration < 100; iteration += 1) {
    const sineLambda = Math.sin(lambda);
    const cosineLambda = Math.cos(lambda);
    sineSigma = Math.sqrt(
      (cosineSecond * sineLambda) ** 2
      + (cosineFirst * sineSecond - sineFirst * cosineSecond * cosineLambda) ** 2
    );
    if (sineSigma === 0) {
      return 0;
    }

    cosineSigma = sineFirst * sineSecond
      + cosineFirst * cosineSecond * cosineLambda;
    sigma = Math.atan2(sineSigma, cosineSigma);
    sineAlpha = cosineFirst * cosineSecond * sineLambda / sineSigma;
    cosineSquaredAlpha = 1 - sineAlpha ** 2;
    cosineDoubleSigmaMidpoint = cosineSquaredAlpha === 0
      ? 0
      : cosineSigma - 2 * sineFirst * sineSecond / cosineSquaredAlpha;
    const correction = WGS84_FLATTENING / 16
      * cosineSquaredAlpha
      * (4 + WGS84_FLATTENING * (4 - 3 * cosineSquaredAlpha));
    const nextLambda = longitudeDifference
      + (1 - correction)
        * WGS84_FLATTENING
        * sineAlpha
        * (
          sigma
          + correction
            * sineSigma
            * (
              cosineDoubleSigmaMidpoint
              + correction
                * cosineSigma
                * (-1 + 2 * cosineDoubleSigmaMidpoint ** 2)
            )
        );

    if (Math.abs(nextLambda - lambda) <= 1e-12) {
      lambda = nextLambda;
      converged = true;
      break;
    }
    lambda = nextLambda;
  }

  if (!converged) {
    return haversineFallback(first, second);
  }

  const squaredU = cosineSquaredAlpha
    * (WGS84_SEMI_MAJOR_METRES ** 2 - WGS84_SEMI_MINOR_METRES ** 2)
    / WGS84_SEMI_MINOR_METRES ** 2;
  const coefficientA = 1 + squaredU / 16_384
    * (4_096 + squaredU * (-768 + squaredU * (320 - 175 * squaredU)));
  const coefficientB = squaredU / 1_024
    * (256 + squaredU * (-128 + squaredU * (74 - 47 * squaredU)));
  const deltaSigma = coefficientB * sineSigma * (
    cosineDoubleSigmaMidpoint
    + coefficientB / 4 * (
      cosineSigma * (-1 + 2 * cosineDoubleSigmaMidpoint ** 2)
      - coefficientB / 6
        * cosineDoubleSigmaMidpoint
        * (-3 + 4 * sineSigma ** 2)
        * (-3 + 4 * cosineDoubleSigmaMidpoint ** 2)
    )
  );

  return WGS84_SEMI_MINOR_METRES * coefficientA * (sigma - deltaSigma);
}

export function sequenceDistanceMetres(points: readonly GeographicPoint[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += distanceWgs84Metres(points[index - 1], points[index]);
  }
  return total;
}
