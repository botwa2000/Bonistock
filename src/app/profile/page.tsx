"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PersonalInfoSection } from "@/components/features/profile/personal-info-section";
import { SecuritySection } from "@/components/features/profile/security-section";
import { SubscriptionSection } from "@/components/features/profile/subscription-section";
import { AccountSection } from "@/components/features/profile/account-section";

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const t = useTranslations("profile");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoggedIn, user, loading } = useAuth();

  const emailChanged = searchParams.get("emailChanged") === "true";

  useEffect(() => {
    if (!loading && !isLoggedIn) router.push("/login");
  }, [isLoggedIn, loading, router]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-text-tertiary border-t-emerald-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isLoggedIn || !user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-text-primary">{t("title")}</h1>

        <div className="max-w-2xl space-y-6">
          <PersonalInfoSection emailChanged={emailChanged} />
          <SecuritySection />
          <SubscriptionSection />
          <AccountSection />
        </div>
      </div>
    </DashboardLayout>
  );
}
