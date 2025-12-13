'use client';

import PagedSection from './PagedSection';
import styles from '@/app/page.module.css';

interface PrincipleCard {
  id: number;
  title: string;
  description: string;
  backgroundColor: 'charbon' | 'jaune' | 'beige' | 'bleu' | 'vert' | 'rouge';
  textColor: 'charbon' | 'creme';
}

export default function PrinciplesSection({ 
  principles 
}: { 
  principles: PrincipleCard[];
}) {
  return (
    <PagedSection
      items={principles}
      itemsPerPageMobile={1}
      itemsPerPageDesktop={3}
      gridClassName={styles.principleGrid}
      renderItem={(principle: PrincipleCard) => {
        return (
          <div 
            key={principle.id} 
            className={styles.principleCard} 
            style={{ 
              backgroundColor: `var(--color-${principle.backgroundColor})`, 
              color: `var(--color-${principle.textColor})` 
            }}
          >
            <h3>{principle.title}</h3>
            <p>{principle.description}</p>
          </div>
        );
      }}
    />
  );
}
