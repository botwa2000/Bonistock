import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { renderTemplate } from "@/lib/email-renderer";
import { getLocalePrefix } from "@/lib/locale-path";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token", code: "MISSING_TOKEN" }, { status: 400 });
  }

  let user: { email: string; name: string | null } | null = null;

  try {
    user = await db.$transaction(async (tx) => {
      const record = await tx.verificationToken.findUnique({
        where: { token, type: "EMAIL_VERIFICATION" },
      });

      if (!record) throw Object.assign(new Error("Invalid or expired token"), { code: "INVALID_TOKEN" });

      if (record.expires < new Date()) {
        await tx.verificationToken.delete({ where: { token } });
        throw Object.assign(new Error("Token expired"), { code: "TOKEN_EXPIRED" });
      }

      // Atomic delete — if two concurrent requests race, only one succeeds
      const deleted = await tx.verificationToken.deleteMany({ where: { token } });
      if (deleted.count === 0) {
        throw Object.assign(new Error("Invalid or expired token"), { code: "INVALID_TOKEN" });
      }

      return tx.user.update({
        where: { email: record.identifier },
        data: { emailVerified: new Date() },
        select: { email: true, name: true },
      });
    });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code ?? "INVALID_TOKEN";
    return NextResponse.json({ error: (err as Error).message, code }, { status: 400 });
  }

  // Send welcome email (non-critical)
  try {
    const { subject, html } = await renderTemplate("welcome", {
      userName: user.name ?? "there",
    });
    await sendEmail(user.email, subject, html);
  } catch {
    // Non-critical — don't block verification
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("Missing required env var: NEXT_PUBLIC_APP_URL");

  const locale = await getLocalePrefix();
  return NextResponse.redirect(`${appUrl}/${locale}/login?verified=true`);
}
