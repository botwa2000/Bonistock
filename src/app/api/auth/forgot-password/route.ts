import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { passwordResetEmail } from "@/lib/email-templates";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { email } = parsed.data;
  const user = await db.user.findUnique({ where: { email, deletedAt: null } });

  // Always return success to prevent email enumeration
  if (!user) {
    return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
  }

  // Delete any existing reset tokens for this user
  await db.verificationToken.deleteMany({
    where: { identifier: email, type: "PASSWORD_RESET" },
  });

  const token = randomBytes(32).toString("hex");
  await db.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      type: "PASSWORD_RESET",
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("Missing required env var: NEXT_PUBLIC_APP_URL");
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  await sendEmail(email, "Reset your password", passwordResetEmail(user.name ?? "there", resetUrl));

  return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
}
