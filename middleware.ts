import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define routes that deactivated users can access
const ALLOWED_ROUTES_FOR_DEACTIVATED = [
  '/dashboard/support',
  '/dashboard/help',
  '/dashboard/profile', // Allow profile viewing
  '/api/support',
  '/api/auth',
  '/auth/signin',
  '/auth/signout',
];

// Define API routes that should be restricted for deactivated users
const RESTRICTED_API_ROUTES = [
  '/api/investments',
  '/api/withdrawals',
  '/api/deposits',
  '/api/live-trade',
  '/api/balance',
  '/api/transactions',
];

export async function middleware(request: NextRequest) {
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  // If no token, let the request proceed (auth will handle it)
  if (!token) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // If user is active, allow all requests
  if (token.isActive) {
    return NextResponse.next();
  }

  // User is deactivated - check if they're accessing allowed routes
  const isAllowedRoute = ALLOWED_ROUTES_FOR_DEACTIVATED.some(route => 
    pathname.startsWith(route)
  );

  // Allow access to allowed routes
  if (isAllowedRoute) {
    return NextResponse.next();
  }

  // Check if it's a restricted API route
  const isRestrictedAPI = RESTRICTED_API_ROUTES.some(route => 
    pathname.startsWith(route)
  );

  if (isRestrictedAPI) {
    return NextResponse.json(
      { 
        error: 'Account deactivated', 
        message: 'Your account has been deactivated. Contact support to regain access.',
        code: 'ACCOUNT_DEACTIVATED'
      },
      { status: 403 }
    );
  }

  // For dashboard routes that aren't allowed, redirect to support
  if (pathname.startsWith('/dashboard') && !isAllowedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard/support';
    url.searchParams.set('reason', 'account_deactivated');
    return NextResponse.redirect(url);
  }

  // For admin routes, block completely (deactivated users shouldn't access admin)
  if (pathname.startsWith('/admin')) {
    return NextResponse.json(
      { error: 'Access denied' },
      { status: 403 }
    );
  }

  // Allow other requests to proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
