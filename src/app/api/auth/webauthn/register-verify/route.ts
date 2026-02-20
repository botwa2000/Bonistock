import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const rpID = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://localhost").hostname;
const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://localhost";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();

  // Retrieve stored challenge
  const challengeRecord = await db.verificationToken.findFirst({
    where: { identifier: session.user.id },
    orderBy: { expires: "desc" },
  });

  if (!challengeRecord || challengeRecord.expires < new Date()) {
    return NextResponse.json({ error: "Challenge expired", code: "CHALLENGE_EXPIRED" }, { status: 400 });
  }

  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge: challengeRecord.token,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Verification failed", code: "VERIFICATION_FAILED" }, { status: 400 });
  }

  const regInfo = verification.registrationInfo as any;
  const credentialID = regInfo.credential?.id ?? regInfo.credentialID;
  const credentialPublicKey = regInfo.credential?.publicKey ?? regInfo.credentialPublicKey;
  const counter = regInfo.credential?.counter ?? regInfo.counter ?? 0;
  const credentialDeviceType = regInfo.credentialDeviceType;
  const credentialBackedUp = regInfo.credentialBackedUp;

  await db.authenticator.create({
    data: {
      credentialID,
      userId: session.user.id,
      providerAccountId: session.user.id,
      credentialPublicKey: Buffer.from(credentialPublicKey).toString("base64"),
      counter,
      credentialDeviceType,
      credentialBackedUp,
      transports: body.response?.transports?.join(",") ?? null,
    },
  });

  // Clean up challenge
  await db.verificationToken.delete({
    where: { identifier_token: { identifier: session.user.id, token: challengeRecord.token } },
  });

  await logAudit(session.user.id, "WEBAUTHN_REGISTER");

  return NextResponse.json({ verified: true });
}
