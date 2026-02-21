import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
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

  return NextResponse.json(products);
}
