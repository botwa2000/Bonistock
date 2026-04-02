import { NextRequest, NextResponse } from "next/server";
import { authenticatedRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";

export const DELETE = authenticatedRoute(async (_req: NextRequest, { userId }) => {
  const promoter = await db.promoter.findUnique({ where: { userId } });
  if (!promoter) {
    return NextResponse.json({ error: "Not a promoter" }, { status: 404 });
  }

  // Block exit if commission history exists — admin must settle/close the account
  const commissionCount = await db.promoterCommission.count({
    where: { promoterId: promoter.id },
  });

  if (commissionCount > 0) {
    return NextResponse.json(
      {
        error: "COMMISSION_HISTORY",
        message:
          "Your account has commission history. Please contact support to close your promoter account and settle any outstanding earnings.",
      },
      { status: 409 }
    );
  }

  // Deactivate all vouchers before deleting (promoterId becomes null via SetNull)
  await db.voucher.updateMany({
    where: { promoterId: promoter.id, active: true },
    data: { active: false },
  });

  await db.promoter.delete({ where: { userId } });

  return NextResponse.json({ success: true });
});
