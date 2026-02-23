"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SectionHeader } from "@/components/ui/section-header";
import { AutoMix } from "@/components/features/auto-mix";
import { EtfMix } from "@/components/features/etf-mix";

export default function MixPage() {
  const t = useTranslations("mix");
  const [tab, setTab] = useState<"stock" | "etf">("stock");

  return (
    <div className="space-y-6">
      <SectionHeader
        overline="Auto-Mix"
        title={t("title")}
        subtitle={tab === "stock" ? t("subtitle") : t("etfSubtitle")}
      />

      <div className="flex gap-2">
        <button
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === "stock"
              ? "bg-emerald-400/20 text-emerald-400 border border-emerald-400/30"
              : "bg-surface text-text-secondary border border-border hover:text-text-primary"
          }`}
          onClick={() => setTab("stock")}
        >
          {t("stockMix")}
        </button>
        <button
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === "etf"
              ? "bg-emerald-400/20 text-emerald-400 border border-emerald-400/30"
              : "bg-surface text-text-secondary border border-border hover:text-text-primary"
          }`}
          onClick={() => setTab("etf")}
        >
          {t("etfMix")}
        </button>
      </div>

      {tab === "stock" ? <AutoMix /> : <EtfMix />}
    </div>
  );
}
