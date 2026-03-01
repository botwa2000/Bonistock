import type { Metadata } from "next";
import AboutPageContent from "@/components/features/about-page-content";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about the Bonistock team, our data sources, scoring methodology, and the Bonifatus Group.",
};

export default function AboutPage() {
  return <AboutPageContent />;
}
