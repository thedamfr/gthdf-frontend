'use client';

import Image from 'next/image';
import styles from './DestinationSection.module.css';

interface PointOfInterest {
  id: number;
  name: string;
  description: string;
  photo?: { url: string; alternativeText?: string };
  url?: string;
}

interface Destination {
  id: number;
  title: string;
  description?: string;
  pois: PointOfInterest[];
}

export default function DestinationSection({ 
  destination, 
  strapiUrl 
}: { 
  destination: Destination; 
  strapiUrl: string;
}) {
  if (!destination || !destination.pois?.length) {
    return null;
  }

  const normalizeUrl = (url: string | undefined) => {
    if (!url) return null;
    return url.startsWith('http') ? url : `${strapiUrl}${url}`;
  };

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.title}>{destination.title}</h2>
        
        {destination.description && (
          <div 
            className={styles.description}
            dangerouslySetInnerHTML={{ __html: destination.description }}
          />
        )}

        <div className={styles.poiGrid}>
          {destination.pois.map((poi: PointOfInterest) => (
            <div key={poi.id} className={styles.poiCard}>
              {poi.photo && (
                <div className={styles.photoContainer}>
                  <Image
                    src={normalizeUrl(poi.photo.url) || ''}
                    alt={poi.photo.alternativeText || poi.name}
                    fill
                    className={styles.photo}
                  />
                </div>
              )}
              
              <div className={styles.content}>
                <h3 className={styles.poiName}>{poi.name}</h3>
                <p className={styles.poiDescription}>{poi.description}</p>
                
                {poi.url && (
                  <a 
                    href={poi.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.link}
                  >
                    En savoir plus →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
