import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { revokeMobileSession } from "@/lib/mobile-auth";

/**
 * POST /api/mobile/auth/logout
 * Revokes the session backing the given refresh token. Idempotent.
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

  await revokeMobileSession(parsed.data.refreshToken);
  return NextResponse.json({ ok: true });
}
