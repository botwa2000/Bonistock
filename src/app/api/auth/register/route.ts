import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { verificationEmail } from "@/lib/email-templates";
import { randomBytes } from "crypto";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  tosAccepted: z.literal(true),
  privacyAccepted: z.literal(true),
  cookieConsent: z.object({
    analytics: z.boolean(),
    marketing: z.boolean(),
  }),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { email, password, name, cookieConsent } = parsed.data;

  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    return NextResponse.json(
      { error: strength.message, code: "WEAK_PASSWORD" },
      { status: 400 }
    );
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists", code: "EMAIL_EXISTS" },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: {
      email,
      name,
      passwordHash,
      tosAcceptedAt: new Date(),
      tosVersion: "1.0",
      privacyAcceptedAt: new Date(),
      cookieConsent,
    },
  });

  // Create verification token
  const token = randomBytes(32).toString("hex");
  await db.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      type: "EMAIL_VERIFICATION",
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("Missing required env var: NEXT_PUBLIC_APP_URL");
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${token}`;

  await sendEmail(email, "Verify your email address", verificationEmail(name, verifyUrl));
  await logAudit(user.id, "REGISTER", { email });

  return NextResponse.json({ message: "Registration successful. Check your email to verify." }, { status: 201 });
}
