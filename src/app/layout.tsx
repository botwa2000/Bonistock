import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { getLocale } from "next-intl/server";
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
      en: "https://bonistock.com/en",
      de: "https://bonistock.com/de",
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

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#10b981" />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${jetBrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
