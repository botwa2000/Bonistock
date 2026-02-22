import { db } from "./db";

export async function getUserTier(userId: string): Promise<"free" | "pass" | "plus"> {
  // Check active subscription
  const subscription = await db.subscription.findUnique({
    where: { userId },
    select: { status: true, tier: true },
  });

  if ((subscription?.status === "ACTIVE" || subscription?.status === "TRIALING") && subscription.tier === "PLUS") {
    return "plus";
  }

  // Check active pass — fetch recent passes and filter in JS
  // (Prisma doesn't support column-to-column comparison in where clauses)
  const recentPass = await db.passPurchase.findFirst({
    where: { userId },
    include: {
      activations: {
        orderBy: { activatedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { purchasedAt: "desc" },
  });

  if (recentPass && recentPass.activationsUsed < recentPass.activationsTotal) {
    const lastActivation = recentPass.activations[0];
    if (lastActivation && new Date() < lastActivation.expiresAt) {
      return "pass";
    }
    // Has remaining activations but no active window — still a pass holder
    return "pass";
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
