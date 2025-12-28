import Link from 'next/link';
import { getLegalNotice } from '@/lib/strapi';
import styles from './page.module.css';
import { marked } from 'marked';

export const revalidate = 3600; // Revalidate every hour

interface LegalNoticeData {
  id: number;
  title: string;
  content: string;
  updatedAt: string;
}

export default async function LegalNoticePage() {
  let legalNotice: LegalNoticeData | null = null;
  let error: string | null = null;

  try {
    legalNotice = await getLegalNotice() as LegalNoticeData;
    // Vérifier que les données sont valides
    if (!legalNotice || !legalNotice.title) {
      error = 'Les mentions légales ne sont pas encore configurées. Veuillez les ajouter dans l\'administration Strapi.';
      legalNotice = null;
    }
  } catch (err) {
    console.error('Failed to load legal notice:', err);
    error = 'Les mentions légales ne sont pas encore configurées. Veuillez les ajouter dans l\'administration Strapi.';
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>← Retour</Link>
        {legalNotice && (
          <h1 className={styles.title}>{legalNotice.title}</h1>
        )}
      </header>

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
        </div>
      )}

      {legalNotice && (
        <article className={styles.content}>
          <div
            className={styles.richText}
            dangerouslySetInnerHTML={{ __html: marked(legalNotice.content) as string }}
          />
          <footer className={styles.footer}>
            <p className={styles.lastUpdated}>
              Dernière mise à jour : {new Date(legalNotice.updatedAt).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </footer>
        </article>
      )}
    </div>
  );
}

export async function generateMetadata() {
  // Return static metadata to avoid build errors if Strapi is not ready
  return {
    title: 'Mentions Légales',
    description: 'Mentions légales du site',
  };
}
