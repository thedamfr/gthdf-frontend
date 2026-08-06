import { handleGpxBuilderPost } from '@/lib/gpx-builder/handler';

export async function POST(request: Request): Promise<Response> {
  return handleGpxBuilderPost(request, 'preview');
}
