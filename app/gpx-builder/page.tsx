import type { Metadata } from 'next';
import Link from 'next/link';

import GpxBuilderForm from '@/components/gpx-builder/GpxBuilderForm';
import { toPublicGpxBuilderManifest } from '@/lib/gpx-builder/manifest';
import { getGpxBuilderManifest } from '@/lib/gpx-builder/server';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Créer mon GPX sur le GTHF',
  description: 'Choisissez deux villes du Grand Tour des Hauts-de-France et téléchargez la portion officielle dans le bon sens.',
};

export const revalidate = 60;

export default async function GpxBuilderPage() {
  const manifest = toPublicGpxBuilderManifest(await getGpxBuilderManifest());

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>← Retour à l’accueil</Link>
        <p className={styles.eyebrow}>GPX officiel à la carte</p>
        <h1>Créer mon GPX sur le GTHF</h1>
        <p className={styles.intro}>
          Choisissez votre sens, votre ville de départ et votre ville d’arrivée.
          Le fichier suit les traces officielles prévues dans ce sens, y compris leur dénivelé.
        </p>
      </header>

      {manifest.enabled ? (
        <GpxBuilderForm manifest={manifest} />
      ) : (
        <section className={styles.unavailable} aria-labelledby="builder-unavailable-title">
          <h2 id="builder-unavailable-title">Le générateur arrive bientôt</h2>
          <p>
            Les villes et les deux sens du parcours sont encore en cours de vérification.
            Les fichiers GPX complets restent disponibles sur chaque chapitre.
          </p>
          <Link href="/chapitres">Voir les chapitres</Link>
        </section>
      )}

      <aside className={styles.note} aria-label="À savoir">
        <h2>À savoir</h2>
        <p>
          Le GPX produit reprend uniquement la géométrie et les altitudes utiles des traces officielles.
          Les horodatages des enregistrements sources ne sont pas inclus.
        </p>
      </aside>
    </main>
  );
}
