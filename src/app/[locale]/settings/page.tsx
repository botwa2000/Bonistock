"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { useRegion } from "@/lib/region-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { getRegionMeta } from "@/lib/region-meta";

interface RegionCurrencyInfo {
  region: string;
  currencyId: string;
  currency: { id: string; name: string; symbol: string };
}

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
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-emerald-400" : "bg-surface"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-text-primary transition-transform ${checked ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const t = useTranslations("settings");
  const router = useRouter();
  const { isLoggedIn, user, refreshUser, loading } = useAuth();
  const { setRegion } = useRegion();
  const [emailAlerts, setEmailAlerts] = useState(user?.emailAlerts ?? true);
  const [weeklyDigest, setWeeklyDigest] = useState(user?.weeklyDigest ?? true);
  const [saving, setSaving] = useState(false);
  const [regionCurrencies, setRegionCurrencies] = useState<RegionCurrencyInfo[]>([]);

  useEffect(() => {
    if (!loading && !isLoggedIn) router.push("/login");
  }, [isLoggedIn, loading, router]);

  useEffect(() => {
    if (user) {
      setEmailAlerts(user.emailAlerts);
      setWeeklyDigest(user.weeklyDigest);
    }
  }, [user]);

  useEffect(() => {
    fetch("/api/region-currencies")
      .then((r) => r.json())
      .then((data: RegionCurrencyInfo[]) => setRegionCurrencies(data))
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-text-tertiary border-t-accent-fg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isLoggedIn || !user) return null;

  const updateBoolSetting = async (field: string, value: boolean) => {
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

  const updateSetting = async (field: string, value: string) => {
    setSaving(true);
    try {
      await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (field === "language") {
        document.cookie = `NEXT_LOCALE=${value.toLowerCase()}; path=/; max-age=31536000; SameSite=Lax`;
        router.refresh();
      }
      if (field === "region") {
        setRegion(value);
      }
      await refreshUser();
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-text-primary">{t("title")}</h1>

        <div className="max-w-2xl space-y-6">
          {/* Market Region */}
          <Card variant="glass" padding="lg">
            <h2 className="text-lg font-semibold text-text-primary">
              {t("region")}
            </h2>
            <p className="mt-1 text-xs text-text-tertiary">
              {t("regionDescription")}
            </p>
            <div className="mt-4">
              <Select
                id="region"
                value={user.region}
                onChange={(v) => updateSetting("region", v)}
                options={
                  regionCurrencies.length > 0
                    ? [...new Set(regionCurrencies.map((rc) => rc.region))].map((code) => {
                        const meta = getRegionMeta(code);
                        const rc = regionCurrencies.find((r) => r.region === code);
                        const curr = rc?.currency?.symbol ?? "";
                        return {
                          value: code,
                          label: `${meta.flag} ${meta.label}${curr ? ` (${rc?.currencyId})` : ""}`,
                        };
                      })
                    : [
                        { value: "GLOBAL", label: t("regionUs") },
                        { value: "DE", label: t("regionDe") },
                      ]
                }
              />
            </div>
            <p className="mt-3 text-xs text-text-tertiary">
              {user.region === "GLOBAL" ? t("regionInfoUs") : t("regionInfoDe")}
            </p>
          </Card>

          {/* Language */}
          <Card variant="glass" padding="lg">
            <h2 className="text-lg font-semibold text-text-primary">
              {t("language")}
            </h2>
            <p className="mt-1 text-xs text-text-tertiary">
              {t("languageDescription")}
            </p>
            <div className="mt-4">
              <Select
                id="lang"
                value={user.language}
                onChange={(v) => updateSetting("language", v)}
                options={[
                  { value: "EN", label: "English" },
                  { value: "DE", label: "Deutsch" },
                ]}
              />
            </div>
          </Card>

          {/* Theme */}
          <Card variant="glass" padding="lg">
            <h2 className="text-lg font-semibold text-text-primary">
              {t("appearance")}
            </h2>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-text-primary">{t("darkMode")}</div>
                <div className="text-xs text-text-tertiary">
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
            <h2 className="text-lg font-semibold text-text-primary">
              {t("notifications")}
            </h2>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-text-primary">{t("emailAlerts")}</div>
                  <div className="text-xs text-text-tertiary">
                    {t("emailAlertsDescription")}
                  </div>
                </div>
                <Toggle checked={emailAlerts} onChange={(v) => { setEmailAlerts(v); updateBoolSetting("emailAlerts", v); }} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-text-primary">{t("weeklyDigest")}</div>
                  <div className="text-xs text-text-tertiary">
                    {t("weeklyDigestDescription")}
                  </div>
                </div>
                <Toggle checked={weeklyDigest} onChange={(v) => { setWeeklyDigest(v); updateBoolSetting("weeklyDigest", v); }} />
              </div>
            </div>
          </Card>

          {/* Goal */}
          <Card variant="glass" padding="lg">
            <h2 className="text-lg font-semibold text-text-primary">Investment Goal</h2>
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
            <p className="text-xs text-text-tertiary text-center">Saving...</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
