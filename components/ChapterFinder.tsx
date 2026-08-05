'use client';

import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from 'react';

import {
  normalizeChapterSearchText,
  searchChapters,
  type ChapterFinderCityRole,
  type ChapterFinderItem,
  type ChapterSearchResult,
} from '@/lib/chapter-search';
import {
  classifyChapterProximity,
  formatProximityDistance,
  PROXIMITY_THRESHOLDS,
  type ProximityClassification,
} from '@/lib/chapter-proximity';
import type { ProximityIndex } from '@/lib/proximity-types';

import styles from './ChapterFinder.module.css';

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 12_000,
  maximumAge: 60_000,
};

type GeolocationState =
  | { status: 'checking' | 'idle' | 'requesting' | 'loading-index' }
  | { status: 'unsupported' | 'insecure' | 'denied' | 'timeout' | 'unavailable' | 'imprecise' | 'index-error' }
  | {
      status: 'result';
      classification: ProximityClassification;
      accuracyMeters: number;
      partial: boolean;
    };

type JoinedProximityResult = ProximityClassification['results'][number] & {
  chapter: ChapterFinderItem;
};

const roleLabels: Record<ChapterFinderCityRole, string> = {
  start: 'départ',
  intermediate: 'passage',
  end: 'arrivée',
};

function formatRoles(roles: ChapterFinderCityRole[]): string {
  return roles.map((role) => roleLabels[role]).join(', ');
}

function joinCurrentChapters(
  classification: ProximityClassification,
  chapters: readonly ChapterFinderItem[]
): JoinedProximityResult[] {
  const chapterByDocumentId = new Map(
    chapters.map((chapter) => [chapter.documentId, chapter])
  );

  return classification.results.flatMap((result) => {
    const chapter = chapterByDocumentId.get(result.documentId);
    return chapter ? [{ ...result, chapter }] : [];
  });
}

function getGeolocationAnnouncement(
  state: GeolocationState,
  chapters: readonly ChapterFinderItem[]
): string {
  const announcements: Partial<Record<GeolocationState['status'], string>> = {
    requesting: 'Localisation en cours.',
    'loading-index': 'Comparaison avec le parcours.',
    unsupported: 'Géolocalisation indisponible.',
    insecure: 'Connexion sécurisée nécessaire pour la géolocalisation.',
    denied: 'Localisation refusée.',
    timeout: 'Délai de localisation dépassé.',
    unavailable: 'Position indisponible.',
    imprecise: 'Position trop imprécise.',
    'index-error': 'Comparaison avec le parcours indisponible.',
  };

  if (state.status !== 'result') {
    return announcements[state.status] ?? '';
  }

  if (state.classification.status === 'out-of-area') {
    return 'Aucun chapitre trouvé à proximité.';
  }

  if (state.classification.status === 'imprecise') {
    return 'Position trop imprécise.';
  }

  if (state.classification.status === 'unavailable') {
    return 'Aucun tracé exploitable.';
  }

  const resultCount = joinCurrentChapters(state.classification, chapters).length;

  if (resultCount === 0) {
    return 'Aucun résultat géographique actuel.';
  }

  return resultCount === 1
    ? 'Un chapitre proche a été trouvé.'
    : `${resultCount} chapitres proches ont été trouvés.`;
}

function ChapterResultLink({ result }: { result: ChapterSearchResult }) {
  const { chapter } = result;
  const cityContext = result.kind === 'city'
    ? `${result.city.name} · ${formatRoles(result.city.roles)}`
    : null;
  const ariaLabel = result.kind === 'city'
    ? `${result.city.name}, ${formatRoles(result.city.roles)} du chapitre ${chapter.displayOrder}, ouvrir ${chapter.startName} vers ${chapter.endName}`
    : `Ouvrir le chapitre ${chapter.displayOrder}, ${chapter.startName} vers ${chapter.endName}`;

  return (
    <Link
      href={`/chapitres/${chapter.slug}`}
      className={styles.chapterLink}
      aria-label={ariaLabel}
    >
      <span className={styles.chapterNumber}>Chapitre {chapter.displayOrder}</span>
      {cityContext ? <strong className={styles.matchContext}>{cityContext}</strong> : null}
      <span className={styles.chapterRoute}>{chapter.startName} → {chapter.endName}</span>
      {chapter.title && chapter.title !== `${chapter.startName} → ${chapter.endName}` ? (
        <span className={styles.chapterTitle}>{chapter.title}</span>
      ) : null}
      <span className={styles.chapterDistance}>~{chapter.distance} km</span>
      <span className={styles.openLabel} aria-hidden="true">Ouvrir →</span>
    </Link>
  );
}

