import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const tokenSchema = z.object({
  token: z.string().min(1).max(512),
  platform: z.enum(["ios", "android"]).default("ios"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = tokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  await db.pushToken.upsert({
    where: { token: parsed.data.token },
    create: {
      userId: session.user.id,
      token: parsed.data.token,
      platform: parsed.data.platform,
    },
    update: {
      userId: session.user.id,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { token } = body;
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  await db.pushToken.deleteMany({
    where: { token, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
