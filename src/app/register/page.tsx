"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          tosAccepted,
          privacyAccepted,
          cookieConsent: { analytics: analyticsConsent, marketing: marketingConsent },
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="w-full max-w-md space-y-6 text-center">
          <Logo size="lg" showText={false} />
          <Card variant="glass" padding="lg">
            <h2 className="text-xl font-semibold text-white">Check your email</h2>
            <p className="mt-2 text-sm text-white/60">
              We sent a verification link to <strong className="text-white">{email}</strong>.
              Click the link to activate your account.
            </p>
            <Link href="/login">
              <Button variant="secondary" className="mt-4">
                Back to login
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-white">Create your account</h1>
          <p className="mt-1 text-sm text-white/60">Start tracking the best stock picks</p>
        </div>

        <Card variant="glass" padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Name"
              id="name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
            <Input
              label="Email"
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <div>
              <Input
                label="Password"
                id="password"
                type="password"
                placeholder=""
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          passwordStrength.level >= level
                            ? passwordStrength.level <= 1
                              ? "bg-rose-400"
                              : passwordStrength.level <= 2
                              ? "bg-amber-400"
                              : passwordStrength.level <= 3
                              ? "bg-emerald-400"
                              : "bg-emerald-300"
                            : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-white/50">{passwordStrength.label}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={tosAccepted}
                  onChange={(e) => setTosAccepted(e.target.checked)}
                  className="mt-0.5 accent-emerald-400"
                />
                <span className="text-white/70">
                  I accept the{" "}
                  <Link href="/terms" className="text-white underline">Terms of Service</Link>
                  {" "}(required)
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => setPrivacyAccepted(e.target.checked)}
                  className="mt-0.5 accent-emerald-400"
                />
                <span className="text-white/70">
                  I accept the{" "}
                  <Link href="/privacy" className="text-white underline">Privacy Policy</Link>
                  {" "}(required)
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={analyticsConsent}
                  onChange={(e) => setAnalyticsConsent(e.target.checked)}
                  className="mt-0.5 accent-emerald-400"
                />
                <span className="text-white/50">Analytics cookies (optional)</span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  className="mt-0.5 accent-emerald-400"
                />
                <span className="text-white/50">Marketing cookies (optional)</span>
              </label>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              disabled={submitting || !tosAccepted || !privacyAccepted}
            >
              {submitting ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-white/50">
            Already have an account?{" "}
            <Link href="/login" className="text-white hover:underline">
              Sign in
            </Link>
          </div>
        </Card>

        <div className="text-center text-sm text-white/60">
          <Link href="/" className="hover:text-white transition-colors">
            &larr; Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

function getPasswordStrength(password: string): { level: number; label: string } {
  if (password.length === 0) return { level: 0, label: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z\d]/.test(password)) score++;

  const labels = ["Weak", "Fair", "Good", "Strong"];
  return { level: score, label: labels[score - 1] ?? "Weak" };
}
