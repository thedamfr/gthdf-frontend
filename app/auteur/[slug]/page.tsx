import type { Metadata, ResolvingMetadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAuthors, getAuthorBySlug } from '@/lib/strapi';
import BlogCard from '@/components/BlogCard';
import styles from './page.module.css';

interface AuthorPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const authors = await getAuthors() as any[];
    return authors
      .filter((a) => a.slug)
      .map((a) => ({ slug: a.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata(
  { params }: AuthorPageProps,
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  let author: any = null;
  try {
    author = await getAuthorBySlug(slug);
  } catch {
    // ignore
  }

  if (!author) {
    return { title: 'Auteur introuvable \u2014 GTHDF' };
  }

  const title = `${author.name} \u2014 GTHDF`;
  const description = author.bio || `Articles de ${author.name} sur GTHDF.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
    },
  };
}

function toAbsoluteMediaUrl(url: string | undefined, strapiUrl: string) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${strapiUrl}${url}`;
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const { slug } = await params;

  let author = null;
  try {
    author = await getAuthorBySlug(slug);
  } catch (error) {
    console.error('Error loading author:', error);
  }

  if (!author) {
    notFound();
  }

  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
  const avatarUrl = toAbsoluteMediaUrl(author.avatar?.url, strapiUrl);
  const articles = (author.articles || []).filter((a: any) => a.slug);

  return (
    <div className={styles.page}>
      <main className={styles.container}>
        <Link href="/blog" className={styles.backLink}>
          ← Retour au blog
        </Link>

        <header className={styles.header}>
          <div className={styles.identity}>
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={author.name}
                width={96}
                height={96}
                className={styles.avatar}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {author.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className={styles.name}>{author.name}</h1>
              {author.email && (
                <a
                  href={`mailto:${author.email}`}
                  className={styles.email}
                >
                  {author.email}
                </a>
              )}
            </div>
          </div>

          {author.bio && (
            <p className={styles.bio}>{author.bio}</p>
          )}
        </header>

        {articles.length > 0 ? (
          <section className={styles.articlesSection}>
            <h2 className={styles.sectionTitle}>
              Articles de {author.name}
              <span className={styles.count}>{articles.length}</span>
            </h2>
            <div className={styles.articlesGrid}>
              {articles.map((article: any) => (
                <BlogCard
                  key={article.id}
                  article={article}
                  strapiUrl={strapiUrl}
                />
              ))}
            </div>
          </section>
        ) : (
          <section className={styles.emptyState}>
            <p>Aucun article publié pour le moment.</p>
          </section>
        )}
      </main>
    </div>
  );
}
