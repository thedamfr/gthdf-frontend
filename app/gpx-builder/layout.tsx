import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Télécharger les GPX — GTHDF',
  description: 'Téléchargez les fichiers GPX des chapitres GTHDF pour votre GPS ou application de navigation vélo.',
  openGraph: {
    title: 'Télécharger les GPX — GTHDF',
    description: 'Téléchargez les fichiers GPX des chapitres GTHDF pour votre GPS ou application de navigation vélo.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function GpxBuilderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
