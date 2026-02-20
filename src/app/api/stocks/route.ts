import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStocks } from "@/lib/data";

const filtersSchema = z.object({
  region: z.string().optional(),
  sector: z.string().optional(),
  risk: z.enum(["LOW", "BALANCED", "HIGH"]).optional(),
  minUpside: z.coerce.number().optional(),
  minAnalysts: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  broker: z.string().optional(),
  marketCap: z.string().optional(),
  dividendOnly: z.coerce.boolean().optional(),
}).strict();

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = filtersSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid filters", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const stocks = await getStocks(parsed.data);
  return NextResponse.json(stocks);
}
