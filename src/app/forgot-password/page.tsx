import type { Metadata } from "next";
import ForgotPasswordPageContent from "@/components/features/forgot-password-page-content";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your Bonistock account password.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageContent />;
}
