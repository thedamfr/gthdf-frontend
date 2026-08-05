'use client';

import { useEffect } from 'react';

import styles from './page.module.css';

export default function ChaptersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unable to render the chapters page:', error);
  }, [error]);

  return (
    <main className={styles.container}>
      <section className={styles.unavailable} aria-labelledby="chapters-unavailable-title">
        <h1 id="chapters-unavailable-title">Les chapitres sont momentanément indisponibles</h1>
        <p>Le contenu n’a pas pu être chargé. Vous pouvez réessayer sans perdre votre navigation.</p>
        <button type="button" onClick={reset} className={styles.retryButton}>
          Réessayer
        </button>
      </section>
    </main>
  );
}
