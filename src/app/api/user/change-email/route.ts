import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { emailChangeConfirmation } from "@/lib/email-templates";

const schema = z.object({
  newEmail: z.string().email(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const rl = rateLimit(`change-email:${session.user.id}`, 3, 60 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests. Try again later.", code: "RATE_LIMITED" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { newEmail } = parsed.data;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found", code: "NOT_FOUND" }, { status: 404 });
  }

  if (user.email === newEmail) {
    return NextResponse.json({ error: "New email must be different from current email", code: "SAME_EMAIL" }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email: newEmail } });
  if (existing) {
    return NextResponse.json({ error: "This email is already in use", code: "EMAIL_TAKEN" }, { status: 409 });
  }

  // Delete any existing email change tokens for this user
  await db.verificationToken.deleteMany({
    where: { identifier: user.email, type: "EMAIL_CHANGE" },
  });

  const token = randomBytes(32).toString("hex");
  await db.verificationToken.create({
    data: {
      identifier: user.email,
      token,
      expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      type: "EMAIL_CHANGE",
      metadata: { newEmail },
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("Missing required env var: NEXT_PUBLIC_APP_URL");
  const confirmUrl = `${appUrl}/api/auth/verify-email-change?token=${token}`;

  await sendEmail(
    newEmail,
    "Confirm your new email address",
    emailChangeConfirmation(user.name ?? "there", newEmail, confirmUrl),
  );

  return NextResponse.json({ message: "Verification email sent to your new address." });
}
