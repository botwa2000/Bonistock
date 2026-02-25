import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { renderTemplate } from "@/lib/email-renderer";
import { log } from "@/lib/logger";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const start = Date.now();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    log.debug("forgot-password", "Validation failed", parsed.error.issues);
    return NextResponse.json({ error: "Invalid email", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { email } = parsed.data;
  log.info("forgot-password", `Request for email=${email}`);

  const user = await db.user.findUnique({ where: { email, deletedAt: null } });

  // Always return success to prevent email enumeration
  if (!user) {
    log.info("forgot-password", `No user found for email=${email} (returning 200 anyway)`);
    return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
  }

  log.debug("forgot-password", `User found id=${user.id} name=${user.name}`);

  // Delete any existing reset tokens for this user
  const deleted = await db.verificationToken.deleteMany({
    where: { identifier: email, type: "PASSWORD_RESET" },
  });
  log.debug("forgot-password", `Deleted ${deleted.count} existing PASSWORD_RESET tokens`);

  const token = randomBytes(32).toString("hex");
  await db.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      type: "PASSWORD_RESET",
    },
  });
  log.debug("forgot-password", "Token created in DB");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("Missing required env var: NEXT_PUBLIC_APP_URL");
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  const { subject, html } = await renderTemplate("passwordReset", { userName: user.name ?? "there", resetUrl });
  log.debug("forgot-password", `Template rendered subject="${subject}"`);

  try {
    await sendEmail(email, subject, html);
    log.info("forgot-password", `Complete for email=${email} (${Date.now() - start}ms)`);
  } catch (err) {
    log.error("forgot-password", `Email send failed for email=${email}`, err);
    // Still return 200 to prevent enumeration
  }

  return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
}
