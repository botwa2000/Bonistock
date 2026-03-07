import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import Apple from "next-auth/providers/apple";
import { z } from "zod";
import { db } from "./db";
import { verifyPassword } from "./password";
import { isLockedOut, recordFailedLogin, resetFailedLogins } from "./lockout";
import { logAudit } from "./audit";
import { notifyAdmins } from "./admin-notify";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
const cookiePrefix = useSecureCookies ? "__Secure-" : "";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days absolute session lifetime
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
    callbackUrl: {
      name: `${cookiePrefix}authjs.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
    csrfToken: {
      name: `${cookiePrefix}authjs.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
    pkceCodeVerifier: {
      name: `${cookiePrefix}authjs.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
        maxAge: 900,
      },
    },
    state: {
      name: `${cookiePrefix}authjs.state`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
        maxAge: 900,
      },
    },
    nonce: {
      name: `${cookiePrefix}authjs.nonce`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Apple({
      clientId: process.env.APPLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.APPLE_OAUTH_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase();
        const user = await db.user.findUnique({
          where: { email, deletedAt: null },
        });
        if (!user || !user.passwordHash) return null;

        if (isLockedOut(user)) {
          throw new Error("ACCOUNT_LOCKED");
        }

        const valid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!valid) {
          const { locked } = await recordFailedLogin(user.id);
          await logAudit(user.id, "FAILED_LOGIN");
          if (locked) throw new Error("ACCOUNT_LOCKED");
          return null;
        }

        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        await resetFailedLogins(user.id);

        if (user.twoFactorEnabled) {
          throw new Error(`2FA_REQUIRED:${user.id}`);
        }

        await logAudit(user.id, "LOGIN");
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  events: {
    async createUser({ user }) {
      const name = user.name ?? "Unknown";
      const email = user.email ?? "no-email";
      await notifyAdmins(
        `New signup: ${name} (${email})`,
        `<h2>New User Registration (OAuth)</h2><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Time:</strong> ${new Date().toISOString()}</p>`
      );
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle OAuth sign-in for soft-deleted accounts: restore the user
      if (account?.provider !== "credentials" && user?.id) {
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { deletedAt: true, email: true },
        });
        if (dbUser?.deletedAt) {
          const oauthEmail = profile?.email as string | undefined;

          // Check if another active user already owns this email
          // (happens when user deleted account then re-registered, but a stale
          // OAuth Account record still points to the old soft-deleted user)
          if (oauthEmail) {
            const emailOwner = await db.user.findFirst({
              where: { email: oauthEmail, deletedAt: null, id: { not: user.id } },
            });
            if (emailOwner) {
              // Remove the stale Account link so next OAuth attempt
              // creates a fresh link to the active user
              await db.account.deleteMany({
                where: { userId: user.id, provider: account!.provider },
              });
              return "/login?error=PleaseRetry";
            }
          }

          // No conflict — restore the deleted user in-place
          await db.user.update({
            where: { id: user.id },
            data: {
              deletedAt: null,
              email: oauthEmail ?? dbUser.email,
              name: (profile?.name as string) ?? user.name ?? null,
              image: (profile?.image as string) ?? user.image ?? null,
              emailVerified: new Date(),
            },
          });
          // Allow sign-in to proceed — user gets a clean restored account
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id;
      }

      if (trigger === "update" && session) {
        // Allow session updates from client
        return { ...token, ...session };
      }

      // Fetch fresh user data on each token refresh
      if (token.userId) {
        const dbUser = await db.user.findUnique({
          where: { id: token.userId as string },
          select: {
            deletedAt: true,
            role: true,
            region: true,
            theme: true,
            language: true,
            goal: true,
          },
        });
        if (!dbUser || dbUser.deletedAt) {
          // User deleted or doesn't exist — invalidate the session
          return { ...token, userId: null, expired: true };
        }
        token.role = dbUser.role;
        token.region = dbUser.region;
        token.theme = dbUser.theme;
        token.language = dbUser.language;
        token.goal = dbUser.goal;
      }

      return token;
    },
    async session({ session, token }) {
      // If token was invalidated (user deleted), return empty session
      if (token.expired) {
        session.user = undefined as unknown as typeof session.user;
        return session;
      }
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
        (session as unknown as Record<string, unknown>).role = token.role;
        (session as unknown as Record<string, unknown>).region = token.region;
        (session as unknown as Record<string, unknown>).theme = token.theme;
        (session as unknown as Record<string, unknown>).language = token.language;
        (session as unknown as Record<string, unknown>).goal = token.goal;
      }
      return session;
    },
  },
});
