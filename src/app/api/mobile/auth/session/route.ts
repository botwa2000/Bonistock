import { NextResponse } from "next/server";
import { authenticatedRoute } from "@/lib/api-utils";
import { getMobileUser } from "@/lib/mobile-auth";

/**
 * GET /api/mobile/auth/session
 * Returns the current user profile for the bearer token. Used at app boot to
 * confirm the stored access token is still valid and to hydrate the user.
 */
export const GET = authenticatedRoute(async (_req, ctx) => {
  const user = await getMobileUser(ctx.userId);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  return NextResponse.json({ user });
});
