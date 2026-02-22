import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminRoute } from "@/lib/api-utils";
import { sendEmail } from "@/lib/email";
import {
  verificationEmail,
  passwordResetEmail,
  welcomeEmail,
  passConfirmationEmail,
  subscriptionConfirmationEmail,
  subscriptionCanceledEmail,
  emailChangeConfirmation,
  paymentFailedEmail,
} from "@/lib/email-templates";

const SAMPLE_URL = "https://example.com/action";
const SAMPLE_NAME = "Test User";

const templates: Record<string, { subject: string; html: string }> = {
  verification: {
    subject: "Verify your email",
    html: verificationEmail(SAMPLE_NAME, SAMPLE_URL),
  },
  passwordReset: {
    subject: "Reset your password",
    html: passwordResetEmail(SAMPLE_NAME, SAMPLE_URL),
  },
  welcome: {
    subject: "Welcome to Bonistock!",
    html: welcomeEmail(SAMPLE_NAME),
  },
  passConfirmation: {
    subject: "Your pass is ready!",
    html: passConfirmationEmail(SAMPLE_NAME, "3-Day Pass", 3),
  },
  subscriptionConfirmation: {
    subject: "Subscription confirmed",
    html: subscriptionConfirmationEmail(SAMPLE_NAME, "Plus Monthly", "$6.99/mo"),
  },
  subscriptionCanceled: {
    subject: "Subscription canceled",
    html: subscriptionCanceledEmail(SAMPLE_NAME, "March 15, 2026"),
  },
  emailChange: {
    subject: "Confirm your new email",
    html: emailChangeConfirmation(SAMPLE_NAME, "new@example.com", SAMPLE_URL),
  },
  paymentFailed: {
    subject: "Payment failed",
    html: paymentFailedEmail(SAMPLE_NAME),
  },
};

const sendSchema = z.object({
  template: z.string().min(1),
});

// GET — return rendered HTML for preview
export async function GET(req: NextRequest) {
  const templateId = req.nextUrl.searchParams.get("template");
  if (!templateId || !templates[templateId]) {
    return NextResponse.json({ error: "Unknown template" }, { status: 400 });
  }

  return NextResponse.json({ html: templates[templateId].html });
}

// POST — send test email to admin's address
export const POST = adminRoute(async (req, context) => {
  const parsed = sendSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { template: templateId } = parsed.data;
  const tmpl = templates[templateId];
  if (!tmpl) {
    return NextResponse.json({ error: "Unknown template" }, { status: 400 });
  }

  // Get admin's email from DB
  const { db } = await import("@/lib/db");
  const user = await db.user.findUnique({
    where: { id: context.userId },
    select: { email: true },
  });

  if (!user?.email) {
    return NextResponse.json({ error: "Could not determine admin email" }, { status: 500 });
  }

  try {
    await sendEmail(user.email, `[TEST] ${tmpl.subject}`, tmpl.html);
    return NextResponse.json({ message: `Test email sent to ${user.email}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Failed to send: ${msg}` }, { status: 500 });
  }
});
