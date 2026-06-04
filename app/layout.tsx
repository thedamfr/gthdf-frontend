import type { Metadata } from "next";
import "./globals.css";
import { getGlobal } from "@/lib/strapi";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export async function generateMetadata(): Promise<Metadata> {
  const global = await getGlobal();
  
  const faviconUrl = global?.favicon?.url
    ? (global.favicon.url.startsWith('http')
        ? global.favicon.url
        : `${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${global.favicon.url}`)
    : '/favicon.ico';

  return {
    title: global?.siteName || "Grand Tour des Hauts-de-France",
    description: global?.siteDescription || "Carnet de voyage numérique. Notes from the road.",
    icons: {
      icon: faviconUrl,
    },
  };
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Grand Tour des Hauts-de-France',
  url: 'https://grandtourdeshautsdefrance.fr',
  sameAs: [
    'https://www.facebook.com/groups/1070406531384166',
    'https://www.instagram.com/grandtourdeshautsdefrance/',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
