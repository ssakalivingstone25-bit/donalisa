/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Simulated App Router Middleware Helper
// In standard Next.js, this runs on Edge runtime before route handlers.
// In AI Studio dual Express+Vite container, this logic can also be imported by server middleware.

export interface RouteCheckResult {
  allowed: boolean;
  redirectUrl?: string;
}

const PROTECTED_ROUTES = ['/favorites', '/history', '/profile'];
const ADMIN_ROUTES = ['/admin', '/admin/upload', '/admin/users'];

/**
 * Evaluates route authorization policies based on role claims.
 */
export function checkRoutePermission(pathname: string, user: { uid?: string; role?: string } | null): RouteCheckResult {
  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));

  if (isAdminRoute) {
    if (!user || user.role !== 'admin') {
      return { allowed: false, redirectUrl: '/browse?error=unauthorized_admin' };
    }
  }

  if (isProtected) {
    if (!user || !user.uid) {
      return { allowed: false, redirectUrl: '/login?redirect=' + encodeURIComponent(pathname) };
    }
  }

  return { allowed: true };
}
