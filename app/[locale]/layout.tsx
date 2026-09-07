import type { Metadata } from "next";
import { Alexandria, Outfit } from "next/font/google";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import "@/app/globals.css";

const thmanyahSans = localFont({
  src: [
    { path: "../../public/fonts/thmanyahsans-Light.woff2", weight: "300" },
    { path: "../../public/fonts/thmanyahsans-Regular.woff2", weight: "400" },
    { path: "../../public/fonts/thmanyahsans-Medium.woff2", weight: "500" },
    { path: "../../public/fonts/thmanyahsans-Bold.woff2", weight: "700" },
    { path: "../../public/fonts/thmanyahsans-Black.woff2", weight: "900" },
  ],
  variable: "--font-thmanyah",
  display: "swap",
});

const alexandria = Alexandria({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "DineHub | الطلب يبدأ بمسح، والتشغيل يبقى تحت سيطرتك",
    template: "%s | DineHub",
  },
  description:
    "منصة طلبات رقمية عبر QR تمنح عملاءك تجربة سريعة، وتمنح فريقك إدارة الفروع والقوائم والطلبات والتحليلات من مكان واحد.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "ar" | "en")) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      data-locale={locale}
      className={`${alexandria.variable} ${outfit.variable} ${thmanyahSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
