import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // If on login page and has token, redirect to app
  if (pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  // If on app routes and no token, redirect to login
  if (pathname.startsWith('/app') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/login', '/app/:path*'],
};
