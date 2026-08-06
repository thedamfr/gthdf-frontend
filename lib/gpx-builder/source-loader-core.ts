import {
  readResponseBytesWithLimit,
  ResponseSizeLimitError,
} from '../bounded-response.ts';
import { isSha256, sha256Hex } from '../gpx/hash.ts';
import { parseOfficialGpx } from '../gpx/parser.ts';
import type { GpxDocument } from '../gpx/types.ts';
import { resolveTrustedMediaUrl } from '../trusted-media-url.ts';
import type { GpxBuilderMedia } from './manifest.ts';

const DEFAULT_MAXIMUM_BYTES = 5 * 1024 * 1024;
const DEFAULT_TIMEOUT_MILLISECONDS = 15_000;

export type GpxSourceErrorCode =
  | 'source_unavailable'
  | 'source_invalid'
  | 'source_stale';

export class GpxSourceError extends Error {
  readonly code: GpxSourceErrorCode;

  constructor(code: GpxSourceErrorCode, message: string) {
    super(message);
    this.name = 'GpxSourceError';
    this.code = code;
  }
}

interface SourceLoaderOptions {
  strapiUrl: string;
  allowedOrigins: readonly string[];
  maximumBytes?: number;
  timeoutMilliseconds?: number;
  fetchImplementation?: typeof fetch;
}

export async function loadOfficialGpxSourceWithOptions(
  media: GpxBuilderMedia,
  expectedSha256: string,
  options: SourceLoaderOptions
): Promise<GpxDocument> {
  let sourceUrl: string;
  try {
    sourceUrl = resolveTrustedMediaUrl(
      media.url,
      options.strapiUrl,
      options.allowedOrigins
    );
  } catch {
    throw new GpxSourceError(
      'source_unavailable',
      'La trace officielle est indisponible.'
    );
  }

  if (!isSha256(expectedSha256)) {
    throw new GpxSourceError(
      'source_invalid',
      'La référence de la trace officielle est invalide.'
    );
  }

  const request = options.fetchImplementation ?? fetch;
  const timeout = options.timeoutMilliseconds ?? DEFAULT_TIMEOUT_MILLISECONDS;
  let response: Response;
  try {
    response = await request(sourceUrl, {
      headers: { Accept: 'application/gpx+xml, application/xml, text/xml' },
      redirect: 'error',
      cache: 'no-store',
      signal: AbortSignal.timeout(timeout),
    });
  } catch {
    throw new GpxSourceError(
      'source_unavailable',
      'La trace officielle est temporairement indisponible.'
    );
  }
  if (!response.ok) {
    throw new GpxSourceError(
      'source_unavailable',
      'La trace officielle est temporairement indisponible.'
    );
  }

  let bytes: Uint8Array;
  try {
    bytes = await readResponseBytesWithLimit(
      response,
      options.maximumBytes ?? DEFAULT_MAXIMUM_BYTES
    );
  } catch (error) {
    if (error instanceof ResponseSizeLimitError) {
      throw new GpxSourceError(
        'source_invalid',
        'La trace officielle est trop volumineuse.'
      );
    }
    throw new GpxSourceError(
      'source_unavailable',
      'La trace officielle est temporairement indisponible.'
    );
  }

  if (sha256Hex(bytes) !== expectedSha256.toLowerCase()) {
    throw new GpxSourceError(
      'source_stale',
      'La trace officielle a été actualisée et doit être requalifiée.'
    );
  }

  let xml: string;
  try {
    xml = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new GpxSourceError(
      'source_invalid',
      'La trace officielle utilise un encodage invalide.'
    );
  }
  try {
    return parseOfficialGpx(xml);
  } catch {
    throw new GpxSourceError(
      'source_invalid',
      'La trace officielle n’est pas conforme.'
    );
  }
}
