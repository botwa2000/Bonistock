import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { verifyTotp } from "@/lib/twofactor";
import {
  verifyChallengeToken,
  issueMobileSession,
  getMobileUser,
} from "@/lib/mobile-auth";

/**
 * POST /api/mobile/auth/2fa
 * Completes the second step of a 2FA login. The app sends the `challengeToken`
 * it received from /login plus the 6-digit TOTP code.
 */
const schema = z.object({
  challengeToken: z.string().min(1),
  code: z.string().length(6),
  deviceId: z.string().max(200).optional(),
  platform: z.enum(["ios", "android"]).optional(),
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

  const userId = await verifyChallengeToken(parsed.data.challengeToken);
  if (!userId) {
    return NextResponse.json({ error: "Invalid or expired challenge", code: "CHALLENGE_INVALID" }, { status: 401 });
  }

  const result = await verifyTotp(userId, parsed.data.code);
  if (result === "not_setup") {
    return NextResponse.json({ error: "2FA not set up", code: "NOT_SETUP" }, { status: 400 });
  }
  if (result === "invalid") {
    return NextResponse.json({ error: "Invalid code", code: "INVALID_CODE" }, { status: 400 });
  }

  await logAudit(userId, "LOGIN");
  const tokens = await issueMobileSession(userId, {
    deviceId: parsed.data.deviceId ?? null,
    userAgent: req.headers.get("user-agent"),
    platform: parsed.data.platform ?? null,
  });
  if (!tokens) {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }

  return NextResponse.json({ ...tokens, user: await getMobileUser(userId) });
}
