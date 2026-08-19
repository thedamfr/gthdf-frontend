import { draftMode } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { resolveSafePreviewExitUrl } from '@/lib/preview-security';

export async function GET(request: NextRequest) {
  const redirectUrl = resolveSafePreviewExitUrl(
    request.nextUrl.searchParams.get('url'),
    request.url
  );

  if (!redirectUrl) {
    return new NextResponse('Invalid redirect url', {
      status: 400,
      headers: {
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  const draft = await draftMode();
  draft.disable();

  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}
