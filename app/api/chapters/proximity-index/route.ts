import { unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';

import { generateChapterProximityIndex } from '@/lib/chapter-proximity-index-server';

export const runtime = 'nodejs';
export const revalidate = 3600;

const getCachedProximityIndex = unstable_cache(
  generateChapterProximityIndex,
  ['chapter-proximity-index-v1'],
  {
    revalidate,
    tags: ['chapter-proximity-index'],
  }
);

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  if (requestUrl.search) {
    return NextResponse.json(
      { error: 'This endpoint does not accept query parameters.' },
      { status: 400 }
    );
  }

  try {
    const index = await getCachedProximityIndex();

    return NextResponse.json(index, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600',
      },
    });
  } catch (error) {
    console.error(
      'Unable to generate the chapter proximity index:',
      error instanceof Error ? error.message : 'unknown error'
    );

    return NextResponse.json(
      { error: 'The proximity index is temporarily unavailable.' },
      { status: 503 }
    );
  }
}
