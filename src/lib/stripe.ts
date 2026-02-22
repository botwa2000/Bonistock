import Stripe from "stripe";
import { db } from "./db";

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing required env var: STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2026-01-28.clover" });
}

export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return Reflect.get(getStripeClient(), prop);
  },
});

export async function getOrCreateCustomer(
  userId: string,
  email: string
): Promise<string> {
  const existing = await db.subscription.findUnique({
    where: { userId },
    select: { stripeCustomerId: true },
  });

  if (existing) return existing.stripeCustomerId;

  const customer = await getStripeClient().customers.create({
    email,
    metadata: { userId },
  });

  await db.subscription.create({
    data: {
      userId,
      stripeCustomerId: customer.id,
      status: "INACTIVE",
      tier: "FREE",
    },
  });

  return customer.id;
}

export async function createCheckoutSession(
  userId: string,
  email: string,
  priceId: string,
  trialDays?: number
): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("Missing required env var: NEXT_PUBLIC_APP_URL");

  const customerId = await getOrCreateCustomer(userId, email);
  const session = await getStripeClient().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    ...(trialDays ? { subscription_data: { trial_period_days: trialDays } } : {}),
    success_url: `${appUrl}/dashboard?subscription=success`,
    cancel_url: `${appUrl}/pricing?canceled=true`,
    metadata: { userId },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

export async function createPassCheckoutSession(
  userId: string,
  email: string,
  priceId: string,
  passType: "ONE_DAY" | "THREE_DAY" | "TWELVE_DAY"
): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("Missing required env var: NEXT_PUBLIC_APP_URL");

  const customerId = await getOrCreateCustomer(userId, email);

  const session = await getStripeClient().checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?pass=success`,
    cancel_url: `${appUrl}/pricing?canceled=true`,
    metadata: { userId, passType },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

export async function createCustomerPortalSession(
  stripeCustomerId: string
): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("Missing required env var: NEXT_PUBLIC_APP_URL");

  const session = await getStripeClient().billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${appUrl}/settings`,
  });

  return session.url;
}
