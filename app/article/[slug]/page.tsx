import Image from "next/image";
import Link from "next/link";
import { getArticleBySlug, getArticles } from "@/lib/strapi";
import { notFound } from "next/navigation";

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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline mb-8"
        >
          ← Back to articles
        </Link>

        {/* Article Header */}
        <article>
          {article.category && (
            <span className="inline-block px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
              {article.category.name}
            </span>
          )}
          
          <h1 className="text-5xl font-bold text-black dark:text-white mb-6">
            {article.title}
          </h1>

          <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-8">
            {article.description}
          </p>

          {/* Author info */}
          {article.author && (
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-zinc-200 dark:border-zinc-800">
              {article.author.avatar?.url && (
                <div className="relative w-16 h-16 rounded-full overflow-hidden">
                  <Image
                    src={`${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${article.author.avatar.url}`}
                    alt={article.author.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <div className="font-semibold text-black dark:text-white">
                  {article.author.name}
                </div>
                {article.author.email && (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    {article.author.email}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cover image */}
          {article.cover?.url && (
            <div className="relative h-96 w-full mb-12 rounded-lg overflow-hidden">
              <Image
                src={`${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${article.cover.url}`}
                alt={article.cover.alternativeText || article.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Article content blocks */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            {article.blocks?.map((block: any, index: number) => {
              switch (block.__component) {
                case 'shared.rich-text':
                  return (
                    <div
                      key={index}
                      dangerouslySetInnerHTML={{ __html: block.body }}
                      className="mb-8"
                    />
                  );
                
                case 'shared.media':
                  return block.file?.url ? (
                    <div key={index} className="my-8">
                      <div className="relative h-96 w-full rounded-lg overflow-hidden">
                        <Image
                          src={`${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${block.file.url}`}
                          alt={block.file.alternativeText || ''}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                  ) : null;

                case 'shared.quote':
                  return (
                    <blockquote
                      key={index}
                      className="border-l-4 border-blue-600 pl-6 my-8 italic text-xl"
                    >
                      <p className="mb-2">{block.body}</p>
                      {block.title && (
                        <cite className="text-sm text-zinc-600 dark:text-zinc-400 not-italic">
                          — {block.title}
                        </cite>
                      )}
                    </blockquote>
                  );

                case 'shared.slider':
                  return block.files?.length > 0 ? (
                    <div key={index} className="grid grid-cols-2 gap-4 my-8">
                      {block.files.map((file: any, fileIndex: number) => (
                        <div
                          key={fileIndex}
                          className="relative h-64 rounded-lg overflow-hidden"
                        >
                          <Image
                            src={`${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${file.url}`}
                            alt={file.alternativeText || ''}
                            fill
                            className="object-cover"
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
