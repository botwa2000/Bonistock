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

  const record = await db.verificationToken.findUnique({
    where: { token, type: "EMAIL_VERIFICATION" },
  });

  if (!record) {
    return NextResponse.json({ error: "Invalid or expired token", code: "INVALID_TOKEN" }, { status: 400 });
  }

  if (record.expires < new Date()) {
    await db.verificationToken.delete({ where: { token } });
    return NextResponse.json({ error: "Token expired", code: "TOKEN_EXPIRED" }, { status: 400 });
  }

  const user = await db.user.update({
    where: { email: record.identifier },
    data: { emailVerified: new Date() },
    select: { email: true, name: true },
  });

  await db.verificationToken.delete({ where: { token } });

  // Send welcome email
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
