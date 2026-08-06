import 'server-only';

import {
  generateGpxSelection,
  GpxBuilderError,
} from './generate';
import { readGpxBuilderRequest, GpxBuilderRequestError } from './request';
import { getGpxBuilderManifest } from './server';
import { loadOfficialGpxSource } from './source-loader';

type ResponseMode = 'preview' | 'download';

const COMMON_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
};

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: COMMON_HEADERS,
  });
}

function errorResponse(error: unknown): Response {
  if (error instanceof GpxBuilderRequestError) {
    return jsonResponse({ error: { code: 'invalid_request', message: error.message } }, 400);
  }
  if (error instanceof GpxBuilderError) {
    const status = error.code === 'stale_revision'
      ? 409
      : error.code === 'invalid_selection'
        ? 400
        : 503;
    return jsonResponse({ error: { code: error.code, message: error.message } }, status);
  }

  const reason = error instanceof Error ? error.name : 'unknown';
  console.error(`[gpx-builder] Generation failed (${reason}).`);
  return jsonResponse({
    error: {
      code: 'generation_failed',
      message: 'Impossible de générer ce GPX pour le moment. Réessayez plus tard.',
    },
  }, 503);
}

export async function handleGpxBuilderPost(
  request: Request,
  mode: ResponseMode
): Promise<Response> {
  try {
    const selection = await readGpxBuilderRequest(request);
    const manifest = await getGpxBuilderManifest();
    const generated = await generateGpxSelection({
      manifest,
      selection,
      generatedAt: new Date(),
      loadSource: loadOfficialGpxSource,
    });

    if (mode === 'preview') {
      return jsonResponse({ summary: generated.summary }, 200);
    }
    return new Response(generated.gpx, {
      status: 200,
      headers: {
        ...COMMON_HEADERS,
        'Content-Type': 'application/gpx+xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${generated.filename}"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
