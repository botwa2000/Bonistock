import { db } from "./db";
import type { User } from "@prisma/client";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function isLockedOut(user: Pick<User, "lockedUntil">): boolean {
  if (!user.lockedUntil) return false;
  return new Date() < user.lockedUntil;
}

export async function recordFailedLogin(userId: string): Promise<{ locked: boolean }> {
  const user = await db.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: { increment: 1 } },
    select: { failedLoginAttempts: true },
  });

  if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
    await db.user.update({
      where: { id: userId },
      data: { lockedUntil: new Date(Date.now() + LOCKOUT_DURATION_MS) },
    });
    return { locked: true };
  }

  return { locked: false };
}

export async function resetFailedLogins(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });
}
