import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Find the most recent pass with remaining activations
  const passes = await db.passPurchase.findMany({
    where: { userId },
    include: {
      activations: {
        orderBy: { activatedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { purchasedAt: "desc" },
  });

  const pass = passes.find(
    (p) => p.activationsUsed < p.activationsTotal
  );

  if (!pass) {
    return NextResponse.json(
      { error: "No pass with remaining activations" },
      { status: 400 }
    );
  }

  // Check if there's already an active (unexpired) activation
  const lastActivation = pass.activations[0];
  if (lastActivation && new Date() < lastActivation.expiresAt) {
    return NextResponse.json(
      { error: "An activation is already active", expiresAt: lastActivation.expiresAt.toISOString() },
      { status: 400 }
    );
  }

  // Create activation with 24h expiry in a transaction
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [activation] = await db.$transaction([
    db.passActivation.create({
      data: {
        passPurchaseId: pass.id,
        activatedAt: now,
        expiresAt,
      },
    }),
    db.passPurchase.update({
      where: { id: pass.id },
      data: { activationsUsed: { increment: 1 } },
    }),
  ]);

  return NextResponse.json({
    activatedAt: activation.activatedAt.toISOString(),
    expiresAt: activation.expiresAt.toISOString(),
    activationsRemaining: pass.activationsTotal - pass.activationsUsed - 1,
  });
}
