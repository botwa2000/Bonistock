/**
 * Shared TOTP verification, used by both the web 2FA route
 * (src/app/api/auth/2fa/verify) and the native mobile 2FA step
 * (src/app/api/mobile/auth/2fa). Keeping it in one place prevents the two
 * call sites from diverging.
 */
import { db } from "./db";
import { decrypt } from "./crypto";
import * as OTPAuth from "otpauth";

function buildTotp(secretBase32: string, label: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: "Bonistock",
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

export type TotpResult = "ok" | "not_setup" | "invalid";

/**
 * Validate a 6-digit TOTP code against the user's stored (encrypted) secret.
 * Returns "not_setup" if the user has no secret, "invalid" if the code is wrong,
 * "ok" on success. Uses a ±1 step window to tolerate clock skew.
 */
export async function verifyTotp(userId: string, code: string): Promise<TotpResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, email: true },
  });
  if (!user?.twoFactorSecret) return "not_setup";

  const totp = buildTotp(decrypt(user.twoFactorSecret), user.email);
  const delta = totp.validate({ token: code, window: 1 });
  return delta === null ? "invalid" : "ok";
}
