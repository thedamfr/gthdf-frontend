import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.footerLegal}>
          <Link href="/mentions-legales" className={styles.legalLink}>
            Mentions Légales
          </Link>
        </div>
      </div>
    </footer>
  );
}
