import { type NextRequest, NextResponse } from 'next/server';

import { itineraryResponseHeaders } from '@/lib/itineraries/response-policy';

export function proxy(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  for (const [name, value] of Object.entries(itineraryResponseHeaders())) {
    response.headers.set(name, value);
  }
  if (request.cookies.has('__prerender_bypass')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
}

export const config = {
  matcher: ['/itineraires-velo/:path*'],
};
