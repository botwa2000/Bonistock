import { cookies, headers } from "next/headers";

export type AppRegion = "GLOBAL" | "DE";

const REGION_COOKIE = "NEXT_REGION";

/**
 * Detect the user's region from cookie or Accept-Language header.
 * Works for both logged-in and anonymous users.
 */
export async function getServerRegion(): Promise<AppRegion> {
  const cookieStore = await cookies();
  const regionCookie = cookieStore.get(REGION_COOKIE)?.value;
  if (regionCookie === "DE" || regionCookie === "GLOBAL") {
    return regionCookie;
  }

  // Fallback: detect from Accept-Language
  const headerStore = await headers();
  const acceptLang = headerStore.get("accept-language") ?? "";
  const primary = acceptLang.split(",")[0] ?? "";
  if (/\bde\b/i.test(primary)) {
    return "DE";
  }

  return "GLOBAL";
}
