"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function DayPassBanner() {
  const t = useTranslations("paywall");
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const tier = user?.tier ?? "free";
  const passExpiry = user?.passExpiry ?? null;
  const passActivationsRemaining = user?.passActivationsRemaining ?? 0;
  const passWindowActive = user?.passWindowActive ?? false;

  const [activating, setActivating] = useState(false);
  const [remaining, setRemaining] = useState("");

  // Live countdown timer
  useEffect(() => {
    if (!passWindowActive || !passExpiry) return;

    const update = () => {
      const ms = new Date(passExpiry).getTime() - Date.now();
      if (ms <= 0) {
        setRemaining("Expired");
        return;
      }
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((ms % (1000 * 60)) / 1000);
      setRemaining(`${hours}h ${minutes}m ${seconds}s`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [passWindowActive, passExpiry]);

  const handleActivate = async () => {
    setActivating(true);
    try {
      const res = await fetch("/api/user/pass/activate", { method: "POST" });
      if (res.ok) {
        await refreshUser();
        router.refresh();
      }
    } finally {
      setActivating(false);
    }
  };

  if (tier === "pass") {
    // Active window — show countdown + consumption stats
    if (passWindowActive && passExpiry) {
      return (
        <Card variant="accent" padding="md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="accent">{t("passActive")}</Badge>
                <span className="text-sm font-semibold text-text-primary">
                  {remaining}
                </span>
              </div>
              <p className="text-xs text-text-tertiary">
                {passActivationsRemaining} activation{passActivationsRemaining !== 1 ? "s" : ""} remaining after this one
              </p>
            </div>
            <Link href="/pricing">
              <Button variant="secondary" size="sm">
                Upgrade to Plus
              </Button>
            </Link>
          </div>
        </Card>
      );
    }

    // Has remaining activations but no active window
    if (passActivationsRemaining > 0) {
      return (
        <Card variant="glass" padding="md" className="border-accent-fg/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-text-primary">Day Pass Ready</h3>
              <p className="text-xs text-text-secondary">
                {passActivationsRemaining} activation{passActivationsRemaining !== 1 ? "s" : ""} remaining &mdash; each gives 24h full access
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleActivate} disabled={activating} size="sm">
                {activating ? "Activating..." : "Activate a Day"}
              </Button>
              <Link href="/pricing">
                <Button variant="secondary" size="sm">
                  Upgrade to Plus
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      );
    }

    // No remaining activations
    return (
      <Card variant="glass" padding="md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-text-primary">All pass activations used</h3>
            <p className="text-xs text-text-secondary">
              Purchase more passes or upgrade to Plus for unlimited access.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/pricing">
              <Button variant="secondary" size="sm">Buy More Passes</Button>
            </Link>
            <Link href="/pricing">
              <Button size="sm">Upgrade to Plus</Button>
            </Link>
          </div>
        </div>
      </Card>
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
