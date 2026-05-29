import styles from './FaqSection.module.css';

interface FaqItem {
  id: number;
  question?: string;
  answer?: string;
}

interface FaqSectionProps {
  title: string;
  items: FaqItem[];
}

export default function FaqSection({ title, items }: FaqSectionProps) {
  if (!items.length) {
    return null;
  }

  return (
    <section className={styles.section} aria-label={title}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.items}>
        {items.map((item) => {
          if (!item.question || !item.answer) {
            return null;
          }

          return (
            <details key={item.id} className={styles.item}>
              <summary className={styles.question}>{item.question}</summary>
              <p className={styles.answer}>{item.answer}</p>
            </details>
          );
        })}
      </div>
    </section>
  );
}
