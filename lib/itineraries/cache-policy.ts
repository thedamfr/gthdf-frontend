export type ItineraryRequestKind =
  | 'feature-switch'
  | 'guard'
  | 'editorial'
  | 'immutable-media';

export function itineraryStrapiCacheOptions(
  kind: ItineraryRequestKind,
  preview = false
): { cache: 'no-store' } | { next: { revalidate: number } } {
  if (preview || kind === 'feature-switch') {
    return { cache: 'no-store' };
  }

  if (kind === 'editorial') {
    return { next: { revalidate: 300 } };
  }

  if (kind === 'immutable-media') {
    return { next: { revalidate: 31_536_000 } };
  }

  return { next: { revalidate: 60 } };
}

export function guardedPublicCacheControl(preview = false): string {
  return preview
    ? 'private, no-store'
    : 'public, max-age=0, s-maxage=60, must-revalidate';
}
