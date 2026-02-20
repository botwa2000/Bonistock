import { NextRequest, NextResponse } from "next/server";
import { getEtf } from "@/lib/data";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const etf = await getEtf(symbol.toUpperCase());
  if (!etf) {
    return NextResponse.json({ error: "ETF not found", code: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json(etf);
}
