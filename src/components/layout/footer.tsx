"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/ui/logo";

export function Footer() {
  const t = useTranslations();

  return (
    <footer className="border-t border-white/5 bg-black/40">
      <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Logo size="sm" />
            <p className="mt-3 text-xs text-white/50">
              {t("footer.disclaimer")}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/60">
              {t("footer.product")}
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              <li>
                <Link href="/pricing" className="hover:text-white">
                  {t("nav.pricing")}
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white">
                  {t("nav.dashboard")}
                </Link>
              </li>
              <li>
                <Link href="/dashboard/mix" className="hover:text-white">
                  {t("nav.mix")}
                </Link>
              </li>
              <li>
                <Link href="/dashboard/brokers" className="hover:text-white">
                  {t("nav.brokers")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/60">
              {t("footer.company")}
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              <li>
                <Link href="/about" className="hover:text-white">
                  {t("nav.about")}
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white">
                  {t("common.login")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/60">
              {t("footer.legal")}
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              <li>
                <Link href="/privacy" className="hover:text-white">
                  {t("footer.privacy")}
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-white">
                  {t("footer.cookies")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white">
                  {t("footer.terms")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/5 pt-6 text-center text-xs text-white/40">
          &copy; {new Date().getFullYear()} {t("footer.copyright")}
        </div>
      </div>
    </footer>
  );
}
