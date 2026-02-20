import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";
import * as OTPAuth from "otpauth";

const schema = z.object({
  code: z.string().length(6),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code format", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { twoFactorSecret: true, twoFactorEnabled: true, email: true },
  });

  if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
    return NextResponse.json({ error: "2FA is not enabled", code: "NOT_ENABLED" }, { status: 400 });
  }

  const secret = decrypt(user.twoFactorSecret);
  const totp = new OTPAuth.TOTP({
    issuer: "Bonistock",
    label: user.email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  const delta = totp.validate({ token: parsed.data.code, window: 1 });
  if (delta === null) {
    return NextResponse.json({ error: "Invalid code", code: "INVALID_CODE" }, { status: 400 });
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });

  await logAudit(session.user.id, "2FA_DISABLE");

  return NextResponse.json({ message: "2FA disabled successfully" });
}
