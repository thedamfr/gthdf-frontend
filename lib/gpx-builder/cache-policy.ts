export type GpxBuilderStrapiRequestKind = 'feature-switch' | 'chapters';

export function gpxBuilderStrapiCacheOptions(
  kind: GpxBuilderStrapiRequestKind
): { cache: 'no-store' } | { next: { revalidate: 60 } } {
  return kind === 'feature-switch'
    ? { cache: 'no-store' }
    : { next: { revalidate: 60 } };
}
