import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { logAudit } from "@/lib/audit";
import { notifyAdmins, escapeHtml } from "@/lib/admin-notify";
import { issueMobileSession, getMobileUser } from "@/lib/mobile-auth";
import {
  findOrLinkOAuthUser,
  OAuthLinkError,
  type OAuthProvider,
} from "@/lib/oauth-link";
import { log } from "@/lib/logger";

/**
 * POST /api/mobile/auth/oauth
 * The native app obtains a provider id_token (Google/Apple/Facebook sign-in SDK)
 * and posts it here. We verify the token server-side against the provider JWKS,
 * find-or-link the user, and issue our own mobile tokens. No browser OAuth dance.
 */
const schema = z.object({
  provider: z.enum(["google", "apple", "facebook"]),
  idToken: z.string().min(1),
  nonce: z.string().optional(),
  name: z.string().max(200).optional(), // Apple sends the name out-of-band on first auth
  deviceId: z.string().max(200).optional(),
  platform: z.enum(["ios", "android"]).optional(),
});

interface ProviderConfig {
  issuer: string | string[];
  jwksUrl: string;
  audiences: string[];
}

function providerConfig(provider: OAuthProvider): ProviderConfig | null {
  switch (provider) {
    case "google": {
      const audiences = [
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_IOS_CLIENT_ID,
        process.env.GOOGLE_ANDROID_CLIENT_ID,
      ].filter((a): a is string => !!a);
      if (!audiences.length) return null;
      return {
        issuer: ["https://accounts.google.com", "accounts.google.com"],
        jwksUrl: "https://www.googleapis.com/oauth2/v3/certs",
        audiences,
      };
    }
    case "apple": {
      const audiences = [
        process.env.APPLE_NATIVE_CLIENT_ID,
        process.env.APPLE_OAUTH_CLIENT_ID,
      ].filter((a): a is string => !!a);
      if (!audiences.length) return null;
      return {
        issuer: "https://appleid.apple.com",
        jwksUrl: "https://appleid.apple.com/auth/keys",
        audiences,
      };
    }
    case "facebook": {
      const audiences = [process.env.FACEBOOK_CLIENT_ID].filter((a): a is string => !!a);
      if (!audiences.length) return null;
      return {
        issuer: "https://www.facebook.com",
        jwksUrl: "https://www.facebook.com/.well-known/oauth/openid/jwks/",
        audiences,
      };
    }
  }
}

// Cache the remote JWK sets per provider across requests.
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
function getJwks(url: string) {
  let jwks = jwksCache.get(url);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(url));
    jwksCache.set(url, jwks);
  }
  return jwks;
}

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { provider, idToken, nonce, name } = parsed.data;
  const config = providerConfig(provider);
  if (!config) {
    return NextResponse.json(
      { error: `${provider} sign-in not configured`, code: "PROVIDER_NOT_CONFIGURED" },
      { status: 501 }
    );
  }

  let payload: JWTPayload;
  try {
    const result = await jwtVerify(idToken, getJwks(config.jwksUrl), {
      issuer: config.issuer,
      audience: config.audiences,
    });
    payload = result.payload;
  } catch (err) {
    log.debug("mobile/oauth", `id_token verification failed for ${provider}:`, err);
    return NextResponse.json({ error: "Invalid id token", code: "TOKEN_INVALID" }, { status: 401 });
  }

  // Optional nonce binding (defense against token replay if the app sets one).
  if (nonce && payload.nonce && payload.nonce !== nonce) {
    return NextResponse.json({ error: "Nonce mismatch", code: "NONCE_MISMATCH" }, { status: 401 });
  }

  const sub = payload.sub;
  if (!sub) {
    return NextResponse.json({ error: "Token missing subject", code: "TOKEN_INVALID" }, { status: 401 });
  }

  const email = typeof payload.email === "string" ? payload.email : null;
  const emailVerified =
    payload.email_verified === true || payload.email_verified === "true";
  const tokenName = typeof payload.name === "string" ? payload.name : null;
  const picture = typeof payload.picture === "string" ? payload.picture : null;

  let link;
  try {
    link = await findOrLinkOAuthUser({
      provider,
      providerAccountId: sub,
      email,
      emailVerified,
      name: tokenName ?? name ?? null,
      image: picture,
    });
  } catch (err) {
    if (err instanceof OAuthLinkError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 409 });
    }
    log.error("mobile/oauth", `Linking failed for ${provider}:`, err);
    return NextResponse.json({ error: "Sign-in failed" }, { status: 500 });
  }

  if (link.isNewUser) {
    const user = await getMobileUser(link.userId);
    await notifyAdmins(
      `New signup: ${escapeHtml(user?.name ?? "Unknown")} (${escapeHtml(user?.email ?? "no-email")})`,
      `<h2>New User Registration (Mobile OAuth — ${provider})</h2><p><strong>Name:</strong> ${escapeHtml(user?.name ?? "Unknown")}</p><p><strong>Email:</strong> ${escapeHtml(user?.email ?? "no-email")}</p><p><strong>Time:</strong> ${new Date().toISOString()}</p>`
    ).catch(() => {});
  }

  await logAudit(link.userId, "LOGIN");
  const tokens = await issueMobileSession(link.userId, {
    deviceId: parsed.data.deviceId ?? null,
    userAgent: req.headers.get("user-agent"),
    platform: parsed.data.platform ?? null,
  });
  if (!tokens) {
    return NextResponse.json({ error: "Sign-in failed" }, { status: 500 });
  }

  return NextResponse.json({ ...tokens, user: await getMobileUser(link.userId) });
}
