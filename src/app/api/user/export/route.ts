import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
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

  await logAudit(session.user.id, "DATA_EXPORT");

  return new NextResponse(JSON.stringify(safeUser, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="bonistock-data-export-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}
