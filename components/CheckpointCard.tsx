'use client';

import { useState } from 'react';
import styles from './CheckpointCard.module.css';

export interface CheckpointData {
  id: number;
  number: number;
  title?: string;
  enigma: string;
  hint?: string;
  what3words: string;
  chapterName?: string;
}

export default function CheckpointCard({ checkpoint }: { checkpoint: CheckpointData }) {
  const [open, setOpen] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);

  const w3wUrl = `https://what3words.com/${checkpoint.what3words}`;

  return (
    <article className={`${styles.card} ${open ? styles.cardOpen : ''}`}>
      <button
        className={styles.cardToggle}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className={styles.number}>#{checkpoint.number}</span>
        <div className={styles.cardMeta}>
          {checkpoint.chapterName && (
            <span className={styles.chapterName}>{checkpoint.chapterName}</span>
          )}
          {checkpoint.title && (
            <span className={styles.title}>{checkpoint.title}</span>
          )}
        </div>
        <span className={styles.chevron} aria-hidden="true">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className={styles.cardBody}>
          <p className={styles.enigma}>{checkpoint.enigma}</p>

          {checkpoint.hint && (
            <div className={styles.hintSection}>
              <button
                className={styles.hintToggle}
                onClick={() => setHintVisible(!hintVisible)}
                aria-expanded={hintVisible}
              >
                {hintVisible ? 'Masquer l\u2019indice' : 'Voir l\u2019indice'}
              </button>
              {hintVisible && (
                <p className={styles.hint}>{checkpoint.hint}</p>
              )}
            </div>
          )}

          <a
            href={w3wUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.w3w}
          >
            <span className={styles.w3wPrefix}>///</span>
            {checkpoint.what3words}
          </a>
        </div>
      )}
    </article>
  );
}
