import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminRoute } from "@/lib/api-utils";
import { sendEmail } from "@/lib/email";
import { renderTemplate } from "@/lib/email-renderer";

const SAMPLE_URL = "https://example.com/action";
const SAMPLE_NAME = "Test User";

const sampleVars: Record<string, Record<string, string>> = {
  verification: { userName: SAMPLE_NAME, verifyUrl: SAMPLE_URL },
  passwordReset: { userName: SAMPLE_NAME, resetUrl: SAMPLE_URL },
  welcome: { userName: SAMPLE_NAME },
  passConfirmation: { userName: SAMPLE_NAME, passType: "3-Day Pass", activations: "3" },
  subscriptionConfirmation: { userName: SAMPLE_NAME, tier: "Plus Monthly", amount: "$6.99/mo" },
  subscriptionCanceled: { userName: SAMPLE_NAME, endDate: "March 15, 2026" },
  emailChange: { userName: SAMPLE_NAME, newEmail: "new@example.com", confirmUrl: SAMPLE_URL },
  paymentFailed: { userName: SAMPLE_NAME, settingsUrl: SAMPLE_URL },
  accountDeletion: { userName: SAMPLE_NAME },
  accountDeletionWithSubscription: { userName: SAMPLE_NAME, tier: "Plus", cancelNote: "Your Stripe subscription has been canceled immediately — you will not be charged again." },
  invoice: { userName: SAMPLE_NAME, amount: "59.99 USD", invoiceUrl: SAMPLE_URL, invoiceNumber: "INV-0001", planName: "Plus Annual", periodStart: "Mar 8, 2026", periodEnd: "Mar 8, 2027" },
};

const sendSchema = z.object({
  template: z.string().min(1),
});

// GET — return rendered HTML for preview
export async function GET(req: NextRequest) {
  const templateId = req.nextUrl.searchParams.get("template");
  if (!templateId || !sampleVars[templateId]) {
    return NextResponse.json({ error: "Unknown template" }, { status: 400 });
  }

  try {
    const { html } = await renderTemplate(templateId, sampleVars[templateId]);
    return NextResponse.json({ html });
  } catch {
    return NextResponse.json({ error: "Failed to render template" }, { status: 500 });
  }
}

// POST — send test email to admin's address
export const POST = adminRoute(async (req, context) => {
  const parsed = sendSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { template: templateId } = parsed.data;
  const vars = sampleVars[templateId];
  if (!vars) {
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
    const { subject, html } = await renderTemplate(templateId, vars);
    await sendEmail(user.email, `[TEST] ${subject}`, html);
    return NextResponse.json({ message: `Test email sent to ${user.email}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Failed to send: ${msg}` }, { status: 500 });
  }
});
