import { handleGpxBuilderPost } from '@/lib/gpx-builder/handler';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  return handleGpxBuilderPost(request, 'download');
}
