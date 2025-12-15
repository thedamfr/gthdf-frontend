const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

interface Chapter {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  startStation: string;
  endStation: string;
  distance: number;
  introSentence: string;
  updatedAt?: string;
  komootEmbedAB?: string;
  komootEmbedBA?: string;
  gpxFileAB?: { url: string; name: string };
  gpxFileBA?: { url: string; name: string };
  horizons?: any[];
  routeNotes?: string;
  testimonials?: Array<{
    id: number;
    quote: string;
    author: string;
    photo?: { url: string; alternativeText?: string };
    borderColor: 'bleu' | 'vert' | 'rouge' | 'jaune' | 'beige';
  }>;
}

/**
 * Get all chapters
 */
export async function getChapters(): Promise<Chapter[]> {
  try {
    const response = await fetch(`${STRAPI_URL}/api/chapters?populate=*`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Failed to fetch chapters');
      return [];
    }

    const json = await response.json();
    return json.data || [];
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return [];
  }
}

/**
 * Get a single chapter by slug
 */
export async function getChapterBySlug(slug: string): Promise<Chapter | null> {
  try {
    const response = await fetch(
      `${STRAPI_URL}/api/chapters?filters[slug][$eq]=${slug}&populate[0]=horizons.image&populate[1]=gpxFileAB&populate[2]=gpxFileBA&populate[3]=testimonials.photo`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch chapter');
      return null;
    }

    const json = await response.json();
    return json.data?.[0] || null;
  } catch (error) {
    console.error('Error fetching chapter:', error);
    return null;
  }
}
