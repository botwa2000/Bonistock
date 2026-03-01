import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale, getMessages } from "next-intl/server";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-provider";
import { CookieConsentBanner } from "@/components/features/cookie-consent";
import { Analytics } from "@/components/features/analytics";
import { InstallPrompt } from "@/components/features/install-prompt";
import { NativeInit } from "@/components/features/native-init";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <AuthProvider>
        <ThemeProvider>
          {children}
          <CookieConsentBanner />
          <InstallPrompt />
          <NativeInit />
          <Analytics />
        </ThemeProvider>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
