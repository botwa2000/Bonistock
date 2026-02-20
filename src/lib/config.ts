// Central config — ZERO defaults. App crashes at import time if any env var is missing.

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const config = {
  database: {
    url: required("DATABASE_URL"),
  },
  auth: {
    secret: required("NEXTAUTH_SECRET"),
    url: required("NEXTAUTH_URL"),
    google: {
      clientId: required("GOOGLE_CLIENT_ID"),
      clientSecret: required("GOOGLE_CLIENT_SECRET"),
    },
    facebook: {
      clientId: required("FACEBOOK_CLIENT_ID"),
      clientSecret: required("FACEBOOK_CLIENT_SECRET"),
    },
  },
  stripe: {
    secretKey: required("STRIPE_SECRET_KEY"),
    publishableKey: required("STRIPE_PUBLISHABLE_KEY"),
    webhookSecret: required("STRIPE_WEBHOOK_SECRET"),
  },
  email: {
    host: "smtp-relay.brevo.com", // Brevo's public SMTP host — not a secret
    port: 587,
    user: required("BREVO_SMTP_USER"),
    password: required("BREVO_SMTP_KEY"),
    from: required("EMAIL_FROM"),
  },
  encryption: {
    key: required("ENCRYPTION_KEY"),
  },
  fmp: {
    apiKey: required("FMP_API_KEY"),
  },
  app: {
    url: required("NEXT_PUBLIC_APP_URL"),
  },
} as const;
