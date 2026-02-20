// Stripe price IDs — must be set in environment variables.
// Create products/prices in Stripe Dashboard, then set these env vars.

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function getStripePrices() {
  return {
    plusMonthly: required("STRIPE_PRICE_PLUS_MONTHLY"),
    plusAnnual: required("STRIPE_PRICE_PLUS_ANNUAL"),
    passOneDay: required("STRIPE_PRICE_PASS_1DAY"),
    passThreeDay: required("STRIPE_PRICE_PASS_3DAY"),
    passTwelveDay: required("STRIPE_PRICE_PASS_12DAY"),
  } as const;
}
