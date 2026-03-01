import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import PrivacyPageContent from "@/components/features/privacy-page-content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Bonistock collects, uses, and protects your personal data. GDPR compliant.",
};

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PrivacyPageContent />;
}
