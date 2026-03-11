import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import AboutPageContent from "@/components/features/about-page-content";

export const metadata: Metadata = {
  title: "About Bonistock — Stock Scoring & ETF Rankings",
  description:
    "Learn how Bonistock scores 200+ stocks by analyst consensus and ranks 100+ ETFs by actual returns. Meet the Bonifatus Group team from Bad Homburg, Germany.",
  openGraph: {
    title: "About Bonistock — How We Rank Stocks & ETFs",
    description:
      "Our scoring methodology, data sources, and the team behind Bonistock.",
  },
};

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AboutPageContent />;
}
