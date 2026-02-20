import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "./auth";

type Handler = (
  req: NextRequest,
  context: { userId: string; role: string }
) => Promise<NextResponse>;

export function authenticatedRoute(handler: Handler) {
  return async (req: NextRequest) => {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    const role = ((session as unknown as Record<string, unknown>).role as string) ?? "USER";
    return handler(req, { userId: session.user.id, role });
  };
}

export function adminRoute(handler: Handler) {
  return authenticatedRoute(async (req, context) => {
    if (context.role !== "ADMIN") {
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
