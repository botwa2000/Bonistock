import { NextRequest, NextResponse } from "next/server";
import { getBrokers } from "@/lib/data";

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get("region") ?? undefined;
  const brokers = await getBrokers(region);
  return NextResponse.json(brokers);
}
