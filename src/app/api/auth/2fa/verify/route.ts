import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveAuth } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { verifyTotp } from "@/lib/twofactor";

const schema = z.object({
  code: z.string().length(6),
});

export async function POST(req: NextRequest) {
  const ctx = await resolveAuth(req);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code format", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const result = await verifyTotp(ctx.userId, parsed.data.code);
  if (result === "not_setup") {
    return NextResponse.json({ error: "2FA not set up. Call setup first.", code: "NOT_SETUP" }, { status: 400 });
  }
  if (result === "invalid") {
    return NextResponse.json({ error: "Invalid code", code: "INVALID_CODE" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: ctx.userId },
    select: { twoFactorEnabled: true },
  });

  if (!user?.twoFactorEnabled) {
    // First-time verification enables 2FA
    await db.user.update({
      where: { id: ctx.userId },
      data: { twoFactorEnabled: true },
    });
    await logAudit(ctx.userId, "2FA_ENABLE");
  }

  return NextResponse.json({ message: "2FA verified successfully" });
}
