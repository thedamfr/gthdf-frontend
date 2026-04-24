import Image from 'next/image';
import Link from 'next/link';
import styles from './BlogCard.module.css';

interface BlogCardProps {
  article: {
    id: number;
    slug: string;
    title: string;
    description?: string;
    publishedAt?: string;
    category?: { name?: string; slug?: string };
    author?: { name?: string };
    cover?: { url?: string; alternativeText?: string };
  };
  strapiUrl: string;
}

function toAbsoluteMediaUrl(url: string | undefined, strapiUrl: string) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${strapiUrl}${url}`;
}

function formatDate(dateValue: string | undefined) {
  if (!dateValue) return null;

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return null;

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(parsedDate);
}

export default function BlogCard({ article, strapiUrl }: BlogCardProps) {
  const coverUrl = toAbsoluteMediaUrl(article.cover?.url, strapiUrl);
  const publishedLabel = formatDate(article.publishedAt);

  return (
    <article className={styles.card}>
      <Link href={`/article/${article.slug}`} className={styles.cardLink}>
        <div className={styles.mediaWrap}>
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={article.cover?.alternativeText || article.title}
              fill
              className={styles.media}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className={styles.placeholder}>
              <span>Image à venir</span>
            </div>
          )}
        </div>

        <div className={styles.content}>
          {article.category?.name && (
            <span className={styles.category}>{article.category.name}</span>
          )}

          <h2 className={styles.title}>{article.title}</h2>

          {article.description && (
            <p className={styles.description}>{article.description}</p>
          )}

          <div className={styles.meta}>
            {publishedLabel && <span>{publishedLabel}</span>}
            {article.author?.name && <span>Par {article.author.name}</span>}
          </div>
        </div>
      </Link>
    </article>
  );
}