function GeolocationResults({
  state,
  chapters,
}: {
  state: GeolocationState;
  chapters: readonly ChapterFinderItem[];
}) {
  if (state.status === 'checking' || state.status === 'idle') {
    return null;
  }

  if (state.status === 'requesting') {
    return <p>Localisation en cours…</p>;
  }

  if (state.status === 'loading-index') {
    return <p>Comparaison avec le parcours…</p>;
  }

  const errorMessages: Partial<Record<GeolocationState['status'], string>> = {
    unsupported: 'La géolocalisation n’est pas disponible sur cet appareil. Recherchez une ville.',
    insecure: 'La géolocalisation nécessite une connexion sécurisée. Recherchez une ville.',
    denied: 'La localisation a été refusée. Vous pouvez rechercher une ville ou réessayer après avoir modifié l’autorisation.',
    timeout: 'La localisation a pris trop de temps. Réessayez ou recherchez une ville.',
    unavailable: 'Votre position n’est pas disponible. Réessayez ou recherchez une ville.',
    imprecise: 'Votre position est trop imprécise pour identifier un chapitre. Réessayez ou cherchez une ville.',
    'index-error': 'La comparaison avec le parcours est momentanément indisponible. La recherche et la liste restent accessibles.',
  };

  if (state.status !== 'result') {
    return <p>{errorMessages[state.status]}</p>;
  }

  const { classification } = state;

  if (classification.status === 'out-of-area') {
    return <p>Aucun chapitre n’a été trouvé à proximité. Recherchez une ville ou consultez la liste complète.</p>;
  }

  if (classification.status === 'imprecise') {
    return <p>Votre position est trop imprécise pour identifier un chapitre. Réessayez ou cherchez une ville.</p>;
  }

  if (classification.status === 'unavailable') {
    return <p>Aucun tracé exploitable n’est disponible pour la comparaison. Recherchez une ville.</p>;
  }

  const results = joinCurrentChapters(classification, chapters);

  if (results.length === 0) {
    return (
      <p>L’index géographique ne correspond plus à la liste actuelle. Recherchez une ville.</p>
    );
  }

  const resultStatus = results.length > 1 ? 'ambiguous' : 'single';
  const nearestIsNear = results[0].distanceMeters + state.accuracyMeters
      <= PROXIMITY_THRESHOLDS.nearDistanceMeters
    && state.accuracyMeters <= PROXIMITY_THRESHOLDS.maximumNearAccuracyMeters;

  return (
    <div>
      <p className={styles.proximityHeading}>
        {resultStatus === 'ambiguous'
          ? 'Chapitres les plus proches de votre position :'
          : nearestIsNear
            ? 'Vous êtes près de ce chapitre.'
            : 'Chapitre le plus proche de votre position :'}
      </p>
      <ul className={styles.proximityList}>
        {results.map(({ chapter, distanceMeters }) => (
          <li key={chapter.documentId}>
            <Link href={`/chapitres/${chapter.slug}`} className={styles.proximityLink}>
              <strong>Chapitre {chapter.displayOrder} — {chapter.startName} → {chapter.endName}</strong>
              <span>À environ {formatProximityDistance(distanceMeters)} du parcours.</span>
              <span className={styles.openLabel}>Ouvrir le chapitre →</span>
            </Link>
          </li>
        ))}
      </ul>
      {classification.accuracyIsImprecise ? (
        <p className={styles.precisionNote}>La position fournie par l’appareil est imprécise.</p>
      ) : null}
      {state.partial ? (
        <p className={styles.precisionNote}>Certains tracés n’ont pas pu être comparés.</p>
      ) : null}
    </div>
  );
}

