'use client';

import { useCallback, useState } from 'react';

import type {
  ItineraryDisplayGeometry,
  ItineraryElevationPoint,
  ItineraryElevationSequence,
} from '@/lib/itineraries/types';
import { formatKilometres } from '@/lib/itineraries/presentation';
import InteractiveRouteMap from './InteractiveRouteMap';
import styles from './RouteVisualization.module.css';
import SchematicRouteMap from './SchematicRouteMap';

interface RouteVisualizationProps {
  geometry: ItineraryDisplayGeometry;
  elevationAvailable: boolean;
  departureName: string;
  arrivalName: string;
  directionLabel: string;
  distanceMetres: number;
  basemapEnabled: boolean;
}

const PROFILE_WIDTH = 1_000;
const PROFILE_HEIGHT = 300;
const PROFILE_PADDING_X = 64;
const PROFILE_PADDING_Y = 42;

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
  directionLabel,
  distanceMetres,
  basemapEnabled,
}: RouteVisualizationProps) {
  const sequenceCount = geometry.sequences.length;
  const gapCount = Math.max(0, sequenceCount - 1);
  const [basemapState, setBasemapState] = useState<'disabled' | 'loading' | 'ready' | 'unavailable'>(
    basemapEnabled ? 'loading' : 'disabled'
  );
  const distance = formatKilometres(distanceMetres);
  const continuity = sequenceCount === 1
    ? 'une séquence continue et aucun écart connu'
    : `${sequenceCount} séquences séparées et ${gapCount} ${gapCount > 1 ? 'écarts connus' : 'écart connu'}`;
  const handleBasemapReady = useCallback(() => setBasemapState('ready'), []);
  const handleBasemapUnavailable = useCallback(() => setBasemapState('unavailable'), []);

  return (
    <div className={styles.loaded}>
      <p className={styles.mapSummary}>
        Carte de la portion {directionLabel}. Distance : {distance}.{' '}
        Le tracé comporte {continuity}.
      </p>
      <a className={styles.skipMapLink} href="#itinerary-map-legend">Passer la carte</a>
      <figure className={styles.mapFigure}>
        <div className={styles.mapViewport}>
          <div hidden={basemapState === 'ready'}>
            <SchematicRouteMap
              geometry={geometry}
              directionLabel={directionLabel}
            />
          </div>
          {basemapEnabled && (
            <InteractiveRouteMap
              geometry={geometry}
              directionLabel={directionLabel}
              ready={basemapState === 'ready'}
              onReady={handleBasemapReady}
              onUnavailable={handleBasemapUnavailable}
            />
          )}
        </div>
        {basemapState === 'loading' && (
          <p className={styles.mapStatus} role="status">Chargement du fond de carte…</p>
        )}
        {basemapState === 'unavailable' && (
          <p className={styles.mapFallback} role="status">
            Le fond de carte n’est pas disponible pour le moment. Le tracé officiel reste
            visible et le GPX peut toujours être téléchargé.
          </p>
        )}
        <figcaption id="itinerary-map-legend" className={styles.mapCaption} tabIndex={-1}>
          <span><i className={styles.departureSwatch} aria-hidden="true" /> Départ : {departureName}</span>
          <span><i className={styles.arrivalSwatch} aria-hidden="true" /> Arrivée : {arrivalName}</span>
        </figcaption>
        {gapCount > 0 && (
          <ol className={styles.segmentLegend} aria-label="Écarts connus du tracé">
            {Array.from({ length: gapCount }, (_, index) => (
              <li key={index}>
                <strong>Écart {index + 1}.</strong>{' '}
                <span>
                  À cet endroit, les deux fichiers officiels ne se rejoignent pas exactement.
                  Le GPX conserve ce décalage au lieu d’inventer un raccord.
                </span>
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
