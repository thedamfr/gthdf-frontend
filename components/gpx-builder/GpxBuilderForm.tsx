'use client';

import {
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';

import type { GpxBuilderSummary } from '@/lib/gpx-builder/generate';
import type {
  PublicGpxBuilderManifest,
  PublicGpxBuilderStop,
} from '@/lib/gpx-builder/manifest';

import styles from './GpxBuilderForm.module.css';

interface GpxBuilderFormProps {
  manifest: PublicGpxBuilderManifest;
}

type RequestStatus = 'idle' | 'previewing' | 'downloading';

interface CityComboboxProps {
  id: string;
  label: string;
  stops: readonly PublicGpxBuilderStop[];
  value: string;
  excludedId: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

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

function stopLabel(stop: PublicGpxBuilderStop): string {
  return stop.context ? stop.name + ' — ' + stop.context : stop.name;
}

function CityCombobox({
  id,
  label,
  stops,
  value,
  excludedId,
  disabled,
  onChange,
}: CityComboboxProps) {
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listboxId = id + '-listbox';
  const availableStops = useMemo(
    () => filterStops(
      stops.filter((stop) => stop.id !== excludedId),
      inputValue
    ),
    [excludedId, inputValue, stops]
  );

  function selectStop(stop: PublicGpxBuilderStop): void {
    if (disabled) {
      return;
    }
    onChange(stop.id);
    setInputValue(stopLabel(stop));
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, availableStops.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && open && availableStops[activeIndex]) {
      event.preventDefault();
      selectStop(availableStops[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className={styles.cityControl}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.combobox}>
        <input
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={
            open && availableStops[activeIndex]
              ? id + '-option-' + availableStops[activeIndex].id
              : undefined
          }
          autoComplete="off"
          value={inputValue}
          onFocus={() => {
            setOpen(true);
            setActiveIndex(-1);
          }}
          onBlur={() => setOpen(false)}
          onChange={(event) => {
            setInputValue(event.target.value);
            setActiveIndex(0);
            setOpen(true);
            onChange('');
          }}
          onKeyDown={handleKeyDown}
          placeholder="Saisir une ville"
          disabled={disabled}
        />
        {open && !disabled && (
          <ul id={listboxId} className={styles.options} role="listbox">
            {availableStops.map((stop, index) => (
              <li
                id={id + '-option-' + stop.id}
                key={stop.id}
                className={index === activeIndex ? styles.activeOption : undefined}
                role="option"
                aria-selected={stop.id === value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectStop(stop)}
              >
                {stopLabel(stop)}
              </li>
            ))}
            {availableStops.length === 0 && (
              <li
                className={styles.noResult}
                role="option"
                aria-disabled="true"
                aria-selected="false"
              >
                Aucune ville trouvée
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
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
  const [departureId, setDepartureId] = useState('');
  const [arrivalId, setArrivalId] = useState('');
  const [summary, setSummary] = useState<GpxBuilderSummary | null>(null);
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [announcement, setAnnouncement] = useState('');
  const [hasError, setHasError] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const allStops = useMemo(
    () => [...manifest.directions.AB.stops].sort((first, second) => (
      stopLabel(first).localeCompare(stopLabel(second), 'fr')
    )),
    [manifest.directions.AB.stops]
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

  function selectionBody(): string {
    return JSON.stringify({
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
      <fieldset className={styles.cityFieldset}>
        <legend>1. Choisissez votre portion</legend>
        <p className={styles.directionHint}>
          Nous choisissons automatiquement la portion officielle la plus courte.
        </p>
        <div className={styles.cityGrid}>
          <CityCombobox
            id="departure-city"
            label="Ville de départ"
            stops={allStops}
            value={departureId}
            excludedId={arrivalId}
            disabled={status !== 'idle'}
            onChange={(value) => {
              setDepartureId(value);
              resetResult();
            }}
          />
          <CityCombobox
            id="arrival-city"
            label="Ville d’arrivée"
            stops={allStops}
            value={arrivalId}
            excludedId={departureId}
            disabled={status !== 'idle'}
            onChange={(value) => {
              setArrivalId(value);
              resetResult();
            }}
          />
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
