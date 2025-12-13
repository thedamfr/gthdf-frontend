'use client';

import Image from 'next/image';
import PagedSection from './PagedSection';
import styles from '@/app/page.module.css';

interface HorizonCard {
  id: number;
  title: string;
  description: string;
  borderColor: 'bleu' | 'vert' | 'rouge' | 'jaune' | 'beige';
  image: { url: string; alternativeText?: string };
}

function ImagePlaceholder({ text, height }: { text: string; height: number }) {
  return (
    <div style={{
      width: '100%',
      height: `${height}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.875rem',
      color: 'var(--color-charbon)',
      opacity: 0.5,
      background: 'var(--color-beige)',
      border: '2px dashed var(--color-charbon)',
    }}>
      {text}
    </div>
  );
}

export default function HorizonsSection({ 
  horizons, 
  strapiUrl 
}: { 
  horizons: HorizonCard[]; 
  strapiUrl: string;
}) {
  return (
    <PagedSection
      items={horizons}
      itemsPerPageMobile={1}
      itemsPerPageDesktop={3}
      className={styles.horizonsContainer}
      gridClassName={styles.horizonsGrid}
      renderItem={(horizon: HorizonCard) => {
        const imageUrl = horizon.image?.url 
          ? (horizon.image.url.startsWith('http') 
              ? horizon.image.url 
              : `${strapiUrl}${horizon.image.url}`)
          : null;

        return (
          <article 
            key={horizon.id} 
            className={styles.horizonCard} 
            style={{ borderColor: `var(--color-${horizon.borderColor})` }}
          >
            <div className={styles.imageFrame}>
              {imageUrl ? (
                <Image 
                  src={imageUrl}
                  alt={horizon.image.alternativeText || horizon.title}
                  width={300}
                  height={200}
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                />
              ) : (
                <ImagePlaceholder text={horizon.title} height={200} />
              )}
            </div>
            <h3>{horizon.title}</h3>
            <p>{horizon.description}</p>
          </article>
        );
      }}
    />
  );
}
