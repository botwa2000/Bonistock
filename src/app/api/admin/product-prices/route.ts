import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const upsertSchema = z.object({
  productId: z.string(),
  currencyId: z.string().min(3).max(3),
  amount: z.number().int().positive(),
  iosAmount: z.number().int().positive().nullable().optional(),
});

const deleteSchema = z.object({
  productId: z.string(),
  currencyId: z.string(),
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

export async function GET(req: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const productId = req.nextUrl.searchParams.get("productId");

  const prices = await db.productPrice.findMany({
    where: productId ? { productId } : undefined,
    include: { currency: true },
    orderBy: [{ productId: "asc" }, { currencyId: "asc" }],
  });

  return NextResponse.json(prices);
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

  // Verify product and currency exist
  const [product, currency] = await Promise.all([
    db.product.findUnique({ where: { id: parsed.data.productId } }),
    db.currency.findUnique({ where: { id: parsed.data.currencyId } }),
  ]);
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  if (!currency) {
    return NextResponse.json({ error: "Currency not found" }, { status: 404 });
  }

  const price = await db.productPrice.upsert({
    where: {
      productId_currencyId: {
        productId: parsed.data.productId,
        currencyId: parsed.data.currencyId,
      },
    },
    update: {
      amount: parsed.data.amount,
      iosAmount: parsed.data.iosAmount ?? null,
    },
    create: {
      productId: parsed.data.productId,
      currencyId: parsed.data.currencyId,
      amount: parsed.data.amount,
      iosAmount: parsed.data.iosAmount ?? null,
    },
    include: { currency: true },
  });

  return NextResponse.json(price, { status: 201 });
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

  await db.productPrice.delete({
    where: {
      productId_currencyId: {
        productId: parsed.data.productId,
        currencyId: parsed.data.currencyId,
      },
    },
  });

  return NextResponse.json({ ok: true });
}
