'use client';

import 'maplibre-gl/dist/maplibre-gl.css';

import { useEffect, useRef } from 'react';
import type { IControl, Map as MapLibreMap } from 'maplibre-gl';

import {
  buildRouteMapData,
  MAP_MAX_FIT_ZOOM,
  MAP_STYLE_TIMEOUT_MS,
  OPEN_FREE_MAP_STYLE_URL,
  transformOpenFreeMapRequest,
} from '@/lib/itineraries/map';
import type { ItineraryDisplayGeometry } from '@/lib/itineraries/types';
import styles from './RouteVisualization.module.css';

interface InteractiveRouteMapProps {
  geometry: ItineraryDisplayGeometry;
  directionLabel: string;
  ready: boolean;
  onReady: () => void;
  onUnavailable: () => void;
}

type RouteBounds = ReturnType<typeof buildRouteMapData>['bounds'];

function supportsWebGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const options = { failIfMajorPerformanceCaveat: true };
    return canvas.getContext('webgl2', options) !== null
      || canvas.getContext('webgl', options) !== null;
  } catch {
    return false;
  }
}

function designColor(name: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!value) {
    throw new Error('map_design_color_unavailable');
  }
  return value;
}

function prefersReducedMotion(): boolean {
  return typeof globalThis.matchMedia === 'function'
    && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function fitRoute(
  map: MapLibreMap,
  bounds: RouteBounds,
  container: HTMLElement,
  duration: number
): void {
  map.fitBounds(bounds, {
    padding: container.clientWidth < 500 ? 36 : 56,
    maxZoom: MAP_MAX_FIT_ZOOM,
    duration,
  });
}

class RecenterControl implements IControl {
  private container: HTMLDivElement | null = null;
  private readonly recenter: () => void;

  constructor(recenter: () => void) {
    this.recenter = recenter;
  }

  onAdd(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = styles.recenterButton;
    button.setAttribute('aria-label', 'Recentrer la portion');
    button.title = 'Recentrer la portion';
    button.textContent = '⌖';
    button.addEventListener('click', this.recenter);
    container.append(button);
    this.container = container;
    return container;
  }

  onRemove(): void {
    const button = this.container?.querySelector('button');
    button?.removeEventListener('click', this.recenter);
    this.container?.remove();
    this.container = null;
  }
}

export default function InteractiveRouteMap({
  geometry,
  directionLabel,
  ready,
  onReady,
  onUnavailable,
}: InteractiveRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const mapData = buildRouteMapData(geometry);
    if (!container || mapData.route.features.length === 0 || !supportsWebGl()) {
      onUnavailable();
      return;
    }

    let disposed = false;
    let failed = false;
    let loaded = false;
    let overlaysAdded = false;
    let firstLoadComplete = false;
    let map: MapLibreMap | null = null;
    const timeout = globalThis.setTimeout(() => reportUnavailable(), MAP_STYLE_TIMEOUT_MS);

    function disposeMap() {
      const currentMap = map;
      map = null;
      currentMap?.remove();
    }

    function reportUnavailable() {
      if (disposed || failed || loaded) {
        return;
      }
      failed = true;
      globalThis.clearTimeout(timeout);
      disposeMap();
      onUnavailable();
    }

    function reportReady() {
      if (
        disposed
        || failed
        || loaded
        || !overlaysAdded
        || !firstLoadComplete
      ) {
        return;
      }
      loaded = true;
      globalThis.clearTimeout(timeout);
      onReady();
    }

    void import('maplibre-gl')
      .then(({ Map, NavigationControl }) => {
        if (disposed || failed) {
          return;
        }

        const colors = {
          route: designColor('--color-bleu'),
          halo: designColor('--color-creme'),
          departure: designColor('--color-vert'),
          arrival: designColor('--color-rouge'),
          text: designColor('--color-charbon'),
        };
        const instance = new Map({
          container,
          style: OPEN_FREE_MAP_STYLE_URL,
          bounds: mapData.bounds,
          fitBoundsOptions: {
            padding: container.clientWidth < 500 ? 36 : 56,
            maxZoom: MAP_MAX_FIT_ZOOM,
            duration: 0,
          },
          transformRequest: transformOpenFreeMapRequest,
          attributionControl: {},
          maplibreLogo: false,
          scrollZoom: false,
          dragRotate: false,
          dragPan: true,
          touchZoomRotate: true,
          touchPitch: false,
          cooperativeGestures: true,
          keyboard: true,
          doubleClickZoom: true,
          maxPitch: 0,
          pitch: 0,
          bearing: 0,
          renderWorldCopies: false,
        });
        map = instance;

        instance.scrollZoom.disable();
        instance.dragRotate.disable();
        instance.touchZoomRotate.disableRotation();
        instance.keyboard.disableRotation();
        instance.addControl(new NavigationControl({
          showCompass: false,
          showZoom: true,
          visualizePitch: false,
        }), 'top-right');
        instance.addControl(new RecenterControl(() => {
          fitRoute(instance, mapData.bounds, container, prefersReducedMotion() ? 0 : 350);
        }), 'top-right');

        instance.on('error', () => {
          if (!instance.isStyleLoaded()) {
            reportUnavailable();
          }
        });
        instance.once('load', () => {
          firstLoadComplete = true;
          reportReady();
        });
        instance.once('style.load', () => {
          if (disposed || failed) {
            return;
          }
          try {
            instance.addSource('gthdf-route', {
              type: 'geojson',
              data: mapData.route,
            });
            instance.addSource('gthdf-endpoints', {
              type: 'geojson',
              data: mapData.endpoints,
            });
            instance.addSource('gthdf-gaps', {
              type: 'geojson',
              data: mapData.gaps,
            });
            instance.addLayer({
              id: 'gthdf-route-halo',
              type: 'line',
              source: 'gthdf-route',
              layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: { 'line-color': colors.halo, 'line-width': 11 },
            });
            instance.addLayer({
              id: 'gthdf-route-line',
              type: 'line',
              source: 'gthdf-route',
              layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: { 'line-color': colors.route, 'line-width': 6 },
            });
            instance.addLayer({
              id: 'gthdf-departure',
              type: 'circle',
              source: 'gthdf-endpoints',
              filter: ['==', ['get', 'kind'], 'departure'],
              paint: {
                'circle-color': colors.departure,
                'circle-radius': 8,
                'circle-stroke-color': colors.halo,
                'circle-stroke-width': 3,
              },
            });
            instance.addLayer({
              id: 'gthdf-arrival',
              type: 'circle',
              source: 'gthdf-endpoints',
              filter: ['==', ['get', 'kind'], 'arrival'],
              paint: {
                'circle-color': colors.arrival,
                'circle-radius': 8,
                'circle-stroke-color': colors.halo,
                'circle-stroke-width': 3,
              },
            });
            instance.addLayer({
              id: 'gthdf-gap-circles',
              type: 'circle',
              source: 'gthdf-gaps',
              paint: {
                'circle-color': colors.halo,
                'circle-radius': 11,
                'circle-stroke-color': colors.text,
                'circle-stroke-width': 2,
              },
            });
            instance.addLayer({
              id: 'gthdf-gap-labels',
              type: 'symbol',
              source: 'gthdf-gaps',
              layout: {
                'text-field': ['get', 'label'],
                'text-font': ['Noto Sans Bold'],
                'text-size': 13,
                'text-allow-overlap': true,
              },
              paint: { 'text-color': colors.text },
            });
            fitRoute(instance, mapData.bounds, container, 0);
            overlaysAdded = true;
            reportReady();
          } catch {
            reportUnavailable();
          }
        });
      })
      .catch(() => reportUnavailable());

    return () => {
      disposed = true;
      globalThis.clearTimeout(timeout);
      disposeMap();
    };
  }, [geometry, onReady, onUnavailable]);

  return (
    <div
      ref={containerRef}
      className={styles.interactiveMapLayer}
      data-ready={ready ? 'true' : 'false'}
      role="region"
      aria-label={`Carte interactive de la portion ${directionLabel}`}
      aria-busy={!ready}
    />
  );
}
