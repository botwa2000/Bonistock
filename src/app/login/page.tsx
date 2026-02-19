"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { Badge } from "@/components/ui/badge";

export default function LoginPage() {
  const t = useTranslations("login");
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(username, password);
    if (success) {
      router.push("/dashboard");
    } else {
      setError(t("error"));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-white">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-white/60">{t("subtitle")}</p>
        </div>

        <Card variant="glass" padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t("usernamePlaceholder")}
              id="username"
              type="text"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
            <Input
              label={t("passwordPlaceholder")}
              id="password"
              type="password"
              placeholder="admin"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            {error && (
              <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {error}
              </div>
            )}

            <Button type="submit" fullWidth>
              {t("loginButton")}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Badge variant="accent">{t("demoHint")}</Badge>
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
