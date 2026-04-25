'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './SocialSection.module.css';

export type TestimonialItem = {
  kind: 'testimonial';
  id: number;
  author: string;
  quote: string;
  photoUrl: string | null;
  borderColor: string;
};

export type ArticleItem = {
  kind: 'article';
  id: number;
  slug: string;
  title: string;
  excerpt?: string;
  coverUrl: string | null;
};

export type SocialItem = TestimonialItem | ArticleItem;

export default function SocialSection({ items }: { items: SocialItem[] }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const itemsPerPage = isMobile ? 1 : items.length;
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const visible = items.slice(currentPage * itemsPerPage, currentPage * itemsPerPage + itemsPerPage);

  if (items.length === 0) return null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.grid}>
        {visible.map((item) => {
          if (item.kind === 'testimonial') {
            return (
              <article
                key={`t-${item.id}`}
                className={styles.card}
                style={{ borderColor: `var(--color-${item.borderColor})` }}
              >
                {item.photoUrl && (
                  <div className={styles.imageFrame}>
                    <Image
                      src={item.photoUrl}
                      alt={item.author}
                      width={400}
                      height={220}
                      style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                    />
                  </div>
                )}
                <div className={styles.body}>
                  <h3 className={styles.cardTitle}>{item.author}</h3>
                  <p className={styles.cardText}>{item.quote}</p>
                </div>
              </article>
            );
          }

          return (
            <Link
              key={`a-${item.id}`}
              href={`/article/${item.slug}`}
              className={`${styles.card} ${styles.cardArticle}`}
            >
              {item.coverUrl && (
                <div className={styles.imageFrame}>
                  <Image
                    src={item.coverUrl}
                    alt={item.title}
                    width={400}
                    height={220}
                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                  />
                </div>
              )}
              <div className={styles.body}>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                {item.excerpt && <p className={styles.cardText}>{item.excerpt}</p>}
              </div>
            </Link>
          );
        })}
      </div>

      {totalPages > 1 && (
        <nav className={styles.pagination} aria-label="Navigation témoignages et articles">
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className={styles.navButton}
            aria-label="Précédent"
          >
            ← Précédente
          </button>
          <span className={styles.pageIndicator}>
            {currentPage + 1} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            className={styles.navButton}
            aria-label="Suivant"
          >
            Suivante →
          </button>
        </nav>
      )}
    </div>
  );
}
