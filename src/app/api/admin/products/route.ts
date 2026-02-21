import { NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { adminRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

const createProductSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  type: z.enum(["SUBSCRIPTION", "PASS"]),
  priceAmount: z.number().int().positive(),
  currency: z.string().length(3).default("usd"),
  billingInterval: z.enum(["MONTH", "YEAR"]).optional(),
  passType: z.enum(["ONE_DAY", "THREE_DAY", "TWELVE_DAY"]).optional(),
  passDays: z.number().int().positive().optional(),
  trialDays: z.number().int().positive().optional(),
  features: z.array(z.string()).optional(),
  highlighted: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const GET = adminRoute(async () => {
  const products = await db.product.findMany({
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
  });
  return NextResponse.json(products);
});

export const POST = adminRoute(async (req) => {
  const raw = await req.json();
  const parsed = createProductSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Validate type-specific fields
  if (data.type === "SUBSCRIPTION" && !data.billingInterval) {
    return NextResponse.json(
      { error: "billingInterval is required for subscriptions" },
      { status: 400 }
    );
  }
  if (data.type === "PASS" && (!data.passType || !data.passDays)) {
    return NextResponse.json(
      { error: "passType and passDays are required for passes" },
      { status: 400 }
    );
  }

  let stripeProduct;
  try {
    // Create Stripe product
    stripeProduct = await stripe.products.create({
      name: data.name,
      description: data.description,
    });

    // Create Stripe price
    const priceParams: Stripe.PriceCreateParams = {
      product: stripeProduct.id,
      unit_amount: data.priceAmount,
      currency: data.currency,
    };

    if (data.type === "SUBSCRIPTION" && data.billingInterval) {
      priceParams.recurring = {
        interval: data.billingInterval === "MONTH" ? "month" : "year",
      };
    }

    const stripePrice = await stripe.prices.create(priceParams);

    // Insert into DB
    const product = await db.product.create({
      data: {
        name: data.name,
        description: data.description,
        features: data.features ?? [],
        type: data.type,
        priceAmount: data.priceAmount,
        currency: data.currency,
        billingInterval: data.type === "SUBSCRIPTION" ? data.billingInterval : null,
        passType: data.type === "PASS" ? data.passType : null,
        passDays: data.type === "PASS" ? data.passDays : null,
        trialDays: data.type === "SUBSCRIPTION" ? data.trialDays : null,
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
        highlighted: data.highlighted,
        sortOrder: data.sortOrder,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    // Roll back Stripe product if it was created
    if (stripeProduct?.id) {
      try {
        await stripe.products.update(stripeProduct.id, { active: false });
      } catch {
        // Best-effort cleanup
      }
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create product", details: message },
      { status: 500 }
    );
  }
});
