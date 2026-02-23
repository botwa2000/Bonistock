import type { Metadata } from "next";
import LandingPageContent from "@/components/features/landing-page-content";

export const metadata: Metadata = {
  title: "Bonistock — Stock Picks & ETF Rankings",
  description:
    "200+ stocks scored by analyst consensus. 100+ ETFs ranked by actual 1/3/5-year returns. Free to start.",
};

export default function LandingPage() {
  return <LandingPageContent />;
}
