import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminRoute } from "@/lib/api-utils";
import { db } from "@/lib/db";

const BulkActionSchema = z.object({
  ids: z.array(z.string()).min(1).max(500),
  action: z.enum(["delete", "activate", "deactivate"]),
});

export const POST = adminRoute(async (req: NextRequest) => {
  const raw = await req.json().catch(() => ({}));
  const parsed = BulkActionSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const { ids, action } = parsed.data;

  if (action === "delete") {
    await db.$transaction([
      db.voucherRedemption.deleteMany({ where: { voucherId: { in: ids } } }),
      db.voucher.deleteMany({ where: { id: { in: ids } } }),
    ]);
    return NextResponse.json({ success: true, deleted: ids.length });
  }

  await db.voucher.updateMany({
    where: { id: { in: ids } },
    data: { active: action === "activate" },
  });

  return NextResponse.json({ success: true, updated: ids.length });
});
