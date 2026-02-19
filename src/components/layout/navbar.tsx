"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const t = useTranslations();
  const { isLoggedIn } = useAuth();

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0b111c]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 md:px-8">
        <Logo />
        <div className="flex items-center gap-6">
          <div className="hidden items-center gap-5 text-sm text-white/70 md:flex">
            <Link href="/pricing" className="transition-colors hover:text-white">
              {t("nav.pricing")}
            </Link>
            <Link href="/about" className="transition-colors hover:text-white">
              {t("nav.about")}
            </Link>
          </div>
          {isLoggedIn ? (
            <Link href="/dashboard">
              <Button size="sm">{t("nav.dashboard")}</Button>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  {t("common.login")}
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm">{t("common.getStarted")}</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
