import { NextRequest, NextResponse } from "next/server";
import { getDemoPortfolioWithSnapshots } from "@/lib/data";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const portfolio = await getDemoPortfolioWithSnapshots(id);
  if (!portfolio) {
    return NextResponse.json({ error: "Portfolio not found", code: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json(portfolio);
}
