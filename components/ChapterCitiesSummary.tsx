import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';

import {
  getCityRoleLabel,
  getCitySummary,
  getVisibleCityPassages,
  hasPublicCityPage,
  type CityPassage,
  type CityReference,
} from '@/lib/city-content';
import styles from './ChapterCitiesSummary.module.css';

interface ChapterCitiesSummaryProps {
  passages?: CityPassage[];
  className?: string;
  linkClassName?: string;
}

function cityName(city: CityReference, className?: string): ReactNode {
  if (!hasPublicCityPage(city)) {
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

  const visiblePassages = getVisibleCityPassages(passages);

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
      <ol className={styles.cityList} aria-label="Villes mises en avant dans l’ordre du parcours">
        {visiblePassages.map((passage, index) => (
          <li
            key={`${passage.city.documentId ?? passage.city.name}-${passage.role}-${index}`}
            className={styles.cityItem}
          >
            <span className={styles.cityNumber} aria-hidden="true">
              #{index + 1}
            </span>
            <span className={styles.cityDetails}>
              <span className={styles.cityName}>
                {cityName(passage.city, linkClassName)}
              </span>
              <span className={styles.cityRole}>{getCityRoleLabel(passage.role)}</span>
              {passage.note && <span className={styles.cityNote}>{passage.note}</span>}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
