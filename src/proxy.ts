import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// ── In-memory sliding-window rate limiter ─────────────────────────────────────
//
// Per-instance storage (Map). Works for single-region / low-traffic deployments.
// For multi-region production scale → replace with Upstash Redis:
//   https://upstash.com/docs/redis/sdks/ratelimit-ts/overview

interface RateWindow {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateWindow>();
let gcTick = 0;

/**
 * Sliding-window counter. O(1) amortised (GC every 200 calls).
 * Returns whether the request is allowed + remaining quota.
 */
function checkLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();

  // Periodically purge expired entries to prevent unbounded Map growth
  if (++gcTick >= 200) {
    gcTick = 0;
    for (const [k, w] of store) {
      if (w.resetAt <= now) store.delete(k);
    }
  }

  const w = store.get(key);

  if (!w || w.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (w.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: w.resetAt };
  }

  w.count++;
  return { allowed: true, remaining: limit - w.count, resetAt: w.resetAt };
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

// ── Rate limit rules ──────────────────────────────────────────────────────────

/** Brute-force protection for auth endpoints: 10 req / 15 min per IP */
const AUTH_RL = { limit: 10, windowMs: 15 * 60_000 } as const;

/** General API protection: 60 req / 1 min per IP */
const API_RL = { limit: 60, windowMs: 60_000 } as const;

function resolveRateLimit(pathname: string) {
  if (/^\/auth\/(signin|signup|forgot-password|reset-password|callback)/.test(pathname)) {
    return { ...AUTH_RL, group: 'auth' } as const;
  }
  if (pathname.startsWith('/api/')) {
    return { ...API_RL, group: 'api' } as const;
  }
  return null;
}

// ── Route guards ──────────────────────────────────────────────────────────────

const PROTECTED_ROUTES = ['/dashboard', '/categories', '/settings', '/profile'];
const AUTH_PAGES = ['/auth/signin', '/auth/signup', '/auth/forgot-password', '/auth/reset-password'];

// ── Proxy (Next.js 16 middleware) ─────────────────────────────────────────────

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const ip = clientIp(request);

  // ── 1. Rate limiting ────────────────────────────────────────────────────────
  const rl = resolveRateLimit(pathname);

  if (rl) {
    const { allowed, remaining, resetAt } = checkLimit(
      `${ip}:${rl.group}`,
      rl.limit,
      rl.windowMs,
    );

    const rlHeaders = {
      'X-RateLimit-Limit':     String(rl.limit),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset':     String(Math.ceil(resetAt / 1000)),
    };

    if (!allowed) {
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too Many Requests', retryAfter },
        {
          status: 429,
          headers: { ...rlHeaders, 'Retry-After': String(retryAfter) },
        },
      );
    }

    // API routes don't need an auth session check — return early with RL headers
    if (pathname.startsWith('/api/')) {
      const res = NextResponse.next();
      for (const [k, v] of Object.entries(rlHeaders)) res.headers.set(k, v);
      return res;
    }
  }

  // ── 2. Auth route protection ────────────────────────────────────────────────
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isAuthPage  = AUTH_PAGES.some((r) => pathname.startsWith(r));

  if (!isProtected && !isAuthPage) return NextResponse.next();

  try {
    const res = NextResponse.next();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (toSet) =>
            toSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options),
            ),
        },
      },
    );

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (isProtected && !session) {
      const loginUrl = new URL('/auth/signin', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isAuthPage && session) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return res;
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
