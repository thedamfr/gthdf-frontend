export function withStrapiStatus(
  query: Record<string, unknown>,
  isDraftPreview: boolean
): Record<string, unknown> {
  const currentQuery = { ...query };
  delete currentQuery.publicationState;

  return {
    ...currentQuery,
    status: isDraftPreview ? 'draft' : 'published',
  };
}
