import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import LandingPageContent from "@/components/features/landing-page-content";

export const metadata: Metadata = {
  title: "Bonistock — Stock Picks & ETF Rankings",
  description:
    "200+ stocks scored by analyst consensus. 100+ ETFs ranked by actual 1/3/5-year returns. Free to start.",
};

function HomeJsonLd() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Bonistock",
        url: "https://bonistock.com",
        logo: "https://bonistock.com/icons/icon-512.png",
        description:
          "Stock picks scored by analyst consensus and ETFs ranked by actual returns.",
      },
      {
        "@type": "WebSite",
        name: "Bonistock",
        url: "https://bonistock.com",
      },
      {
        "@type": "SoftwareApplication",
        name: "Bonistock",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        url: "https://bonistock.com",
        description:
          "200+ stocks scored nightly by analyst consensus. 100+ ETFs ranked by actual 1/3/5-year returns. Auto-Mix portfolio builder. Free to start.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
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

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <HomeJsonLd />
      <LandingPageContent />
    </>
  );
}
