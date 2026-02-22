import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { log } from "@/lib/logger";
import { renderTemplate } from "@/lib/email-renderer";

const PASS_ACTIVATIONS: Record<string, { type: "ONE_DAY" | "THREE_DAY" | "TWELVE_DAY"; count: number }> = {
  ONE_DAY: { type: "ONE_DAY", count: 1 },
  THREE_DAY: { type: "THREE_DAY", count: 3 },
  TWELVE_DAY: { type: "TWELVE_DAY", count: 12 },
};

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing required env var: STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2026-01-28.clover" });
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("Missing required env var: STRIPE_WEBHOOK_SECRET");

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    log.error("stripe/webhook", "Invalid signature:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  log.info("stripe/webhook", `Event: ${event.type} (${event.id})`);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId) break;

      if (session.mode === "subscription" && session.subscription) {
        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;
        const stripeSubscription = await getStripe().subscriptions.retrieve(subscriptionId);

        const statusMap: Record<string, "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING"> = {
          active: "ACTIVE",
          past_due: "PAST_DUE",
          canceled: "CANCELED",
          trialing: "TRIALING",
        };
        const dbStatus = statusMap[stripeSubscription.status] ?? "ACTIVE";

        const subItem = stripeSubscription.items.data[0];
        await db.subscription.update({
          where: { stripeCustomerId: session.customer as string },
          data: {
            stripeSubscriptionId: subscriptionId,
            stripePriceId: subItem?.price.id,
            status: dbStatus,
            tier: "PLUS",
            ...(subItem?.current_period_start && {
              currentPeriodStart: new Date(subItem.current_period_start * 1000),
            }),
            ...(subItem?.current_period_end && {
              currentPeriodEnd: new Date(subItem.current_period_end * 1000),
            }),
          },
        });

        const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
        if (user) {
          const { subject, html } = await renderTemplate("subscriptionConfirmation", {
            userName: user.name ?? "there",
            tier: "Plus",
            amount: session.amount_total ? `$${(session.amount_total / 100).toFixed(2)}` : "",
          });
          await sendEmail(user.email, subject, html);
        }
        log.info("stripe/webhook", `Subscription activated for user ${userId}, status=${dbStatus}`);
        await logAudit(userId, "SUBSCRIPTION_CHANGE", { action: "subscribe", tier: "PLUS" });
      } else if (session.mode === "payment") {
        const passTypeKey = session.metadata?.passType;
        if (!passTypeKey) break;

        const passConfig = PASS_ACTIVATIONS[passTypeKey];
        if (!passConfig) break;

        await db.passPurchase.create({
          data: {
            userId,
            passType: passConfig.type,
            activationsTotal: passConfig.count,
            activationsUsed: 0,
            stripePaymentIntentId: session.payment_intent as string,
          },
        });

        const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
        if (user) {
          const passNames = { ONE_DAY: "1-Day Pass", THREE_DAY: "3-Day Pass", TWELVE_DAY: "12-Day Pass" };
          const { subject, html } = await renderTemplate("passConfirmation", {
            userName: user.name ?? "there",
            passType: passNames[passConfig.type],
            activations: String(passConfig.count),
          });
          await sendEmail(user.email, subject, html);
        }
        log.info("stripe/webhook", `Pass purchased for user ${userId}: ${passConfig.type} (${passConfig.count} activations)`);
        await logAudit(userId, "PASS_PURCHASE", { passType: passConfig.type, activations: passConfig.count });
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      if ((invoice as any).subscription) {
        const subscriptionId = typeof (invoice as any).subscription === "string"
          ? (invoice as any).subscription
          : (invoice as any).subscription.id;
        const stripeSubscription = await getStripe().subscriptions.retrieve(subscriptionId);
        const invSubItem = stripeSubscription.items.data[0];
        await db.subscription.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: {
            status: "ACTIVE",
            ...(invSubItem?.current_period_start && {
              currentPeriodStart: new Date(invSubItem.current_period_start * 1000),
            }),
            ...(invSubItem?.current_period_end && {
              currentPeriodEnd: new Date(invSubItem.current_period_end * 1000),
            }),
          },
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      if ((invoice as any).subscription) {
        const subscriptionId = typeof (invoice as any).subscription === "string"
          ? (invoice as any).subscription
          : (invoice as any).subscription.id;
        const sub = await db.subscription.findUnique({
          where: { stripeSubscriptionId: subscriptionId },
          include: { user: { select: { email: true, name: true } } },
        });
        if (sub) {
          await db.subscription.update({
            where: { id: sub.id },
            data: { status: "PAST_DUE" },
          });
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
          const { subject: pfSubject, html: pfHtml } = await renderTemplate("paymentFailed", {
            userName: sub.user.name ?? "there",
            settingsUrl: `${appUrl}/settings`,
          });
          await sendEmail(sub.user.email, pfSubject, pfHtml);
        }
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const statusMap: Record<string, "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING"> = {
        active: "ACTIVE",
        past_due: "PAST_DUE",
        canceled: "CANCELED",
        trialing: "TRIALING",
      };
      const updSubItem = subscription.items.data[0];
      await db.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: statusMap[subscription.status] ?? "INACTIVE",
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          ...(updSubItem?.current_period_end && {
            currentPeriodEnd: new Date(updSubItem.current_period_end * 1000),
          }),
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const sub = await db.subscription.findUnique({
        where: { stripeSubscriptionId: subscription.id },
        include: { user: { select: { email: true, name: true } } },
      });
      if (sub) {
        await db.subscription.update({
          where: { id: sub.id },
          data: { status: "CANCELED", tier: "FREE" },
        });
        const delSubItem = subscription.items.data[0];
        const endTimestamp = delSubItem?.current_period_end;
        const { subject: scSubject, html: scHtml } = await renderTemplate("subscriptionCanceled", {
          userName: sub.user.name ?? "there",
          endDate: endTimestamp ? new Date(endTimestamp * 1000).toLocaleDateString() : "soon",
        });
        await sendEmail(sub.user.email, scSubject, scHtml);
        await logAudit(sub.userId, "SUBSCRIPTION_CHANGE", { action: "cancel" });
      }
      break;
    }

  }

  return NextResponse.json({ received: true });
}
