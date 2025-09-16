import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rutas que requieren autenticación
const protectedRoutes = ['/dashboard', '/profile', '/admin'];

// Rutas de autenticación (solo accesibles si NO está autenticado)
const authRoutes = ['/auth/login', '/auth/register'];

// Rutas públicas (accesibles sin autenticación)
const publicRoutes = ['/'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Obtener el token de las cookies
  const token = request.cookies.get('auth-token')?.value;
  const isAuthenticated = !!token;

  // Permitir acceso a rutas públicas
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Si está en una ruta protegida y no está autenticado, redirigir al login
  if (protectedRoutes.some(route => pathname.startsWith(route)) && !isAuthenticated) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si está en una ruta de auth y ya está autenticado, redirigir al dashboard
  if (authRoutes.some(route => pathname.startsWith(route)) && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};