import type { Metadata } from 'next';
import { draftMode } from 'next/headers';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';

import CityBlocks from '@/components/CityBlocks';
import DeferredRouteVisualizations from '@/components/itineraries/DeferredRouteVisualizations';
import {
  getPublicCatalogueEntries,
  getRelatedDepartureItineraries,
  resolveCatalogueItinerary,
} from '@/lib/itineraries/server';
import {
  formatDepartureLabel,
  formatElevation,
  formatItineraryDirection,
  formatKilometres,
  selectRepresentativeCities,
} from '@/lib/itineraries/presentation';
import { isItineraryBasemapEnabled } from '@/lib/itineraries/map';
import type { PublicItinerary } from '@/lib/itineraries/types';
import styles from './page.module.css';

export const revalidate = 60;
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gthf.fr';
const PUBLIC_STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

interface ItineraryPageProps {
  params: Promise<{ slug: string }>;
}

function canonicalUrl(slug: string): string {
  return new URL(`/itineraires-velo/${slug}`, SITE_URL).toString();
}

function absoluteMediaUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }
  try {
    return new URL(url, `${new URL(PUBLIC_STRAPI_URL).origin}/`).toString();
  } catch {
    return null;
  }
}

function generatedTitle(itinerary: PublicItinerary): string {
  return `${itinerary.departure.name} – ${itinerary.arrival.name} à vélo : itinéraire GPX de ${formatKilometres(itinerary.distanceMetres)}`;
}

function generatedDescription(itinerary: PublicItinerary): string {
  const availableFeatures = itinerary.elevationAvailable
    ? 'Carte, dénivelé et GPX.'
    : 'Carte et GPX.';
  return `L’itinéraire cyclotouristique ${formatItineraryDirection(
    itinerary.departure,
    itinerary.arrival
  )} fait ${formatKilometres(itinerary.distanceMetres)} sur une portion du Grand Tour des Hauts-de-France. ${availableFeatures}`;
}

export async function generateStaticParams() {
  try {
    const itineraries = await getPublicCatalogueEntries();
    return itineraries.map((itinerary) => ({ slug: itinerary.slug }));
  } catch {
    console.warn('[catalogue] Static params unavailable; dynamic params remain enabled.');
    return [];
  }
}

export async function generateMetadata({ params }: ItineraryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const draft = await draftMode();
  const resolution = await resolveCatalogueItinerary(slug, draft.isEnabled);

  if (resolution.kind === 'redirect') {
    return {
      alternates: { canonical: canonicalUrl(resolution.slug) },
      robots: { index: false, follow: true },
    };
  }
  if (resolution.kind === 'not_found') {
    return {
      title: 'Itinéraire introuvable — GTHF',
      robots: { index: false, follow: false },
    };
  }

  const itinerary = resolution.itinerary.dto;
  const title = generatedTitle(itinerary);
  const description = generatedDescription(itinerary);
  const canonical = canonicalUrl(itinerary.slug);
  const shareImage = absoluteMediaUrl(itinerary.seo.shareImageUrl);
  const indexable = !itinerary.isPreview && itinerary.seoStatus === 'indexable';

  return {
    title,
    description,
    alternates: { canonical },
    robots: {
      index: indexable,
      follow: !itinerary.isPreview,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
      ...(shareImage ? { images: [{ url: shareImage }] } : {}),
    },
    twitter: { card: 'summary_large_image' },
  };
}

function CityLink({ city }: { city: PublicItinerary['cities'][number] }) {
  return city.href
    ? <Link href={city.href}>{city.name}</Link>
    : <span>{city.name}</span>;
}

