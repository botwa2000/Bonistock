import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getStocks, getWeeklyFreeSymbols } from "@/lib/data";
import { mapStockToFrontend } from "@/lib/api-mappers";
import { log } from "@/lib/logger";

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
  const start = Date.now();
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  log.debug("stocks", "GET /api/stocks", params);

  const parsed = filtersSchema.safeParse(params);
  if (!parsed.success) {
    log.warn("stocks", "Invalid filters", parsed.error.issues);
    return NextResponse.json(
      { error: "Invalid filters", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const [stocks, freeSymbols] = await Promise.all([
    getStocks(parsed.data),
    getWeeklyFreeSymbols(),
  ]);
  log.info("stocks", `Returning ${stocks.length} stocks (${Date.now() - start}ms)`);
  return NextResponse.json({
    stocks: stocks.map(mapStockToFrontend),
    freeSymbols,
  });
}
