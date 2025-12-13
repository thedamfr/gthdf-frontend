'use client';

import { ReactNode, useState, useEffect } from 'react';
import styles from './PagedSection.module.css';

interface PagedSectionProps {
  items: any[];
  itemsPerPageMobile?: number;
  itemsPerPageDesktop?: number;
  renderItem: (item: any, index: number) => ReactNode;
  className?: string;
  gridClassName?: string;
}

export default function PagedSection({
  items,
  itemsPerPageMobile = 1,
  itemsPerPageDesktop = 3,
  renderItem,
  className = '',
  gridClassName = '',
}: PagedSectionProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const itemsPerPage = isMobile ? itemsPerPageMobile : itemsPerPageDesktop;
  const totalPages = Math.ceil(items.length / itemsPerPage);
  
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const visibleItems = items.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
  };

  if (items.length === 0) return null;

  return (
    <div className={className}>
      <div className={gridClassName}>
        {visibleItems.map((item, index) => renderItem(item, startIndex + index))}
      </div>

      {totalPages > 1 && (
        <nav className={styles.pagination} aria-label="Navigation de pages">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0}
            className={styles.navButton}
            aria-label="Page précédente"
          >
            ← Précédente
          </button>
          
          <span className={styles.pageIndicator} aria-label={`Page ${currentPage + 1} sur ${totalPages}`}>
            {currentPage + 1} / {totalPages}
          </span>
          
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages - 1}
            className={styles.navButton}
            aria-label="Page suivante"
          >
            Suivante →
          </button>
        </nav>
      )}
    </div>
  );
}
