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
  thumbnail?: { url: string; alternativeText?: string };
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
  nextChapter?: { id: number; slug: string; title: string };
  previousChapter?: { id: number; slug: string; title: string };
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
 * Get chapters in sequential order following the nextChapter chain
 * Finds the first chapter (one without any previous reference) and follows the chain
 */
export async function getChaptersInOrder(): Promise<Chapter[]> {
  try {
    // Fetch all chapters with nextChapter relation and thumbnail
    const response = await fetch(
      `${STRAPI_URL}/api/chapters?populate[0]=nextChapter&populate[1]=thumbnail`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch chapters');
      return [];
    }

    const json = await response.json();
    const chapters = json.data || [];

    if (chapters.length === 0) return [];

    // Build a map for quick lookup
    const chapterMap = new Map(chapters.map((ch: Chapter) => [ch.id, ch]));

    // Find chapters that are referenced as nextChapter
    const referencedIds = new Set(
      chapters
        .filter((ch: Chapter) => ch.nextChapter?.id)
        .map((ch: Chapter) => ch.nextChapter!.id)
    );

    // Find the first chapter (not referenced by anyone)
    let firstChapter = chapters.find((ch: Chapter) => !referencedIds.has(ch.id));
    
    // If no clear first chapter, just use the first one
    if (!firstChapter) {
      firstChapter = chapters[0];
    }

    // Follow the chain
    const orderedChapters: Chapter[] = [];
    let current = firstChapter;
    const visited = new Set<number>();

    while (current && !visited.has(current.id)) {
      orderedChapters.push(current);
      visited.add(current.id);
      
      if (current.nextChapter?.id) {
        current = chapterMap.get(current.nextChapter.id);
      } else {
        break;
      }
    }

    // Add any remaining chapters that weren't in the chain
    chapters.forEach((ch: Chapter) => {
      if (!visited.has(ch.id)) {
        orderedChapters.push(ch);
      }
    });

    return orderedChapters;
  } catch (error) {
    console.error('Error fetching chapters in order:', error);
    return [];
  }
}

/**
 * Get a single chapter by slug
 */
export async function getChapterBySlug(slug: string): Promise<Chapter | null> {
  try {
    const response = await fetch(
      `${STRAPI_URL}/api/chapters?filters[slug][$eq]=${slug}&populate[0]=horizons.image&populate[1]=gpxFileAB&populate[2]=gpxFileBA&populate[3]=testimonials.photo&populate[4]=nextChapter&populate[5]=previousChapter&populate[6]=thumbnail`,
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
