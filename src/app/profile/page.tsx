"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function ProfilePage() {
  const t = useTranslations("profile");
  const router = useRouter();
  const { isLoggedIn, user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isLoggedIn) router.push("/login");
  }, [isLoggedIn, loading, router]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isLoggedIn || !user) return null;

  const tier = user.tier;
  const tierVariant =
    tier === "plus" ? "info" : tier === "pass" ? "accent" : "default";

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
                <span className="text-white">{user.name}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-3">
                <span className="text-white/60">{t("email")}</span>
                <span className="text-white">{user.email}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-white/60">{t("tier")}</span>
                <Badge variant={tierVariant}>{tier.toUpperCase()}</Badge>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-3">
                <span className="text-white/60">Region</span>
                <span className="text-white">{user.region === "US" ? "United States" : "Germany"}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-3">
                <span className="text-white/60">2FA</span>
                <Badge variant={user.twoFactorEnabled ? "accent" : "default"}>
                  {user.twoFactorEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">Email verified</span>
                <Badge variant={user.emailVerified ? "accent" : "warning"}>
                  {user.emailVerified ? "Verified" : "Not verified"}
                </Badge>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <Card variant="glass" padding="lg">
              <h2 className="text-lg font-semibold text-white">Subscription</h2>
              <p className="mt-2 text-sm text-white/60">
                {tier === "plus"
                  ? "You have full access to all features."
                  : tier === "pass"
                  ? `You have ${user.passActivationsRemaining} activations remaining.`
                  : "Upgrade to Plus for full access."}
              </p>
              <Link href="/pricing">
                <Button variant="secondary" size="sm" className="mt-3">
                  {tier === "free" ? "Upgrade" : "Manage Subscription"}
                </Button>
              </Link>
            </Card>

            <Card variant="glass" padding="lg">
              <h2 className="text-lg font-semibold text-white">Security</h2>
              <div className="mt-3 space-y-2">
                <Link href="/settings">
                  <Button variant="secondary" size="sm" fullWidth>
                    {user.twoFactorEnabled ? "Manage 2FA" : "Enable 2FA"}
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
