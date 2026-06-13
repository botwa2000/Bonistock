/**
 * Native mobile app authentication.
 *
 * Access tokens are stateless JWEs minted with the same `encode`/`decode` from
 * `next-auth/jwt` and the same `NEXTAUTH_SECRET` the web session uses, so the
 * claim shape matches what `auth()` produces. We use a dedicated salt so mobile
 * tokens are not interchangeable with the web session cookie.
 *
 * Refresh tokens are opaque random strings; only their SHA-256 hash is stored
 * (in the `MobileSession` table). They are rotated on every refresh and deleted
 * on logout. See src/app/api/mobile/auth/*.
 */
import { createHash, randomBytes } from "crypto";
import { encode, decode } from "next-auth/jwt";
import { db } from "./db";

/** Salt that keys mobile access tokens separately from the web session cookie. */
const MOBILE_SALT = "bonistock.mobile";

/** Distinct salt for the short-lived 2FA challenge token — NOT interchangeable with access tokens. */
const CHALLENGE_SALT = "bonistock.mobile.2fa";

/** 2FA challenge token lifetime (seconds). */
const CHALLENGE_MAX_AGE = 5 * 60; // 5 minutes

/** Access token lifetime (seconds). Short — the app silently refreshes. */
export const ACCESS_TOKEN_MAX_AGE = 30 * 60; // 30 minutes

/** Refresh token lifetime (seconds). Matches the web session absolute lifetime. */
export const REFRESH_TOKEN_MAX_AGE = 60 * 24 * 60 * 60; // 60 days

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("Missing required env var: NEXTAUTH_SECRET");
  return secret;
}

export interface MobileTokenClaims {
  userId: string;
  role: string;
  region: string;
  theme: string;
  language: string;
  goal: string;
}

/**
 * Fetch fresh user data and build the claim set, mirroring the `jwt` callback in
 * src/lib/auth.ts. Returns null if the user is missing or soft-deleted.
 */
export async function buildClaims(userId: string): Promise<MobileTokenClaims | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      deletedAt: true,
      role: true,
      region: true,
      theme: true,
      language: true,
      goal: true,
    },
  });
  if (!user || user.deletedAt) return null;
  return {
    userId,
    role: user.role,
    region: user.region,
    theme: user.theme,
    language: user.language,
    goal: user.goal,
  };
}

/** Mint a stateless access token (JWE) carrying the claims. */
export async function mintAccessToken(claims: MobileTokenClaims): Promise<string> {
  return encode({
    token: { ...claims, mobile: true },
    secret: getSecret(),
    salt: MOBILE_SALT,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
}

/** Verify + decode an access token. Returns null when invalid/expired/malformed. */
export async function verifyAccessToken(token: string): Promise<MobileTokenClaims | null> {
  try {
    const payload = await decode({ token, secret: getSecret(), salt: MOBILE_SALT });
    if (!payload || typeof payload.userId !== "string" || !payload.userId) return null;
    return {
      userId: payload.userId as string,
      role: (payload.role as string) ?? "USER",
      region: (payload.region as string) ?? "GLOBAL",
      theme: (payload.theme as string) ?? "DARK",
      language: (payload.language as string) ?? "EN",
      goal: (payload.goal as string) ?? "GROWTH",
    };
  } catch {
    return null;
  }
}

/** Generate an opaque refresh token and its storage hash. */
export function generateRefreshToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashRefreshToken(raw) };
}

/** SHA-256 of a refresh token — only the hash is ever persisted. */
export function hashRefreshToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

// ──── 2FA challenge token (issued after password step, before the TOTP step) ────

/** Mint a short-lived token that authorizes the second (2FA) step for `userId`. */
export async function mintChallengeToken(userId: string): Promise<string> {
  return encode({
    token: { userId, challenge: true },
    secret: getSecret(),
    salt: CHALLENGE_SALT,
    maxAge: CHALLENGE_MAX_AGE,
  });
}

/** Verify a 2FA challenge token; returns the userId or null. */
export async function verifyChallengeToken(token: string): Promise<string | null> {
  try {
    const payload = await decode({ token, secret: getSecret(), salt: CHALLENGE_SALT });
    if (!payload || payload.challenge !== true || typeof payload.userId !== "string") return null;
    return payload.userId as string;
  } catch {
    return null;
  }
}

// ──── Session lifecycle (refresh-token rows in MobileSession) ────

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface SessionMeta {
  deviceId?: string | null;
  userAgent?: string | null;
  platform?: string | null;
}

/**
 * Create a new mobile session: mint an access token + opaque refresh token,
 * persist the refresh token's hash. Returns null if the user is missing/deleted.
 */
export async function issueMobileSession(
  userId: string,
  meta: SessionMeta = {}
): Promise<IssuedTokens | null> {
  const claims = await buildClaims(userId);
  if (!claims) return null;
  const accessToken = await mintAccessToken(claims);
  const { raw, hash } = generateRefreshToken();
  await db.mobileSession.create({
    data: {
      userId,
      refreshTokenHash: hash,
      deviceId: meta.deviceId ?? null,
      userAgent: meta.userAgent ?? null,
      platform: meta.platform ?? null,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000),
    },
  });
  return { accessToken, refreshToken: raw, expiresIn: ACCESS_TOKEN_MAX_AGE };
}

/**
 * Rotate a refresh token: validate it, issue a fresh access + refresh token, and
 * replace the stored hash. Returns null if the token is unknown/revoked/expired or
 * the user is gone (in which case the row is deleted).
 */
export async function rotateMobileSession(rawRefreshToken: string): Promise<IssuedTokens | null> {
  const hash = hashRefreshToken(rawRefreshToken);
  const row = await db.mobileSession.findUnique({ where: { refreshTokenHash: hash } });
  if (!row || row.revokedAt || row.expiresAt < new Date()) return null;

  const claims = await buildClaims(row.userId);
  if (!claims) {
    await db.mobileSession.delete({ where: { id: row.id } }).catch(() => {});
    return null;
  }

  const accessToken = await mintAccessToken(claims);
  const { raw, hash: newHash } = generateRefreshToken();
  await db.mobileSession.update({
    where: { id: row.id },
    data: { refreshTokenHash: newHash, lastUsedAt: new Date() },
  });
  return { accessToken, refreshToken: raw, expiresIn: ACCESS_TOKEN_MAX_AGE };
}

/** Revoke (delete) the session backing a refresh token. Idempotent. */
export async function revokeMobileSession(rawRefreshToken: string): Promise<void> {
  const hash = hashRefreshToken(rawRefreshToken);
  await db.mobileSession.deleteMany({ where: { refreshTokenHash: hash } });
}

/**
 * The user profile returned to the app alongside tokens. Tier is intentionally
 * omitted — the app fetches it (and full settings) from /api/user/settings.
 */
export async function getMobileUser(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      region: true,
      theme: true,
      language: true,
      goal: true,
    },
  });
}
