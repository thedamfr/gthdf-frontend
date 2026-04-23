import Image from "next/image";
import Link from "next/link";
import { marked } from "marked";
import { getArticleBySlug, getArticles } from "@/lib/strapi";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

// Generate static paths for all articles
export async function generateStaticParams() {
  try {
    const articles = await getArticles() as any[];
    return articles.map((article) => ({
      slug: article.slug,
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  
  let article = null;
  try {
    article = await getArticleBySlug(slug);
  } catch (error) {
    console.error('Error loading article:', error);
  }

  if (!article) {
    notFound();
  }

  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

  return (
    <div className={styles.page}>
      <main className={styles.container}>
        <Link href="/" className={styles.backLink}>
          ← Retour
        </Link>

        <article>
          {article.category && (
            <span className={styles.category}>{article.category.name}</span>
          )}

          <h1 className={styles.title}>{article.title}</h1>

          {article.description && (
            <p className={styles.description}>{article.description}</p>
          )}

          {article.author && (
            <div className={styles.authorBlock}>
              {article.author.avatar?.url && (
                <Image
                  src={`${strapiUrl}${article.author.avatar.url}`}
                  alt={article.author.name}
                  width={56}
                  height={56}
                  className={styles.authorAvatar}
                />
              )}
              <div>
                <div className={styles.authorName}>{article.author.name}</div>
                {article.author.email && (
                  <div className={styles.authorEmail}>{article.author.email}</div>
                )}
              </div>
            </div>
          )}

          {article.cover?.url && (
            <div className={styles.coverImage}>
              <Image
                src={`${strapiUrl}${article.cover.url}`}
                alt={article.cover.alternativeText || article.title}
                fill
                style={{ objectFit: 'cover' }}
              />
            </div>
          )}

          <div className={styles.content}>
            {article.blocks?.map((block: any, index: number) => {
              switch (block.__component) {
                case 'shared.rich-text':
                  return (
                    <div
                      key={index}
                      className={styles.richText}
                      dangerouslySetInnerHTML={{ __html: marked(block.body || '') as string }}
                    />
                  );

                case 'shared.media':
                  return block.file?.url ? (
                    <div key={index} className={styles.mediaBlock}>
                      <Image
                        src={`${strapiUrl}${block.file.url}`}
                        alt={block.file.alternativeText || ''}
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                  ) : null;

                case 'shared.quote':
                  return (
                    <blockquote key={index} className={styles.quote}>
                      <p className={styles.quoteText}>{block.body}</p>
                      {block.title && (
                        <cite className={styles.quoteAuthor}>— {block.title}</cite>
                      )}
                    </blockquote>
                  );

                case 'shared.slider':
                  return block.files?.length > 0 ? (
                    <div key={index} className={styles.sliderGrid}>
                      {block.files.map((file: any, fileIndex: number) => (
                        <div key={fileIndex} className={styles.sliderImage}>
                          <Image
                            src={`${strapiUrl}${file.url}`}
                            alt={file.alternativeText || ''}
                            fill
                            style={{ objectFit: 'cover' }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : null;

                default:
                  return null;
              }
            })}
          </div>
        </article>
      </main>
    </div>
  );
}
