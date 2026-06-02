import type { MetadataRoute } from 'next';
import { getArticles } from '@/lib/strapi';
import { getChapters } from '@/lib/chapters';

export const revalidate = 3600; // régénéré au plus toutes les heures

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gthf.fr';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/chapitres`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/checkpoints`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/a-propos`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/mentions-legales`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];

  let chapterRoutes: MetadataRoute.Sitemap = [];
  try {
    const chapters = await getChapters();
    chapterRoutes = chapters.map((chapter) => ({
      url: `${BASE_URL}/chapitres/${chapter.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }));
  } catch {
    // ignore if Strapi unavailable at build time
  }

  let articleRoutes: MetadataRoute.Sitemap = [];
  try {
    const articles = await getArticles() as Array<{ slug: string; updatedAt?: string }>;
    articleRoutes = articles.map((article) => ({
      url: `${BASE_URL}/article/${article.slug}`,
      lastModified: article.updatedAt ? new Date(article.updatedAt) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));
  } catch {
    // ignore if Strapi unavailable at build time
  }

  return [...staticRoutes, ...chapterRoutes, ...articleRoutes];
}
