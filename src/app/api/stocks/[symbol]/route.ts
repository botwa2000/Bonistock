import { NextRequest, NextResponse } from "next/server";
import { getStock } from "@/lib/data";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const stock = await getStock(symbol.toUpperCase());
  if (!stock) {
    return NextResponse.json({ error: "Stock not found", code: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json(stock);
}
