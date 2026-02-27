import { NextResponse } from "next/server";
import { adminRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";

const GRACE_PERIOD_DAYS = 30;

/**
 * POST /api/admin/cleanup
 * Hard-deletes user records that were soft-deleted more than 30 days ago.
 * Can be called manually from admin dashboard or via cron.
 */
export const POST = adminRoute(async () => {
  const cutoff = new Date(Date.now() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  const staleUsers = await db.user.findMany({
    where: {
      deletedAt: { not: null, lt: cutoff },
    },
    select: { id: true, deletedAt: true },
  });

  if (staleUsers.length === 0) {
    return NextResponse.json({ purged: 0, message: "No stale accounts to purge" });
  }

  const ids = staleUsers.map((u) => u.id);

  // Hard-delete audit logs referencing these users (set userId null first, then delete orphans)
  await db.auditLog.deleteMany({ where: { userId: { in: ids } } });

  // Hard-delete the user records (cascades Account, Session, Authenticator, Subscription, PassPurchase, PushToken)
  const result = await db.user.deleteMany({ where: { id: { in: ids } } });

  log.info("admin:cleanup", `Purged ${result.count} soft-deleted user(s) past ${GRACE_PERIOD_DAYS}-day grace period`);

  return NextResponse.json({
    purged: result.count,
    message: `Purged ${result.count} account(s) deleted before ${cutoff.toISOString().split("T")[0]}`,
  });
});
