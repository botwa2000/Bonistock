import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getEtfs } from "@/lib/data";

const filtersSchema = z.object({
  region: z.string().optional(),
  theme: z.string().optional(),
  maxFee: z.coerce.number().optional(),
  minSharpe: z.coerce.number().optional(),
  broker: z.string().optional(),
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

  const etfs = await getEtfs(parsed.data);
  return NextResponse.json(etfs);
}
