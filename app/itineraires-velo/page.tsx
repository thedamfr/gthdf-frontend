import type { Metadata } from 'next';
import Link from 'next/link';

import { catalogueIndexEntries } from '@/lib/itineraries/index-core';
import { formatKilometres } from '@/lib/itineraries/presentation';
import { getPublicCatalogueEntries } from '@/lib/itineraries/server';

import styles from './index.module.css';

export const revalidate = 60;
export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gthf.fr';
const title = 'Itinéraires à vélo sur le GTHF';
const description = 'Toutes les portions ville à ville publiées sur le Grand Tour des Hauts-de-France, avec leur distance et leur fiche GPX officielle.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: new URL('/itineraires-velo', SITE_URL).toString(),
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title,
    description,
    type: 'website',
    url: new URL('/itineraires-velo', SITE_URL).toString(),
  },
};

export default async function ItineraryIndexPage() {
  const itineraries = catalogueIndexEntries(await getPublicCatalogueEntries());
  const countLabel = itineraries.length === 1
    ? '1 itinéraire publié'
    : `${itineraries.length.toLocaleString('fr-FR')} itinéraires publiés`;

  return (
    <main className={styles.page}>
      <Link href="/gpx-builder" className={styles.backLink}>
        ← Préparer une portion GPX
      </Link>

      <header className={styles.header}>
        <p className={styles.eyebrow}>Le catalogue public</p>
        <h1>Itinéraires à vélo sur le GTHF</h1>
        <p>
          Chaque fiche décrit une portion publiée entre deux villes du Grand Tour,
          sa distance sur le tracé et son fichier GPX officiel.
        </p>
      </header>

      <section className={styles.catalogue} aria-labelledby="itinerary-index-title">
        <div className={styles.catalogueHeader}>
          <h2 id="itinerary-index-title">Les portions publiées</h2>
          <p>{countLabel}</p>
        </div>

        {itineraries.length > 0 ? (
          <ul className={styles.itineraryList} aria-label="Itinéraires publiés">
            {itineraries.map((itinerary) => (
              <li key={itinerary.documentId}>
                <Link href={`/itineraires-velo/${itinerary.slug}`}>
                  <strong>
                    De {itinerary.departure.name} à {itinerary.arrival.name} à vélo
                  </strong>
                  <span>{formatKilometres(itinerary.distanceMetres)} sur le GTHF</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.emptyState}>
            <h2>Aucun itinéraire publié pour le moment</h2>
            <p>Les dix chapitres du Grand Tour restent disponibles.</p>
            <Link href="/chapitres">Voir les chapitres</Link>
          </div>
        )}
      </section>
    </main>
  );
}
