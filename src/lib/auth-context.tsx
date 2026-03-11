"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { SessionProvider, useSession, signIn, signOut } from "next-auth/react";
import { isNative, registerPushNotifications } from "@/lib/native";
import { dispatchRegionChange } from "@/lib/region-context";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const SUPPORTED_LOCALES = ["en", "de", "fr", "es", "it"];

function getLocaleFromPath(): string {
  const seg = window.location.pathname.split("/")[1];
  return SUPPORTED_LOCALES.includes(seg) ? seg : "en";
}

interface UserData {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tier: "free" | "pass" | "plus";
  region: string;
  theme: "DARK" | "LIGHT";
  language: "EN" | "DE" | "ES" | "FR";
  goal: "GROWTH" | "INCOME" | "BALANCED";
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  hasPassword: boolean;
  passActivationsRemaining: number;
  passExpiry: string | null;
  passWindowActive: boolean;
  emailAlerts: boolean;
  weeklyDigest: boolean;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  loginWithApple: () => Promise<void>;
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

        // Sync locale cookie with user's saved language preference
        if (data.language) {
          const locale = data.language.toLowerCase();
          if (SUPPORTED_LOCALES.includes(locale)) {
            document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
          }
        }

        // Sync region cookie with user's saved region preference
        if (data.region) {
          document.cookie = `NEXT_REGION=${data.region}; path=/; max-age=31536000; SameSite=Lax`;
          dispatchRegionChange();
        }

        // Native platform setup
        if (isNative) {
          // Register push token
          registerPushNotifications().then((token) => {
            if (token) {
              fetch("/api/user/push-token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, platform: "ios" }),
              }).catch(() => {});
            }
          });
        }
      }
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (status === "loading") return;
    fetchUser();
  }, [status, fetchUser]);

  // Inactivity timeout — log out after 30 minutes of no interaction
  const lastActivityRef = useRef(Date.now());
  const isLoggedIn = !!session?.user;

  useEffect(() => {
    if (!isLoggedIn) return;

    let loggingOut = false;
    const doLogout = () => {
      if (loggingOut) return;
      loggingOut = true;
      signOut({ redirect: false }).then(() => {
        window.location.href = `/${getLocaleFromPath()}/login?reason=inactive`;
      });
    };

    const checkInactivity = () => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_TIMEOUT_MS) {
        doLogout();
      }
    };

    const resetTimer = () => {
      // Check BEFORE resetting — catches returning from sleep/background
      checkInactivity();
      if (!loggingOut) lastActivityRef.current = Date.now();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") checkInactivity();
    };

    const events = ["mousedown", "keydown", "touchstart", "scroll"] as const;
    for (const e of events) window.addEventListener(e, resetTimer, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);

    const interval = setInterval(checkInactivity, 60_000);

    return () => {
      for (const e of events) window.removeEventListener(e, resetTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearInterval(interval);
    };
  }, [isLoggedIn]);

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
    const locale = getLocaleFromPath();
    await signIn("google", { callbackUrl: `/${locale}/dashboard` });
  }, []);

  const loginWithFacebook = useCallback(async () => {
    const locale = getLocaleFromPath();
    await signIn("facebook", { callbackUrl: `/${locale}/dashboard` });
  }, []);

  const loginWithApple = useCallback(async () => {
    const locale = getLocaleFromPath();
    await signIn("apple", { callbackUrl: `/${locale}/dashboard` });
  }, []);

  const logout = useCallback(async () => {
    // Clean up native resources before signing out
    if (isNative) {
      try {
        const token = await registerPushNotifications();
        if (token) {
          await fetch("/api/user/push-token", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
        }
      } catch {}
    }
    await signOut({ redirect: false });
    setUser(null);
    window.location.href = `/${getLocaleFromPath()}`;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        user,
        loading: status === "loading" || loading,
        login,
        loginWithGoogle,
        loginWithFacebook,
        loginWithApple,
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
