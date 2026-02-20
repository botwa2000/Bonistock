"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.error ?? "Something went wrong");
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
          <h1 className="mt-4 text-2xl font-semibold text-white">Reset your password</h1>
          <p className="mt-1 text-sm text-white/60">
            Enter your email and we&apos;ll send a reset link
          </p>
        </div>

        <Card variant="glass" padding="lg">
          {sent ? (
            <div className="text-center">
              <p className="text-sm text-white/70">
                If an account exists for <strong className="text-white">{email}</strong>,
                you&apos;ll receive a password reset link shortly.
              </p>
              <Link href="/login">
                <Button variant="secondary" className="mt-4">
                  Back to login
                </Button>
              </Link>
            </div>
          ) : (
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

              {error && (
                <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {error}
                </div>
              )}

              <Button type="submit" fullWidth disabled={submitting}>
                {submitting ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          )}
        </Card>

        <div className="text-center text-sm text-white/60">
          <Link href="/login" className="hover:text-white transition-colors">
            &larr; Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
