'use client';

import {
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';

import type { GpxBuilderSummary } from '@/lib/gpx-builder/generate';
import type {
  PublicGpxBuilderManifest,
  PublicGpxBuilderStop,
} from '@/lib/gpx-builder/manifest';
import type { GpxDirection } from '@/lib/gpx/types';

import styles from './GpxBuilderForm.module.css';

interface GpxBuilderFormProps {
  manifest: PublicGpxBuilderManifest;
}

type RequestStatus = 'idle' | 'previewing' | 'downloading';

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr');
}

function filterStops(
  stops: readonly PublicGpxBuilderStop[],
  query: string
): PublicGpxBuilderStop[] {
  const normalizedQuery = normalizeSearch(query.trim());
  if (!normalizedQuery) {
    return [...stops];
  }
  return stops.filter((stop) => normalizeSearch(
    [stop.name, ...stop.alternativeNames].join(' ')
  ).includes(normalizedQuery));
}

function formatDistance(distanceMetres: number): string {
  return `${new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(distanceMetres / 1000)} km`;
}

function errorMessage(payload: unknown): string {
  if (
    typeof payload === 'object'
    && payload !== null
    && 'error' in payload
    && typeof payload.error === 'object'
    && payload.error !== null
    && 'message' in payload.error
    && typeof payload.error.message === 'string'
  ) {
    return payload.error.message;
  }
  return 'Le générateur est temporairement indisponible.';
}

