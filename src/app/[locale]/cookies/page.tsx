import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import CookiesPageContent from "@/components/features/cookies-page-content";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "How Bonistock uses cookies for essential functionality and optional analytics.",
};

export default async function CookiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CookiesPageContent />;
}
