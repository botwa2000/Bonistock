import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { token, password } = parsed.data;

  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    return NextResponse.json({ error: strength.message, code: "WEAK_PASSWORD" }, { status: 400 });
  }

  const record = await db.verificationToken.findUnique({
    where: { token, type: "PASSWORD_RESET" },
  });

  if (!record) {
    return NextResponse.json({ error: "Invalid or expired token", code: "INVALID_TOKEN" }, { status: 400 });
  }

  if (record.expires < new Date()) {
    await db.verificationToken.delete({ where: { token } });
    return NextResponse.json({ error: "Token expired", code: "TOKEN_EXPIRED" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const user = await db.user.update({
    where: { email: record.identifier },
    data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
  });

  await db.verificationToken.delete({ where: { token } });
  await logAudit(user.id, "PASSWORD_RESET");

  return NextResponse.json({ message: "Password reset successful. You can now log in." });
}
