import { defineRouting } from "next-intl/routing";

export const locales = ["en", "de", "fr", "es", "it"] as const;
export type AppLocale = (typeof locales)[number];

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale: "en" satisfies AppLocale,
  localePrefix: "always",
});
