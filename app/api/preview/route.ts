import { draftMode } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  isAllowedPreviewPath,
  isValidPreviewSecret,
} from '@/lib/preview-security';

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
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

export async function OPTIONS(request: NextRequest) {
  return withPreviewCors(new NextResponse(null, { status: 204 }), request);
}

function getPublicBaseUrl(request: NextRequest): string {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  return configuredSiteUrl ? new URL(configuredSiteUrl).origin : request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const previewUrl = request.nextUrl.searchParams.get('url') || '/';
  const status = request.nextUrl.searchParams.get('status');
  const candidateSecret = request.nextUrl.searchParams.get('secret');
  const configuredSecret = process.env.PREVIEW_SECRET;

  if (!configuredSecret) {
    return withPreviewCors(new NextResponse('Preview is not configured', {
      status: 503,
    }), request);
  }

  if (!isValidPreviewSecret(candidateSecret, configuredSecret)) {
    return withPreviewCors(new NextResponse('Invalid preview secret', {
      status: 401,
    }), request);
  }

  if (!isAllowedPreviewPath(previewUrl)) {
    return withPreviewCors(new NextResponse('Invalid preview url', {
      status: 400,
    }), request);
  }

  if (status !== 'draft' && status !== 'published') {
    return withPreviewCors(new NextResponse('Invalid preview status', {
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
