// lib/strapi.ts - Strapi API client

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env.NEXT_PUBLIC_STRAPI_API_TOKEN;

interface StrapiRequestOptions {
  endpoint: string;
  query?: Record<string, any>;
  wrappedByKey?: string;
  wrappedByList?: boolean;
}

/**
 * Fetch data from Strapi API
 */
export async function fetchAPI<T>(options: StrapiRequestOptions): Promise<T> {
  const { endpoint, query = {}, wrappedByKey, wrappedByList } = options;

  const mergedOptions = {
    next: { revalidate: 60 }, // Cache for 60 seconds
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
  
  console.log('Fetching:', requestUrl); // Debug

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
 */
export async function getArticles() {
  return fetchAPI({
    endpoint: '/articles',
    query: {
      populate: ['cover', 'author.avatar', 'category'],
      sort: ['publishedAt:desc'],
    },
    wrappedByList: true,
  });
}

/**
 * Get a single article by slug
 */
export async function getArticleBySlug(slug: string) {
  const articles = await fetchAPI<any[]>({
    endpoint: '/articles',
    query: {
      filters: { slug: { $eq: slug } },
      populate: ['cover', 'author.avatar', 'category', 'blocks'],
    },
    wrappedByList: true,
  });

  return articles[0] || null;
}

/**
 * Get all categories
 */
export async function getCategories() {
  return fetchAPI({
    endpoint: '/categories',
    query: {
      populate: '*',
    },
    wrappedByList: true,
  });
}

/**
 * Get global site data (header, footer, SEO)
 */
export async function getGlobal() {
  return fetchAPI({
    endpoint: '/global',
    query: {
      populate: ['favicon', 'defaultSeo.shareImage'],
    },
    wrappedByKey: 'data',
  });
}

/**
 * Get About page with blocks
 */
export async function getAbout() {
  return fetchAPI({
    endpoint: '/about',
    query: {
      populate: ['blocks', 'blocks.file', 'blocks.files'],
    },
    wrappedByKey: 'data',
  });
}

/**
 * Get Homepage content
 */
export async function getHomepage() {
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
