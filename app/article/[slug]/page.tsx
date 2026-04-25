import Image from "next/image";
import Link from "next/link";
import { marked } from "marked";
import { getArticleBySlug, getArticles } from "@/lib/strapi";
import ImageSlider from "@/components/ImageSlider";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

function toAbsoluteMediaUrl(url: string | undefined, strapiUrl: string) {
  if (!url) return null;
  return url.startsWith("http") ? url : `${strapiUrl}${url}`;
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
              {toAbsoluteMediaUrl(article.author.avatar?.url, strapiUrl) && (
                <Image
                  src={toAbsoluteMediaUrl(article.author.avatar?.url, strapiUrl) || ""}
                  alt={article.author.name}
                  width={56}
                  height={56}
                  className={styles.authorAvatar}
                />
              )}
              <div>
                {article.author.slug ? (
                  <Link href={`/auteur/${article.author.slug}`} className={styles.authorName}>
                    {article.author.name}
                  </Link>
                ) : (
                  <div className={styles.authorName}>{article.author.name}</div>
                )}
                {article.author.email && (
                  <div className={styles.authorEmail}>{article.author.email}</div>
                )}
              </div>
            </div>
          )}

          {article.cover?.url && (
            <div className={styles.coverImage}>
              <Image
                src={toAbsoluteMediaUrl(article.cover.url, strapiUrl) || ""}
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
                        src={toAbsoluteMediaUrl(block.file.url, strapiUrl) || ""}
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
                    <ImageSlider
                      key={index}
                      images={block.files
                        .map((file: any) => ({
                          url: toAbsoluteMediaUrl(file.url, strapiUrl) || "",
                          alternativeText: file.alternativeText,
                        }))
                        .filter((img: { url: string }) => img.url)
                      }
                    />
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
