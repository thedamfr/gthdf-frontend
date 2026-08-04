import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';

import {
  getCitySummary,
  type CityPassage,
  type CityReference,
} from '@/lib/city-content';

interface ChapterCitiesSummaryProps {
  passages?: CityPassage[];
  className?: string;
  linkClassName?: string;
}

function cityName(city: CityReference, className?: string): ReactNode {
  if (!city.hasPublicPage || !city.slug) {
    return city.name;
  }

  return (
    <Link href={`/villes/${city.slug}`} className={className}>
      {city.name}
    </Link>
  );
}

function frenchCityList(passages: CityPassage[], linkClassName?: string): ReactNode[] {
  return passages.flatMap((passage, index) => {
    const separator = index === 0
      ? ''
      : index === passages.length - 1
        ? ' et '
        : ', ';

    return [
      <Fragment key={`separator-${passage.city.documentId ?? passage.city.name}-${index}`}>
        {separator}
      </Fragment>,
      <Fragment key={`city-${passage.city.documentId ?? passage.city.name}-${index}`}>
        {cityName(passage.city, linkClassName)}
      </Fragment>,
    ];
  });
}

export default function ChapterCitiesSummary({
  passages = [],
  className,
  linkClassName,
}: ChapterCitiesSummaryProps) {
  const summary = getCitySummary(passages);

  if (!summary) {
    return null;
  }

  return (
    <section className={className} aria-labelledby="chapter-cities-title">
      <h2 id="chapter-cities-title">Villes traversées</h2>
      <p>
        Ce chapitre relie {cityName(summary.start.city, linkClassName)} à{' '}
        {cityName(summary.end.city, linkClassName)}
        {summary.featuredIntermediates.length > 0 && (
          <> en passant notamment par {frenchCityList(summary.featuredIntermediates, linkClassName)}</>
        )}.
      </p>
    </section>
  );
}
