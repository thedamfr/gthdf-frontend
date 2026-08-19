import { createHash, timingSafeEqual } from 'node:crypto';

const STATIC_PREVIEW_PATHS = new Set([
  '/',
  '/a-propos',
  '/checkpoints',
  '/mentions-legales',
]);

const DYNAMIC_PREVIEW_BASES = new Set([
  'article',
  'auteur',
  'chapitres',
  'itineraires-velo',
  'villes',
]);

const SAFE_SLUG_PATTERN = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

export function isAllowedPreviewPath(pathname: string): boolean {
  if (STATIC_PREVIEW_PATHS.has(pathname)) {
    return true;
  }

  if (
    !pathname.startsWith('/')
    || pathname.startsWith('//')
    || pathname.includes('\\')
    || pathname.includes('?')
    || pathname.includes('#')
  ) {
    return false;
  }

  const segments = pathname.slice(1).split('/');
  return segments.length === 2
    && DYNAMIC_PREVIEW_BASES.has(segments[0])
    && SAFE_SLUG_PATTERN.test(segments[1]);
}

export function resolveSafePreviewExitUrl(
  candidate: string | null | undefined,
  requestUrl: string
): URL | null {
  const redirectPath = candidate || '/';
  if (
    !redirectPath.startsWith('/')
    || redirectPath.startsWith('//')
    || redirectPath.includes('\\')
  ) {
    return null;
  }

  try {
    const requestOrigin = new URL(requestUrl);
    const redirectUrl = new URL(redirectPath, requestOrigin);
    return redirectUrl.origin === requestOrigin.origin ? redirectUrl : null;
  } catch {
    return null;
  }
}

function secretDigest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

export function isValidPreviewSecret(
  candidate: string | null | undefined,
  configuredSecret: string | null | undefined
): boolean {
  if (!candidate || !configuredSecret) {
    return false;
  }

  return timingSafeEqual(secretDigest(candidate), secretDigest(configuredSecret));
}
