// lib/strapi.ts - Strapi API client
import { cache } from 'react';
import { draftMode } from 'next/headers';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.NEXT_PUBLIC_STRAPI_API_TOKEN;

interface StrapiRequestOptions {
  endpoint: string;
  query?: Record<string, any>;
  wrappedByKey?: string;
  wrappedByList?: boolean;
  revalidate?: number;
}

/**
 * Fetch data from Strapi API
 */
export async function fetchAPI<T>(options: StrapiRequestOptions): Promise<T> {
  const { endpoint, query = {}, wrappedByKey, wrappedByList, revalidate = 60 } = options;
  
  // draftMode() only works in request scope, fails during static generation
  let isDraftPreview = false;
  try {
    const draftStatus = await draftMode();
    isDraftPreview = draftStatus.isEnabled;
  } catch {
    // Not in request scope (e.g., generateStaticParams), continue without draft mode
    isDraftPreview = false;
  }

  const requestQuery: Record<string, any> = { ...query };
  if (isDraftPreview && requestQuery.publicationState === undefined) {
    requestQuery.publicationState = 'preview';
  }

  const mergedOptions = {
    ...(isDraftPreview ? { cache: 'no-store' as const } : { next: { revalidate } }),
    headers: {
      'Content-Type': 'application/json',
      ...(STRAPI_API_TOKEN && {
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      }),
    },
  };

  const queryString = new URLSearchParams();
  
  Object.entries(requestQuery).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      // For arrays, add multiple params with same key
      value.forEach((item) => {
        queryString.append(key, item);
      });
    } else if (typeof value === 'object') {
      queryString.append(key, JSON.stringify(value));
    } else {
      queryString.append(key, value);
    }
  });

  const requestUrl = `${STRAPI_URL}/api${endpoint}${queryString.toString() ? `?${queryString.toString()}` : ''}`;

  try {
    const response = await fetch(requestUrl, mergedOptions);

    if (!response.ok) {
      throw new Error(`Failed to fetch data from Strapi: ${response.statusText}`);
    }

    const data = await response.json();

    if (wrappedByKey) {
      return data[wrappedByKey] as T;
    }

    if (wrappedByList) {
      return data.data as T;
    }

    return data as T;
  } catch (error) {
    console.error('Error fetching from Strapi:', error);
    throw error;
  }
}

/**
 * Get all articles with authors and categories
 * @param category optional category slug to filter by
 */
export const getArticles = cache(async (category?: string) => {
  return fetchAPI({
    endpoint: '/articles',
    query: {
      ...(category && { 'filters[category][slug][$eq]': category }),
      'sort[0]': 'publishedAt:desc',
      'populate[0]': 'cover',
      'populate[1]': 'category',
      'populate[2]': 'author.avatar',
    },
    wrappedByList: true,
  });
});

/**
 * Get a single article by slug
 */
export const getArticleBySlug = cache(async (slug: string) => {
  const articles = await fetchAPI<any[]>({
    endpoint: '/articles',
    query: {
      'filters[slug][$eq]': slug,
      'populate[0]': 'cover',
      'populate[1]': 'author.avatar',
      'populate[2]': 'category',
      'populate[3]': 'blocks',
      'populate[4]': 'blocks.file',
      'populate[5]': 'blocks.files',
      'populate[6]': 'seo',
      'populate[7]': 'seo.shareImage',
    },
    wrappedByList: true,
  });

  return articles[0] || null;
});

/**
 * Get all categories
 */
export const getCategories = cache(async () => {
  return fetchAPI({
    endpoint: '/categories',
    query: {
      'sort[0]': 'name:asc',
    },
    wrappedByList: true,
  });
});

/**
 * Get global site data (favicon, SEO defaults, checkpointMap)
 * Long cache: 1 hour (changes rarely)
 */
interface GlobalData {
  siteName?: string;
  siteDescription?: string;
  favicon?: { url: string; alternativeText?: string };
  defaultSeo?: { shareImage?: { url: string } };
  [key: string]: any;
}

export const getGlobal = cache(async () => {
  return fetchAPI<GlobalData>({
    endpoint: '/global',
    query: {
      'populate[0]': 'favicon',
      'populate[1]': 'defaultSeo.shareImage',
    },
    wrappedByKey: 'data',
    revalidate: 3600,
  });
});

/**
 * Get About page with blocks
 */
export const getAbout = cache(async () => {
  return fetchAPI({
    endpoint: '/about',
    query: {
      populate: ['blocks', 'blocks.file', 'blocks.files'],
    },
    wrappedByKey: 'data',
  });
});

/**
 * Get Homepage content
 */
export const getHomepage = cache(async () => {
  try {
    return await fetchAPI({
      endpoint: '/homepage',
      query: {
        'populate[0]': 'logo',
        'populate[1]': 'horizons.image',
        'populate[2]': 'rencontres.image',
        'populate[3]': 'seo.shareImage',
        'populate[4]': 'principles',
        'populate[5]': 'socialLinks',
        'populate[6]': 'mapPreviewImage',
      },
      wrappedByKey: 'data',
    });
  } catch {
    // Fallback without mapPreviewImage (schema may not be deployed yet)
    return fetchAPI({
      endpoint: '/homepage',
      query: {
        'populate[0]': 'logo',
        'populate[1]': 'horizons.image',
        'populate[2]': 'rencontres.image',
        'populate[3]': 'seo.shareImage',
        'populate[4]': 'principles',
        'populate[5]': 'socialLinks',
      },
      wrappedByKey: 'data',
    });
  }
});

/**
 * Get Legal Notice content
 */
export const getLegalNotice = cache(async () => {
  return fetchAPI({
    endpoint: '/legal-notice',
    query: {
      populate: '*',
    },
    wrappedByKey: 'data',
    revalidate: 3600,
  });
});

/**
 * Get Checkpoints page single type content
 */
export const getCheckpointsPage = cache(async () => {
  try {
    return await fetchAPI({
      endpoint: '/checkpoints-page',
      query: {
        'populate[0]': 'heroImage',
        'populate[1]': 'mapA3Pdf',
        'populate[2]': 'mapA1Pdf',
      },
      wrappedByKey: 'data',
      revalidate: 300,
    });
  } catch (error) {
    console.error('Error loading checkpoints page single type:', error);
    return null;
  }
});

/**
 * Get all checkpoints
 */
export const getCheckpoints = cache(async () => {
  try {
    return await fetchAPI({
      endpoint: '/checkpoints',
      query: {
        'sort[0]': 'number:asc',
        'populate[0]': 'chapter',
      },
      wrappedByList: true,
      revalidate: 300,
    });
  } catch (error) {
    console.error('Error loading checkpoints collection:', error);
    return [];
  }
});

/**
 * Get all authors (for static params generation)
 */
export const getAuthors = cache(async () => {
  return fetchAPI({
    endpoint: '/authors',
    query: {
      'populate[0]': 'avatar',
    },
    wrappedByList: true,
  });
});

/**
 * Get a single author by slug with their articles
 */
export const getAuthorBySlug = cache(async (slug: string) => {
  const authors = await fetchAPI<any[]>({
    endpoint: '/authors',
    query: {
      'filters[slug][$eq]': slug,
      'populate[0]': 'avatar',
      'populate[1]': 'articles',
      'populate[2]': 'articles.cover',
      'populate[3]': 'articles.category',
    },
    wrappedByList: true,
  });

  return authors[0] || null;
});
