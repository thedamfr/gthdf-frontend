'use client';

import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { parseItineraryDisplayGeometry } from '@/lib/itineraries/geometry';
import type { ItineraryDisplayGeometry } from '@/lib/itineraries/types';
import styles from './RouteVisualization.module.css';

const RouteVisualization = lazy(() => import('./RouteVisualization'));

interface DeferredRouteVisualizationsProps {
  geometryPath: string;
  elevationAvailable: boolean;
  departureName: string;
  arrivalName: string;
}

type LoadState =
  | { kind: 'idle' | 'error' }
  | { kind: 'ready'; geometry: ItineraryDisplayGeometry };

export default function DeferredRouteVisualizations({
  geometryPath,
  elevationAvailable,
  departureName,
  arrivalName,
}: DeferredRouteVisualizationsProps) {
  const containerRef = useRef<HTMLElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [state, setState] = useState<LoadState>({ kind: 'idle' });

  useEffect(() => {
    const element = containerRef.current;
    if (!element || shouldLoad) {
      return;
    }

    if (typeof globalThis.IntersectionObserver === 'undefined') {
      const timer = globalThis.setTimeout(() => setShouldLoad(true), 0);
      return () => globalThis.clearTimeout(timer);
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: '320px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [shouldLoad]);

  useEffect(() => {
    if (!shouldLoad) {
      return;
    }

    const controller = new AbortController();
    void fetch(geometryPath, {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      cache: 'default',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('geometry_unavailable');
        }
        const parsed = parseItineraryDisplayGeometry(await response.json());
        if (!parsed) {
          throw new Error('invalid_geometry');
        }
        setState({ kind: 'ready', geometry: parsed });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setState({ kind: 'error' });
      });

    return () => controller.abort();
  }, [geometryPath, shouldLoad]);

  return (
    <section
      ref={containerRef}
      className={styles.visualizations}
      aria-labelledby="itinerary-map-title"
    >
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>Tracé officiel</p>
        <h2 id="itinerary-map-title">Aperçu du tracé</h2>
        <p>
          Cette vue schématique montre la forme de la portion, son départ et son arrivée.
        </p>
      </div>

      {state.kind === 'idle' && (
        <div className={styles.placeholder} role="status" aria-live="polite">
          {shouldLoad ? 'Chargement de la carte…' : 'La carte se chargera à l’approche de cette section.'}
        </div>
      )}

      {state.kind === 'error' && (
        <p className={styles.error} role="status">
          La carte n’est pas disponible pour le moment. Les métriques et le GPX restent
          accessibles ci-dessus.
        </p>
      )}

      {state.kind === 'ready' && (
        <Suspense fallback={<div className={styles.placeholder}>Préparation de la carte…</div>}>
          <RouteVisualization
            geometry={state.geometry}
            elevationAvailable={elevationAvailable}
            departureName={departureName}
            arrivalName={arrivalName}
          />
        </Suspense>
      )}

      <noscript>
        <p className={styles.error}>
          La carte nécessite JavaScript. Toutes les informations essentielles et le GPX
          sont disponibles avant cette section.
        </p>
      </noscript>
    </section>
  );
}
