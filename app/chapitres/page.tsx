import type { Metadata } from 'next';
import Link from 'next/link';

import ChapterFinder from '@/components/ChapterFinder';
import DesktopChapterGallery, {
  type DesktopChapterCard,
} from '@/components/DesktopChapterGallery';
import { buildChapterFinderItems } from '@/lib/chapter-finder-data';
import { getChaptersInOrder } from '@/lib/chapters';

import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Les chapitres — GTHF',
  description: 'Le parcours GTHF est découpé en chapitres. Retrouvez le bon chapitre depuis une ville ou votre position.',
  openGraph: {
    title: 'Les chapitres — GTHF',
    description: 'Le parcours GTHF est découpé en chapitres. Retrouvez le bon chapitre depuis une ville ou votre position.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default async function ChaptersPage() {
  const chapters = await getChaptersInOrder();
  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
  const finderChapters = buildChapterFinderItems(chapters);
  const finderByDocumentId = new Map(
    finderChapters.map((chapter) => [chapter.documentId, chapter])
  );
  const galleryChapters: DesktopChapterCard[] = chapters.map((chapter) => {
    const finderChapter = finderByDocumentId.get(chapter.documentId);
    const thumbnailUrl = chapter.thumbnail?.url
      ? new URL(chapter.thumbnail.url, strapiUrl).toString()
      : undefined;

    return {
      documentId: chapter.documentId,
      slug: chapter.slug,
      title: chapter.title,
      startName: finderChapter?.startName ?? chapter.startStation,
      endName: finderChapter?.endName ?? chapter.endStation,
      distance: chapter.distance,
      introSentence: chapter.introSentence,
      thumbnailUrl,
      thumbnailAlternativeText: chapter.thumbnail?.alternativeText,
    };
  });

  return (
    <main className={styles.container}>
      <header className={styles.chaptersHeader}>
        <Link href="/" className={styles.backLink}>← Retour</Link>
        <h1 className={styles.pageTitle}>Les chapitres</h1>
        <p className={styles.pageIntro}>
          Le parcours est découpé en chapitres. Chaque chapitre peut être parcouru dans les deux sens.
        </p>
      </header>

      {finderChapters.length > 0 ? (
        <>
          <ChapterFinder chapters={finderChapters} />
          <DesktopChapterGallery chapters={galleryChapters} />
        </>
      ) : (
        <section className={styles.emptyCatalog}>
          <h2>Aucun chapitre publié pour le moment</h2>
          <p>Revenez bientôt pour consulter le parcours.</p>
        </section>
      )}
    </main>
  );
}
