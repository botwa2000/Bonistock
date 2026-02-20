"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function DayPassBanner() {
  const t = useTranslations("paywall");
  const {
    tier,
    passExpiry,
    passType,
    passActivationsRemaining,
    isPassActive,
    canActivatePass,
    activatePassDay,
  } = useAuth();

  if (tier === "pass") {
    const active = isPassActive();
    const remaining =
      active && passExpiry
        ? formatRemaining(new Date(passExpiry).getTime() - Date.now())
        : null;
    const passLabel =
      passType === "1day"
        ? "1-Day"
        : passType === "3day"
          ? "3-Day"
          : "12-Day";

    return (
      <div className="flex items-center justify-between rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Badge variant="accent">
            {passLabel} {t("passActive")}
          </Badge>
          {active && remaining && (
            <span className="text-sm text-white/70">
              {t("passExpires")} {remaining}
            </span>
          )}
          {active && (
            <span className="text-sm text-white/50">
              {passActivationsRemaining} activation
              {passActivationsRemaining !== 1 ? "s" : ""} remaining
            </span>
          )}
          {!active && canActivatePass() && (
            <>
              <span className="text-sm text-white/70">
                {passActivationsRemaining} activation
                {passActivationsRemaining !== 1 ? "s" : ""} remaining
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={activatePassDay}
              >
                Activate a Day
              </Button>
            </>
          )}
          {!active && !canActivatePass() && (
            <span className="text-sm text-rose-300">{t("passExpired")}</span>
          )}
        </div>
        <Button variant="secondary" size="sm">
          Upgrade to Plus
        </Button>
      </div>
    );
  }

  if (tier === "free") {
    return (
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="text-sm text-white/70">
          Viewing top 5 only.{" "}
          <span className="text-white">Unlock the full list</span> with a Pass
          (from $2.99) or Plus ($6.99/mo).
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm">
            Pass from $2.99
          </Button>
          <Button size="sm">Go Plus</Button>
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
