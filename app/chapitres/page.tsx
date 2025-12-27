import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';
import { getChaptersInOrder } from '@/lib/chapters';

export default async function ChaptersPage() {
  const chapters = await getChaptersInOrder();
  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

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
        {chapters.map((chapter) => {
          const thumbnailUrl = chapter.thumbnail?.url
            ? (chapter.thumbnail.url.startsWith('http')
                ? chapter.thumbnail.url
                : `${strapiUrl}${chapter.thumbnail.url}`)
            : null;

          return (
            <Link 
              key={chapter.id}
              href={`/chapitres/${chapter.slug}`}
              className={`${styles.chapterCard} ${thumbnailUrl ? styles.withThumbnail : styles.withoutThumbnail}`}
            >
              <div className={styles.chapterContent}>
                <h2 className={styles.chapterTitle}>{chapter.title}</h2>
                <div className={styles.chapterMeta}>
                  <span className={styles.stations}>
                    {chapter.startStation} → {chapter.endStation}
                  </span>
                  <span className={styles.distance}>~{chapter.distance} km</span>
                </div>
                <p className={styles.chapterIntro}>{chapter.introSentence}</p>
              </div>
              {thumbnailUrl && (
                <div className={styles.chapterThumbnail}>
                  <Image
                    src={thumbnailUrl}
                    alt={chapter.thumbnail?.alternativeText || chapter.title}
                    width={400}
                    height={400}
                    style={{ objectFit: 'contain', width: '100%', height: 'auto', borderRadius: '8px' }}
                  />
                </div>
              )}
            </Link>
          );
        })}
      </section>
    </div>
  );
}
