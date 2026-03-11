import type { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://bonistock.com";

  const pages = [
    { path: "/", priority: 1.0 },
    { path: "/top-stocks", priority: 0.9 },
    { path: "/best-etfs", priority: 0.9 },
    { path: "/pricing", priority: 0.9 },
    { path: "/faq", priority: 0.8 },
    { path: "/about", priority: 0.7 },
    { path: "/login", priority: 0.5 },
    { path: "/register", priority: 0.5 },
    { path: "/privacy", priority: 0.3 },
    { path: "/terms", priority: 0.3 },
    { path: "/cookies", priority: 0.3 },
  ];

  return pages.flatMap((page) =>
    locales.map((locale) => ({
      url: `${base}/${locale}${page.path === "/" ? "" : page.path}`,
      lastModified: new Date(),
      priority: page.priority,
      alternates: {
        languages: {
          en: `${base}/en${page.path === "/" ? "" : page.path}`,
          de: `${base}/de${page.path === "/" ? "" : page.path}`,
        },
      },
    }))
  );
}
