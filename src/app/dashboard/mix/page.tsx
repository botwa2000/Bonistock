"use client";

import { useTranslations } from "next-intl";
import { SectionHeader } from "@/components/ui/section-header";
import { AutoMix } from "@/components/features/auto-mix";

export default function MixPage() {
  const t = useTranslations("mix");

  return (
    <div className="space-y-6">
      <SectionHeader
        overline="Auto-Mix"
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <AutoMix />
    </div>
  );
}
