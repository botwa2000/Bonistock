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
import type { UserRegion } from "@/lib/types";

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
  const { isLoggedIn, region, setRegion } = useAuth();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    if (!isLoggedIn) router.push("/login");
  }, [isLoggedIn, router]);

  if (!isLoggedIn) return null;

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
                value={region}
                onChange={(v) => setRegion(v as UserRegion)}
                options={[
                  { value: "us", label: t("regionUs") },
                  { value: "de", label: t("regionDe") },
                ]}
              />
            </div>
            <p className="mt-3 text-xs text-white/40">
              {region === "us" ? t("regionInfoUs") : t("regionInfoDe")}
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
                value={language}
                onChange={setLanguage}
                options={[
                  { value: "en", label: "English" },
                  { value: "de", label: "Deutsch (coming soon)" },
                  { value: "es", label: "Espanol (coming soon)" },
                  { value: "fr", label: "Francais (coming soon)" },
                ]}
              />
            </div>
            {language !== "en" && (
              <Badge variant="warning" className="mt-3">
                Translation coming soon — i18n scaffold ready
              </Badge>
            )}
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

          {/* Appearance */}
          <Card variant="glass" padding="lg">
            <h2 className="text-lg font-semibold text-white">
              {t("appearance")}
            </h2>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-white">{t("darkMode")}</div>
                <div className="text-xs text-white/50">
                  Dark mode is currently the only theme
                </div>
              </div>
              <Toggle checked={true} onChange={() => {}} />
            </div>
          </Card>

          {/* Danger Zone */}
          <Card variant="glass" padding="lg" className="border-rose-400/20">
            <h2 className="text-lg font-semibold text-white">
              {t("dangerZone")}
            </h2>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-white">{t("deleteAccount")}</div>
                <div className="text-xs text-white/50">
                  {t("deleteAccountDescription")}
                </div>
              </div>
              <Button variant="danger" size="sm">
                {t("deleteAccount")}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
