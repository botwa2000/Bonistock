import nodemailer from "nodemailer";

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

  const transport = getTransport();
  await transport.sendMail({ from, to, subject, html });
}
