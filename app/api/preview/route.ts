import { draftMode } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const previewUrl = request.nextUrl.searchParams.get('url') || '/';
  const status = request.nextUrl.searchParams.get('status');

  // Allow only internal paths to avoid open redirects.
  if (!previewUrl.startsWith('/')) {
    return new NextResponse('Invalid preview url', {
      status: 400,
      headers: {
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  const draft = await draftMode();
  if (status === 'published') {
    draft.disable();
  } else {
    draft.enable();
  }

  const response = NextResponse.redirect(new URL(previewUrl, request.url));
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}
