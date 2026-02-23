import type { Metadata } from "next";
import PricingPageContent from "@/components/features/pricing-page-content";

export const metadata: Metadata = {
  title: "Pricing — Bonistock",
  description:
    "Free, Plus, and Day Pass plans for Bonistock. Start free with top 5 stocks and basic ETF data. Upgrade for the full list.",
};

export default function PricingPage() {
  return <PricingPageContent />;
}
