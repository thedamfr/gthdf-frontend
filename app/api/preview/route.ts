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

function getPublicBaseUrl(request: NextRequest): string {
  // Behind a reverse proxy, request.url reflects the internal address (localhost).
  // Use forwarded headers to reconstruct the real public URL.
  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
  const host = request.headers.get('x-forwarded-host') || request.nextUrl.host;
  return `${proto}://${host}`;
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

  const response = NextResponse.redirect(new URL(previewUrl, getPublicBaseUrl(request)));
  return withPreviewCors(response, request);
}
