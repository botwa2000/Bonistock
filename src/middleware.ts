import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' js.stripe.com",
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
    "font-src 'self' fonts.gstatic.com",
    "connect-src 'self' api.stripe.com *.sentry.io",
    "frame-src js.stripe.com",
    "img-src 'self' data: *.googleusercontent.com *.fbsbx.com",
    "worker-src 'self' blob:",
  ].join("; "),
};

// Rate limit configs
const API_LIMIT = 100; // 100 req/min for general API
const API_WINDOW = 60 * 1000;
const AUTH_LIMIT = 10; // 10 req/min for auth routes
const AUTH_WINDOW = 60 * 1000;

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rate limiting for API routes
  if (pathname.startsWith("/api/")) {
    const ip = getClientIP(req);
    // Only rate-limit sensitive auth endpoints (login, register, password reset) strictly.
    // OAuth callback/session/csrf routes need the general limit — a single OAuth
    // sign-in triggers multiple rapid requests (csrf, callback, session, providers).
    const isStrictAuthRoute =
      pathname.startsWith("/api/auth/") &&
      !pathname.startsWith("/api/auth/callback") &&
      pathname !== "/api/auth/csrf" &&
      pathname !== "/api/auth/session" &&
      pathname !== "/api/auth/providers";
    const limit = isStrictAuthRoute ? AUTH_LIMIT : API_LIMIT;
    const window = isStrictAuthRoute ? AUTH_WINDOW : API_WINDOW;
    const key = `${ip}:${isStrictAuthRoute ? "auth" : "api"}`;

    const result = rateLimit(key, limit, window);
    if (!result.success) {
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
    // Skip webhook route (Stripe sends its own signature)
    if (!pathname.startsWith("/api/stripe/webhook")) {
      const origin = req.headers.get("origin");
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (origin && appUrl && !origin.startsWith(appUrl)) {
        return new NextResponse(
          JSON.stringify({ error: "CSRF validation failed", code: "CSRF_REJECTED" }),
          { status: 403, headers: { "Content-Type": "application/json", ...SECURITY_HEADERS } }
        );
      }
    }
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files and _next
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