export default async function ItineraryPage({ params }: ItineraryPageProps) {
  const { slug } = await params;
  const draft = await draftMode();
  const resolution = await resolveCatalogueItinerary(slug, draft.isEnabled);

  if (resolution.kind === 'redirect') {
    permanentRedirect(`/itineraires-velo/${resolution.slug}`);
  }
  if (resolution.kind === 'not_found') {
    notFound();
  }

  const itinerary = resolution.itinerary.dto;
  const relatedItineraries = await getRelatedDepartureItineraries(
    itinerary.departure.documentId,
    itinerary.documentId
  );
  const representativeCities = selectRepresentativeCities(itinerary.cities);
  const directionLabel = formatItineraryDirection(itinerary.departure, itinerary.arrival);
  const headingDirection = formatItineraryDirection(
    itinerary.departure,
    itinerary.arrival,
    { capitalize: true }
  );
  const distance = formatKilometres(itinerary.distanceMetres);

  return (
    <main className={styles.page}>
      <Link href="/chapitres" className={styles.backLink}>
        ← Retour au Grand Tour
      </Link>

      {itinerary.isPreview && (
        <div className={styles.previewBanner}>
          <p role="status">
            <strong>Mode prévisualisation actif.</strong>{' '}
            Cette version n’est pas indexée.
          </p>
          <a
            className={styles.previewExitLink}
            href={`/api/preview/exit?url=${encodeURIComponent(
              `/itineraires-velo/${itinerary.slug}`
            )}`}
          >
            Quitter la prévisualisation
          </a>
        </div>
      )}

      <header className={styles.header}>
        <p className={styles.eyebrow}>Itinéraire cyclotouristique</p>
        <h1>{headingDirection} à vélo : {distance}</h1>
        <p className={styles.routeContext}>
          L’itinéraire cyclotouristique {directionLabel} fait {distance}. Cette distance est
          mesurée le long du tracé GPX téléchargeable ci-dessous.
        </p>
        <p className={styles.routeContext}>
          Ce parcours constitue une portion du Grand Tour des Hauts-de-France, une boucle
          cyclotouristique de 1 400 km pensée pour découvrir la région à vélo. Il peut être
          parcouru seul ou intégré à un voyage plus long.
        </p>
      </header>

      <section className={styles.summary} aria-labelledby="itinerary-summary-title">
        <div>
          <p className={styles.eyebrow}>La portion en bref</p>
          <h2 id="itinerary-summary-title">Préparer le parcours</h2>
        </div>
        <dl className={styles.metrics}>
          <div>
            <dt>Distance du tracé GPX</dt>
            <dd>{distance}</dd>
          </div>
          <div>
            <dt>Dénivelé positif</dt>
            <dd>{itinerary.elevationAvailable ? formatElevation(itinerary.elevationGainMetres!) : 'Indisponible'}</dd>
          </div>
          <div>
            <dt>Dénivelé négatif</dt>
            <dd>{itinerary.elevationAvailable ? formatElevation(itinerary.elevationLossMetres!) : 'Indisponible'}</dd>
          </div>
        </dl>
        <a
          className={styles.downloadButton}
          href={itinerary.downloadPath}
          download
        >
          Télécharger le GPX {directionLabel} — {distance}
        </a>
        <p className={styles.downloadNote}>
          Fichier GPX officiel de la portion, à importer dans une application de navigation compatible.
        </p>
      </section>

      {itinerary.junctionWarnings.length > 0 && (
        <aside className={styles.warnings} aria-labelledby="junction-warning-title">
          <h2 id="junction-warning-title">Rupture connue sur le tracé</h2>
          <ul>
            {itinerary.junctionWarnings.map((warning, index) => (
              <li key={`${warning.afterChapterSlug ?? 'segment'}-${index}`}>
                {warning.message}
              </li>
            ))}
          </ul>
        </aside>
      )}

      {(itinerary.introduction || itinerary.usesLoopOrigin) && (
        <section className={styles.introduction} aria-labelledby="itinerary-context-title">
          <h2 id="itinerary-context-title">À propos de cette portion</h2>
          {itinerary.introduction && <p>{itinerary.introduction}</p>}
          {itinerary.usesLoopOrigin && (
            <p>
              Cette portion passe par l’origine de calcul de la boucle du GTHF ; l’ordre des
              chapitres ci-dessous suit bien le sens du parcours proposé.
            </p>
          )}
        </section>
      )}

      <div className={styles.routeLists}>
        <section aria-labelledby="itinerary-chapters-title">
          <h2 id="itinerary-chapters-title">
            {itinerary.chapters.length === 1 ? 'Chapitre concerné' : 'Chapitres concernés'}
          </h2>
          <ol className={styles.chapterList}>
            {itinerary.chapters.map((chapter) => (
              <li key={chapter.documentId}>
                <Link href={chapter.href}>{chapter.title}</Link>
                <span>{formatKilometres(chapter.distanceMetres)} sur cette portion</span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="itinerary-cities-title">
          <h2 id="itinerary-cities-title">Principales villes traversées</h2>
          <ol className={styles.cityList}>
            {representativeCities.map((city) => (
              <li key={city.documentId}><CityLink city={city} /></li>
            ))}
          </ol>
          {representativeCities.length < itinerary.cities.length && (
            <p className={styles.listNote}>
              {itinerary.cities.length} villes qualifiées se trouvent sur la portion ; cette
              liste en présente une sélection dans l’ordre du parcours.
            </p>
          )}
        </section>
      </div>

      <CityBlocks
        blocks={itinerary.blocks}
        cityName={`l’itinéraire ${directionLabel}`}
        strapiUrl={PUBLIC_STRAPI_URL}
      />

      <DeferredRouteVisualizations
        geometryPath={itinerary.geometryPath}
        elevationAvailable={itinerary.elevationAvailable}
        departureName={itinerary.departure.name}
        arrivalName={itinerary.arrival.name}
        directionLabel={directionLabel}
        distanceMetres={itinerary.distanceMetres}
        basemapEnabled={isItineraryBasemapEnabled(process.env.ITINERARY_BASEMAP_ENABLED)}
      />

      <p className={styles.updatedAt}>
        Géométrie vérifiée le{' '}
        <time dateTime={itinerary.revisionUpdatedAt}>
          {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(itinerary.revisionUpdatedAt))}
        </time>.
      </p>

      {relatedItineraries.length > 0 && (
        <section
          className={styles.relatedItineraries}
          aria-labelledby="related-itineraries-title"
        >
          <h2 id="related-itineraries-title">
            Voir aussi au départ {formatDepartureLabel(itinerary.departure)}
          </h2>
          <ul className={styles.relatedItineraryList}>
            {relatedItineraries.map((relatedItinerary) => (
              <li key={relatedItinerary.documentId}>
                <Link href={`/itineraires-velo/${relatedItinerary.slug}`}>
                  <strong>
                    {formatItineraryDirection(
                      relatedItinerary.departure,
                      relatedItinerary.arrival,
                      { capitalize: true }
                    )} à vélo
                  </strong>
                  <span>{formatKilometres(relatedItinerary.distanceMetres)} sur le GTHF</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
