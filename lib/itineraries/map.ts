import { geometryBounds } from './geometry.ts';
import type { ItineraryDisplayGeometry } from './types';

type Position = [number, number];

const OPEN_FREE_MAP_ORIGIN = 'https://tiles.openfreemap.org';

export const OPEN_FREE_MAP_STYLE_URL = `${OPEN_FREE_MAP_ORIGIN}/styles/positron`;
export const MAP_STYLE_TIMEOUT_MS = 7_000;
export const MAP_MAX_FIT_ZOOM = 14;

export function isItineraryBasemapEnabled(value: string | undefined): boolean {
  return value === 'true';
}

export function transformOpenFreeMapRequest(url: string): { url: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('map_provider_url_rejected');
  }
  if (
    parsed.origin !== OPEN_FREE_MAP_ORIGIN
    || parsed.username !== ''
    || parsed.password !== ''
  ) {
    throw new Error('map_provider_url_rejected');
  }
  return { url };
}

interface FeatureCollection<TFeature> {
  type: 'FeatureCollection';
  features: TFeature[];
}

interface LineFeature {
  type: 'Feature';
  properties: { sequenceIndex: number };
  geometry: {
    type: 'LineString';
    coordinates: Position[];
  };
}

interface EndpointFeature {
  type: 'Feature';
  properties: { kind: 'departure' | 'arrival' };
  geometry: {
    type: 'Point';
    coordinates: Position;
  };
}

interface GapFeature {
  type: 'Feature';
  properties: {
    gapIndex: number;
    label: string;
    side: 'before' | 'after';
  };
  geometry: {
    type: 'Point';
    coordinates: Position;
  };
}

export interface RouteMapData {
  route: FeatureCollection<LineFeature>;
  endpoints: FeatureCollection<EndpointFeature>;
  gaps: FeatureCollection<GapFeature>;
  bounds: [Position, Position];
}

function mapPosition(coordinate: ItineraryDisplayGeometry['sequences'][number]['coordinates'][number]): Position {
  return [coordinate[0], coordinate[1]];
}

export function buildRouteMapData(geometry: ItineraryDisplayGeometry): RouteMapData {
  const sequences = geometry.sequences.map((sequence) => (
    sequence.coordinates.map(mapPosition)
  ));
  const firstPosition = sequences[0][0];
  const lastSequence = sequences[sequences.length - 1];
  const lastPosition = lastSequence[lastSequence.length - 1];
  const bounds = geometryBounds(geometry);

  return {
    route: {
      type: 'FeatureCollection',
      features: sequences.flatMap((coordinates, sequenceIndex) => (
        coordinates.length < 2
          ? []
          : [{
            type: 'Feature' as const,
            properties: { sequenceIndex },
            geometry: { type: 'LineString' as const, coordinates },
          }]
      )),
    },
    endpoints: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { kind: 'departure' },
          geometry: { type: 'Point', coordinates: firstPosition },
        },
        {
          type: 'Feature',
          properties: { kind: 'arrival' },
          geometry: { type: 'Point', coordinates: lastPosition },
        },
      ],
    },
    gaps: {
      type: 'FeatureCollection',
      features: sequences.slice(0, -1).flatMap((sequence, index) => {
        const gapIndex = index + 1;
        return [
          {
            type: 'Feature' as const,
            properties: { gapIndex, label: String(gapIndex), side: 'before' as const },
            geometry: {
              type: 'Point' as const,
              coordinates: sequence[sequence.length - 1],
            },
          },
          {
            type: 'Feature' as const,
            properties: { gapIndex, label: String(gapIndex), side: 'after' as const },
            geometry: {
              type: 'Point' as const,
              coordinates: sequences[index + 1][0],
            },
          },
        ];
      }),
    },
    bounds: [
      [bounds.minLongitude, bounds.minLatitude],
      [bounds.maxLongitude, bounds.maxLatitude],
    ],
  };
}
