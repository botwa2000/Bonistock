import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const updateUserSchema = z.object({
  tier: z.enum(["FREE", "PLUS", "PASS"]).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
});

export const PATCH = adminRoute(async (req: NextRequest, context) => {
  const id = req.nextUrl.pathname.split("/").pop()!;

  const raw = await req.json();
  const parsed = updateUserSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;
  if (!data.tier && !data.role) {
    return NextResponse.json(
      { error: "Nothing to update", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const changes: Record<string, { from: string; to: string }> = {};

  // Update role if changed
  if (data.role && data.role !== existing.role) {
    await db.user.update({ where: { id }, data: { role: data.role } });
    changes.role = { from: existing.role, to: data.role };
  }

  // Update tier via Subscription record if changed
  if (data.tier) {
    const currentSub = await db.subscription.findUnique({ where: { userId: id } });
    const currentTier = currentSub?.tier ?? "FREE";

    if (data.tier !== currentTier) {
      const status = data.tier === "FREE" ? "INACTIVE" : "ACTIVE";

      await db.subscription.upsert({
        where: { userId: id },
        create: {
          userId: id,
          stripeCustomerId: `admin_override_${id}`,
          status,
          tier: data.tier,
        },
        update: {
          status,
          tier: data.tier,
        },
      });
      changes.tier = { from: currentTier, to: data.tier };
    }
  }

  if (Object.keys(changes).length > 0) {
    await logAudit(context.userId, "ADMIN_USER_EDIT", {
      targetUserId: id,
      changes,
    });
  }

  // Fetch updated user with subscription for response
  const updated = await db.user.findUnique({
    where: { id },
    include: { subscription: true },
  });

  return NextResponse.json({
    id: updated!.id,
    email: updated!.email,
    name: updated!.name,
    role: updated!.role,
    region: updated!.region,
    tier: updated!.subscription?.tier ?? "FREE",
    status: updated!.subscription?.status ?? "INACTIVE",
    createdAt: updated!.createdAt.toISOString(),
  });
});
