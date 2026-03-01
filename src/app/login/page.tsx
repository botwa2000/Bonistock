import type { Metadata } from "next";
import LoginPageContent from "@/components/features/login-page-content";

export const metadata: Metadata = {
  title: "Log In",
  description: "Sign in to your Bonistock account.",
};

export default function LoginPage() {
  return <LoginPageContent />;
}
