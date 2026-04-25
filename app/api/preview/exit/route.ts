import { draftMode } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const redirectTo = request.nextUrl.searchParams.get('url') || '/';

  if (!redirectTo.startsWith('/')) {
    return new NextResponse('Invalid redirect url', {
      status: 400,
      headers: {
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  const draft = await draftMode();
  draft.disable();

  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}
