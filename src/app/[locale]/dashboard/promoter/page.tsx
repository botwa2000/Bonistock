import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { PromoterDashboard } from "@/components/features/promoter-dashboard";

export const metadata: Metadata = {
  title: "Promoter Dashboard",
  robots: { index: false, follow: false },
};

export default async function PromoterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PromoterDashboard />;
}
