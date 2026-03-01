import type { Metadata } from "next";
import RegisterPageContent from "@/components/features/register-page-content";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Create a free Bonistock account. Access 200+ analyst-scored stocks and 100+ ranked ETFs.",
};

export default function RegisterPage() {
  return <RegisterPageContent />;
}
