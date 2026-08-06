import 'server-only';

import type { GpxDocument } from '../gpx/types.ts';
import type { GpxBuilderMedia } from './manifest.ts';
import { loadOfficialGpxSourceWithOptions } from './source-loader-core.ts';

function configuredOrigins(): string[] {
  return (process.env.STRAPI_MEDIA_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export async function loadOfficialGpxSource(
  media: GpxBuilderMedia,
  expectedSha256: string
): Promise<GpxDocument> {
  return loadOfficialGpxSourceWithOptions(media, expectedSha256, {
    strapiUrl: process.env.NEXT_PUBLIC_STRAPI_URL ?? 'http://localhost:1337',
    allowedOrigins: configuredOrigins(),
  });
}
