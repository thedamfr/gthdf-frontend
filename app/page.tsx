import styles from './page.module.css';
import { getHomepage } from '@/lib/strapi';
import Image from 'next/image';

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

export default async function Home() {
  const homepage = await getHomepage() as { 
    title?: string; 
    subtitle?: string;
    logo?: { url: string; alternativeText?: string; width?: number; height?: number };
    horizons?: HorizonCard[];
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
        <h2 className={styles.sectionTitle}>Changing Horizons</h2>
        <div className={styles.horizonsContainer}>
          <div className={styles.horizonsGrid}>
            {homepage?.horizons?.map((horizon, index) => {
              const imageUrl = horizon.image?.url 
                ? (horizon.image.url.startsWith('http') 
                    ? horizon.image.url 
                    : `${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${horizon.image.url}`)
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
                  
                  {/* Path arrow between cards */}
                  {index < (homepage.horizons?.length || 0) - 1 && (
                    <svg 
                      className={styles.pathArrow}
                      width="60" 
                      height="40" 
                      viewBox="0 0 60 40"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        d="M0 20 Q 30 10, 60 20" 
                        stroke="var(--color-rouge)" 
                        strokeWidth="2" 
                        strokeDasharray="4 4"
                        fill="none"
                      />
                      <path 
                        d="M 55 15 L 60 20 L 55 25" 
                        stroke="var(--color-rouge)" 
                        strokeWidth="2" 
                        fill="none"
                      />
                    </svg>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Encounters */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Encounters</h2>
        <div className={styles.encountersGrid}>
          <article className={styles.encounterCard}>
            <div className={styles.encounterImage}>
              <ImagePlaceholder text="René & Marie" height={150} />
            </div>
            <div className={styles.encounterText}>
              <h3>René & Marie</h3>
              <p>Retired, cycling slowly towards Lille.</p>
            </div>
          </article>

          <article className={styles.encounterCard}>
            <div className={styles.encounterImage}>
              <ImagePlaceholder text="Claire" height={150} />
            </div>
            <div className={styles.encounterText}>
              <h3>Claire</h3>
              <p>Baker in Arras. Suggested the canal route.</p>
            </div>
          </article>

          <article className={styles.encounterCard}>
            <div className={styles.encounterImage}>
              <ImagePlaceholder text="Marc & Léo" height={150} />
            </div>
            <div className={styles.encounterText}>
              <h3>Marc & Léo</h3>
              <p>First multi-day trip together.</p>
            </div>
          </article>
        </div>
      </section>

      {/* Map Overview */}
      <section className={styles.mapSection}>
        <h2 className={styles.sectionTitle}>Map Overview</h2>
        <div className={styles.mapContainer}>
          <div className={styles.mapFrame}>
            <div className={styles.mapTitle}>The Reference Path</div>
            <div className={styles.mapPlaceholder}>
              <p style={{ textAlign: 'center', color: 'var(--color-charbon)', opacity: 0.5 }}>
                Interactive map placeholder
              </p>
            </div>
          </div>
          <p className={styles.mapCaption}>
            A general direction. The itinerary is open to interpretation. No rush.
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
