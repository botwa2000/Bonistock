import { NextResponse } from "next/server";
import { adminRoute } from "@/lib/api-utils";
import { discoverAndPopulateStocks } from "@/lib/stock-discovery";

export const POST = adminRoute(async () => {
  const result = await discoverAndPopulateStocks();
  return NextResponse.json(result);
});
