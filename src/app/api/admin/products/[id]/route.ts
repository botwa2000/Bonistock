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

  const product = await db.product.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.features !== undefined && { features: data.features }),
      ...(data.active !== undefined && { active: data.active }),
      ...(data.highlighted !== undefined && { highlighted: data.highlighted }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
  });

  return NextResponse.json(product);
});
