import { runtimeUrls } from '@/lib/runtime-config';
import { contentReady } from '@/lib/readiness';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ready = await contentReady(runtimeUrls().strapi, process.env.STRAPI_API_TOKEN);
  return Response.json({ status: ready ? 'ready' : 'unavailable' }, {
    status: ready ? 200 : 503,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
