import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { routing, type AppLocale } from "@/i18n/routing";
import en from "../../../../../../messages/en.json";
import de from "../../../../../../messages/de.json";
import fr from "../../../../../../messages/fr.json";
import es from "../../../../../../messages/es.json";
import it from "../../../../../../messages/it.json";

/**
 * GET /api/mobile/messages/[locale]
 * Serves the translation JSON for a locale so the native app can fetch copy
 * updates without an app release. The app bundles the same files for offline
 * startup and revalidates here with If-None-Match.
 */
const MESSAGES: Record<AppLocale, unknown> = { en, de, fr, es, it };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale: requested } = await params;
  const locale: AppLocale = routing.locales.includes(requested as AppLocale)
    ? (requested as AppLocale)
    : routing.defaultLocale;

  const payload = JSON.stringify(MESSAGES[locale]);
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
