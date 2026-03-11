import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserTier, getPassInfo, hasActivePassWindow } from "@/lib/tier";
import { logAudit } from "@/lib/audit";
import { log } from "@/lib/logger";

const updateSchema = z.object({
  region: z.string().optional(),
  language: z.enum(["EN", "DE", "FR", "ES", "IT"]).optional(),
  theme: z.enum(["DARK", "LIGHT"]).optional(),
  goal: z.enum(["GROWTH", "INCOME", "BALANCED"]).optional(),
  name: z.string().min(1).max(100).optional(),
  emailAlerts: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  cookieConsent: z.object({
    analytics: z.boolean(),
    marketing: z.boolean(),
  }).optional(),
}).strict();

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      region: true,
      language: true,
      theme: true,
      goal: true,
      twoFactorEnabled: true,
      emailVerified: true,
      passwordHash: true,
      emailAlerts: true,
      weeklyDigest: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found", code: "NOT_FOUND" }, { status: 404 });
  }

  const [tier, passInfo, passWindowActive] = await Promise.all([
    getUserTier(user.id),
    getPassInfo(user.id),
    hasActivePassWindow(user.id),
  ]);

  const { passwordHash, ...safeUser } = user;

  log.debug("user/settings", `GET user=${user.id} tier=${tier} pass=${passInfo?.activationsRemaining ?? 0}`);

  return NextResponse.json({
    ...safeUser,
    emailVerified: !!user.emailVerified,
    hasPassword: !!passwordHash,
    tier,
    passActivationsRemaining: passInfo?.activationsRemaining ?? 0,
    passExpiry: passInfo?.expiry ?? null,
    passWindowActive,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", code: "VALIDATION_ERROR", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data: parsed.data as Parameters<typeof db.user.update>[0]["data"],
    select: { id: true, region: true, language: true, theme: true, goal: true, name: true },
  });

  await logAudit(session.user.id, "SETTINGS_CHANGE", { changes: parsed.data });

  return NextResponse.json(user);
}
