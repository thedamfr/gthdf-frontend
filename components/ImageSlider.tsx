'use client';

import Image from 'next/image';
import { useState } from 'react';
import styles from './ImageSlider.module.css';

interface ImageSliderProps {
  images: Array<{
    url: string;
    alternativeText?: string;
  }>;
}

export default function ImageSlider({ images }: ImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (images.length === 0) return null;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const currentImage = images[currentIndex];

  return (
    <div className={styles.slider}>
      <div className={styles.mediaContainer}>
        <Image
          src={currentImage.url}
          alt={currentImage.alternativeText || `Image ${currentIndex + 1}`}
          fill
          style={{ objectFit: 'contain' }}
          priority={currentIndex === 0}
        />
      </div>

      {images.length > 1 && (
        <>
          <button
            className={styles.navButton}
            onClick={handlePrev}
            aria-label="Image précédente"
            type="button"
          >
            ←
          </button>
          <button
            className={styles.navButton}
            onClick={handleNext}
            aria-label="Image suivante"
            type="button"
          >
            →
          </button>

          <div className={styles.counter}>
            {currentIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}
