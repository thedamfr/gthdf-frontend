import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';
import CheckpointCard, { type CheckpointData } from '@/components/CheckpointCard';
import { getCheckpoints, getCheckpointsPage } from '@/lib/strapi';

interface CheckpointItem {
  id: number;
  number: number;
  title?: string;
  enigma: string;
  hint?: string;
  what3words: string;
  chapter?: { title?: string };
}

interface CheckpointsPageContent {
  title?: string;
  heroLead?: string;
  heroParagraph1?: string;
  heroParagraph2?: string;
  rule1?: string;
  rule2?: string;
  rule3?: string;
  rule4?: string;
  whatsappUrl?: string;
  whatsappSubtitle?: string;
  mapsSectionTitle?: string;
  mapA3Label?: string;
  mapA1Label?: string;
  heroImage?: { url: string; alternativeText?: string };
  mapA3Pdf?: { url: string };
  mapA1Pdf?: { url: string };
}

function toAbsoluteMediaUrl(url: string | undefined, strapiUrl: string) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${strapiUrl}${url}`;
}

export default async function CheckpointsPage() {
  const [pageDataRaw, checkpointsRaw] = await Promise.all([
    getCheckpointsPage(),
    getCheckpoints(),
  ]);

  const pageData = (pageDataRaw || {}) as CheckpointsPageContent;
  const checkpoints = (checkpointsRaw || []) as CheckpointItem[];
  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

  const mappedCheckpoints: CheckpointData[] = checkpoints.map((checkpoint) => ({
    id: checkpoint.id,
    number: checkpoint.number,
    title: checkpoint.title,
    enigma: checkpoint.enigma,
    hint: checkpoint.hint,
    what3words: checkpoint.what3words,
    chapterName: checkpoint.chapter?.title,
  }));

  const rules = [pageData.rule1, pageData.rule2, pageData.rule3, pageData.rule4].filter(Boolean) as string[];
  const heroImageUrl = toAbsoluteMediaUrl(pageData.heroImage?.url, strapiUrl);
  const mapA3Url = toAbsoluteMediaUrl(pageData.mapA3Pdf?.url, strapiUrl) || '#';
  const mapA1Url = toAbsoluteMediaUrl(pageData.mapA1Pdf?.url, strapiUrl) || '#';
  const whatsappUrl = pageData.whatsappUrl || '#';

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <Link href="/" className={styles.backLink}>← Retour</Link>
        <h1 className={styles.pageTitle}>{pageData.title || 'Les checkpoints'}</h1>

        <div className={styles.heroLayout}>
          <div className={styles.heroText}>
            <p className={styles.heroLead}>
              {pageData.heroLead || 'Le GTHDF n’est pas qu’un sentier. C’est une enquête qui se déroule dans le paysage franc-comtois.'}
            </p>
            <p className={styles.heroPara}>
              {pageData.heroParagraph1 || 'Tout au long du tracé, les checkpoints sont dissimulés dans l’architecture, la géologie et la mémoire des lieux. Chacun est une énigme à résoudre sur le terrain, sans aide extérieure.'}
            </p>
            <p className={styles.heroPara}>
              {pageData.heroParagraph2 || 'Le principe est simple : trouver le lieu décrit par l’énigme, puis valider avec l’adresse what3words sur votre téléphone. Si vous bloquez, l’indice est là.'}
            </p>
            <ul className={styles.rulesList}>
              {rules.length > 0 ? (
                rules.map((rule) => <li key={rule}>{rule}</li>)
              ) : (
                <>
                  <li>24 checkpoints repartis sur l’ensemble du trace</li>
                  <li>Validation par what3words (precision 3 m2)</li>
                  <li>L’indice se deverrouille a la demande</li>
                  <li>Pas de classement, pas de chrono</li>
                </>
              )}
            </ul>

            <a
              href={whatsappUrl}
              className={styles.whatsappCta}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className={styles.whatsappIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.122 1.532 5.858L.057 23.57a.75.75 0 0 0 .93.927l5.845-1.474A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.655-.51-5.17-1.4l-.37-.22-3.827.965.984-3.717-.242-.383A9.956 9.956 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
              Rejoindre le groupe WhatsApp
              <span className={styles.whatsappSub}>{pageData.whatsappSubtitle || 'entraide checkpoints & sorties'}</span>
            </a>
          </div>

          {heroImageUrl ? (
            <div className={styles.heroImage}>
              <Image
                src={heroImageUrl}
                alt={pageData.heroImage?.alternativeText || 'Randonneurs cherchant un checkpoint'}
                width={900}
                height={1200}
                className={styles.heroImageMedia}
                sizes="(max-width: 768px) 100vw, 45vw"
              />
            </div>
          ) : (
            <div className={styles.heroImage} aria-hidden="true">
              <div className={styles.heroImagePlaceholder}>
                <span>Ajoutez une image hero dans le SingleType Checkpoints Page</span>
              </div>
            </div>
          )}
        </div>
      </header>

      <section className={styles.mapsSection}>
        <h2 className={styles.mapsSectionTitle}>{pageData.mapsSectionTitle || 'Cartes du parcours'}</h2>
        <div className={styles.mapsGrid}>
          <a
            href={mapA3Url}
            className={styles.mapCard}
            aria-label="Télécharger la carte A3"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className={styles.mapIcon}>A3</div>
            <div className={styles.mapInfo}>
              <span className={styles.mapLabel}>{pageData.mapA3Label || 'Carte de randonnée'}</span>
              <span className={styles.mapFormat}>Format A3 — PDF</span>
            </div>
            <span className={styles.mapDownload}>↓</span>
          </a>
          <a
            href={mapA1Url}
            className={styles.mapCard}
            aria-label="Télécharger la carte A1"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className={styles.mapIcon}>A1</div>
            <div className={styles.mapInfo}>
              <span className={styles.mapLabel}>{pageData.mapA1Label || 'Carte grand format'}</span>
              <span className={styles.mapFormat}>Format A1 — PDF</span>
            </div>
            <span className={styles.mapDownload}>↓</span>
          </a>
        </div>
      </section>

      <section className={styles.grid}>
        {mappedCheckpoints.length > 0 ? (
          mappedCheckpoints.map((cp) => (
            <CheckpointCard key={cp.id} checkpoint={cp} />
          ))
        ) : (
          <p className={styles.emptyState}>Aucun checkpoint publie pour le moment.</p>
        )}
      </section>
    </div>
  );
}
