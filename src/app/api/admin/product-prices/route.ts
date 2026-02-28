import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

const upsertSchema = z.object({
  productId: z.string(),
  currencyId: z.string().min(3).max(3),
  amount: z.number().int().positive(),
  iosAmount: z.number().int().positive().nullable().optional(),
  usualAmount: z.number().int().positive().nullable().optional(),
});

const deleteSchema = z.object({
  productId: z.string(),
  currencyId: z.string(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  return user?.role === "ADMIN" ? session.user.id : null;
}

export async function GET(req: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const productId = req.nextUrl.searchParams.get("productId");

  const prices = await db.productPrice.findMany({
    where: productId ? { productId } : undefined,
    include: { currency: true },
    orderBy: [{ productId: "asc" }, { currencyId: "asc" }],
  });

  return NextResponse.json(prices);
}

export async function POST(req: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = upsertSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 }
    );
  }

  // Verify product and currency exist
  const [product, currency] = await Promise.all([
    db.product.findUnique({ where: { id: parsed.data.productId } }),
    db.currency.findUnique({ where: { id: parsed.data.currencyId } }),
  ]);
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  if (!currency) {
    return NextResponse.json({ error: "Currency not found" }, { status: 404 });
  }

  // Check if there's an existing ProductPrice (to get old stripePriceId)
  const existing = await db.productPrice.findUnique({
    where: {
      productId_currencyId: {
        productId: parsed.data.productId,
        currencyId: parsed.data.currencyId,
      },
    },
  });

  // Create a new Stripe Price for this currency
  let stripePriceId = existing?.stripePriceId ?? null;
  const amountChanged = !existing || existing.amount !== parsed.data.amount;

  if (amountChanged) {
    try {
      const priceParams: Stripe.PriceCreateParams = {
        product: product.stripeProductId,
        unit_amount: parsed.data.amount,
        currency: parsed.data.currencyId.toLowerCase(),
      };

      if (product.type === "SUBSCRIPTION" && product.billingInterval) {
        priceParams.recurring = {
          interval: product.billingInterval === "MONTH" ? "month" : "year",
        };
      }

      const newStripePrice = await stripe.prices.create(priceParams);

      // Archive old Stripe Price if it exists
      if (stripePriceId) {
        try {
          await stripe.prices.update(stripePriceId, { active: false });
        } catch {
          // Best-effort archive
        }
      }

      stripePriceId = newStripePrice.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json(
        { error: "Failed to create Stripe Price", details: message },
        { status: 500 }
      );
    }
  }

  const price = await db.productPrice.upsert({
    where: {
      productId_currencyId: {
        productId: parsed.data.productId,
        currencyId: parsed.data.currencyId,
      },
    },
    update: {
      amount: parsed.data.amount,
      iosAmount: parsed.data.iosAmount ?? null,
      usualAmount: parsed.data.usualAmount ?? null,
      stripePriceId,
    },
    create: {
      productId: parsed.data.productId,
      currencyId: parsed.data.currencyId,
      amount: parsed.data.amount,
      iosAmount: parsed.data.iosAmount ?? null,
      usualAmount: parsed.data.usualAmount ?? null,
      stripePriceId,
    },
    include: { currency: true },
  });

  // Sync base price: when saving USD entry, keep product.priceAmount in sync
  if (
    parsed.data.currencyId.toUpperCase() === "USD" &&
    parsed.data.amount !== product.priceAmount
  ) {
    await db.product.update({
      where: { id: parsed.data.productId },
      data: {
        priceAmount: parsed.data.amount,
        ...(parsed.data.usualAmount !== undefined
          ? { usualPrice: parsed.data.usualAmount ?? null }
          : {}),
      },
    });
  }

  return NextResponse.json(price, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = deleteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Get the existing record to archive its Stripe Price
  const existing = await db.productPrice.findUnique({
    where: {
      productId_currencyId: {
        productId: parsed.data.productId,
        currencyId: parsed.data.currencyId,
      },
    },
  });

  if (existing?.stripePriceId) {
    try {
      await stripe.prices.update(existing.stripePriceId, { active: false });
    } catch {
      // Best-effort archive
    }
  }

  await db.productPrice.delete({
    where: {
      productId_currencyId: {
        productId: parsed.data.productId,
        currencyId: parsed.data.currencyId,
      },
    },
  });

  return NextResponse.json({ ok: true });
}
