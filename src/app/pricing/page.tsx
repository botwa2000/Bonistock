import type { Metadata } from "next";
import PricingPageContent from "@/components/features/pricing-page-content";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Free, Plus, and Day Pass plans for Bonistock. Start free with top 5 stocks and basic ETF data. Upgrade for the full list.",
};

function PricingJsonLd() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Bonistock Plus",
    description:
      "Full access to 200+ analyst-scored stocks, 100+ ranked ETFs, Auto-Mix, alerts, and performance tracking.",
    brand: { "@type": "Brand", name: "Bonistock" },
    offers: [
      {
        "@type": "Offer",
        price: "6.99",
        priceCurrency: "USD",
        priceValidUntil: "2026-12-31",
        availability: "https://schema.org/InStock",
        name: "Plus Monthly",
        url: "https://bonistock.com/pricing",
      },
      {
        "@type": "Offer",
        price: "49.99",
        priceCurrency: "USD",
        priceValidUntil: "2026-12-31",
        availability: "https://schema.org/InStock",
        name: "Plus Annual",
        url: "https://bonistock.com/pricing",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export default function PricingPage() {
  return (
    <>
      <PricingJsonLd />
      <PricingPageContent />
    </>
  );
}
