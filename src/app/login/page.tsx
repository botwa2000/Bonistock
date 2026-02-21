"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { GoogleIcon, FacebookIcon } from "@/components/ui/icons";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const t = useTranslations("login");
  const searchParams = useSearchParams();
  const { login, loginWithGoogle, loginWithFacebook } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [error, setError] = useState("");
  const [show2FA, setShow2FA] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const verified = searchParams.get("verified") === "true";
  const authError = searchParams.get("error");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const result = await login(email, password);
      if (result.ok) {
        // Check if user is admin to redirect appropriately
        try {
          const userRes = await fetch("/api/user/settings");
          if (userRes.ok) {
            const userData = await userRes.json();
            if (userData.role === "ADMIN") {
              window.location.href = "/dashboard/admin";
              return;
            }
          }
        } catch { /* fallback to /dashboard */ }
        window.location.href = "/dashboard";
      } else if (result.error === "2FA_REQUIRED") {
        setShow2FA(true);
      } else {
        setError(result.error ?? t("error"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: twoFactorCode }),
      });
      if (res.ok) {
        // Re-login after 2FA verification
        const result = await login(email, password);
        if (result.ok) {
          try {
            const userRes = await fetch("/api/user/settings");
            if (userRes.ok) {
              const userData = await userRes.json();
              if (userData.role === "ADMIN") {
                window.location.href = "/dashboard/admin";
                return;
              }
            }
          } catch { /* fallback to /dashboard */ }
          window.location.href = "/dashboard";
        }
      } else {
        const data = await res.json();
        setError(data.error ?? "Invalid 2FA code");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-text-primary">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">{t("subtitle")}</p>
        </div>

        {verified && (
          <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-center text-xs text-emerald-200">
            Email verified successfully. You can now log in.
          </div>
        )}

        {authError && (
          <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-center text-xs text-rose-200">
            {authError === "OAuthAccountNotLinked"
              ? "This email is already registered with a different sign-in method."
              : "Sign-in failed. Please try again or use a different method."}
          </div>
        )}

        <Card variant="glass" padding="lg">
          {show2FA ? (
            <form onSubmit={handle2FASubmit} className="space-y-4">
              <p className="text-sm text-text-secondary">
                Enter the 6-digit code from your authenticator app.
              </p>
              <Input
                label="2FA Code"
                id="twoFactorCode"
                type="text"
                placeholder="000000"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                autoComplete="one-time-code"
                maxLength={6}
              />

              {error && (
                <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {error}
                </div>
              )}

              <Button type="submit" fullWidth disabled={submitting}>
                {submitting ? "Verifying..." : "Verify"}
              </Button>
              <button
                type="button"
                onClick={() => { setShow2FA(false); setError(""); }}
                className="w-full text-center text-sm text-text-tertiary hover:text-text-primary transition-colors"
              >
                Back to login
              </button>
            </form>
          ) : (
            <>
              {/* OAuth Buttons */}
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={loginWithGoogle}
                >
                  <GoogleIcon /> <span className="ml-2">Continue with Google</span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={loginWithFacebook}
                >
                  <FacebookIcon /> <span className="ml-2">Continue with Facebook</span>
                </Button>
              </div>

              <div className="my-4 flex items-center gap-3">
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-text-tertiary">or</span>
                <div className="flex-1 border-t border-border" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email"
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <Input
                  label={t("passwordPlaceholder")}
                  id="password"
                  type="password"
                  placeholder=""
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />

                {error && (
                  <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                    {error}
                  </div>
                )}

                <Button type="submit" fullWidth disabled={submitting}>
                  {submitting ? "Signing in..." : t("loginButton")}
                </Button>
              </form>

              <div className="mt-4 flex justify-between text-sm">
                <Link
                  href="/forgot-password"
                  className="text-text-tertiary hover:text-text-primary transition-colors"
                >
                  Forgot password?
                </Link>
                <Link
                  href="/register"
                  className="text-text-tertiary hover:text-text-primary transition-colors"
                >
                  Create account
                </Link>
              </div>
            </>
          )}
        </Card>

        <div className="text-center text-sm text-text-secondary">
          <Link href="/" className="hover:text-text-primary transition-colors">
            &larr; Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
