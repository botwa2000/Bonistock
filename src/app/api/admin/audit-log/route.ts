import { NextRequest, NextResponse } from "next/server";
import { adminRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";

const PAGE_SIZE = 50;

export const GET = adminRoute(async (req: NextRequest) => {
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1"));
  const skip = (page - 1) * PAGE_SIZE;

  const [entries, total] = await Promise.all([
    db.auditLog.findMany({
      take: PAGE_SIZE,
      skip,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true, name: true } } },
    }),
    db.auditLog.count(),
  ]);

  return NextResponse.json({
    entries: entries.map((entry) => ({
      id: entry.id,
      action: entry.action,
      metadata: entry.metadata,
      createdAt: entry.createdAt,
      userEmail: entry.user?.email ?? null,
      userName: entry.user?.name ?? null,
    })),
    total,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
  });
});
