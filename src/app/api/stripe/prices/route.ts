import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";

export async function GET() {
  log.debug("stripe/prices", "Fetching active products");

  const products = await db.product.findMany({
    where: { active: true },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      features: true,
      type: true,
      priceAmount: true,
      currency: true,
      billingInterval: true,
      passType: true,
      passDays: true,
      trialDays: true,
      stripePriceId: true,
      highlighted: true,
      sortOrder: true,
    },
  });

  log.info("stripe/prices", `Returning ${products.length} active products`);
  return NextResponse.json(products);
}
