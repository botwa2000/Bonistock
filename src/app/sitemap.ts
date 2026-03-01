import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://bonistock.com";

  return [
    { url: base, lastModified: new Date(), priority: 1.0 },
    { url: `${base}/pricing`, lastModified: new Date(), priority: 0.9 },
    { url: `${base}/faq`, lastModified: new Date(), priority: 0.8 },
    { url: `${base}/about`, lastModified: new Date(), priority: 0.7 },
    { url: `${base}/login`, lastModified: new Date(), priority: 0.5 },
    { url: `${base}/register`, lastModified: new Date(), priority: 0.5 },
    { url: `${base}/privacy`, lastModified: new Date(), priority: 0.3 },
    { url: `${base}/terms`, lastModified: new Date(), priority: 0.3 },
    { url: `${base}/cookies`, lastModified: new Date(), priority: 0.3 },
  ];
}
