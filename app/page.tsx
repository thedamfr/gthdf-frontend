import styles from './page.module.css';
import { getHomepage } from '@/lib/strapi';
import Image from 'next/image';
import HorizonsSection from '@/components/HorizonsSection';
import EncountersSection from '@/components/EncountersSection';
import type { Metadata } from 'next';

// Temporary placeholder component until images are added
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

function LogoPlaceholder() {
  return (
    <div style={{
      width: '140px',
      height: '280px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.75rem',
      color: 'var(--color-charbon)',
      background: 'var(--color-beige)',
      border: '3px solid var(--color-charbon)',
      borderRadius: '70px',
      textAlign: 'center',
      padding: '1rem',
      fontWeight: 'bold',
    }}>
      GTHDF<br/>Logo
    </div>
  );
}

interface HorizonCard {
  id: number;
  title: string;
  description: string;
  borderColor: 'bleu' | 'vert' | 'rouge' | 'jaune' | 'beige';
  image: { url: string; alternativeText?: string };
}

interface EncounterCard {
  id: number;
  title: string;
  description: string;
  borderColor: 'bleu' | 'vert' | 'rouge' | 'jaune' | 'beige';
  image: { url: string; alternativeText?: string };
}

interface SeoComponent {
  id: number;
  metaTitle: string;
  metaDescription: string;
  shareImage?: { url: string; alternativeText?: string };
}

export async function generateMetadata(): Promise<Metadata> {
  const homepage = await getHomepage() as { 
    seo?: SeoComponent[];
  };

  const seo = homepage?.seo?.[0];
  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
  
  const shareImageUrl = seo?.shareImage?.url
    ? (seo.shareImage.url.startsWith('http')
        ? seo.shareImage.url
        : `${strapiUrl}${seo.shareImage.url}`)
    : null;

  return {
    title: seo?.metaTitle || 'Grand Tour des Hauts-de-France',
    description: seo?.metaDescription || 'Carnet de voyage numérique. Notes from the road.',
    openGraph: shareImageUrl ? {
      images: [shareImageUrl],
    } : undefined,
  };
}

export default async function Home() {
  const homepage = await getHomepage() as { 
    title?: string; 
    subtitle?: string;
    logo?: { url: string; alternativeText?: string; width?: number; height?: number };
    HorizonsTitres?: string;
    horizons?: HorizonCard[];
    rencontresTitre?: string;
    rencontres?: EncounterCard[];
    mapTitle?: string;
    mapEmbedUrl?: string;
    mapCaption?: string;
  };

  const logoUrl = homepage?.logo?.url 
    ? (homepage.logo.url.startsWith('http') 
        ? homepage.logo.url 
        : `${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${homepage.logo.url}`)
    : null;

  return (
    <div className={styles.container}>
      {/* Header with Logo */}
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          {logoUrl ? (
            <Image 
              src={logoUrl}
              alt={homepage?.logo?.alternativeText || 'GTHDF Logo'}
              width={140}
              height={280}
              priority
            />
          ) : (
            <LogoPlaceholder />
          )}
        </div>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{homepage?.title || 'Grand Tour des Hauts-de-France'}</h1>
          <p className={styles.subtitle}>{homepage?.subtitle || 'Carnet de voyage numérique. Notes from the road.'}</p>
        </div>
      </header>

      {/* Horizons Changeants */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{homepage?.HorizonsTitres || 'Changing Horizons'}</h2>
        <HorizonsSection 
          horizons={homepage?.horizons || []} 
          strapiUrl={process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}
        />
      </section>

      {/* Encounters */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{homepage?.rencontresTitre || 'Encounters'}</h2>
        <EncountersSection 
          rencontres={homepage?.rencontres || []} 
          strapiUrl={process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}
        />
      </section>

      {/* Map Overview */}
      <section className={styles.mapSection}>
        <h2 className={styles.sectionTitle}>{homepage?.mapTitle || 'Map Overview'}</h2>
        <div className={styles.mapContainer}>
          <div className={styles.mapFrame}>
            {homepage?.mapEmbedUrl ? (
              <iframe
                src={homepage.mapEmbedUrl}
                width="100%"
                height="480"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={homepage.mapTitle || 'Map Overview'}
              />
            ) : (
              <div className={styles.mapPlaceholder}>
                <p style={{ textAlign: 'center', color: 'var(--color-charbon)', opacity: 0.5 }}>
                  Interactive map placeholder
                </p>
              </div>
            )}
          </div>
          <p className={styles.mapCaption}>
            {homepage?.mapCaption || 'A general direction. The itinerary is open to interpretation. No rush.'}
          </p>
        </div>
      </section>

      {/* The Principle */}
      <section className={styles.principleSection}>
        <h2 className={styles.sectionTitle}>The Principle</h2>
        <div className={styles.principleGrid}>
          <div className={styles.principleCard} style={{ backgroundColor: 'var(--color-charbon)', color: 'var(--color-creme)' }}>
            <h3>Accessible</h3>
            <p>Mostly flat, sometimes rolling. Designed for heavy bikes and easy gears.</p>
          </div>

          <div className={styles.principleCard} style={{ backgroundColor: 'var(--color-jaune)', color: 'var(--color-charbon)' }}>
            <h3>Timeless</h3>
            <p>Five days or five weeks. The arrival date is not important.</p>
          </div>

          <div className={styles.principleCard} style={{ backgroundColor: 'var(--color-beige)', color: 'var(--color-charbon)' }}>
            <h3>Grounded</h3>
            <p>A break from efficiency. Watch the landscape change slowly.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
