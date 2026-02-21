import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token", code: "MISSING_TOKEN" }, { status: 400 });
  }

  const record = await db.verificationToken.findUnique({
    where: { token, type: "EMAIL_CHANGE" },
  });

  if (!record) {
    return NextResponse.json({ error: "Invalid or expired token", code: "INVALID_TOKEN" }, { status: 400 });
  }

  if (record.expires < new Date()) {
    await db.verificationToken.delete({ where: { token } });
    return NextResponse.json({ error: "Token expired", code: "TOKEN_EXPIRED" }, { status: 400 });
  }

  const metadata = record.metadata as { newEmail?: string } | null;
  const newEmail = metadata?.newEmail;
  if (!newEmail) {
    await db.verificationToken.delete({ where: { token } });
    return NextResponse.json({ error: "Invalid token data", code: "INVALID_TOKEN" }, { status: 400 });
  }

  // Race condition guard: re-check new email isn't taken
  const existing = await db.user.findUnique({ where: { email: newEmail } });
  if (existing) {
    await db.verificationToken.delete({ where: { token } });
    return NextResponse.json({ error: "This email is already in use", code: "EMAIL_TAKEN" }, { status: 409 });
  }

  const user = await db.user.findUnique({ where: { email: record.identifier } });
  if (!user) {
    await db.verificationToken.delete({ where: { token } });
    return NextResponse.json({ error: "User not found", code: "NOT_FOUND" }, { status: 404 });
  }

  await db.user.update({
    where: { id: user.id },
    data: { email: newEmail, emailVerified: new Date() },
  });

  await db.verificationToken.delete({ where: { token } });
  await logAudit(user.id, "EMAIL_CHANGE", { oldEmail: record.identifier, newEmail });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("Missing required env var: NEXT_PUBLIC_APP_URL");

  return NextResponse.redirect(`${appUrl}/profile?emailChanged=true`);
}
