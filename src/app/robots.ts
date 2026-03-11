import type { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";

const protectedPaths = ["/dashboard/", "/settings", "/profile"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        ...locales.flatMap((l) => protectedPaths.map((p) => `/${l}${p}`)),
      ],
    },
    sitemap: "https://bonistock.com/sitemap.xml",
  };
}
