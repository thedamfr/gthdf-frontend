import type { Metadata } from 'next';
import Link from 'next/link';

import GpxBuilderForm from '@/components/gpx-builder/GpxBuilderForm';
import GpxBuilderRouteContext from '@/components/gpx-builder/GpxBuilderRouteContext';
import { toPublicGpxBuilderManifest } from '@/lib/gpx-builder/manifest';
import { getGpxBuilderManifest } from '@/lib/gpx-builder/server';
import { getHomepage } from '@/lib/strapi';
import { resolveTrustedMediaUrl } from '@/lib/trusted-media-url';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Créer mon GPX sur le GTHF',
  description: 'Choisissez deux villes du Grand Tour des Hauts-de-France et téléchargez la portion officielle dans le bon sens.',
};

export const dynamic = 'force-dynamic';

interface HomepageRouteContext {
  mapPreviewImage?: { url?: string };
}

async function getRoutePreviewImageUrl(): Promise<string | undefined> {
  try {
    const homepage = await getHomepage() as HomepageRouteContext | null;
    const mediaUrl = homepage?.mapPreviewImage?.url;
    if (!mediaUrl) {
      return undefined;
    }
    // The resolved URL is serialized into next/image, so relative media must
    // use the public Strapi origin rather than a server-only endpoint.
    const configuredStrapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL;
    if (!configuredStrapiUrl && process.env.NODE_ENV === 'production') {
      return undefined;
    }
    const strapiUrl = configuredStrapiUrl ?? 'http://localhost:1337';
    const allowedOrigins = (process.env.STRAPI_MEDIA_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    return resolveTrustedMediaUrl(mediaUrl, strapiUrl, allowedOrigins);
  } catch {
    return undefined;
  }
}

export default async function GpxBuilderPage() {
  const [manifest, previewImageUrl] = await Promise.all([
    getGpxBuilderManifest().then(toPublicGpxBuilderManifest),
    getRoutePreviewImageUrl(),
  ]);

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>← Retour à l’accueil</Link>
        <p className={styles.eyebrow}>GPX officiel à la carte</p>
        <h1>Créer mon GPX sur le GTHF</h1>
        <p className={styles.intro}>
          Choisissez une ville de départ et une ville d’arrivée pour préparer
          votre prochaine portion du Grand Tour.
        </p>
      </header>

      <GpxBuilderRouteContext previewImageUrl={previewImageUrl} />

      {manifest.enabled ? (
        <GpxBuilderForm manifest={manifest} />
      ) : (
        <section className={styles.unavailable} aria-labelledby="builder-unavailable-title">
          <h2 id="builder-unavailable-title">Le générateur arrive bientôt</h2>
          <p>
            Les villes et les traces du parcours sont encore en cours de vérification.
            Les fichiers GPX complets restent disponibles sur chaque chapitre.
          </p>
          <Link href="/chapitres">Voir les chapitres</Link>
        </section>
      )}

      <aside className={styles.note} aria-label="À savoir">
        <h2>À savoir</h2>
        <p>
          Le fichier est créé à partir des traces officielles du GTHF pour la portion choisie.
        </p>
      </aside>
    </main>
  );
}
