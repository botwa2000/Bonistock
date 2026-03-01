import type { Metadata } from "next";
import CookiesPageContent from "@/components/features/cookies-page-content";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "How Bonistock uses cookies for essential functionality and optional analytics.",
};

export default function CookiesPage() {
  return <CookiesPageContent />;
}
