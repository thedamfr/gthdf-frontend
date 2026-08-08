import type { GuardedItinerary } from './types';

const SAFE_SLUG_PATTERN = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

export type CatalogueFeatureState =
  | { kind: 'open' }
  | { kind: 'authoritative_closed' }
  | { kind: 'missing'; reason: string }
  | { kind: 'upstream_error'; reason: string };

export type CatalogueItineraryResolution =
  | { kind: 'found'; itinerary: GuardedItinerary }
  | { kind: 'redirect'; slug: string }
  | { kind: 'not_found' };

export class CatalogueUnavailableError extends Error {
  constructor(reason = 'catalogue_unavailable') {
    super(reason);
    this.name = 'CatalogueUnavailableError';
  }
}

export async function loadOptionalCatalogueEntries<T>(
  loadEntries: () => Promise<T[]>,
  reportError: (error: unknown) => void = () => undefined
): Promise<T[]> {
  try {
    return await loadEntries();
  } catch (error) {
    reportError(error);
    return [];
  }
}

export function classifyCatalogueFeaturePayload(payload: unknown): CatalogueFeatureState {
  if (!payload || typeof payload !== 'object') {
    return { kind: 'missing', reason: 'missing_feature_switch' };
  }
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== 'object') {
    return { kind: 'missing', reason: 'missing_feature_switch' };
  }
  const flag = (data as { publishCityItinerariesToNext?: unknown })
    .publishCityItinerariesToNext;
  if (typeof flag !== 'boolean') {
    return { kind: 'missing', reason: 'missing_feature_switch' };
  }
  return flag ? { kind: 'open' } : { kind: 'authoritative_closed' };
}

export async function readCatalogueFeatureState(
  loadPayload: () => Promise<unknown>,
  isConfigurationError: (error: unknown) => boolean = () => false
): Promise<CatalogueFeatureState> {
  try {
    return classifyCatalogueFeaturePayload(await loadPayload());
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown';
    return isConfigurationError(error)
      ? { kind: 'missing', reason }
      : { kind: 'upstream_error', reason };
  }
}

export function catalogueFeatureIsOpen(
  state: CatalogueFeatureState,
  preview = false
): boolean {
  if (preview || state.kind === 'open') {
    return true;
  }
  if (state.kind === 'authoritative_closed') {
    return false;
  }
  throw new CatalogueUnavailableError(state.reason);
}

interface CatalogueResolutionDependencies {
  getItinerary: (
    slug: string,
    options: { preview: boolean; editorial: boolean }
  ) => Promise<GuardedItinerary | null>;
  getFeatureState: () => Promise<CatalogueFeatureState>;
  getRedirectTargetSlug: (oldSlug: string) => Promise<string | null>;
}

export async function resolveCatalogueItineraryCore(
  slug: string,
  preview: boolean,
  dependencies: CatalogueResolutionDependencies
): Promise<CatalogueItineraryResolution> {
  const itinerary = await dependencies.getItinerary(slug, {
    preview,
    editorial: true,
  });
  if (itinerary) {
    return { kind: 'found', itinerary };
  }

  if (preview || !SAFE_SLUG_PATTERN.test(slug)) {
    return { kind: 'not_found' };
  }

  const state = await dependencies.getFeatureState();
  if (!catalogueFeatureIsOpen(state)) {
    return { kind: 'not_found' };
  }

  const targetSlug = await dependencies.getRedirectTargetSlug(slug);
  if (!targetSlug || targetSlug === slug || !SAFE_SLUG_PATTERN.test(targetSlug)) {
    return { kind: 'not_found' };
  }

  const target = await dependencies.getItinerary(targetSlug, {
    preview: false,
    editorial: false,
  });
  return target
    ? { kind: 'redirect', slug: target.dto.slug }
    : { kind: 'not_found' };
}
