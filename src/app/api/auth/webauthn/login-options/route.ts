import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { z } from "zod";
import { db } from "@/lib/db";
import type { Authenticator } from "@prisma/client";

const rpID = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://localhost").hostname;

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email, deletedAt: null },
    select: { id: true, authenticators: true },
  });

  if (!user || user.authenticators.length === 0) {
    return NextResponse.json({ error: "No passkeys registered", code: "NO_PASSKEYS" }, { status: 400 });
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: user.authenticators.map((auth: Authenticator) => ({
      id: auth.credentialID,
      type: "public-key" as const,
      transports: auth.transports
        ? (auth.transports.split(",") as AuthenticatorTransport[])
        : undefined,
    })) as any,
    userVerification: "preferred",
  });

  // Store challenge
  await db.verificationToken.create({
    data: {
      identifier: user.id,
      token: options.challenge,
      expires: new Date(Date.now() + 5 * 60 * 1000),
      type: "EMAIL_VERIFICATION",
    },
  });

  return NextResponse.json({ ...options, userId: user.id });
}

type AuthenticatorTransport = "ble" | "hybrid" | "internal" | "nfc" | "usb";
