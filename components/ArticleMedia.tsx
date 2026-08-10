'use client';

import Image from 'next/image';
import { useEffect, useId, useRef } from 'react';

import styles from './ArticleMedia.module.css';

interface ArticleMediaProps {
  src: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

const FALLBACK_WIDTH = 1600;
const FALLBACK_HEIGHT = 900;

export default function ArticleMedia({
  src,
  alt = '',
  caption,
  width = FALLBACK_WIDTH,
  height = FALLBACK_HEIGHT,
}: ArticleMediaProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousOverflowRef = useRef('');
  const captionId = useId();
  const accessibleName = alt || 'Image de l’article';

  const restorePageScroll = () => {
    document.body.style.overflow = previousOverflowRef.current;
  };

  const openLightbox = () => {
    const dialog = dialogRef.current;

    if (!dialog || dialog.open) {
      return;
    }

    previousOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
  };

  const closeLightbox = () => {
    dialogRef.current?.close();
  };

  useEffect(() => restorePageScroll, []);

  return (
    <>
      <figure className={styles.figure}>
        <button
          type="button"
          className={styles.imageButton}
          onClick={openLightbox}
          aria-label={`Agrandir : ${accessibleName}`}
        >
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            sizes="(max-width: 832px) calc(100vw - 2rem), 800px"
            className={styles.inlineImage}
          />
          <span className={styles.zoomHint} aria-hidden="true">
            Agrandir
          </span>
        </button>
        {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
      </figure>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-label={`Image agrandie : ${accessibleName}`}
        aria-describedby={caption ? captionId : undefined}
        onClose={restorePageScroll}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeLightbox();
          }
        }}
      >
        <div className={styles.dialogPanel}>
          <button
            type="button"
            className={styles.closeButton}
            onClick={closeLightbox}
            aria-label="Fermer l’image agrandie"
          >
            Fermer
          </button>
          <div className={styles.dialogImageFrame}>
            <Image
              src={src}
              alt={alt}
              fill
              sizes="100vw"
              className={styles.dialogImage}
            />
          </div>
          {caption && (
            <p id={captionId} className={styles.dialogCaption}>
              {caption}
            </p>
          )}
        </div>
      </dialog>
    </>
  );
}
