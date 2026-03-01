import type { Metadata } from "next";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
