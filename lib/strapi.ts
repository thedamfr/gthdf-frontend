// lib/strapi.ts - Strapi API client
import { cache } from 'react';

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

  const mergedOptions = {
    next: { revalidate }, // Cache configurable, default 60 seconds
    headers: {
      'Content-Type': 'application/json',
      ...(STRAPI_API_TOKEN && {
        Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      }),
    },
  };

  const queryString = new URLSearchParams();
  
  Object.entries(query).forEach(([key, value]) => {
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
export const getGlobal = cache(async () => {
  return fetchAPI({
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
