import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const createSchema = z.object({
  id: z.string().min(3).max(3).toUpperCase(),
  name: z.string().min(1).max(100),
  symbol: z.string().min(1).max(10),
  active: z.boolean().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  symbol: z.string().min(1).max(10).optional(),
  active: z.boolean().optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  return user?.role === "ADMIN" ? session.user.id : null;
}

export async function GET() {
  const adminId = await requireAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currencies = await db.currency.findMany({
    orderBy: { id: "asc" },
    include: {
      regionCurrencies: true,
      _count: { select: { productPrices: true } },
    },
  });

  return NextResponse.json(currencies);
}

export async function POST(req: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const existing = await db.currency.findUnique({ where: { id: parsed.data.id } });
  if (existing) {
    return NextResponse.json({ error: "Currency already exists" }, { status: 409 });
  }

  const currency = await db.currency.create({
    data: {
      id: parsed.data.id,
      name: parsed.data.name,
      symbol: parsed.data.symbol,
      active: parsed.data.active ?? true,
    },
  });

  return NextResponse.json(currency, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Currency id required" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(updates);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const currency = await db.currency.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(currency);
}
