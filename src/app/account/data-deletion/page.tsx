import type { Metadata } from "next";
import DataDeletionPageContent from "@/components/features/data-deletion-page-content";

export const metadata: Metadata = {
  title: "Data Deletion",
  description:
    "Request deletion of your Bonistock account and personal data.",
};

export default function DataDeletionPage() {
  return <DataDeletionPageContent />;
}
