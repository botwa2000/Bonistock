import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import ForgotPasswordPageContent from "@/components/features/forgot-password-page-content";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your Bonistock account password.",
};

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ForgotPasswordPageContent />;
}
