import { NextResponse } from 'next/server';

// Optimistic check only: send visitors without a session cookie to the login page.
// The API still verifies the token and role on every request.
export function proxy(request) {
  if (request.cookies.has('token')) return NextResponse.next();

  const url = new URL('/login', request.url);
  url.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin/:path*', '/emp/:path*', '/candidate/:path*', '/view-emp/:path*', '/master/:path*'],
};
