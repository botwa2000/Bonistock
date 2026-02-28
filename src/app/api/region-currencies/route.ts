import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const regionCurrencies = await db.regionCurrency.findMany({
      where: { isDefault: true },
      include: {
        currency: {
          select: { id: true, name: true, symbol: true },
        },
      },
      orderBy: { region: "asc" },
    });

    return NextResponse.json(regionCurrencies);
  } catch {
    return NextResponse.json([]);
  }
}
