import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveAuth } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { verifyPassword, validatePasswordStrength, hashPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const ctx = await resolveAuth(req);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const rl = await rateLimit(`change-password:${ctx.userId}`, 5, 60 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests. Try again later.", code: "RATE_LIMITED" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { currentPassword, newPassword } = parsed.data;

  const user = await db.user.findUnique({
    where: { id: ctx.userId },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) {
    return NextResponse.json(
      { error: "Password change is not available for social login accounts.", code: "OAUTH_ONLY" },
      { status: 400 },
    );
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect.", code: "WRONG_PASSWORD" }, { status: 400 });
  }

  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) {
    return NextResponse.json({ error: strength.message, code: "WEAK_PASSWORD" }, { status: 400 });
  }

  const hashed = await hashPassword(newPassword);
  await db.user.update({
    where: { id: ctx.userId },
    data: { passwordHash: hashed },
  });

  await logAudit(ctx.userId, "PASSWORD_CHANGE");

  return NextResponse.json({ message: "Password updated successfully." });
}
