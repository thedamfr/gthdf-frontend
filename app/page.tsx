import Image from "next/image";
import Link from "next/link";
import { getArticles } from "@/lib/strapi";

export default async function Home() {
  let articles = [];
  let error = null;

  try {
    articles = await getArticles();
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to load articles';
    console.error('Error loading articles:', e);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="container mx-auto px-4 py-16 max-w-6xl">
        <header className="mb-16 text-center">
          <h1 className="text-5xl font-bold text-black dark:text-white mb-4">
            GTHDF Blog
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400">
            Articles powered by Strapi CMS
          </p>
        </header>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-8">
            <h2 className="text-red-800 dark:text-red-200 font-semibold mb-2">
              Unable to load articles
            </h2>
            <p className="text-red-600 dark:text-red-300 text-sm">
              {error}
            </p>
            <p className="text-red-600 dark:text-red-300 text-sm mt-2">
              Make sure Strapi is running on http://localhost:1337
            </p>
          </div>
        )}

        {articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article: any) => (
              <article
                key={article.id}
                className="bg-white dark:bg-zinc-900 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
              >
                {article.cover?.url && (
                  <div className="relative h-48 w-full">
                    <Image
                      src={`${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${article.cover.url}`}
                      alt={article.cover.alternativeText || article.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  {article.category && (
                    <span className="inline-block px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-3">
                      {article.category.name}
                    </span>
                  )}
                  <h2 className="text-2xl font-bold text-black dark:text-white mb-2">
                    <Link
                      href={`/article/${article.slug}`}
                      className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {article.title}
                    </Link>
                  </h2>
                  <p className="text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-3">
                    {article.description}
                  </p>
                  {article.author && (
                    <div className="flex items-center gap-3">
                      {article.author.avatar?.url && (
                        <div className="relative w-10 h-10 rounded-full overflow-hidden">
                          <Image
                            src={`${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${article.author.avatar.url}`}
                            alt={article.author.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {article.author.name}
                      </span>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : !error ? (
          <div className="text-center py-16">
            <p className="text-xl text-zinc-600 dark:text-zinc-400">
              No articles found. Seed your Strapi database with:
            </p>
            <code className="block mt-4 bg-zinc-100 dark:bg-zinc-900 p-4 rounded text-sm">
              cd ../gthdf-cms && npm run seed:example
            </code>
          </div>
        ) : null}
      </main>
    </div>
  );
}
