import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import RegisterPageContent from "@/components/features/register-page-content";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Create a free Bonistock account. Access 200+ analyst-scored stocks and 100+ ranked ETFs.",
};

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <RegisterPageContent />;
}
