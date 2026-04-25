import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { marked } from 'marked';
import { getAbout } from '@/lib/strapi';
import ImageSlider from '@/components/ImageSlider';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'À propos — Grand Tour des Hauts-de-France',
  description: 'Le projet Grand Tour des Hauts-de-France : un carnet de voyage numérique pour explorer la région à vélo.',
  openGraph: {
    title: 'À propos — Grand Tour des Hauts-de-France',
    description: 'Le projet Grand Tour des Hauts-de-France : un carnet de voyage numérique pour explorer la région à vélo.',
  },
};

interface AboutBlock {
  __component: 'shared.rich-text' | 'shared.media' | 'shared.quote' | 'shared.slider';
  id: number;
  body?: string;
  title?: string;
  file?: {
    url?: string;
    alternativeText?: string;
  };
  files?: Array<{
    url?: string;
    alternativeText?: string;
  }>;
}

interface AboutData {
  title?: string;
  blocks?: AboutBlock[];
}

function toAbsoluteMediaUrl(url: string | undefined, strapiUrl: string) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${strapiUrl}${url}`;
}

export default async function AboutPage() {
  let about: AboutData | null = null;

  try {
    about = await getAbout() as AboutData;
  } catch (error) {
    console.error('Error loading about page:', error);
  }

  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
  const title = about?.title || 'A propos';
  const blocks = about?.blocks || [];

  return (
    <div className={styles.page}>
      <main className={styles.container}>
        <Link href="/" className={styles.backLink}>← Retour</Link>

        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.lead}>Carnet de route, paysages traversés et principes de voyage lent.</p>
        </header>

        {blocks.length > 0 ? (
          <article className={styles.content}>
            {blocks.map((block) => {
              switch (block.__component) {
                case 'shared.rich-text':
                  return (
                    <div
                      key={block.id}
                      className={styles.richText}
                      dangerouslySetInnerHTML={{ __html: marked(block.body || '') as string }}
                    />
                  );

                case 'shared.media': {
                  const mediaUrl = toAbsoluteMediaUrl(block.file?.url, strapiUrl);
                  return mediaUrl ? (
                    <div key={block.id} className={styles.mediaBlock}>
                      <Image
                        src={mediaUrl}
                        alt={block.file?.alternativeText || 'Illustration'}
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                  ) : null;
                }

                case 'shared.quote':
                  return (
                    <blockquote key={block.id} className={styles.quote}>
                      <p className={styles.quoteText}>{block.body}</p>
                      {block.title && (
                        <cite className={styles.quoteAuthor}>- {block.title}</cite>
                      )}
                    </blockquote>
                  );

                case 'shared.slider':
                  return block.files && block.files.length > 0 ? (
                    <ImageSlider
                      key={block.id}
                      images={block.files.map((file) => ({
                        url: toAbsoluteMediaUrl(file.url, strapiUrl) || '',
                        alternativeText: file.alternativeText,
                      })).filter((img) => img.url)}
                    />
                  ) : null;

                default:
                  return null;
              }
            })}
          </article>
        ) : (
          <section className={styles.emptyState}>
            <p>La page a propos n&apos;est pas encore configuree dans Strapi.</p>
          </section>
        )}
      </main>
    </div>
  );
}
