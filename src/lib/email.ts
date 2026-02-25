import nodemailer from "nodemailer";
import { log } from "@/lib/logger";

function getTransport() {
  const host = "smtp-relay.brevo.com";
  const user = process.env.BREVO_SMTP_USER;
  const pass = process.env.BREVO_SMTP_KEY;
  if (!user) throw new Error("Missing required env var: BREVO_SMTP_USER");
  if (!pass) throw new Error("Missing required env var: BREVO_SMTP_KEY");

  return nodemailer.createTransport({
    host,
    port: 587,
    secure: false,
    auth: { user, pass },
  });
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("Missing required env var: EMAIL_FROM");

  log.debug("email", `Sending email to=${to} subject="${subject}" from=${from}`);
  const start = Date.now();

  try {
    const transport = getTransport();
    const info = await transport.sendMail({ from, to, subject, html });
    log.info("email", `Sent to=${to} messageId=${info.messageId} response="${info.response}" (${Date.now() - start}ms)`);
  } catch (err) {
    log.error("email", `Failed to send to=${to} subject="${subject}"`, err);
    throw err;
  }
}
