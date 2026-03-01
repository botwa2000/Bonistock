import type { Metadata } from "next";
import PrivacyPageContent from "@/components/features/privacy-page-content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Bonistock collects, uses, and protects your personal data. GDPR compliant.",
};

export default function PrivacyPage() {
  return <PrivacyPageContent />;
}
