const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

interface GlobalData {
  favicon?: {
    url: string;
  };
  siteName?: string;
  siteDescription?: string;
}

/**
 * Get global site settings
 */
export async function getGlobal(): Promise<GlobalData | null> {
  try {
    const response = await fetch(`${STRAPI_URL}/api/global?populate=favicon`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Failed to fetch global settings');
      return null;
    }

    const json = await response.json();
    return json.data || null;
  } catch (error) {
    console.error('Error fetching global settings:', error);
    return null;
  }
}
