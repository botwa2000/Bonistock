import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().positive(),
  riskFilter: z.enum(["LOW", "BALANCED", "HIGH"]),
  allocations: z.array(z.object({
    symbol: z.string(),
    weight: z.number(),
    dollars: z.number(),
    shares: z.number(),
  })),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const mixes = await db.savedMix.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(mixes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const mix = await db.savedMix.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      amount: parsed.data.amount,
      riskFilter: parsed.data.riskFilter,
      allocations: parsed.data.allocations,
    },
  });

  return NextResponse.json(mix, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  await db.savedMix.deleteMany({
    where: { id, userId: session.user.id },
  });

  return NextResponse.json({ deleted: true });
}
