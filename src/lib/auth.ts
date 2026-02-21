import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import { z } from "zod";
import { db } from "./db";
import { verifyPassword } from "./password";
import { isLockedOut, recordFailedLogin, resetFailedLogins } from "./lockout";
import { logAudit } from "./audit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email, deletedAt: null },
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
  callbacks: {
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
            role: true,
            region: true,
            theme: true,
            language: true,
            goal: true,
          },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.region = dbUser.region;
          token.theme = dbUser.theme;
          token.language = dbUser.language;
          token.goal = dbUser.goal;
        }
      }

      return token;
    },
    async session({ session, token }) {
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
