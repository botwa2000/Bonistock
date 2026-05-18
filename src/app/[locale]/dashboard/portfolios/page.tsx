"use client";

import { useAuth } from "@/lib/auth-context";
import { SectionHeader } from "@/components/ui/section-header";
import { UpgradePaywall } from "@/components/features/upgrade-paywall";
import { PortfolioManager } from "@/components/features/portfolio-manager";

export default function PortfoliosPage() {
  const { user } = useAuth();
  const tier = user?.tier ?? "free";
  const isPaid = tier === "plus" || (tier === "pass" && !!user?.passWindowActive);

  if (!isPaid) {
    return (
      <UpgradePaywall feature="Model portfolios — build analyst-driven baskets, track weighted upside, and monitor how analyst consensus plays out over time" />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        overline="Paid feature"
        title="My Portfolios"
        subtitle="Weight-based model portfolios built on analyst consensus data. Up to 10 portfolios, 20 holdings each."
      />
      <PortfolioManager />
    </div>
  );
}
