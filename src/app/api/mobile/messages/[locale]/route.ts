import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { routing } from "@/i18n/routing";

/**
 * GET /api/mobile/messages/[locale]
 * Serves the translation JSON for a locale so the native app can fetch copy
 * updates without an app release. The app bundles the same files for offline
 * startup and revalidates here with If-None-Match.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale: requested } = await params;
  const locale = routing.locales.includes(requested as (typeof routing.locales)[number])
    ? requested
    : routing.defaultLocale;

  let messages: Record<string, unknown>;
  try {
    messages = (await import(`../../../../../messages/${locale}.json`)).default;
  } catch {
    return NextResponse.json({ error: "Messages not found" }, { status: 404 });
  }

  const payload = JSON.stringify(messages);
  const etag = `"${createHash("sha1").update(`${locale}:${payload}`).digest("hex")}"`;

  if (req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": "public, max-age=3600" },
    });
  }

  return new NextResponse(payload, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
      ETag: etag,
    },
  });
}
