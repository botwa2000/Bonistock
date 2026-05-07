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

  const pass = passes.find((p) => p.activationsUsed < p.activationsTotal);

  if (!pass) {
    return NextResponse.json(
      { error: "No pass with remaining activations" },
      { status: 400 }
    );
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  try {
    const activation = await db.$transaction(async (tx) => {
      // Atomic guard: only succeeds if activationsUsed < activationsTotal at update time,
      // preventing double-activation from concurrent requests
      const updated = await tx.passPurchase.updateMany({
        where: { id: pass.id, activationsUsed: { lt: pass.activationsTotal } },
        data: { activationsUsed: { increment: 1 } },
      });
      if (updated.count === 0) {
        throw Object.assign(new Error("No pass with remaining activations"), { code: "NO_PASS" });
      }

      // Re-check for an active window inside the transaction
      const current = await tx.passActivation.findFirst({
        where: { passPurchaseId: pass.id },
        orderBy: { activatedAt: "desc" },
      });
      if (current && now < current.expiresAt) {
        throw Object.assign(
          new Error("An activation is already active"),
          { code: "ALREADY_ACTIVE", expiresAt: current.expiresAt.toISOString() }
        );
      }

      return tx.passActivation.create({
        data: { passPurchaseId: pass.id, activatedAt: now, expiresAt },
      });
    });

    return NextResponse.json({
      activatedAt: activation.activatedAt.toISOString(),
      expiresAt: activation.expiresAt.toISOString(),
      activationsRemaining: pass.activationsTotal - pass.activationsUsed - 1,
    });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === "ALREADY_ACTIVE") {
      return NextResponse.json(
        { error: (err as Error).message, expiresAt: (err as { expiresAt?: string }).expiresAt },
        { status: 400 }
      );
    }
    if (code === "NO_PASS") {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }
    throw err;
  }
}
