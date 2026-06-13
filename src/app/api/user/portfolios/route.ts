import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveAuth } from "@/lib/api-utils";
import { db } from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET(req: NextRequest) {
  const ctx = await resolveAuth(req);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const portfolios = await db.userPortfolio.findMany({
    where: { userId: ctx.userId },
    include: { holdings: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(portfolios);
}

export async function POST(req: NextRequest) {
  const ctx = await resolveAuth(req);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const portfolio = await db.userPortfolio.create({
    data: {
      userId: ctx.userId,
      name: parsed.data.name,
    },
    include: { holdings: true },
  });

  return NextResponse.json(portfolio, { status: 201 });
}
