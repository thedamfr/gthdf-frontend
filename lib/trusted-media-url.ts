const TRUST_ERROR = 'The Strapi media URL is not trusted.';

function originOf(value: string): string {
  const url = new URL(value);

  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error(TRUST_ERROR);
  }

  return url.origin;
}

export function resolveTrustedMediaUrl(
  mediaUrl: string,
  strapiBaseUrl: string,
  additionalAllowedOrigins: readonly string[] = []
): string {
  try {
    const strapiOrigin = originOf(strapiBaseUrl);
    const resolvedUrl = new URL(mediaUrl, `${strapiOrigin}/`);
    const allowedOrigins = new Set([
      strapiOrigin,
      ...additionalAllowedOrigins.map(originOf),
    ]);

    if (
      !['http:', 'https:'].includes(resolvedUrl.protocol)
      || resolvedUrl.username
      || resolvedUrl.password
      || !allowedOrigins.has(resolvedUrl.origin)
    ) {
      throw new Error(TRUST_ERROR);
    }

    return resolvedUrl.toString();
  } catch (error) {
    if (error instanceof Error && error.message === TRUST_ERROR) {
      throw error;
    }

    throw new Error(TRUST_ERROR);
  }
}
