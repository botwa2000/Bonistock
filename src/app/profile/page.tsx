"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import type { Goal, Tier, PassDuration } from "@/lib/types";

export default function ProfilePage() {
  const t = useTranslations("profile");
  const router = useRouter();
  const { isLoggedIn, username, email, tier, goal, memberSince, region, setTier, setGoal, activatePass } =
    useAuth();

  useEffect(() => {
    if (!isLoggedIn) router.push("/login");
  }, [isLoggedIn, router]);

  if (!isLoggedIn) return null;

  const tierVariant =
    tier === "plus" ? "info" : tier === "pass" ? "accent" : "default";

  const handleTierChange = (value: string) => {
    if (value === "1day" || value === "3day" || value === "12day") {
      activatePass(value as PassDuration);
    } else {
      setTier(value as Tier);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">{t("title")}</h1>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card variant="glass" padding="lg">
            <h2 className="text-lg font-semibold text-white">
              Account Details
            </h2>
            <div className="mt-4 space-y-4 text-sm">
              <div className="flex justify-between border-b border-white/5 pb-3">
                <span className="text-white/60">{t("username")}</span>
                <span className="text-white">{username}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-3">
                <span className="text-white/60">{t("email")}</span>
                <span className="text-white">{email}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-white/60">{t("tier")}</span>
                <Badge variant={tierVariant}>{tier.toUpperCase()}</Badge>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-3">
                <span className="text-white/60">Region</span>
                <span className="text-white">{region === "us" ? "United States" : "Germany"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">{t("memberSince")}</span>
                <span className="text-white">{memberSince}</span>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card variant="glass" padding="lg">
              <h2 className="text-lg font-semibold text-white">
                {t("changeTier")}
              </h2>
              <p className="mt-1 text-xs text-white/50">
                Switch tier to preview different experiences (demo only).
              </p>
              <div className="mt-4">
                <Select
                  label={t("tier")}
                  id="tier-select"
                  value={tier}
                  onChange={handleTierChange}
                  options={[
                    { value: "free", label: "Free" },
                    { value: "1day", label: "1-Day Pass ($2.99/24h)" },
                    { value: "3day", label: "3-Day Pass ($5.99/72h)" },
                    { value: "12day", label: "12-Day Pass ($14.99/12d)" },
                    { value: "plus", label: "Plus ($6.99/mo)" },
                  ]}
                />
              </div>
              <Link href="/pricing">
                <Button variant="secondary" size="sm" className="mt-3">
                  View Plans
                </Button>
              </Link>
            </Card>

            <Card variant="glass" padding="lg">
              <h2 className="text-lg font-semibold text-white">
                {t("changeGoal")}
              </h2>
              <div className="mt-4">
                <Select
                  label={t("goal")}
                  id="goal-select"
                  value={goal}
                  onChange={(v) => setGoal(v as Goal)}
                  options={[
                    { value: "growth", label: "Growth" },
                    { value: "income", label: "Income" },
                    { value: "balanced", label: "Balanced" },
                  ]}
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
