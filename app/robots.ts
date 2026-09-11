import { runtimeUrls } from '@/lib/runtime-config';
import type { MetadataRoute } from 'next';

const BASE_URL = runtimeUrls().site || 'https://gthf.fr';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}

export const dynamic = 'force-dynamic';
