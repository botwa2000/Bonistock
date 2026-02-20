import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

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

  await db.user.update({
    where: { email: record.identifier },
    data: { emailVerified: new Date() },
  });

  await db.verificationToken.delete({ where: { token } });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("Missing required env var: NEXT_PUBLIC_APP_URL");

  return NextResponse.redirect(`${appUrl}/login?verified=true`);
}
