import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import DataDeletionPageContent from "@/components/features/data-deletion-page-content";

export const metadata: Metadata = {
  title: "Data Deletion",
  description:
    "Request deletion of your Bonistock account and personal data.",
};

export default async function DataDeletionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <DataDeletionPageContent />;
}
