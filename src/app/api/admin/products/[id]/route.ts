import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { adminRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

const updateProductSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  features: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  highlighted: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  priceAmount: z.number().int().positive().optional(),
  trialDays: z.number().int().min(0).nullable().optional(),
});

export const PATCH = adminRoute(async (req: NextRequest) => {
  const id = req.nextUrl.pathname.split("/").pop()!;

  const raw = await req.json();
  const parsed = updateProductSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Sync changes to Stripe product
  const stripeUpdate: Stripe.ProductUpdateParams = {};
  if (data.name !== undefined) stripeUpdate.name = data.name;
  if (data.description !== undefined) stripeUpdate.description = data.description;
  if (data.active !== undefined) stripeUpdate.active = data.active;

  if (Object.keys(stripeUpdate).length > 0) {
    await stripe.products.update(existing.stripeProductId, stripeUpdate);
  }

  // If price changed, create a new Stripe price and archive the old one
  let newStripePriceId = existing.stripePriceId;
  if (data.priceAmount !== undefined && data.priceAmount !== existing.priceAmount) {
    const priceParams: Stripe.PriceCreateParams = {
      product: existing.stripeProductId,
      unit_amount: data.priceAmount,
      currency: existing.currency,
    };

    if (existing.type === "SUBSCRIPTION" && existing.billingInterval) {
      priceParams.recurring = {
        interval: existing.billingInterval === "MONTH" ? "month" : "year",
      };
    }

    const newPrice = await stripe.prices.create(priceParams);
    // Archive old price
    await stripe.prices.update(existing.stripePriceId, { active: false });
    newStripePriceId = newPrice.id;
  }

  const product = await db.product.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.features !== undefined && { features: data.features }),
      ...(data.active !== undefined && { active: data.active }),
      ...(data.highlighted !== undefined && { highlighted: data.highlighted }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.priceAmount !== undefined && { priceAmount: data.priceAmount }),
      ...(data.trialDays !== undefined && { trialDays: data.trialDays }),
      ...(newStripePriceId !== existing.stripePriceId && { stripePriceId: newStripePriceId }),
    },
  });

  return NextResponse.json(product);
});
