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
        <h3 className="text-lg font-semibold text-text-primary">
          {t("dayPassTitle")}
        </h3>
        <p className="mt-1 text-sm text-text-secondary">{t("dayPassSubtitle")}</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {passOptions.map((option) => (
          <div
            key={option.duration}
            className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface-elevated p-4"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-text-primary">
                {option.price}
              </span>
              {option.savings && (
                <Badge variant="accent">{option.savings}</Badge>
              )}
            </div>
            <div className="text-sm font-medium text-text-primary">{option.name}</div>
            <p className="text-xs text-text-secondary">{option.description}</p>
            <p className="text-xs text-text-tertiary">{option.perDay}</p>
            <Button variant="secondary" size="sm" fullWidth>
              Buy {option.name}
            </Button>
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-text-tertiary">
        {t("dayPassNote")}
      </p>
    </Card>
  );
}
