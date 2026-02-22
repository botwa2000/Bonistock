import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { renderTemplate } from "@/lib/email-renderer";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  // Capture original email/name BEFORE anonymization
  const originalUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true },
  });

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

  // Send deletion confirmation to original email
  if (originalUser?.email) {
    try {
      const { subject, html } = await renderTemplate("accountDeletion", {
        userName: originalUser.name ?? "there",
      });
      await sendEmail(originalUser.email, subject, html);
    } catch {
      // Non-critical — don't block deletion
    }
  }

  return NextResponse.json({ deleted: true });
}
