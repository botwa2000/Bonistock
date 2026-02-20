import { db } from "./db";

export async function getUserTier(userId: string): Promise<"free" | "pass" | "plus"> {
  // Check active subscription
  const subscription = await db.subscription.findUnique({
    where: { userId },
    select: { status: true, tier: true },
  });

  if (subscription?.status === "ACTIVE" && subscription.tier === "PLUS") {
    return "plus";
  }

  // Check active pass
  const activePass = await db.passPurchase.findFirst({
    where: {
      userId,
      activationsUsed: { lt: db.$queryRaw`activations_total` as unknown as number },
    },
    include: {
      activations: {
        orderBy: { activatedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { purchasedAt: "desc" },
  });

  if (activePass) {
    if (activePass.activationsUsed < activePass.activationsTotal) {
      // Has remaining activations
      const lastActivation = activePass.activations[0];
      if (lastActivation && new Date() < lastActivation.expiresAt) {
        // Currently in an active 24h window
        return "pass";
      }
      // Has remaining activations but no active window — still a pass holder
      return "pass";
    }
  }

  return "free";
}

export async function getPassInfo(userId: string): Promise<{
  activationsRemaining: number;
  expiry: string | null;
} | null> {
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

  for (const pass of passes) {
    const remaining = pass.activationsTotal - pass.activationsUsed;
    if (remaining > 0) {
      const lastActivation = pass.activations[0];
      const expiry = lastActivation && new Date() < lastActivation.expiresAt
        ? lastActivation.expiresAt.toISOString()
        : null;
      return { activationsRemaining: remaining, expiry };
    }
  }

  return null;
}
