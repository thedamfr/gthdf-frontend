import { handleItineraryArtifactGet } from '@/lib/itineraries/handler';

export const runtime = 'nodejs';
export const revalidate = 60;

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { slug } = await context.params;
  return handleItineraryArtifactGet(slug, 'geometry', request);
}
