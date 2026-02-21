"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function DayPassBanner() {
  const t = useTranslations("paywall");
  const { user } = useAuth();

  const tier = user?.tier ?? "free";
  const passExpiry = user?.passExpiry ?? null;
  const passActivationsRemaining = user?.passActivationsRemaining ?? 0;

  if (tier === "pass") {
    const active = passExpiry ? Date.now() < new Date(passExpiry).getTime() : false;
    const remaining =
      active && passExpiry
        ? formatRemaining(new Date(passExpiry).getTime() - Date.now())
        : null;

    return (
      <div className="flex items-center justify-between rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Badge variant="accent">{t("passActive")}</Badge>
          {active && remaining && (
            <span className="text-sm text-text-secondary">
              {t("passExpires")} {remaining}
            </span>
          )}
          <span className="text-sm text-text-tertiary">
            {passActivationsRemaining} activation
            {passActivationsRemaining !== 1 ? "s" : ""} remaining
          </span>
          {!active && passActivationsRemaining > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                await fetch("/api/user/pass/activate", { method: "POST" });
                window.location.reload();
              }}
            >
              Activate a Day
            </Button>
          )}
          {!active && passActivationsRemaining <= 0 && (
            <span className="text-sm text-rose-300">{t("passExpired")}</span>
          )}
        </div>
        <Link href="/pricing">
          <Button variant="secondary" size="sm">
            Upgrade to Plus
          </Button>
        </Link>
      </div>
    );
  }

  if (tier === "free") {
    return (
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
        <div className="text-sm text-text-secondary">
          Viewing top 5 only.{" "}
          <span className="text-text-primary">Unlock the full list</span> with a Pass
          (from $2.99) or Plus ($6.99/mo).
        </div>
        <div className="flex gap-2">
          <Link href="/pricing">
            <Button variant="secondary" size="sm">
              Pass from $2.99
            </Button>
          </Link>
          <Link href="/pricing">
            <Button size="sm">Go Plus</Button>
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0m";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}
