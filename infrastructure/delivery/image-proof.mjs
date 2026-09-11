export function requireImageRevision(config, revision) {
  if (config?.config?.Labels?.['org.opencontainers.image.revision'] !== revision) {
    throw new Error('The image does not prove the requested source revision');
  }
}
