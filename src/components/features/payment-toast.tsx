"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Toast } from "@/components/ui/toast";

function PaymentToastInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
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
  }, [searchParams, router]);

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
