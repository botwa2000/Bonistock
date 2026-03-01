import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import TermsPageContent from "@/components/features/terms-page-content";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms and conditions for using the Bonistock platform.",
};

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <TermsPageContent />;
}
