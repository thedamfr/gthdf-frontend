import Image from 'next/image';

import ImageSlider from './ImageSlider';
import type { CityBlock, CityMedia } from '@/lib/cities';
import { renderSafeMarkdown } from '@/lib/safe-markdown';
import styles from './CityBlocks.module.css';

interface CityBlocksProps {
  blocks?: CityBlock[];
  cityName: string;
  strapiUrl: string;
}

function absoluteMediaUrl(media: CityMedia | undefined, strapiUrl: string): string | null {
  if (!media?.url) {
    return null;
  }

  return media.url.startsWith('http') ? media.url : `${strapiUrl}${media.url}`;
}

export default function CityBlocks({ blocks = [], cityName, strapiUrl }: CityBlocksProps) {
  if (blocks.length === 0) {
    return null;
  }

  return (
    <section className={styles.blocks} aria-label={`Découvrir ${cityName}`}>
      {blocks.map((block) => {
        switch (block.__component) {
          case 'shared.rich-text':
            return block.body ? (
              <div
                key={`${block.__component}-${block.id}`}
                className={styles.richText}
                dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(block.body) }}
              />
            ) : null;

          case 'shared.media': {
            const imageUrl = absoluteMediaUrl(block.file, strapiUrl);
            return imageUrl ? (
              <figure key={`${block.__component}-${block.id}`} className={styles.media}>
                <Image
                  src={imageUrl}
                  alt={block.file?.alternativeText || `Illustration de ${cityName}`}
                  width={block.file?.width || 1200}
                  height={block.file?.height || 800}
                />
              </figure>
            ) : null;
          }

          case 'shared.quote':
            return block.body ? (
              <blockquote key={`${block.__component}-${block.id}`} className={styles.quote}>
                <p>{block.body}</p>
                {block.title && <cite>— {block.title}</cite>}
              </blockquote>
            ) : null;

          case 'shared.slider': {
            const images = (block.files ?? [])
              .map((file) => ({
                url: absoluteMediaUrl(file, strapiUrl) || '',
                alternativeText: file.alternativeText || `Vue de ${cityName}`,
              }))
              .filter((image) => image.url);

            return images.length > 0 ? (
              <div key={`${block.__component}-${block.id}`} className={styles.slider}>
                <ImageSlider images={images} />
              </div>
            ) : null;
          }
        }
      })}
    </section>
  );
}
