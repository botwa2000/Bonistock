import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const startTime = Date.now();
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "unknown";
const isDev = appUrl.includes("dev.");
console.log(`[boot] Bonistock started — env=${isDev ? "dev" : "prod"} url=${appUrl}`);

export async function GET() {
  let dbStatus = "disconnected";

  try {
    await db.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch {
    // Return 200 so Docker healthcheck passes even if DB is temporarily unreachable.
    // The "degraded" status signals that DB is down without killing the container.
    return NextResponse.json({
      status: "degraded",
      db: "disconnected",
      uptime: Math.floor((Date.now() - startTime) / 1000),
    });
  }

  return NextResponse.json({
    status: "ok",
    db: dbStatus,
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
}
