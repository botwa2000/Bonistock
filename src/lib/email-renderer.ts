import { db } from "@/lib/db";
import {
  layout,
  verificationEmail,
  passwordResetEmail,
  welcomeEmail,
  passConfirmationEmail,
  subscriptionConfirmationEmail,
  subscriptionCanceledEmail,
  emailChangeConfirmation,
  paymentFailedEmail,
} from "@/lib/email-templates";

// Hardcoded fallbacks keyed by slug
const fallbacks: Record<string, (vars: Record<string, string>) => { subject: string; html: string }> = {
  verification: (v) => ({
    subject: "Verify your email",
    html: verificationEmail(v.userName ?? "", v.verifyUrl ?? ""),
  }),
  passwordReset: (v) => ({
    subject: "Reset your password",
    html: passwordResetEmail(v.userName ?? "", v.resetUrl ?? ""),
  }),
  welcome: (v) => ({
    subject: "Welcome to Bonistock!",
    html: welcomeEmail(v.userName ?? ""),
  }),
  passConfirmation: (v) => ({
    subject: "Your pass is ready!",
    html: passConfirmationEmail(v.userName ?? "", v.passType ?? "", Number(v.activations) || 1),
  }),
  subscriptionConfirmation: (v) => ({
    subject: "Subscription confirmed",
    html: subscriptionConfirmationEmail(v.userName ?? "", v.tier ?? "", v.amount ?? ""),
  }),
  subscriptionCanceled: (v) => ({
    subject: "Subscription canceled",
    html: subscriptionCanceledEmail(v.userName ?? "", v.endDate ?? ""),
  }),
  emailChange: (v) => ({
    subject: "Confirm your new email",
    html: emailChangeConfirmation(v.userName ?? "", v.newEmail ?? "", v.confirmUrl ?? ""),
  }),
  paymentFailed: (v) => ({
    subject: "Payment failed",
    html: paymentFailedEmail(v.userName ?? ""),
  }),
  accountDeletion: (v) => ({
    subject: "Your account has been deleted",
    html: layout(`
    <h1>Account deleted</h1>
    <p>Hi ${v.userName ?? ""},</p>
    <p>Your Bonistock account has been successfully deleted. All your personal data has been anonymized.</p>
    <p>If you change your mind, you're welcome to create a new account anytime.</p>`),
  }),
};

export async function renderTemplate(
  slug: string,
  variables: Record<string, string>
): Promise<{ subject: string; html: string }> {
  try {
    const template = await db.emailTemplate.findUnique({ where: { slug } });
    if (template) {
      let body = template.body;
      let subject = template.subject;
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        body = body.replaceAll(placeholder, value);
        subject = subject.replaceAll(placeholder, value);
      }
      return { subject, html: layout(body) };
    }
  } catch {
    // DB unavailable — fall through to hardcoded
  }

  // Fallback to hardcoded templates
  const fb = fallbacks[slug];
  if (fb) return fb(variables);

  throw new Error(`Unknown email template: ${slug}`);
}
