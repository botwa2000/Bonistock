import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "./auth";
import { log } from "./logger";

type Handler = (
  req: NextRequest,
  context: { userId: string; role: string }
) => Promise<NextResponse>;

export function authenticatedRoute(handler: Handler) {
  return async (req: NextRequest) => {
    const start = Date.now();
    const path = req.nextUrl.pathname;
    log.request(req.method, path);

    const session = await auth();
    if (!session?.user?.id) {
      log.debug("auth", `Unauthorized request to ${path}`);
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    const role = ((session as unknown as Record<string, unknown>).role as string) ?? "USER";
    log.debug("auth", `User ${session.user.id} (${role}) → ${path}`);

    try {
      const res = await handler(req, { userId: session.user.id, role });
      log.response(req.method, path, res.status, Date.now() - start);
      return res;
    } catch (err) {
      log.error("api", `${req.method} ${path} threw:`, err);
      return NextResponse.json(
        { error: "Internal server error", code: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }
  };
}

export function adminRoute(handler: Handler) {
  return authenticatedRoute(async (req, context) => {
    if (context.role !== "ADMIN") {
      log.warn("admin", `Non-admin user ${context.userId} tried to access ${req.nextUrl.pathname}`);
      return NextResponse.json(
        { error: "Forbidden", code: "FORBIDDEN" },
        { status: 403 }
      );
    }
    return handler(req, context);
  });
}

export function validateBody<T>(schema: z.ZodSchema<T>, handler: (req: NextRequest, body: T, context: { userId: string; role: string }) => Promise<NextResponse>) {
  return authenticatedRoute(async (req, context) => {
    const raw = await req.json();
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", code: "VALIDATION_ERROR", details: parsed.error.issues },
        { status: 400 }
      );
    }
    return handler(req, parsed.data, context);
  });
}
