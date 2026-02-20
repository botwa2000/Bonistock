import { db } from "./db";
import { Prisma } from "@prisma/client";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "FAILED_LOGIN"
  | "PASSWORD_CHANGE"
  | "PASSWORD_RESET"
  | "2FA_ENABLE"
  | "2FA_DISABLE"
  | "WEBAUTHN_REGISTER"
  | "SUBSCRIPTION_CHANGE"
  | "PASS_PURCHASE"
  | "DATA_EXPORT"
  | "ACCOUNT_DELETE"
  | "SETTINGS_CHANGE"
  | "REGISTER";

export async function logAudit(
  userId: string | null,
  action: AuditAction,
  metadata?: Record<string, unknown>
): Promise<void> {
  await db.auditLog.create({
    data: {
      userId,
      action,
      metadata: metadata as Prisma.InputJsonValue ?? undefined,
    },
  });
}
