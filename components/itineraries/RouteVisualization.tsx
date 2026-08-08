'use client';

import { useMemo, useState } from 'react';

import { geometryBounds } from '@/lib/itineraries/geometry';
import type {
  ItineraryDisplayGeometry,
  ItineraryElevationPoint,
  ItineraryElevationSequence,
} from '@/lib/itineraries/types';
import styles from './RouteVisualization.module.css';

interface RouteVisualizationProps {
  geometry: ItineraryDisplayGeometry;
  elevationAvailable: boolean;
  departureName: string;
  arrivalName: string;
}

const MAP_WIDTH = 1_000;
const MAP_HEIGHT = 480;
const MAP_PADDING = 48;
const PROFILE_WIDTH = 1_000;
const PROFILE_HEIGHT = 300;
const PROFILE_PADDING_X = 64;
const PROFILE_PADDING_Y = 42;

function projectedSequences(geometry: ItineraryDisplayGeometry): string[] {
  const bounds = geometryBounds(geometry);
  const averageLatitude = (bounds.minLatitude + bounds.maxLatitude) / 2;
  const longitudeFactor = Math.max(Math.cos(averageLatitude * Math.PI / 180), 0.1);
  const rawWidth = Math.max((bounds.maxLongitude - bounds.minLongitude) * longitudeFactor, 1e-9);
  const rawHeight = Math.max(bounds.maxLatitude - bounds.minLatitude, 1e-9);
  const scale = Math.min(
    (MAP_WIDTH - MAP_PADDING * 2) / rawWidth,
    (MAP_HEIGHT - MAP_PADDING * 2) / rawHeight
  );
  const renderedWidth = rawWidth * scale;
  const renderedHeight = rawHeight * scale;
  const offsetX = (MAP_WIDTH - renderedWidth) / 2;
  const offsetY = (MAP_HEIGHT - renderedHeight) / 2;

  return geometry.sequences.map((sequence) => sequence.coordinates
    .map(([longitude, latitude]) => {
      const x = offsetX + (longitude - bounds.minLongitude) * longitudeFactor * scale;
      const y = offsetY + (bounds.maxLatitude - latitude) * scale;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' '));
}

function endpoint(
  points: string[],
  sequenceIndex: number,
  atEnd: boolean
): { x: number; y: number } {
  const sequence = points[sequenceIndex].split(' ');
  const point = sequence[atEnd ? sequence.length - 1 : 0].split(',').map(Number);
  return { x: point[0], y: point[1] };
}

interface ProfilePointReference {
  sequenceIndex: number;
  pointIndex: number;
  point: ItineraryElevationPoint;
}

function sampledProfilePoints(
  profile: ItineraryElevationSequence[],
  maximum = 24
): ProfilePointReference[] {
  const all = profile.flatMap((sequence) => sequence.points.map((point, pointIndex) => ({
    sequenceIndex: sequence.sequenceIndex,
    pointIndex,
    point,
  })));
  if (all.length <= maximum) {
    return all;
  }
  return Array.from(new Set(Array.from({ length: maximum }, (_, index) => (
    Math.round(index * (all.length - 1) / (maximum - 1))
  )))).map((index) => all[index]);
}

function formatProfilePoint(point: ItineraryElevationPoint): string {
  return `${(point.distanceMetres / 1_000).toLocaleString('fr-FR', {
    maximumFractionDigits: 1,
  })} km · ${Math.round(point.elevationMetres)} m d’altitude`;
}

function ElevationProfile({ profile }: { profile: ItineraryElevationSequence[] }) {
  const [active, setActive] = useState({ sequenceIndex: 0, pointIndex: 0 });
  const allPoints = profile.flatMap((sequence) => sequence.points);
  const activePoint = profile[active.sequenceIndex].points[active.pointIndex];
  const measuredMaximumDistance = Math.max(...allPoints.map((point) => point.distanceMetres));
  const maximumDistance = Math.max(measuredMaximumDistance, 1);
  const minimumElevation = Math.min(...allPoints.map((point) => point.elevationMetres));
  const maximumElevation = Math.max(...allPoints.map((point) => point.elevationMetres));
  const elevationRange = Math.max(maximumElevation - minimumElevation, 1);
  const usableWidth = PROFILE_WIDTH - PROFILE_PADDING_X * 2;
  const usableHeight = PROFILE_HEIGHT - PROFILE_PADDING_Y * 2;
  const pointPosition = (point: ItineraryElevationPoint) => ({
    x: PROFILE_PADDING_X + point.distanceMetres / maximumDistance * usableWidth,
    y: PROFILE_PADDING_Y
      + (maximumElevation - point.elevationMetres) / elevationRange * usableHeight,
  });
  const paths = profile.map((sequence) => sequence.points.map((point, index) => {
    const position = pointPosition(point);
    return `${index === 0 ? 'M' : 'L'} ${position.x.toFixed(2)} ${position.y.toFixed(2)}`;
  }).join(' '));
  const activePosition = pointPosition(activePoint);
  const controls = sampledProfilePoints(profile).map((reference) => ({
    ...reference,
    position: pointPosition(reference.point),
  }));

  return (
    <section className={styles.profile} aria-labelledby="itinerary-profile-title">
      <div className={styles.profileHeading}>
        <h3 id="itinerary-profile-title">Profil altimétrique</h3>
        <p aria-live="polite">{formatProfilePoint(activePoint)}</p>
      </div>
      <div className={styles.profileChart}>
        <svg
          viewBox={`0 0 ${PROFILE_WIDTH} ${PROFILE_HEIGHT}`}
          role="img"
          aria-labelledby="profile-svg-title profile-svg-description"
        >
        <title id="profile-svg-title">Altitude le long de la portion</title>
        <desc id="profile-svg-description">
          Profil de {Math.round(minimumElevation)} à {Math.round(maximumElevation)} mètres,
          sur {(measuredMaximumDistance / 1_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} kilomètres,
          en {profile.length} {profile.length > 1 ? 'séquences séparées' : 'séquence continue'}.
        </desc>
        <line
          className={styles.profileAxis}
          x1={PROFILE_PADDING_X}
          y1={PROFILE_HEIGHT - PROFILE_PADDING_Y}
          x2={PROFILE_WIDTH - PROFILE_PADDING_X}
          y2={PROFILE_HEIGHT - PROFILE_PADDING_Y}
        />
        {paths.map((path, index) => {
          const first = pointPosition(profile[index].points[0]);
          const last = pointPosition(profile[index].points[profile[index].points.length - 1]);
          return (
            <g key={index}>
              <path
                className={styles.profileFill}
                d={`${path} L ${last.x} ${PROFILE_HEIGHT - PROFILE_PADDING_Y} L ${first.x} ${PROFILE_HEIGHT - PROFILE_PADDING_Y} Z`}
              />
              <path
                className={`${styles.profileLine} ${styles[`profilePattern${index % 3}`]}`}
                d={path}
              />
            </g>
          );
        })}
        <circle
          className={styles.activeProfilePoint}
          cx={activePosition.x}
          cy={activePosition.y}
          r="7"
        />
        <text className={styles.axisLabel} x={PROFILE_PADDING_X} y={PROFILE_HEIGHT - 10}>0 km</text>
        <text className={styles.axisLabel} textAnchor="end" x={PROFILE_WIDTH - PROFILE_PADDING_X} y={PROFILE_HEIGHT - 10}>
          {(measuredMaximumDistance / 1_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km
        </text>
        </svg>
        <div
          className={styles.profileControls}
          role="group"
          aria-label="Points du profil altimétrique"
        >
          {controls.map((reference) => (
            <button
              key={`${reference.sequenceIndex}-${reference.pointIndex}`}
              type="button"
              className={styles.profileHitArea}
              style={{
                left: `clamp(22px, ${reference.position.x / PROFILE_WIDTH * 100}%, calc(100% - 22px))`,
                top: `clamp(22px, ${reference.position.y / PROFILE_HEIGHT * 100}%, calc(100% - 22px))`,
                width: 44,
                height: 44,
              }}
              aria-label={formatProfilePoint(reference.point)}
              onFocus={() => setActive({
                sequenceIndex: reference.sequenceIndex,
                pointIndex: reference.pointIndex,
              })}
              onPointerEnter={() => setActive({
                sequenceIndex: reference.sequenceIndex,
                pointIndex: reference.pointIndex,
              })}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function RouteVisualization({
  geometry,
  elevationAvailable,
  departureName,
  arrivalName,
}: RouteVisualizationProps) {
  const sequencePoints = useMemo(() => projectedSequences(geometry), [geometry]);
  const departure = endpoint(sequencePoints, 0, false);
  const arrival = endpoint(sequencePoints, sequencePoints.length - 1, true);

  return (
    <div className={styles.loaded}>
      <figure className={styles.mapFigure}>
        <svg
          className={styles.map}
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          role="img"
          aria-labelledby="route-map-title route-map-description"
        >
          <title id="route-map-title">Tracé de {departureName} à {arrivalName}</title>
          <desc id="route-map-description">
            La portion comporte {sequencePoints.length} {sequencePoints.length > 1 ? 'segments séparés' : 'segment continu'}.
          </desc>
          <rect className={styles.mapBackground} width={MAP_WIDTH} height={MAP_HEIGHT} rx="24" />
          {sequencePoints.map((points, index) => (
            <polyline
              key={index}
              className={`${styles.routeLine} ${styles[`routePattern${index % 3}`]}`}
              points={points}
              vectorEffect="non-scaling-stroke"
            >
              <title>Segment {index + 1}</title>
            </polyline>
          ))}
          <circle className={styles.departureMarker} cx={departure.x} cy={departure.y} r="11" />
          <circle className={styles.arrivalMarker} cx={arrival.x} cy={arrival.y} r="11" />
        </svg>
        <figcaption className={styles.mapCaption}>
          <span><i className={styles.departureSwatch} aria-hidden="true" /> Départ : {departureName}</span>
          <span><i className={styles.arrivalSwatch} aria-hidden="true" /> Arrivée : {arrivalName}</span>
        </figcaption>
        {sequencePoints.length > 1 && (
          <ol className={styles.segmentLegend} aria-label="Segments séparés du tracé">
            {sequencePoints.map((_, index) => (
              <li key={index}>
                <i className={`${styles.segmentSwatch} ${styles[`swatchPattern${index % 3}`]}`} aria-hidden="true" />
                Segment {index + 1}{index > 0 ? ' — reprise après une rupture connue' : ''}
              </li>
            ))}
          </ol>
        )}
      </figure>

      {elevationAvailable && geometry.elevationProfile && (
        <ElevationProfile profile={geometry.elevationProfile} />
      )}
    </div>
  );
}
