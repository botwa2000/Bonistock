import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/en/dashboard/", "/de/dashboard/", "/en/settings", "/de/settings", "/en/profile", "/de/profile"],
    },
    sitemap: "https://bonistock.com/sitemap.xml",
  };
}
