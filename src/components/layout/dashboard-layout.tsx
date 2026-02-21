"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SidebarLink {
  href: string;
  labelKey: string;
  icon: string;
  tier?: string;
}

const sidebarLinks: SidebarLink[] = [
  { href: "/dashboard", labelKey: "nav.stocks", icon: "chart" },
  { href: "/dashboard/etfs", labelKey: "nav.etfs", icon: "layers" },
  { href: "/dashboard/mix", labelKey: "nav.mix", icon: "mix" },
  { href: "/dashboard/brokers", labelKey: "nav.brokers", icon: "compare" },
  { href: "/dashboard/watchlist", labelKey: "nav.watchlist", icon: "eye", tier: "plus" },
  { href: "/dashboard/alerts", labelKey: "nav.alerts", icon: "bell", tier: "plus" },
];

const iconMap: Record<string, string> = {
  chart: "\u2191",
  layers: "\u25A6",
  mix: "\u2726",
  compare: "\u21C4",
  eye: "\u25C9",
  bell: "\u266A",
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, user, logout, loading } = useAuth();
  const username = user?.name ?? user?.email ?? "";
  const tier = user?.tier ?? "free";

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-text-tertiary border-t-emerald-400" />
      </div>
    );
  }

  if (!isLoggedIn) return null;

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-56 flex-shrink-0 flex-col border-r border-border-subtle bg-surface-elevated lg:w-64">
        <div className="border-b border-border-subtle p-4">
          <Logo size="sm" />
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {sidebarLinks.map((link) => {
              const isActive =
                link.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                      isActive
                        ? "bg-surface text-text-primary"
                        : "text-text-secondary hover:bg-surface hover:text-text-primary"
                    }`}
                  >
                    <span className="w-5 text-center">
                      {iconMap[link.icon]}
                    </span>
                    <span>{t(link.labelKey)}</span>
                    {link.tier && (
                      <Badge variant="accent" className="ml-auto text-[10px]">
                        {link.tier.toUpperCase()}
                      </Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border-subtle p-3 space-y-1">
          <Link
            href="/profile"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${pathname === "/profile" ? "bg-surface text-text-primary" : "text-text-secondary hover:bg-surface hover:text-text-primary"}`}
          >
            <span className="w-5 text-center">{"\u2B24"}</span>
            <span>{t("nav.profile")}</span>
          </Link>
          <Link
            href="/settings"
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${pathname === "/settings" ? "bg-surface text-text-primary" : "text-text-secondary hover:bg-surface hover:text-text-primary"}`}
          >
            <span className="w-5 text-center">{"\u2699"}</span>
            <span>{t("nav.settings")}</span>
          </Link>
        </div>

        <div className="border-t border-border-subtle p-4">
          <div className="flex items-center justify-between text-sm">
            <div>
              <div className="font-medium text-text-primary">{username}</div>
              <Badge variant="accent" className="mt-1">
                {tier.toUpperCase()}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                logout();
              }}
            >
              {t("common.logout")}
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
