"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { RegionSwitcher } from "@/components/ui/region-switcher";

export function Navbar() {
  const t = useTranslations();
  const { isLoggedIn } = useAuth();

  return (
    <nav className="sticky top-0 z-50 border-b border-border-subtle bg-surface-elevated/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-2 md:px-8">
        <div className="sm:hidden"><Logo size="sm" showText={false} /></div>
        <div className="hidden sm:block"><Logo /></div>
        <div className="flex items-center gap-2 sm:gap-6">
          <div className="hidden items-center gap-5 text-sm text-text-secondary md:flex">
            <Link href="/top-stocks" className="transition-colors hover:text-text-primary">
              {t("nav.stocks")}
            </Link>
            <Link href="/best-etfs" className="transition-colors hover:text-text-primary">
              {t("nav.etfs")}
            </Link>
            <Link href="/pricing" className="transition-colors hover:text-text-primary">
              {t("nav.pricing")}
            </Link>
            <Link href="/faq" className="transition-colors hover:text-text-primary">
              {t("nav.faq")}
            </Link>
            <Link href="/about" className="transition-colors hover:text-text-primary">
              {t("nav.about")}
            </Link>
          </div>
          {!isLoggedIn && <RegionSwitcher />}
          {!isLoggedIn && <LanguageSwitcher />}
          {isLoggedIn ? (
            <Link href="/dashboard">
              <Button size="sm">{t("nav.dashboard")}</Button>
            </Link>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="whitespace-nowrap">
                  {t("common.login")}
                </Button>
              </Link>
              <Link href="/login" className="hidden sm:block">
                <Button size="sm">{t("common.getStarted")}</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
