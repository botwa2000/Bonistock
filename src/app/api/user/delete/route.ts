import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  // Soft delete: anonymize PII, mark as deleted
  await db.user.update({
    where: { id: session.user.id },
    data: {
      email: `deleted-${session.user.id}@deleted.bonistock.com`,
      name: "Deleted User",
      passwordHash: null,
      twoFactorSecret: null,
      twoFactorEnabled: false,
      image: null,
      deletedAt: new Date(),
    },
  });

  // Delete active sessions
  await db.session.deleteMany({ where: { userId: session.user.id } });

  // Delete user data
  await db.watchlistItem.deleteMany({ where: { userId: session.user.id } });
  await db.alert.deleteMany({ where: { userId: session.user.id } });
  await db.savedMix.deleteMany({ where: { userId: session.user.id } });
  await db.userPortfolio.deleteMany({ where: { userId: session.user.id } });

  await logAudit(session.user.id, "ACCOUNT_DELETE");

  return NextResponse.json({ deleted: true });
}
