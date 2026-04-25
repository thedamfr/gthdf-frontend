import type { Metadata } from 'next';
import Link from 'next/link';
import BlogCard from '@/components/BlogCard';
import { getArticles, getCategories } from '@/lib/strapi';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Contenus — Grand Tour des Hauts-de-France',
  description: 'Articles, conseils pratiques et récits de voyage pour préparer votre tour à vélo des Hauts-de-France.',
  openGraph: {
    title: 'Contenus — Grand Tour des Hauts-de-France',
    description: 'Articles, conseils pratiques et récits de voyage pour préparer votre tour à vélo des Hauts-de-France.',
  },
};

interface BlogPageProps {
  searchParams?: Promise<{ category?: string }>;
}

interface CategoryItem {
  id: number;
  name: string;
  slug: string;
}

interface ArticleItem {
  id: number;
  slug: string;
  title: string;
  description?: string;
  publishedAt?: string;
  category?: {
    name?: string;
    slug?: string;
  };
  author?: {
    name?: string;
  };
  cover?: {
    url?: string;
    alternativeText?: string;
  };
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const query = searchParams ? await searchParams : undefined;
  const selectedCategory = query?.category || '';

  const [articlesRaw, categoriesRaw] = await Promise.all([
    getArticles(selectedCategory || undefined).catch((error) => {
      console.error('Error loading blog articles:', error);
      return [];
    }),
    getCategories().catch((error) => {
      console.error('Error loading blog categories:', error);
      return [];
    }),
  ]);

  const articles = (articlesRaw || []) as ArticleItem[];
  const categories = (categoriesRaw || []) as CategoryItem[];
  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>← Retour</Link>
        <h1 className={styles.title}>Journal de route</h1>
        <p className={styles.intro}>
          Récits, retours terrain et fragments collectés le long du Grand Tour.
        </p>
      </header>

      <nav className={styles.filters} aria-label="Filtres catégories">
        <Link
          href="/blog"
          className={`${styles.filterChip} ${selectedCategory ? '' : styles.filterChipActive}`}
        >
          Tout
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/blog?category=${category.slug}`}
            className={`${styles.filterChip} ${selectedCategory === category.slug ? styles.filterChipActive : ''}`}
          >
            {category.name}
          </Link>
        ))}
      </nav>

      {articles.length > 0 ? (
        <section className={styles.grid}>
          {articles.map((article) => (
            <BlogCard key={article.id} article={article} strapiUrl={strapiUrl} />
          ))}
        </section>
      ) : (
        <p className={styles.emptyState}>Aucun article publié pour le moment.</p>
      )}
    </div>
  );
}
