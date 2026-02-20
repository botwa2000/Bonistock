import { NextResponse } from "next/server";
import { getDemoPortfolios } from "@/lib/data";

export async function GET() {
  const portfolios = await getDemoPortfolios();
  return NextResponse.json(portfolios);
}
