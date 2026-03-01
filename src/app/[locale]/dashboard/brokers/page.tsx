"use client";

import { useTranslations } from "next-intl";
import { SectionHeader } from "@/components/ui/section-header";
import { BrokerComparison } from "@/components/features/broker-comparison";

export default function BrokersPage() {
  const t = useTranslations("brokers");

  return (
    <div className="space-y-6">
      <SectionHeader
        overline="Execute"
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <BrokerComparison />
    </div>
  );
}
