"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";

const steps = [
  { icon: "\uD83C\uDFAF", key: "step1" },
  { icon: "\uD83D\uDCC8", key: "step2" },
  { icon: "\u2726", key: "step3" },
  { icon: "\uD83D\uDE80", key: "step4" },
] as const;

export function HowItWorks() {
  const t = useTranslations("landing");

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {steps.map((step, idx) => (
        <Card key={step.key} variant="glass" className="relative text-center">
          <div className="absolute -top-3 left-4 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400 text-xs font-bold text-gray-900">
            {idx + 1}
          </div>
          <div className="mt-2 text-3xl">{step.icon}</div>
          <h3 className="mt-3 text-base font-semibold text-text-primary">
            {t(`${step.key}Title`)}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            {t(`${step.key}Text`)}
          </p>
        </Card>
      ))}
    </div>
  );
}
