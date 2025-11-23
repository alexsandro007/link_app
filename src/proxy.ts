import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Маршруты, которые требуют аутентификации
const protectedRoutes = ['/dashboard', '/profile', '/settings'];

// Маршруты для неаутентифицированных пользователей
const authRoutes = ['/auth/signin', '/auth/signup'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Проверяем защищенные маршруты
    const isProtectedRoute = protectedRoutes.some((route) =>
      pathname.startsWith(route)
    );

    // Проверяем маршруты для неаутентифицированных
    const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

    // Если пользователь не авторизован и пытается зайти на защищенную страницу
    if (isProtectedRoute && !session) {
      const url = new URL('/auth/signin', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    // Если пользователь авторизован и пытается зайти на страницу входа/регистрации
    if (isAuthRoute && session) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
