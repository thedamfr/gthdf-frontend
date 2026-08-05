'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import styles from './DesktopChapterGallery.module.css';

export interface DesktopChapterCard {
  documentId: string;
  slug: string;
  title: string;
  startName: string;
  endName: string;
  distance: number;
  introSentence: string;
  thumbnailUrl?: string;
  thumbnailAlternativeText?: string;
}

const DESKTOP_MEDIA_QUERY = '(min-width: 769px)';

export default function DesktopChapterGallery({
  chapters,
}: {
  chapters: DesktopChapterCard[];
}) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const updateViewport = () => setIsDesktop(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);
    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

  if (!isDesktop) {
    return null;
  }

  return (
    <section className={styles.gallerySection} aria-labelledby="chapter-gallery-title">
      <h2 id="chapter-gallery-title" className={styles.galleryTitle}>
        Découvrir les chapitres
      </h2>
      <div className={styles.gallery}>
        {chapters.map((chapter) => (
          <Link
            key={chapter.documentId}
            href={`/chapitres/${chapter.slug}`}
            className={styles.chapterCard}
          >
            <div className={styles.chapterContent}>
              <h3 className={styles.chapterTitle}>{chapter.title}</h3>
              <div className={styles.chapterMeta}>
                <span className={styles.stations}>
                  {chapter.startName} → {chapter.endName}
                </span>
                <span className={styles.distance}>~{chapter.distance} km</span>
              </div>
              <p className={styles.chapterIntro}>{chapter.introSentence}</p>
            </div>
            {chapter.thumbnailUrl ? (
              <div className={styles.chapterThumbnail}>
                <Image
                  src={chapter.thumbnailUrl}
                  alt={chapter.thumbnailAlternativeText || chapter.title}
                  width={400}
                  height={400}
                  loading="lazy"
                  sizes="(min-width: 1280px) 18vw, (min-width: 769px) 45vw, 1px"
                  className={styles.chapterImage}
                />
              </div>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
