import styles from './page.module.css';

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

export default function Home() {
  return (
    <div className={styles.container}>
      {/* Header with Logo */}
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <LogoPlaceholder />
        </div>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Grand Tour des Hauts-de-France</h1>
          <p className={styles.subtitle}>Carnet de voyage numérique. Notes from the road.</p>
        </div>
      </header>

      {/* Horizons Changeants */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Changing Horizons</h2>
        <div className={styles.horizonsGrid}>
          <article className={styles.horizonCard} style={{ borderColor: 'var(--color-bleu)' }}>
            <div className={styles.imageFrame}>
              <ImagePlaceholder text="Opal Coast" height={200} />
            </div>
            <h3>The Opal Coast</h3>
            <p>Salt air and wide skies. The path follows the cliff edge.</p>
          </article>

          <article className={styles.horizonCard} style={{ borderColor: 'var(--color-vert)' }}>
            <div className={styles.imageFrame}>
              <ImagePlaceholder text="Mining Basin" height={200} />
            </div>
            <h3>The Mining Basin</h3>
            <p>History reclaimed by nature. A surprising quiet.</p>
          </article>

          <article className={styles.horizonCard} style={{ borderColor: 'var(--color-vert)' }}>
            <div className={styles.imageFrame}>
              <ImagePlaceholder text="Ardennes Foothills" height={200} />
            </div>
            <h3>The Ardennes foothills</h3>
            <p>Deep woods and sloped tunnels. The route goes gently.</p>
          </article>
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
