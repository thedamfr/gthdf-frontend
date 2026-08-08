import { type NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  if (request.cookies.has('__prerender_bypass')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
}

export const config = {
  matcher: ['/itineraires-velo/:path*'],
};
