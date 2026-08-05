import 'server-only';

import {
  getPublishedChapterGpxSources,
  type ChapterGpxSource,
} from './chapters';
import {
  buildProximityIndex,
  type GpxChapterSource,
  type GpxTraceSource,
} from './gpx-proximity-index';
import type { TraceDirection } from './proximity-types';
import { resolveTrustedMediaUrl } from './trusted-media-url';
import { readResponseBytesWithLimit } from './bounded-response';

const MAX_GPX_BYTES = 5 * 1024 * 1024;
const GPX_FETCH_TIMEOUT_MS = 15_000;
const DEFAULT_MEDIA_ORIGINS = [
  'https://cellar-c2.services.clever-cloud.com',
  'https://cms.gthf.fr',
];
const LOCAL_MEDIA_ORIGINS = ['http://127.0.0.1:9000'];
const GPX_FETCH_CONCURRENCY = 4;

function configuredMediaOrigins(): string[] {
  return [
    ...DEFAULT_MEDIA_ORIGINS,
    ...(process.env.NODE_ENV === 'production' ? [] : LOCAL_MEDIA_ORIGINS),
    ...(process.env.STRAPI_MEDIA_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  ];
}

async function fetchGpxTrace(
  chapter: ChapterGpxSource,
  direction: TraceDirection
): Promise<GpxTraceSource | undefined> {
  const media = direction === 'AB' ? chapter.gpxFileAB : chapter.gpxFileBA;
  if (!media?.url) {
    return undefined;
  }

  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

  try {
    const mediaUrl = resolveTrustedMediaUrl(
      media.url,
      strapiUrl,
      configuredMediaOrigins()
    );
    const response = await fetch(mediaUrl, {
      headers: {
        Accept: 'application/gpx+xml, application/xml, text/xml, */*',
      },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(GPX_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    if (response.url) {
      resolveTrustedMediaUrl(
        response.url,
        strapiUrl,
        configuredMediaOrigins()
      );
    }

    const payload = await readResponseBytesWithLimit(response, MAX_GPX_BYTES);

    return {
      xml: new TextDecoder().decode(payload),
      media: {
        id: media.id ?? media.documentId ?? media.hash ?? `${chapter.documentId}-${direction}`,
        documentId: media.documentId,
        hash: media.hash ?? media.url,
        updatedAt: media.updatedAt ?? chapter.updatedAt ?? 'unknown',
        size: media.size,
      },
    };
  } catch (error) {
    console.warn(
      `Unable to prepare ${direction} GPX for chapter ${chapter.slug}:`,
      error instanceof Error ? error.message : 'unknown error'
    );
    return undefined;
  }
}

async function toIndexSource(chapter: ChapterGpxSource): Promise<GpxChapterSource> {
  const AB = await fetchGpxTrace(chapter, 'AB');
  const BA = await fetchGpxTrace(chapter, 'BA');

  return {
    documentId: chapter.documentId,
    slug: chapter.slug,
    displayOrder: chapter.displayOrder as number,
    traces: {
      ...(AB ? { AB } : {}),
      ...(BA ? { BA } : {}),
    },
  };
}

async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(values[currentIndex]);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, values.length) },
      () => worker()
    )
  );

  return results;
}

export async function generateChapterProximityIndex() {
  const chapters = await getPublishedChapterGpxSources();
  const sources = await mapWithConcurrency(
    chapters,
    GPX_FETCH_CONCURRENCY,
    toIndexSource
  );

  return buildProximityIndex(sources);
}
