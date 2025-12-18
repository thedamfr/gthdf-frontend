import Link from 'next/link';
import styles from './page.module.css';
import { getChaptersInOrder } from '@/lib/chapters';

export default async function ChaptersPage() {
  const chapters = await getChaptersInOrder();

  return (
    <div className={styles.container}>
      <header className={styles.chaptersHeader}>
        <Link href="/" className={styles.backLink}>← Retour</Link>
        <h1 className={styles.pageTitle}>Les chapitres</h1>
        <p className={styles.pageIntro}>
          Le parcours est découpé en chapitres. Chaque chapitre peut être parcouru dans les deux sens.
        </p>
      </header>

      <section className={styles.chaptersList}>
        {chapters.map((chapter) => (
          <Link 
            key={chapter.id}
            href={`/chapitres/${chapter.slug}`}
            className={styles.chapterCard}
          >
            <h2 className={styles.chapterTitle}>{chapter.title}</h2>
            <div className={styles.chapterMeta}>
              <span className={styles.stations}>
                {chapter.startStation} → {chapter.endStation}
              </span>
              <span className={styles.distance}>~{chapter.distance} km</span>
            </div>
            <p className={styles.chapterIntro}>{chapter.introSentence}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
