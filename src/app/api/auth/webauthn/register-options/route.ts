import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Authenticator } from "@prisma/client";

const rpName = "Bonistock";
const rpID = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://localhost").hostname;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, authenticators: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found", code: "NOT_FOUND" }, { status: 404 });
  }

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: user.id,
    userName: user.email,
    userDisplayName: user.name ?? user.email,
    attestationType: "none",
    excludeCredentials: user.authenticators.map((auth: Authenticator) => ({
      id: auth.credentialID,
      type: "public-key" as const,
      transports: auth.transports
        ? (auth.transports.split(",") as AuthenticatorTransport[])
        : undefined,
    })) as any,
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  // Store challenge in session (we use a simple approach via cookie-less DB store)
  // For simplicity, store in verification_tokens table
  await db.verificationToken.create({
    data: {
      identifier: user.id,
      token: options.challenge,
      expires: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      type: "EMAIL_VERIFICATION", // Reuse type; it's just a temp challenge
    },
  });

  return NextResponse.json(options);
}

type AuthenticatorTransport = "ble" | "hybrid" | "internal" | "nfc" | "usb";
