import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { DemoPortfoliosContent } from "@/components/features/demo-portfolios-content";

export const metadata: Metadata = {
  title: "Demo Portfolios — Analyst-Driven Model Portfolios",
  description:
    "Six model portfolios built on real analyst consensus data. See how stocks selected by analyst conviction, growth, value, and ETF strategies perform over time.",
  openGraph: {
    title: "Demo Portfolios — Bonistock",
    description: "Model portfolios built on analyst consensus. Track performance, weighted upside, and conviction scores.",
  },
};

export const revalidate = 3600;

export default async function DemoPortfoliosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <DemoPortfoliosContent />;
}
