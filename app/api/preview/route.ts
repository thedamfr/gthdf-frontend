import { draftMode } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

function withPreviewCors(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  const allowedOrigins = new Set([
    'https://cms.gthf.fr',
    'http://localhost:1337',
    'https://localhost:1337',
    'http://localhost:8080',
    'https://localhost:8080',
  ]);

  if (origin && allowedOrigins.has(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin');
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export async function OPTIONS(request: NextRequest) {
  return withPreviewCors(new NextResponse(null, { status: 204 }), request);
}

export async function GET(request: NextRequest) {
  const previewUrl = request.nextUrl.searchParams.get('url') || '/';
  const status = request.nextUrl.searchParams.get('status');

  // Allow only internal paths to avoid open redirects.
  if (!previewUrl.startsWith('/')) {
    return withPreviewCors(new NextResponse('Invalid preview url', {
      status: 400,
    }), request);
  }

  const draft = await draftMode();
  if (status === 'published') {
    draft.disable();
  } else {
    draft.enable();
  }

  const response = NextResponse.redirect(new URL(previewUrl, request.url));
  return withPreviewCors(response, request);
}
