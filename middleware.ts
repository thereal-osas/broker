import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Pool } from 'pg';

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

// Helper function to check session invalidation
async function checkSessionInvalidation(userId: string, tokenIssuedAt: number): Promise<boolean> {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    const result = await pool.query(
      'SELECT session_invalidated_at FROM users WHERE id = $1',
      [userId]
    );

    await pool.end();

    if (result.rows.length === 0) {
      return false; // User not found, don't invalidate
    }

    const sessionInvalidatedAt = result.rows[0].session_invalidated_at;

    if (!sessionInvalidatedAt) {
      return false; // No invalidation timestamp
    }

    // Convert timestamps to compare
    const invalidatedTimestamp = new Date(sessionInvalidatedAt).getTime();
    const tokenTimestamp = tokenIssuedAt * 1000; // JWT iat is in seconds

    // If session was invalidated after token was issued, force logout
    return invalidatedTimestamp > tokenTimestamp;
  } catch (error) {
    console.error('Session invalidation check failed:', error);
    return false; // Don't invalidate on error
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });

    // If no token, let the request proceed (auth will handle it)
    if (!token) {
      return NextResponse.next();
    }

    // Check if session has been invalidated
    if (token.sub && token.iat) {
      const isSessionInvalidated = await checkSessionInvalidation(token.sub, token.iat);

      if (isSessionInvalidated) {
        // Force logout by redirecting to signout
        const url = request.nextUrl.clone();
        url.pathname = '/api/auth/signout';
        url.searchParams.set('callbackUrl', '/auth/signin?message=session_invalidated');
        return NextResponse.redirect(url);
      }
    }

    // If user is active or isActive is undefined (backward compatibility), allow all requests
    if (token.isActive === true || token.isActive === undefined) {
      return NextResponse.next();
    }

    // User is deactivated - continue to access control logic below

  } catch (error) {
    // If there's an error with token parsing, let the request proceed
    console.error('Middleware error:', error);
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
