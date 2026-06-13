import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rotateMobileSession } from "@/lib/mobile-auth";

/**
 * POST /api/mobile/auth/refresh
 * Exchanges a valid refresh token for a fresh access + refresh token (rotation).
 * The old refresh token is invalidated.
 */
const schema = z.object({
  refreshToken: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const tokens = await rotateMobileSession(parsed.data.refreshToken);
  if (!tokens) {
    return NextResponse.json({ error: "Invalid refresh token", code: "REFRESH_INVALID" }, { status: 401 });
  }

  return NextResponse.json(tokens);
}
