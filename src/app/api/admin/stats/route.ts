import { NextResponse } from "next/server";
import { adminRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";

export const GET = adminRoute(async () => {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersThisWeek,
    newUsersThisMonth,
    activeSubscriptions,
    totalPassPurchases,
    stockCount,
    etfCount,
    lastStock,
    recentActivity,
    usersByRegion,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: oneWeekAgo } } }),
    db.user.count({ where: { createdAt: { gte: oneMonthAgo } } }),
    db.subscription.count({ where: { status: "ACTIVE" } }),
    db.passPurchase.count(),
    db.stock.count(),
    db.etf.count(),
    db.stock.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    db.auditLog.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true, name: true } } },
    }),
    db.user.groupBy({ by: ["region"], _count: { region: true } }),
  ]);

  // Get users by tier via subscription table
  const usersByTier = await db.subscription.groupBy({
    by: ["tier"],
    _count: { tier: true },
  });

  // DB health check
  let dbConnected = true;
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    dbConnected = false;
  }

  return NextResponse.json({
    users: {
      total: totalUsers,
      newThisWeek: newUsersThisWeek,
      newThisMonth: newUsersThisMonth,
      byTier: usersByTier.map((t) => ({ tier: t.tier, count: t._count.tier })),
      byRegion: usersByRegion.map((r) => ({ region: r.region, count: r._count.region })),
    },
    transactions: {
      activeSubscriptions,
      totalPassPurchases,
    },
    stocks: {
      count: stockCount,
      etfCount,
      lastRefresh: lastStock?.updatedAt ?? null,
    },
    health: {
      dbConnected,
      uptime: process.uptime(),
    },
    recentActivity: recentActivity.map((entry) => ({
      id: entry.id,
      action: entry.action,
      metadata: entry.metadata,
      createdAt: entry.createdAt,
      userEmail: entry.user?.email ?? null,
      userName: entry.user?.name ?? null,
    })),
  });
});
