"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { SessionProvider, useSession, signIn, signOut } from "next-auth/react";

interface UserData {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tier: "free" | "pass" | "plus";
  region: "US" | "DE";
  theme: "DARK" | "LIGHT";
  language: "EN" | "DE" | "ES" | "FR";
  goal: "GROWTH" | "INCOME" | "BALANCED";
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  hasPassword: boolean;
  passActivationsRemaining: number;
  passExpiry: string | null;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function AuthProviderInner({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    if (!session?.user?.id) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/user/settings");
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (status === "loading") return;
    fetchUser();
  }, [status, fetchUser]);

  const login = useCallback(
    async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        if (result.error.includes("ACCOUNT_LOCKED")) {
          return { ok: false, error: "Account locked. Try again in 15 minutes." };
        }
        if (result.error.includes("EMAIL_NOT_VERIFIED")) {
          return { ok: false, error: "Please verify your email before logging in." };
        }
        if (result.error.includes("2FA_REQUIRED")) {
          return { ok: false, error: "2FA_REQUIRED" };
        }
        return { ok: false, error: "Invalid email or password." };
      }
      return { ok: true };
    },
    []
  );

  const loginWithGoogle = useCallback(async () => {
    await signIn("google", { callbackUrl: "/dashboard" });
  }, []);

  const loginWithFacebook = useCallback(async () => {
    await signIn("facebook", { callbackUrl: "/dashboard" });
  }, []);

  const logout = useCallback(async () => {
    await signOut({ redirect: false });
    setUser(null);
    window.location.href = "/";
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: !!session?.user,
        user,
        loading: status === "loading" || loading,
        login,
        loginWithGoogle,
        loginWithFacebook,
        logout,
        refreshUser: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthProviderInner>{children}</AuthProviderInner>
    </SessionProvider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
