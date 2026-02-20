import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, twoFactorEnabled: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found", code: "NOT_FOUND" }, { status: 404 });
  }
  if (user.twoFactorEnabled) {
    return NextResponse.json({ error: "2FA is already enabled", code: "ALREADY_ENABLED" }, { status: 400 });
  }

  const totp = new OTPAuth.TOTP({
    issuer: "Bonistock",
    label: user.email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 }),
  });

  // Store encrypted secret temporarily (not enabled yet until verified)
  const encryptedSecret = encrypt(totp.secret.base32);
  await db.user.update({
    where: { id: session.user.id },
    data: { twoFactorSecret: encryptedSecret },
  });

  const otpauthUrl = totp.toString();
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  return NextResponse.json({
    qrCode: qrCodeDataUrl,
    secret: totp.secret.base32, // Show to user for manual entry
    otpauthUrl,
  });
}
