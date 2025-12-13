'use client';

import Image from 'next/image';
import PagedSection from './PagedSection';
import styles from '@/app/page.module.css';

interface EncounterCard {
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

export default function EncountersSection({ 
  rencontres, 
  strapiUrl 
}: { 
  rencontres: EncounterCard[]; 
  strapiUrl: string;
}) {
  return (
    <PagedSection
      items={rencontres}
      itemsPerPageMobile={1}
      itemsPerPageDesktop={3}
      gridClassName={styles.encountersGrid}
      renderItem={(encounter: EncounterCard) => {
        const imageUrl = encounter.image?.url 
          ? (encounter.image.url.startsWith('http') 
              ? encounter.image.url 
              : `${strapiUrl}${encounter.image.url}`)
          : null;

        return (
          <article key={encounter.id} className={styles.encounterCard}>
            <div 
              className={styles.encounterImage}
              style={{ borderColor: `var(--color-${encounter.borderColor})` }}
            >
              {imageUrl ? (
                <Image 
                  src={imageUrl}
                  alt={encounter.image.alternativeText || encounter.title}
                  width={200}
                  height={150}
                  style={{ objectFit: 'cover', width: '100%', height: '100%', borderRadius: '4px' }}
                />
              ) : (
                <ImagePlaceholder text={encounter.title} height={150} />
              )}
            </div>
            <div className={styles.encounterText}>
              <h3>{encounter.title}</h3>
              <p>{encounter.description}</p>
            </div>
          </article>
        );
      }}
    />
  );
}
