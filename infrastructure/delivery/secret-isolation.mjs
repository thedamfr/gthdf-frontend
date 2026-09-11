export function requireIsolatedSecrets(staging, production) {
  for (const key of ['POSTGRES_PASSWORD', 'APP_KEYS', 'API_TOKEN_SALT', 'ADMIN_JWT_SECRET', 'TRANSFER_TOKEN_SALT', 'ENCRYPTION_KEY', 'JWT_SECRET', 'PREVIEW_SECRET', 'STRAPI_API_TOKEN']) {
    // Never include compared secret values in assertion diagnostics.
    if (!staging[key] || !production[key] || staging[key] === production[key]) throw new Error('Staging secret isolation failed: ' + key);
  }
}
