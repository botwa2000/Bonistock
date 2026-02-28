import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const upsertSchema = z.object({
  region: z.enum(["GLOBAL", "DE"]),
  currencyId: z.string().min(3).max(3),
});

const deleteSchema = z.object({
  id: z.string(),
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

  const regionCurrencies = await db.regionCurrency.findMany({
    include: { currency: true },
    orderBy: [{ region: "asc" }, { isDefault: "desc" }],
  });

  return NextResponse.json(regionCurrencies);
}

export async function POST(req: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = upsertSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 }
    );
  }

  // Verify currency exists
  const currency = await db.currency.findUnique({ where: { id: parsed.data.currencyId } });
  if (!currency) {
    return NextResponse.json({ error: "Currency not found" }, { status: 404 });
  }

  const rc = await db.regionCurrency.upsert({
    where: {
      region_currencyId: {
        region: parsed.data.region,
        currencyId: parsed.data.currencyId,
      },
    },
    update: { isDefault: true },
    create: {
      region: parsed.data.region,
      currencyId: parsed.data.currencyId,
      isDefault: true,
    },
    include: { currency: true },
  });

  return NextResponse.json(rc, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = deleteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await db.regionCurrency.delete({ where: { id: parsed.data.id } });

  return NextResponse.json({ ok: true });
}
