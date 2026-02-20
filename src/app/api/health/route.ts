import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const startTime = Date.now();

export async function GET() {
  let dbStatus = "disconnected";

  try {
    await db.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        db: "disconnected",
        uptime: Math.floor((Date.now() - startTime) / 1000),
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: "ok",
    db: dbStatus,
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
}
