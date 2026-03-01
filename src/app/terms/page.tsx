import type { Metadata } from "next";
import TermsPageContent from "@/components/features/terms-page-content";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms and conditions for using the Bonistock platform.",
};

export default function TermsPage() {
  return <TermsPageContent />;
}
