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
  priceId: string
): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("Missing required env var: NEXT_PUBLIC_APP_URL");

  const customerId = await getOrCreateCustomer(userId, email);
  const session = await getStripeClient().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?subscription=success`,
    cancel_url: `${appUrl}/pricing?canceled=true`,
    metadata: { userId },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

export async function createPassPaymentIntent(
  userId: string,
  email: string,
  priceId: string,
  passType: "ONE_DAY" | "THREE_DAY" | "TWELVE_DAY"
): Promise<{ clientSecret: string }> {
  const customerId = await getOrCreateCustomer(userId, email);

  // Fetch the price to get the amount
  const price = await getStripeClient().prices.retrieve(priceId);
  if (!price.unit_amount) throw new Error("Price has no unit_amount");

  const paymentIntent = await getStripeClient().paymentIntents.create({
    amount: price.unit_amount,
    currency: price.currency,
    customer: customerId,
    metadata: { userId, passType },
  });

  if (!paymentIntent.client_secret) throw new Error("No client_secret returned");
  return { clientSecret: paymentIntent.client_secret };
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
