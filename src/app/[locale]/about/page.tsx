import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import AboutPageContent from "@/components/features/about-page-content";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about the Bonistock team, our data sources, scoring methodology, and the Bonifatus Group.",
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
