import { NextRequest, NextResponse } from "next/server";
import { resolveAuth } from "@/lib/api-utils";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const ctx = await resolveAuth(req);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const sessions = await db.session.findMany({
    where: { userId: ctx.userId, expires: { gt: new Date() } },
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      createdAt: true,
      expires: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sessions);
}

export async function DELETE(req: NextRequest) {
  const ctx = await resolveAuth(req);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const sessionId = req.nextUrl.searchParams.get("id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session id", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  await db.session.deleteMany({
    where: { id: sessionId, userId: ctx.userId },
  });

  return NextResponse.json({ revoked: true });
}
