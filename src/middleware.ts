export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { rateLimit } from "@/lib/rate-limit";

const isDev = (process.env.NEXT_PUBLIC_APP_URL ?? "").includes("dev.");

const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' js.stripe.com www.googletagmanager.com *.posthog.com",
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
    "font-src 'self' fonts.gstatic.com",
    "connect-src 'self' api.stripe.com *.sentry.io www.google-analytics.com *.google-analytics.com *.googletagmanager.com *.posthog.com",
    "frame-src js.stripe.com",
    "img-src 'self' data: *.googleusercontent.com *.fbsbx.com www.googletagmanager.com",
    "worker-src 'self' blob:",
  ].join("; "),
};

// Rate limit configs
const API_LIMIT = 100; // 100 req/min for general API
const API_WINDOW = 60 * 1000;
const AUTH_LIMIT = 10; // 10 req/min for auth routes
const AUTH_WINDOW = 60 * 1000;

const intlMiddleware = createIntlMiddleware(routing);

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Dev: log all API requests
  if (isDev && pathname.startsWith("/api/")) {
    console.log(`[middleware] ${req.method} ${pathname}`);
  }

  // Rate limiting for API routes
  if (pathname.startsWith("/api/")) {
    const ip = getClientIP(req);
    // Only rate-limit sensitive auth endpoints (login, register, password reset) strictly.
    // OAuth callback/session/csrf routes need the general limit — a single OAuth
    // sign-in triggers multiple rapid requests (csrf, callback, session, providers).
    const isStrictAuthRoute =
      (pathname.startsWith("/api/auth/") &&
        !pathname.startsWith("/api/auth/callback") &&
        pathname !== "/api/auth/csrf" &&
        pathname !== "/api/auth/session" &&
        pathname !== "/api/auth/providers") ||
      // Native mobile credential/2FA login — brute-force protection.
      // (Refresh stays on the general bucket: a foregrounded app may refresh in bursts.)
      pathname === "/api/mobile/auth/login" ||
      pathname === "/api/mobile/auth/2fa" ||
      pathname === "/api/mobile/auth/oauth";
    const limit = isStrictAuthRoute ? AUTH_LIMIT : API_LIMIT;
    const window = isStrictAuthRoute ? AUTH_WINDOW : API_WINDOW;
    const key = `rl:${ip}:${isStrictAuthRoute ? "auth" : "api"}`;

    const result = await rateLimit(key, limit, window);
    if (!result.success) {
      console.warn(`[middleware] RATE_LIMITED ip=${ip} path=${pathname} bucket=${isStrictAuthRoute ? "auth" : "api"}`);
      return new NextResponse(
        JSON.stringify({ error: "Too many requests", code: "RATE_LIMITED" }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
            ...SECURITY_HEADERS,
          },
        }
      );
    }
  }

  // CSRF protection for mutating requests
  if (pathname.startsWith("/api/") && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    // A request carrying `Authorization: Bearer` is inherently CSRF-safe: a browser
    // never auto-attaches that header cross-site, so native mobile clients bypass the
    // Origin check while cookie-based web requests keep full protection.
    const hasBearer = req.headers.get("authorization")?.startsWith("Bearer ") ?? false;
    // Skip webhook routes (Stripe/Apple/Google Play send their own signatures)
    if (
      !hasBearer &&
      !pathname.startsWith("/api/stripe/webhook") &&
      !pathname.startsWith("/api/apple/webhook") &&
      !pathname.startsWith("/api/google-play/webhook")
    ) {
      const origin = req.headers.get("origin");
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (origin && appUrl && !origin.startsWith(appUrl)) {
        console.warn(`[middleware] CSRF_REJECTED origin=${origin} expected=${appUrl} path=${pathname}`);
        return new NextResponse(
          JSON.stringify({ error: "CSRF validation failed", code: "CSRF_REJECTED" }),
          { status: 403, headers: { "Content-Type": "application/json", ...SECURITY_HEADERS } }
        );
      }
    }
  }

  // i18n locale routing for non-API, non-static paths
  const isApiOrStatic =
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/monitoring") ||
    pathname.startsWith("/icons/") ||
    pathname.includes(".");
  if (!isApiOrStatic) {
    const response = intlMiddleware(req);
    return applySecurityHeaders(response);
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    // Match all paths except static files and _next
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
