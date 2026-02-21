"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-emerald-400" : "bg-white/20"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const t = useTranslations("settings");
  const router = useRouter();
  const { isLoggedIn, user, refreshUser, loading } = useAuth();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const updateSetting = async (field: string, value: string) => {
    setSaving(true);
    try {
      await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      await refreshUser();
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">{t("title")}</h1>

        <div className="max-w-2xl space-y-6">
          {/* Market Region */}
          <Card variant="glass" padding="lg">
            <h2 className="text-lg font-semibold text-white">
              {t("region")}
            </h2>
            <p className="mt-1 text-xs text-white/50">
              {t("regionDescription")}
            </p>
            <div className="mt-4">
              <Select
                id="region"
                value={user.region}
                onChange={(v) => updateSetting("region", v)}
                options={[
                  { value: "US", label: t("regionUs") },
                  { value: "DE", label: t("regionDe") },
                ]}
              />
            </div>
            <p className="mt-3 text-xs text-white/40">
              {user.region === "US" ? t("regionInfoUs") : t("regionInfoDe")}
            </p>
          </Card>

          {/* Language */}
          <Card variant="glass" padding="lg">
            <h2 className="text-lg font-semibold text-white">
              {t("language")}
            </h2>
            <p className="mt-1 text-xs text-white/50">
              {t("languageDescription")}
            </p>
            <div className="mt-4">
              <Select
                id="lang"
                value={user.language}
                onChange={(v) => updateSetting("language", v)}
                options={[
                  { value: "EN", label: "English" },
                  { value: "DE", label: "Deutsch (coming soon)" },
                  { value: "ES", label: "Espanol (coming soon)" },
                  { value: "FR", label: "Francais (coming soon)" },
                ]}
              />
            </div>
            {user.language !== "EN" && (
              <Badge variant="warning" className="mt-3">
                Translation coming soon
              </Badge>
            )}
          </Card>

          {/* Theme */}
          <Card variant="glass" padding="lg">
            <h2 className="text-lg font-semibold text-white">
              {t("appearance")}
            </h2>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-white">{t("darkMode")}</div>
                <div className="text-xs text-white/50">
                  Toggle between dark and light mode
                </div>
              </div>
              <Toggle
                checked={user.theme === "DARK"}
                onChange={(v) => updateSetting("theme", v ? "DARK" : "LIGHT")}
              />
            </div>
          </Card>

          {/* Notifications */}
          <Card variant="glass" padding="lg">
            <h2 className="text-lg font-semibold text-white">
              {t("notifications")}
            </h2>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white">{t("emailAlerts")}</div>
                  <div className="text-xs text-white/50">
                    {t("emailAlertsDescription")}
                  </div>
                </div>
                <Toggle checked={emailAlerts} onChange={setEmailAlerts} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white">{t("weeklyDigest")}</div>
                  <div className="text-xs text-white/50">
                    {t("weeklyDigestDescription")}
                  </div>
                </div>
                <Toggle checked={weeklyDigest} onChange={setWeeklyDigest} />
              </div>
            </div>
          </Card>

          {/* Goal */}
          <Card variant="glass" padding="lg">
            <h2 className="text-lg font-semibold text-white">Investment Goal</h2>
            <div className="mt-4">
              <Select
                id="goal"
                value={user.goal}
                onChange={(v) => updateSetting("goal", v)}
                options={[
                  { value: "GROWTH", label: "Growth" },
                  { value: "INCOME", label: "Income" },
                  { value: "BALANCED", label: "Balanced" },
                ]}
              />
            </div>
          </Card>

          {saving && (
            <p className="text-xs text-white/40 text-center">Saving...</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
