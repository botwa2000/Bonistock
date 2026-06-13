import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { isLockedOut, recordFailedLogin, resetFailedLogins } from "@/lib/lockout";
import { logAudit } from "@/lib/audit";
import { issueMobileSession, mintChallengeToken, getMobileUser } from "@/lib/mobile-auth";

/**
 * POST /api/mobile/auth/login
 * Native credential login. Mirrors the `authorize()` callback in src/lib/auth.ts.
 * Returns { accessToken, refreshToken, expiresIn, user } on success, or
 * { requires2fa: true, challengeToken } when the account has 2FA enabled.
 */
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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

  const email = parsed.data.email.toLowerCase();
  const user = await db.user.findUnique({ where: { email, deletedAt: null } });

  // Generic message to avoid user enumeration.
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  if (isLockedOut(user)) {
    return NextResponse.json({ error: "Account locked", code: "ACCOUNT_LOCKED" }, { status: 403 });
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    const { locked } = await recordFailedLogin(user.id);
    await logAudit(user.id, "FAILED_LOGIN");
    if (locked) {
      return NextResponse.json({ error: "Account locked", code: "ACCOUNT_LOCKED" }, { status: 403 });
    }
    return NextResponse.json({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  if (!user.emailVerified) {
    return NextResponse.json({ error: "Email not verified", code: "EMAIL_NOT_VERIFIED" }, { status: 403 });
  }

  await resetFailedLogins(user.id);

  if (user.twoFactorEnabled) {
    const challengeToken = await mintChallengeToken(user.id);
    return NextResponse.json({ requires2fa: true, challengeToken });
  }

  await logAudit(user.id, "LOGIN");
  const tokens = await issueMobileSession(user.id, {
    deviceId: parsed.data.deviceId ?? null,
    userAgent: req.headers.get("user-agent"),
    platform: parsed.data.platform ?? null,
  });
  if (!tokens) {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }

  return NextResponse.json({ ...tokens, user: await getMobileUser(user.id) });
}
