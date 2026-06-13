import { NextRequest, NextResponse } from "next/server";
import { resolveAuth } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const ctx = await resolveAuth(req);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: ctx.userId },
    include: {
      watchlistItems: true,
      alerts: true,
      savedMixes: true,
      portfolios: { include: { holdings: true } },
      subscription: true,
      passPurchases: { include: { activations: true } },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 100 },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found", code: "NOT_FOUND" }, { status: 404 });
  }

  // Strip sensitive fields
  const { passwordHash: _, twoFactorSecret: __, ...safeUser } = user;

  await logAudit(ctx.userId, "DATA_EXPORT");

  return new NextResponse(JSON.stringify(safeUser, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="bonistock-data-export-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}
