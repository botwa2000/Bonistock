import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-provider";
import { CookieConsentBanner } from "@/components/features/cookie-consent";
import { Analytics } from "@/components/features/analytics";
import { InstallPrompt } from "@/components/features/install-prompt";
import { NativeInit } from "@/components/features/native-init";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bonistock.com"),
  title: {
    default: "Bonistock — Stock Picks & ETF Rankings",
    template: "%s — Bonistock",
  },
  description:
    "200+ stocks scored nightly by analyst consensus. 100+ ETFs ranked by actual 1/3/5-year returns. Free to start.",
  openGraph: {
    type: "website",
    siteName: "Bonistock",
    locale: "en_US",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
  },
  alternates: {
    languages: {
      en: "https://bonistock.com",
      de: "https://bonistock.com",
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/icon-192.png",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#10b981" />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${jetBrainsMono.variable} antialiased`}
      >
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
      </body>
    </html>
  );
}
