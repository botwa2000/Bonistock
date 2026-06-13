import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { resolveAuth } from "@/lib/api-utils";
import { db } from "@/lib/db";

const createSchema = z.object({
  symbol: z.string().min(1).max(10),
  type: z.enum(["PRICE_TARGET", "RATING_CHANGE", "TREND_WARNING"]),
  condition: z.object({}).passthrough(),
  message: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const ctx = await resolveAuth(req);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const alerts = await db.alert.findMany({
    where: { userId: ctx.userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(alerts);
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

  const alert = await db.alert.create({
    data: {
      userId: ctx.userId,
      symbol: parsed.data.symbol,
      type: parsed.data.type,
      condition: parsed.data.condition as Prisma.InputJsonValue,
      message: parsed.data.message,
    },
  });

  return NextResponse.json(alert, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const ctx = await resolveAuth(req);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  await db.alert.deleteMany({
    where: { id, userId: ctx.userId },
  });

  return NextResponse.json({ deleted: true });
}
