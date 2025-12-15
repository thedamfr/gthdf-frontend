import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import styles from './page.module.css';
import { getChapterBySlug, getChapters } from '@/lib/chapters';
import HorizonsSection from '@/components/HorizonsSection';

export async function generateStaticParams() {
  const chapters = await getChapters();
  return chapters.map((chapter) => ({
    slug: chapter.slug,
  }));
}

export default async function ChapterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const chapter = await getChapterBySlug(slug);

  if (!chapter) {
    notFound();
  }

  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

  // Normalize Komoot URLs to embed format
  const normalizeKomootUrl = (url: string | undefined) => {
    if (!url) return null;
    // If already an embed URL, return as is
    if (url.includes('/embed')) return url;
    // If it's a regular Komoot tour URL, add /embed
    if (url.includes('komoot.com/tour/') || url.includes('komoot.com/fr-fr/tour/')) {
      return `${url.replace(/\/$/, '')}/embed`;
    }
    // Otherwise return as is
    return url;
  };

  const komootAB = normalizeKomootUrl(chapter.komootEmbedAB);
  const komootBA = normalizeKomootUrl(chapter.komootEmbedBA);

  const gpxABUrl = chapter.gpxFileAB?.url
    ? (chapter.gpxFileAB.url.startsWith('http')
        ? chapter.gpxFileAB.url
        : `${strapiUrl}${chapter.gpxFileAB.url}`)
    : null;

  const gpxBAUrl = chapter.gpxFileBA?.url
    ? (chapter.gpxFileBA.url.startsWith('http')
        ? chapter.gpxFileBA.url
        : `${strapiUrl}${chapter.gpxFileBA.url}`)
    : null;

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <Link href="/chapitres" className={styles.backLink}>← Tous les chapitres</Link>
        
        <h1 className={styles.title}>{chapter.title}</h1>
        
        <div className={styles.meta}>
          <div className={styles.stations}>
            <span className={styles.station}>{chapter.startStation}</span>
            <span className={styles.arrow}>→</span>
            <span className={styles.station}>{chapter.endStation}</span>
          </div>
          <div className={styles.distance}>~{chapter.distance} km</div>
        </div>

        <div className={styles.bidirectionalNotice}>
          Ce chapitre peut être parcouru dans les deux sens
        </div>

        <p className={styles.intro}>{chapter.introSentence}</p>

        {chapter.updatedAt && (
          <div className={styles.lastUpdated}>
            Mis à jour le {new Date(chapter.updatedAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </div>
        )}
      </header>

      {/* Horizons */}
      {chapter.horizons && chapter.horizons.length > 0 && (
        <section className={styles.horizonsSection}>
          <h2 className={styles.sectionTitle}>Horizons</h2>
          <HorizonsSection horizons={chapter.horizons} strapiUrl={strapiUrl} />
        </section>
      )}

      {/* Navigation (Komoot + GPX) */}
      {(komootAB || komootBA) && (
        <section className={styles.navigationSection}>
          <h2 className={styles.sectionTitle}>Navigation</h2>
          
          <div className={styles.komootContainer}>
            {komootAB && (
              <div className={styles.komootEmbed}>
                <h3 className={styles.komootTitle}>
                  Direction {chapter.startStation} → {chapter.endStation}
                </h3>
                <iframe
                  src={komootAB}
                  width="100%"
                  height="500"
                  frameBorder="0"
                  title={`Komoot ${chapter.startStation} → ${chapter.endStation}`}
                />
                {gpxABUrl && (
                  <a 
                    href={gpxABUrl} 
                    download 
                    className={styles.gpxButton}
                  >
                    Télécharger GPX ({chapter.startStation} → {chapter.endStation})
                  </a>
                )}
              </div>
            )}

            {komootBA && (
              <div className={styles.komootEmbed}>
                <h3 className={styles.komootTitle}>
                  Direction {chapter.endStation} → {chapter.startStation}
                </h3>
                <iframe
                  src={komootBA}
                  width="100%"
                  height="500"
                  frameBorder="0"
                  title={`Komoot ${chapter.endStation} → ${chapter.startStation}`}
                />
                {gpxBAUrl && (
                  <a 
                    href={gpxBAUrl} 
                    download 
                    className={styles.gpxButton}
                  >
                    Télécharger GPX ({chapter.endStation} → {chapter.startStation})
                  </a>
                )}
              </div>
            )}
          </div>
          
          {/* Route Notes */}
          {chapter.routeNotes && (
            <div className={styles.notesWrapper}>
              <h3 className={styles.notesTitle}>En savoir plus sur ce Tour</h3>
              <div 
                className={styles.routeNotes}
                dangerouslySetInnerHTML={{ __html: chapter.routeNotes }}
              />
            </div>
          )}
        </section>
      )}

      {/* Testimonials */}
      {chapter.testimonials && chapter.testimonials.length > 0 && (
        <section className={styles.testimonialsSection}>
          <h2 className={styles.sectionTitle}>Témoignages</h2>
          <div className={styles.testimonialsList}>
            {chapter.testimonials.map((testimonial) => {
              const photoUrl = testimonial.photo?.url
                ? (testimonial.photo.url.startsWith('http')
                    ? testimonial.photo.url
                    : `${strapiUrl}${testimonial.photo.url}`)
                : null;

              return (
                <article 
                  key={testimonial.id} 
                  className={styles.testimonial}
                  style={{ borderColor: `var(--color-${testimonial.borderColor})` }}
                >
                  {photoUrl && (
                    <div className={styles.testimonialPhoto}>
                      <Image
                        src={photoUrl}
                        alt={testimonial.photo?.alternativeText || testimonial.author}
                        width={300}
                        height={200}
                        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                      />
                    </div>
                  )}
                  <div className={styles.testimonialContent}>
                    <h3>{testimonial.author}</h3>
                    <p>{testimonial.quote}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
