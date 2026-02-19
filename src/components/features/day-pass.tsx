"use client";

import { useTranslations } from "next-intl";
import { passOptions } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function DayPassSection() {
  const t = useTranslations("pricing");

  return (
    <Card variant="glass" padding="lg">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white">
          {t("dayPassTitle")}
        </h3>
        <p className="mt-1 text-sm text-white/60">{t("dayPassSubtitle")}</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {passOptions.map((option) => (
          <div
            key={option.duration}
            className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">
                {option.price}
              </span>
              {option.savings && (
                <Badge variant="accent">{option.savings}</Badge>
              )}
            </div>
            <div className="text-sm font-medium text-white">{option.name}</div>
            <p className="text-xs text-white/60">{option.description}</p>
            <p className="text-xs text-white/40">{option.perDay}</p>
            <Button variant="secondary" size="sm" fullWidth>
              Buy {option.name}
            </Button>
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-white/40">
        {t("dayPassNote")}
      </p>
    </Card>
  );
}
