import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { getLocalePrefix } from "@/lib/locale-path";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token", code: "MISSING_TOKEN" }, { status: 400 });
  }

  let auditData: { userId: string; oldEmail: string; newEmail: string } | null = null;

  try {
    auditData = await db.$transaction(async (tx) => {
      const record = await tx.verificationToken.findUnique({
        where: { token, type: "EMAIL_CHANGE" },
      });

      if (!record) throw Object.assign(new Error("Invalid or expired token"), { code: "INVALID_TOKEN" });

      if (record.expires < new Date()) {
        await tx.verificationToken.delete({ where: { token } });
        throw Object.assign(new Error("Token expired"), { code: "TOKEN_EXPIRED" });
      }

      const metadata = record.metadata as { newEmail?: string } | null;
      const newEmail = metadata?.newEmail;
      if (!newEmail) {
        await tx.verificationToken.delete({ where: { token } });
        throw Object.assign(new Error("Invalid token data"), { code: "INVALID_TOKEN" });
      }

      // Atomic delete — if two concurrent requests race, only one succeeds
      const deleted = await tx.verificationToken.deleteMany({ where: { token } });
      if (deleted.count === 0) {
        throw Object.assign(new Error("Invalid or expired token"), { code: "INVALID_TOKEN" });
      }

      // Race condition guard: re-check new email isn't taken inside the transaction
      const existing = await tx.user.findUnique({ where: { email: newEmail } });
      if (existing) {
        throw Object.assign(new Error("This email is already in use"), { code: "EMAIL_TAKEN" });
      }

      const user = await tx.user.findUnique({ where: { email: record.identifier } });
      if (!user) {
        throw Object.assign(new Error("User not found"), { code: "NOT_FOUND" });
      }

      await tx.user.update({
        where: { id: user.id },
        data: { email: newEmail, emailVerified: new Date() },
      });

      return { userId: user.id, oldEmail: record.identifier, newEmail };
    });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code ?? "INVALID_TOKEN";
    const status = code === "EMAIL_TAKEN" ? 409 : code === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: (err as Error).message, code }, { status });
  }

  await logAudit(auditData.userId, "EMAIL_CHANGE", {
    oldEmail: auditData.oldEmail,
    newEmail: auditData.newEmail,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("Missing required env var: NEXT_PUBLIC_APP_URL");

  const locale = await getLocalePrefix();
  return NextResponse.redirect(`${appUrl}/${locale}/profile?emailChanged=true`);
}
