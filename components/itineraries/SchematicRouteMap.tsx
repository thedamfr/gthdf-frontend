'use client';

import { useMemo } from 'react';

import { geometryBounds } from '@/lib/itineraries/geometry';
import type { ItineraryDisplayGeometry } from '@/lib/itineraries/types';
import styles from './RouteVisualization.module.css';

interface SchematicRouteMapProps {
  geometry: ItineraryDisplayGeometry;
  departureName: string;
  arrivalName: string;
}

const MAP_WIDTH = 1_000;
const MAP_HEIGHT = 480;
const MAP_PADDING = 48;

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

export default function SchematicRouteMap({
  geometry,
  departureName,
  arrivalName,
}: SchematicRouteMapProps) {
  const sequencePoints = useMemo(() => projectedSequences(geometry), [geometry]);
  const departure = endpoint(sequencePoints, 0, false);
  const arrival = endpoint(sequencePoints, sequencePoints.length - 1, true);
  const gaps = sequencePoints.slice(0, -1).map((_, index) => ({
    label: String(index + 1),
    before: endpoint(sequencePoints, index, true),
    after: endpoint(sequencePoints, index + 1, false),
  }));

  return (
    <svg
      className={styles.map}
      data-schematic-map
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
        {gaps.flatMap((gap) => [gap.before, gap.after].map((point, sideIndex) => (
          <g
            key={`${gap.label}-${sideIndex}`}
            className={styles.gapMarker}
            aria-hidden="true"
          >
            <circle cx={point.x} cy={point.y} r="16" />
            <text x={point.x} y={point.y}>{gap.label}</text>
          </g>
        )))}
        <circle className={styles.departureMarker} cx={departure.x} cy={departure.y} r="11" />
        <circle className={styles.arrivalMarker} cx={arrival.x} cy={arrival.y} r="11" />
    </svg>
  );
}
