import type { Metadata } from 'next';
import { draftMode } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import CityBlocks from '@/components/CityBlocks';
import {
  getCityBySlug,
  getChaptersForCity,
  getEligiblePublicCities,
  type City,
  type CityChapter,
} from '@/lib/cities';
import { getCityRoleLabel } from '@/lib/city-content';
import { getFeaturedItinerariesForCity } from '@/lib/itineraries/server';
import styles from './page.module.css';

export const revalidate = 60;
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gthf.fr';
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

interface CityPageProps {
  params: Promise<{ slug: string }>;
}

function cityDescription(city: City, chapters: CityChapter[]): string {
  if (city.seo?.metaDescription) {
    return city.seo.metaDescription;
  }

  if (city.shortDescription) {
    return city.shortDescription;
  }

  if (chapters.length === 1) {
    return `${city.name} se situe sur le Grand Tour des Hauts-de-France, dans le chapitre ${chapters[0].title}.`;
  }

  return `${city.name} relie ${chapters.length} chapitres du Grand Tour des Hauts-de-France.`;
}

function absoluteMediaUrl(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  return url.startsWith('http') ? url : `${STRAPI_URL}${url}`;
}

function cityRoleInChapter(cityDocumentId: string, chapter: CityChapter): string {
  const passage = chapter.cityPassages.find(
    (candidate) => candidate.city?.documentId === cityDocumentId
  );

  return passage ? getCityRoleLabel(passage.role) : 'Ville traversée';
}

export async function generateStaticParams() {
  try {
    const cities = await getEligiblePublicCities();
    return cities.map((city) => ({ slug: city.slug }));
  } catch (error) {
    console.error('Error generating city static params:', error);
    return [];
  }
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const draft = await draftMode();

  try {
    const city = await getCityBySlug(slug);
    if (!city) {
      return { title: 'Ville introuvable — GTHF' };
    }

    const chapters = await getChaptersForCity(city.documentId);
    if (!draft.isEnabled && (!city.hasPublicPage || chapters.length === 0)) {
      return { title: 'Ville introuvable — GTHF' };
    }

    const title = city.seo?.metaTitle
      || `${city.name} à vélo — Grand Tour des Hauts-de-France`;
    const description = cityDescription(city, chapters);
    const canonical = new URL(`/villes/${city.slug}`, SITE_URL).toString();
    const imageUrl = absoluteMediaUrl(city.seo?.shareImage?.url);

    return {
      title,
      description,
      alternates: { canonical },
      robots: draft.isEnabled
        ? { index: false, follow: false }
        : { index: true, follow: true },
      openGraph: {
        title,
        description,
        type: 'website',
        url: canonical,
        ...(imageUrl && { images: [{ url: imageUrl }] }),
      },
      twitter: {
        card: 'summary_large_image',
      },
    };
  } catch (error) {
    console.error('Error generating city metadata:', error);
    return { title: 'Ville — GTHF' };
  }
}

export default async function CityPage({ params }: CityPageProps) {
  const { slug } = await params;
  const draft = await draftMode();
  const city = await getCityBySlug(slug);

  if (!city) {
    notFound();
  }

  const chapters = await getChaptersForCity(city.documentId);
  if (!draft.isEnabled && (!city.hasPublicPage || chapters.length === 0)) {
    notFound();
  }

  const featuredItineraries = await getFeaturedItinerariesForCity(city.documentId);

  return (
    <main className={styles.page}>
      <Link href="/chapitres" className={styles.backLink}>
        ← Retour aux chapitres
      </Link>

      <header className={styles.header}>
        <h1>{city.name} à vélo sur le Grand Tour des Hauts-de-France</h1>
        {city.shortDescription && <p>{city.shortDescription}</p>}
      </header>

      {chapters.length > 0 && (
        <section className={styles.chapters} aria-labelledby="city-chapters-title">
          <h2 id="city-chapters-title">
            {chapters.length === 1 ? 'Chapitre concerné' : 'Chapitres concernés'}
          </h2>
          <div className={styles.chapterGrid}>
            {chapters.map((chapter) => (
              <article key={chapter.documentId} className={styles.chapterCard}>
                <p className={styles.role}>
                  {cityRoleInChapter(city.documentId, chapter)}
                </p>
                <h3>
                  <Link href={`/chapitres/${chapter.slug}`}>
                    {chapter.title}
                  </Link>
                </h3>
                <p className={styles.stations}>
                  {chapter.startStation} → {chapter.endStation}
                </p>
                <p className={styles.distance}>Environ {chapter.distance} km</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {featuredItineraries.length > 0 && (
        <section className={styles.itineraries} aria-labelledby="city-itineraries-title">
          <h2 id="city-itineraries-title">Itinéraires à vélo</h2>
          <ul className={styles.itineraryGrid}>
            {featuredItineraries.map((itinerary) => (
              <li key={itinerary.documentId}>
                <Link href={`/itineraires-velo/${itinerary.slug}`}>
                  <strong>{itinerary.departure.name} → {itinerary.arrival.name}</strong>
                  <span>
                    {(itinerary.distanceMetres / 1000).toLocaleString('fr-FR', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })} km sur le GTHF
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CityBlocks
        blocks={city.blocks}
        cityName={city.name}
        strapiUrl={STRAPI_URL}
      />
    </main>
  );
}
