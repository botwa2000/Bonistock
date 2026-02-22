"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Toast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";

function PaymentToastInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    const subscription = searchParams.get("subscription");
    const pass = searchParams.get("pass");
    const canceled = searchParams.get("canceled");

    if (subscription === "success") {
      setToast({ message: "Subscription activated! Welcome to Plus.", variant: "success" });
    } else if (pass === "success") {
      setToast({ message: "Pass purchased! Activate it from your dashboard.", variant: "success" });
    } else if (canceled === "true") {
      setToast({ message: "Payment canceled. No charges were made.", variant: "info" });
    } else {
      return;
    }

    // Clean URL params
    const url = new URL(window.location.href);
    url.searchParams.delete("subscription");
    url.searchParams.delete("pass");
    url.searchParams.delete("canceled");
    router.replace(url.pathname + url.search, { scroll: false });

    // Refresh user tier after successful payment (webhook may need a moment)
    if (subscription === "success" || pass === "success") {
      const t1 = setTimeout(() => refreshUser(), 1500);
      const t2 = setTimeout(() => refreshUser(), 4000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [searchParams, router, refreshUser]);

  if (!toast) return null;

  return (
    <Toast
      message={toast.message}
      variant={toast.variant}
      onClose={() => setToast(null)}
    />
  );
}

export function PaymentToast() {
  return (
    <Suspense fallback={null}>
      <PaymentToastInner />
    </Suspense>
  );
}
