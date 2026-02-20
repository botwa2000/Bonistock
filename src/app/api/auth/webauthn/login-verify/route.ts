import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const rpID = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://localhost").hostname;
const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://localhost";

const schema = z.object({
  userId: z.string().min(1),
  response: z.object({}).passthrough(), // WebAuthn response object
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { userId } = parsed.data;

  const challengeRecord = await db.verificationToken.findFirst({
    where: { identifier: userId },
    orderBy: { expires: "desc" },
  });

  if (!challengeRecord || challengeRecord.expires < new Date()) {
    return NextResponse.json({ error: "Challenge expired", code: "CHALLENGE_EXPIRED" }, { status: 400 });
  }

  const authenticator = await db.authenticator.findUnique({
    where: { credentialID: body.id },
  });

  if (!authenticator || authenticator.userId !== userId) {
    return NextResponse.json({ error: "Authenticator not found", code: "NOT_FOUND" }, { status: 400 });
  }

  const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge: challengeRecord.token,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: authenticator.credentialID,
      publicKey: Buffer.from(authenticator.credentialPublicKey, "base64"),
      counter: authenticator.counter,
      transports: authenticator.transports
        ? (authenticator.transports.split(",") as AuthenticatorTransport[])
        : undefined,
    },
  } as any);

  if (!verification.verified) {
    return NextResponse.json({ error: "Verification failed", code: "VERIFICATION_FAILED" }, { status: 400 });
  }

  // Update counter
  await db.authenticator.update({
    where: { credentialID: authenticator.credentialID },
    data: { counter: verification.authenticationInfo.newCounter },
  });

  // Clean up challenge
  await db.verificationToken.delete({
    where: { identifier_token: { identifier: userId, token: challengeRecord.token } },
  });

  await logAudit(userId, "LOGIN", { method: "webauthn" });

  // Return user info for client-side signIn
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, image: true },
  });

  return NextResponse.json({ verified: true, user });
}

type AuthenticatorTransport = "ble" | "hybrid" | "internal" | "nfc" | "usb";
