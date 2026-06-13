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
  BREVO_SMTP_USER: z.string().min(1),
  BREVO_SMTP_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  ENCRYPTION_KEY: z.string().length(64), // 32 bytes hex-encoded
  FMP_API_KEY: z.string().min(1),
  APPLE_OAUTH_CLIENT_ID: z.string().min(1).optional(),
  APPLE_OAUTH_CLIENT_SECRET: z.string().min(1).optional(),
  // Native mobile OAuth (id_token exchange). Optional until the apps ship.
  GOOGLE_IOS_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_ANDROID_CLIENT_ID: z.string().min(1).optional(),
  APPLE_NATIVE_CLIENT_ID: z.string().min(1).optional(), // app bundle id audience
  // Google Play Billing (Android IAP). Optional until the Android app ships.
  GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: z.string().min(1).optional(),
  GOOGLE_PLAY_PUBSUB_AUDIENCE: z.string().min(1).optional(),
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
