import Image from 'next/image';
import Link from 'next/link';

import styles from './GpxBuilderRouteContext.module.css';

interface GpxBuilderRouteContextProps {
  previewImageUrl?: string;
}

export default function GpxBuilderRouteContext({
  previewImageUrl,
}: GpxBuilderRouteContextProps) {
  return (
    <section className={styles.context} aria-labelledby="gpx-route-context-title">
      <div className={styles.imageFrame}>
        <Image
          src={previewImageUrl ?? '/map-preview-illustration.svg'}
          alt="Parcours complet de la boucle GTHF dans les Hauts-de-France"
          fill
          priority
          sizes="(max-width: 760px) 100vw, 55vw"
          className={styles.image}
        />
      </div>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>Le parcours complet</p>
        <h2 id="gpx-route-context-title">Une section de la boucle GTHF</h2>
        <p>
          Le Grand Tour s’adresse à celles et ceux qui veulent découvrir les
          Hauts-de-France à vélo, à leur rythme. Une journée, un week-end ou un
          voyage plus long : chacun choisit sa section de la boucle.
        </p>
        <Link href="/chapitres">Découvrir le parcours complet</Link>
      </div>
    </section>
  );
}
