import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  FACEBOOK_CLIENT_ID: z.string().min(1),
  FACEBOOK_CLIENT_SECRET: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  STRIPE_PRICE_PLUS_MONTHLY: z.string().startsWith("price_"),
  STRIPE_PRICE_PLUS_ANNUAL: z.string().startsWith("price_"),
  STRIPE_PRICE_PASS_1DAY: z.string().startsWith("price_"),
  STRIPE_PRICE_PASS_3DAY: z.string().startsWith("price_"),
  STRIPE_PRICE_PASS_12DAY: z.string().startsWith("price_"),
  BREVO_SMTP_USER: z.string().min(1),
  BREVO_SMTP_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  ENCRYPTION_KEY: z.string().length(64), // 32 bytes hex-encoded
  FMP_API_KEY: z.string().min(1),
});

export function validateEnv(): void {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map(
      (issue) => `  - ${issue.path.join(".")}: ${issue.message}`
    );
    throw new Error(
      `Environment validation failed:\n${missing.join("\n")}\n\nAll env vars are required. No defaults. Fix before starting.`
    );
  }
}
