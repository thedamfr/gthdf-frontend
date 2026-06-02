import { NextResponse } from 'next/server';
import { getLlmsTxt } from '@/lib/strapi';

export const revalidate = 3600;

const FALLBACK = `# Grand Tour des Hauts-de-France (GTHDF)

> Itinéraire cycliste longue distance à travers les Hauts-de-France, découpé en chapitres, avec checkpoints collectionnables et blog éditorial.

Site : https://gthf.fr
`;

export async function GET() {
  let content: string | null = null;

  try {
    content = await getLlmsTxt();
  } catch {
    // Strapi indisponible, on sert le fallback
  }

  return new NextResponse(content ?? FALLBACK, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
