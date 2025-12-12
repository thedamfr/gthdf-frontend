import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grand Tour des Hauts-de-France",
  description: "Carnet de voyage numérique. Notes from the road.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        {children}
      </body>
    </html>
  );
}