async function responsePayload(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export default function GpxBuilderForm({ manifest }: GpxBuilderFormProps) {
  const [direction, setDirection] = useState<GpxDirection>('AB');
  const [departureId, setDepartureId] = useState('');
  const [arrivalId, setArrivalId] = useState('');
  const [departureQuery, setDepartureQuery] = useState('');
  const [arrivalQuery, setArrivalQuery] = useState('');
  const [summary, setSummary] = useState<GpxBuilderSummary | null>(null);
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [announcement, setAnnouncement] = useState('');
  const [hasError, setHasError] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const directionManifest = manifest.directions[direction];
  const departureStops = useMemo(
    () => filterStops(directionManifest.stops, departureQuery),
    [departureQuery, directionManifest.stops]
  );
  const arrivalStops = useMemo(
    () => filterStops(directionManifest.stops, arrivalQuery),
    [arrivalQuery, directionManifest.stops]
  );
  const canSubmit = Boolean(
    departureId
    && arrivalId
    && departureId !== arrivalId
    && status === 'idle'
  );

  function focusStatus(): void {
    window.setTimeout(() => statusRef.current?.focus(), 0);
  }

  function resetResult(): void {
    setSummary(null);
    setAnnouncement('');
    setHasError(false);
  }

  function selectDirection(nextDirection: GpxDirection): void {
    if (nextDirection === direction) {
      return;
    }
    setDirection(nextDirection);
    setDepartureId('');
    setArrivalId('');
    setDepartureQuery('');
    setArrivalQuery('');
    setSummary(null);
    setAnnouncement('Le sens a changé : les villes ont été réinitialisées.');
    setHasError(false);
    focusStatus();
  }

  function selectionBody(): string {
    return JSON.stringify({
      direction,
      departureId,
      arrivalId,
      revision: manifest.revision,
    });
  }

  async function preview(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canSubmit) {
      setAnnouncement(
        departureId === arrivalId && departureId
          ? 'Choisissez deux villes différentes.'
          : 'Choisissez une ville de départ et une ville d’arrivée.'
      );
      setHasError(true);
      focusStatus();
      return;
    }

    setStatus('previewing');
    setSummary(null);
    setAnnouncement('Calcul du parcours en cours.');
    setHasError(false);
    try {
      const response = await fetch('/api/gpx-builder/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: selectionBody(),
      });
      const payload = await responsePayload(response);
      if (
        !response.ok
        || typeof payload !== 'object'
        || payload === null
        || !('summary' in payload)
      ) {
        throw new Error(errorMessage(payload));
      }
      setSummary(payload.summary as GpxBuilderSummary);
      setAnnouncement('Parcours prêt à être téléchargé.');
      setHasError(false);
    } catch (error) {
      setAnnouncement(
        error instanceof Error
          ? error.message
          : 'Le générateur est temporairement indisponible.'
      );
      setHasError(true);
    } finally {
      setStatus('idle');
      focusStatus();
    }
  }

  async function download(): Promise<void> {
    if (!summary || status !== 'idle') {
      return;
    }
    setStatus('downloading');
    setAnnouncement('Préparation du téléchargement.');
    setHasError(false);
    try {
      const response = await fetch('/api/gpx-builder/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: selectionBody(),
      });
      if (!response.ok) {
        throw new Error(errorMessage(await responsePayload(response)));
      }
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') ?? '';
      const filename = disposition.match(/filename="([a-z0-9.-]+)"/i)?.[1]
        ?? 'gthf-parcours.gpx';
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setAnnouncement('Le téléchargement du GPX a démarré.');
      setHasError(false);
    } catch (error) {
      setAnnouncement(
        error instanceof Error
          ? error.message
          : 'Le téléchargement est temporairement indisponible.'
      );
      setHasError(true);
    } finally {
      setStatus('idle');
      focusStatus();
    }
  }

  return (
    <form className={styles.form} onSubmit={preview}>
      <fieldset className={styles.directionFieldset}>
        <legend>1. Choisissez le sens du parcours</legend>
        <div className={styles.directionOptions}>
          {(['AB', 'BA'] as const).map((value) => (
            <label key={value} className={styles.directionOption}>
              <input
                type="radio"
                name="direction"
                value={value}
                checked={direction === value}
                onChange={() => selectDirection(value)}
                disabled={status !== 'idle'}
              />
              <span>{manifest.directions[value].label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.cityFieldset}>
        <legend>2. Choisissez votre portion</legend>
        <div className={styles.cityGrid}>
          <div className={styles.cityControl}>
            <label htmlFor="departure-search">Rechercher une ville de départ</label>
            <input
              id="departure-search"
              type="search"
              value={departureQuery}
              onChange={(event) => setDepartureQuery(event.target.value)}
              placeholder="Nom ou autre appellation"
              disabled={status !== 'idle'}
            />
            <label htmlFor="departure-city">Ville de départ</label>
            <select
              id="departure-city"
              value={departureId}
              onChange={(event) => {
                setDepartureId(event.target.value);
                resetResult();
              }}
              disabled={status !== 'idle'}
            >
              <option value="">Sélectionner une ville</option>
              {departureStops.map((stop) => (
                <option key={stop.id} value={stop.id}>
                  {stop.name}{stop.context ? ` — ${stop.context}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.cityControl}>
            <label htmlFor="arrival-search">Rechercher une ville d’arrivée</label>
            <input
              id="arrival-search"
              type="search"
              value={arrivalQuery}
              onChange={(event) => setArrivalQuery(event.target.value)}
              placeholder="Nom ou autre appellation"
              disabled={status !== 'idle'}
            />
            <label htmlFor="arrival-city">Ville d’arrivée</label>
            <select
              id="arrival-city"
              value={arrivalId}
              onChange={(event) => {
                setArrivalId(event.target.value);
                resetResult();
              }}
              disabled={status !== 'idle'}
            >
              <option value="">Sélectionner une ville</option>
              {arrivalStops.map((stop) => (
                <option key={stop.id} value={stop.id}>
                  {stop.name}{stop.context ? ` — ${stop.context}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <button className={styles.previewButton} type="submit" disabled={!canSubmit}>
        {status === 'previewing' ? 'Calcul en cours…' : 'Prévisualiser mon parcours'}
      </button>

      <div
        ref={statusRef}
        className={styles.liveStatus}
        role={hasError ? 'alert' : 'status'}
        aria-live={hasError ? 'assertive' : 'polite'}
        tabIndex={-1}
      >
        {announcement}
      </div>

      {summary && (
        <section className={styles.summary} aria-labelledby="gpx-summary-title">
          <p className={styles.eyebrow}>Votre portion</p>
          <h2 id="gpx-summary-title">
            {summary.departureName} → {summary.arrivalName}
          </h2>
          <dl className={styles.metrics}>
            <div>
              <dt>Sens</dt>
              <dd>{directionManifest.label}</dd>
            </div>
            <div>
              <dt>Distance</dt>
              <dd>{formatDistance(summary.distanceMetres)}</dd>
            </div>
            <div>
              <dt>Dénivelé</dt>
              <dd>
                {summary.elevationAvailable
                  ? `~D+ ${Math.round((summary.elevationGainMetres ?? 0) / 10) * 10} m · ~D− ${Math.round((summary.elevationLossMetres ?? 0) / 10) * 10} m`
                  : 'Non disponible pour cette portion'}
              </dd>
            </div>
            <div>
              <dt>Chapitres traversés</dt>
              <dd>{summary.chapterTitles.join(' · ')}</dd>
            </div>
            <div>
              <dt>Séquences continues</dt>
              <dd>{summary.sequenceCount}</dd>
            </div>
          </dl>
          {summary.usesLoopOrigin && (
            <p className={styles.loopNotice}>
              Cette portion passe par l’origine d’affichage de la boucle.
            </p>
          )}
          {summary.warnings.length > 0 && (
            <p className={styles.warning}>
              Cette portion comporte {summary.warnings.length === 1 ? 'une interruption qualifiée' : `${summary.warnings.length} interruptions qualifiées`} entre deux traces officielles.
            </p>
          )}
          <p className={styles.durationNote}>
            Cette portion ne constitue pas une estimation de durée.
          </p>
          <button
            className={styles.downloadButton}
            type="button"
            onClick={download}
            disabled={status !== 'idle'}
          >
            {status === 'downloading' ? 'Préparation…' : 'Télécharger mon GPX'}
          </button>
        </section>
      )}
    </form>
  );
}
