'use client';

import { useEffect, useState } from 'react';
import styles from './DeferredMapEmbed.module.css';

type DeferredMapEmbedProps = {
  src: string;
  title: string;
  previewImageSrc?: string;
};

export default function DeferredMapEmbed({ src, title, previewImageSrc }: DeferredMapEmbedProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [shouldPreload, setShouldPreload] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let idleId: number | undefined;

    const onIdle = () => setShouldPreload(true);

    const win = window as unknown as {
      requestIdleCallback?: (cb: IdleRequestCallback) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof win.requestIdleCallback === 'function') {
      idleId = win.requestIdleCallback(onIdle);
    } else {
      timeoutId = globalThis.setTimeout(onIdle, 1200);
    }

    return () => {
      if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId);
      if (idleId !== undefined && typeof win.cancelIdleCallback === 'function') {
        win.cancelIdleCallback(idleId);
      }
    };
  }, []);

  return (
    <div className={styles.wrapper}>
      {shouldPreload && !isUnlocked && (
        <iframe
          src={src}
          className={styles.preloadFrame}
          aria-hidden="true"
          title="Preload map"
          tabIndex={-1}
        />
      )}

      {isUnlocked ? (
        <iframe
          src={src}
          width="100%"
          height="480"
          style={{ border: 0 }}
          allowFullScreen
          loading="eager"
          referrerPolicy="no-referrer-when-downgrade"
          title={title}
          className={styles.mapIframe}
        />
      ) : (
        <button
          type="button"
          className={styles.placeholderButton}
          onClick={() => setIsUnlocked(true)}
          aria-label="Cliquer pour voir la carte interactive"
          style={
            previewImageSrc
              ? {
                  backgroundImage: `linear-gradient(135deg, rgba(245, 234, 208, 0.62), rgba(255, 248, 227, 0.66)), url(${previewImageSrc}), url('/map-preview-illustration.svg')`,
                }
              : undefined
          }
        >
          <span className={styles.scrim} aria-hidden="true" />
          <span className={styles.overlayCard}>
            <span className={styles.placeholderTitle}>Cliquer pour voir la carte interactive</span>
            <span className={styles.placeholderHint}>
              {shouldPreload ? 'La carte est prechargee.' : 'La carte se precharge en arriere-plan.'}
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