export default function ChapterFinder({ chapters }: { chapters: ChapterFinderItem[] }) {
  const [query, setQuery] = useState('');
  const [geolocationState, setGeolocationState] = useState<GeolocationState>({
    status: 'checking',
  });
  const searchResults = useMemo(() => searchChapters(chapters, query), [chapters, query]);
  const hasQuery = normalizeChapterSearchText(query).length > 0;
  const isLocating = geolocationState.status === 'requesting'
    || geolocationState.status === 'loading-index';
  const canLocate = !['checking', 'unsupported', 'insecure'].includes(geolocationState.status);

  useEffect(() => {
    if (!window.isSecureContext) {
      setGeolocationState({ status: 'insecure' });
      return;
    }

    if (!('geolocation' in navigator)) {
      setGeolocationState({ status: 'unsupported' });
      return;
    }

    setGeolocationState({ status: 'idle' });
  }, []);

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape' && query) {
      setQuery('');
    }
  }

  function locateChapter() {
    if (isLocating || !canLocate || !navigator.geolocation) {
      return;
    }

    setGeolocationState({ status: 'requesting' });
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        if (coords.accuracy > PROXIMITY_THRESHOLDS.maximumUsableAccuracyMeters) {
          setGeolocationState({ status: 'imprecise' });
          return;
        }

        setGeolocationState({ status: 'loading-index' });
        try {
          const response = await fetch('/api/chapters/proximity-index', {
            method: 'GET',
            headers: { Accept: 'application/json' },
          });

          if (!response.ok) {
            throw new Error(`Proximity index request failed with ${response.status}`);
          }

          const index = await response.json() as ProximityIndex;
          if (index.schemaVersion !== 1 || !Array.isArray(index.chapters)) {
            throw new Error('Unsupported proximity index response.');
          }

          const classification = classifyChapterProximity(
            [coords.longitude, coords.latitude],
            coords.accuracy,
            index.chapters
          );
          setGeolocationState({
            status: 'result',
            classification,
            accuracyMeters: coords.accuracy,
            partial: index.partial,
          });
        } catch (error) {
          console.error('Unable to load the chapter proximity index:', error);
          setGeolocationState({ status: 'index-error' });
        }
      },
      (error) => {
        const status = error.code === error.PERMISSION_DENIED
          ? 'denied'
          : error.code === error.TIMEOUT
            ? 'timeout'
            : 'unavailable';
        setGeolocationState({ status });
      },
      GEOLOCATION_OPTIONS
    );
  }

  return (
    <section
      className={styles.finder}
      aria-labelledby="chapter-finder-title"
      data-search-state={hasQuery ? 'results' : 'idle'}
    >
      <div className={styles.finderHeading}>
        <p className={styles.eyebrow}>Sur la route ou avant de partir</p>
        <h2 id="chapter-finder-title">Trouver un chapitre</h2>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchControl}>
          <label htmlFor="chapter-search">Ville ou chapitre</label>
          <input
            id="chapter-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            autoComplete="off"
            spellCheck={false}
            placeholder="Ex. Calais ou chapitre 4"
          />
        </div>
        <button
          type="button"
          className={styles.locationButton}
          onClick={locateChapter}
          disabled={!canLocate || isLocating}
          aria-busy={isLocating}
        >
          {geolocationState.status === 'requesting'
            ? 'Localisation en cours…'
            : geolocationState.status === 'loading-index'
              ? 'Comparaison en cours…'
              : ['denied', 'timeout', 'unavailable', 'imprecise', 'index-error'].includes(geolocationState.status)
                ? 'Réessayer autour de moi'
                : 'Autour de moi'}
        </button>
      </div>

      <noscript>
        <p className={styles.noScript}>
          La recherche instantanée et la localisation nécessitent JavaScript. Tous les chapitres restent accessibles dans la liste ci-dessous.
        </p>
      </noscript>

      <p className={styles.geolocationLiveStatus} role="status" aria-live="polite">
        {getGeolocationAnnouncement(geolocationState, chapters)}
      </p>

      <div className={styles.geolocationStatus}>
        <GeolocationResults state={geolocationState} chapters={chapters} />
      </div>

      <p className={styles.resultsStatus} role="status" aria-live="polite">
        {hasQuery
          ? `${searchResults.length} résultat${searchResults.length > 1 ? 's' : ''}`
          : ''}
      </p>

      {searchResults.length > 0 ? (
        <ul className={styles.chapterList}>
          {searchResults.map((result) => (
            <li key={result.resultId}>
              <ChapterResultLink result={result} />
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.emptyState}>
          <p>Aucun chapitre ne correspond à cette recherche.</p>
          <button type="button" onClick={() => setQuery('')} className={styles.clearButton}>
            Effacer la recherche
          </button>
        </div>
      )}
    </section>
  );
}
