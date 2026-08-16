import type { PublicItineraryCity } from './types';

interface ItineraryCityLabel {
  name: string;
  fromLabel?: string | null;
  toLabel?: string | null;
}

const VOWEL_OR_MUTE_H_PATTERN = /^[aeiouyàâäæéèêëîïôöœùûüÿh]/iu;

function editorialLabel(value: string | null | undefined): string | null {
  const label = value?.trim();
  return label ? label : null;
}

export function formatDepartureLabel(city: ItineraryCityLabel): string {
  const override = editorialLabel(city.fromLabel);
  if (override) {
    return override;
  }

  const singularArticle = city.name.match(/^Le\s+(.+)$/u);
  if (singularArticle) {
    return `du ${singularArticle[1]}`;
  }

  const pluralArticle = city.name.match(/^Les\s+(.+)$/u);
  if (pluralArticle) {
    return `des ${pluralArticle[1]}`;
  }

  return VOWEL_OR_MUTE_H_PATTERN.test(city.name)
    ? `d’${city.name}`
    : `de ${city.name}`;
}

export function formatArrivalLabel(city: ItineraryCityLabel): string {
  const override = editorialLabel(city.toLabel);
  if (override) {
    return override;
  }

  const singularArticle = city.name.match(/^Le\s+(.+)$/u);
  if (singularArticle) {
    return `au ${singularArticle[1]}`;
  }

  const pluralArticle = city.name.match(/^Les\s+(.+)$/u);
  if (pluralArticle) {
    return `aux ${pluralArticle[1]}`;
  }

  return `à ${city.name}`;
}

export function formatItineraryDirection(
  departure: ItineraryCityLabel,
  arrival: ItineraryCityLabel,
  options: { capitalize?: boolean } = {}
): string {
  const label = `${formatDepartureLabel(departure)} ${formatArrivalLabel(arrival)}`;
  if (!options.capitalize) {
    return label;
  }
  return label.slice(0, 1).toLocaleUpperCase('fr-FR') + label.slice(1);
}

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
