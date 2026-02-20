import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { WatchlistItem } from "@prisma/client";

const addSchema = z.object({
  symbol: z.string().min(1).max(10),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const items = await db.watchlistItem.findMany({
    where: { userId: session.user.id },
    orderBy: { addedAt: "desc" },
  });

  // Enrich with stock data
  const enriched = await Promise.all(
    items.map(async (item: WatchlistItem) => {
      const stock = await db.stock.findUnique({
        where: { symbol: item.symbol },
        select: { name: true, price: true, upside: true },
      });
      return { ...item, ...stock };
    })
  );

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = addSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const item = await db.watchlistItem.upsert({
    where: { userId_symbol: { userId: session.user.id, symbol: parsed.data.symbol } },
    update: {},
    create: { userId: session.user.id, symbol: parsed.data.symbol },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  await db.watchlistItem.deleteMany({
    where: { userId: session.user.id, symbol },
  });

  return NextResponse.json({ deleted: true });
}
