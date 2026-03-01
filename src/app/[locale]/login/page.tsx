import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import LoginPageContent from "@/components/features/login-page-content";

export const metadata: Metadata = {
  title: "Log In",
  description: "Sign in to your Bonistock account.",
};

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LoginPageContent />;
}
