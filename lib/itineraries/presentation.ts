import type { PublicItineraryCity } from './types';

export function formatKilometres(metres: number): string {
  return `${(metres / 1_000).toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} km`;
}

export function formatElevation(metres: number): string {
  return `~${Math.round(metres / 10) * 10} m`;
}

export function selectRepresentativeCities<T extends PublicItineraryCity>(
  cities: readonly T[],
  maximum = 12
): T[] {
  if (maximum < 2 || cities.length <= maximum) {
    return [...cities];
  }

  const indexes = new Set<number>();
  for (let index = 0; index < maximum; index += 1) {
    indexes.add(Math.round(index * (cities.length - 1) / (maximum - 1)));
  }
  return [...indexes].sort((left, right) => left - right).map((index) => cities[index]);
}
