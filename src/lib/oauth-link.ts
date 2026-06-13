/**
 * Shared OAuth account find-or-link logic.
 *
 * The web flow (src/lib/auth.ts) relies on the NextAuth Prisma adapter to create
 * users and link Account rows, with a `signIn` callback that restores soft-deleted
 * accounts. The native mobile OAuth endpoint (src/app/api/mobile/auth/oauth) has no
 * adapter, so it must do the equivalent itself. This module centralizes that logic
 * so the two paths apply the SAME linking policy:
 *   - Google, Apple: email-based linking allowed (verified emails).
 *   - Facebook: NOT allowed (weaker email verification → account-takeover risk);
 *     only an existing provider Account links, otherwise a fresh user is created,
 *     and an email already owned by another user is rejected.
 */
import { db } from "./db";

export type OAuthProvider = "google" | "apple" | "facebook";

export interface OAuthProfile {
  provider: OAuthProvider;
  providerAccountId: string; // the provider `sub`
  email?: string | null;
  emailVerified?: boolean;
  name?: string | null;
  image?: string | null;
}

export interface LinkResult {
  userId: string;
  isNewUser: boolean;
}

export class OAuthLinkError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const EMAIL_LINKING_ALLOWED: Record<OAuthProvider, boolean> = {
  google: true,
  apple: true,
  facebook: false,
};

async function createAccountLink(userId: string, profile: OAuthProfile): Promise<void> {
  await db.account.create({
    data: {
      userId,
      type: "oidc",
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
    },
  });
}

/**
 * Find the user for an OAuth identity, linking or creating as policy allows.
 * Throws OAuthLinkError with a stable `code` on conflicts the client should surface.
 */
export async function findOrLinkOAuthUser(profile: OAuthProfile): Promise<LinkResult> {
  const email = profile.email?.toLowerCase() ?? null;

  // 1. Existing provider Account → that user (restore if soft-deleted).
  const existingAccount = await db.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
      },
    },
    select: { userId: true },
  });

  if (existingAccount) {
    const user = await db.user.findUnique({
      where: { id: existingAccount.userId },
      select: { id: true, deletedAt: true, email: true },
    });
    if (!user) {
      // Dangling account row — drop it and fall through to create fresh.
      await db.account.deleteMany({
        where: { provider: profile.provider, providerAccountId: profile.providerAccountId },
      });
    } else {
      if (user.deletedAt) {
        // Soft-deleted: refuse if another ACTIVE user now owns this email.
        if (email) {
          const emailOwner = await db.user.findFirst({
            where: { email, deletedAt: null, id: { not: user.id } },
            select: { id: true },
          });
          if (emailOwner) {
            await db.account.deleteMany({
              where: { provider: profile.provider, providerAccountId: profile.providerAccountId },
            });
            throw new OAuthLinkError("EMAIL_IN_USE", "Email already in use by another account");
          }
        }
        await db.user.update({
          where: { id: user.id },
          data: {
            deletedAt: null,
            email: email ?? user.email,
            name: profile.name ?? undefined,
            image: profile.image ?? undefined,
            emailVerified: new Date(),
          },
        });
      }
      return { userId: user.id, isNewUser: false };
    }
  }

  // 2. No provider Account yet. Look up by email (include soft-deleted to respect the unique constraint).
  const byEmail = email
    ? await db.user.findFirst({ where: { email }, select: { id: true, deletedAt: true } })
    : null;

  if (byEmail) {
    if (!EMAIL_LINKING_ALLOWED[profile.provider]) {
      // Facebook: never link by email.
      throw new OAuthLinkError("EMAIL_IN_USE", "Email already in use — sign in with your password or original provider");
    }
    // Google/Apple: link to (and restore, if needed) the existing user.
    if (byEmail.deletedAt) {
      await db.user.update({
        where: { id: byEmail.id },
        data: {
          deletedAt: null,
          name: profile.name ?? undefined,
          image: profile.image ?? undefined,
          emailVerified: new Date(),
        },
      });
    }
    await createAccountLink(byEmail.id, profile);
    return { userId: byEmail.id, isNewUser: false };
  }

  // 3. Brand-new user. Email is required to create one.
  if (!email) {
    throw new OAuthLinkError("EMAIL_REQUIRED", "Provider did not supply an email address");
  }
  const newUser = await db.user.create({
    data: {
      email,
      name: profile.name ?? null,
      image: profile.image ?? null,
      emailVerified: new Date(),
    },
    select: { id: true },
  });
  await createAccountLink(newUser.id, profile);
  return { userId: newUser.id, isNewUser: true };
}
