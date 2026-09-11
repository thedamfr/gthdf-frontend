/** Server-only configuration: indirect legacy lookups avoid Next build-time substitution. */
export function runtimeUrls(env: Record<string, string | undefined> = process.env, fallbackSite = 'https://gthf.fr') {
  return {
    strapi: env.STRAPI_URL || env['NEXT_PUBLIC_STRAPI_URL'] || 'http://localhost:1337',
    publicStrapi: env.PUBLIC_STRAPI_URL || env['NEXT_PUBLIC_STRAPI_URL'] || 'http://localhost:1337',
    site: env.SITE_URL || env['NEXT_PUBLIC_SITE_URL'] || fallbackSite,
  };
}
