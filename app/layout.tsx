import type { Metadata } from "next";
import { Alexandria, Outfit } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const thmanyahSans = localFont({
  src: [
    { path: "../public/fonts/thmanyahsans-Light.woff2", weight: "300" },
    { path: "../public/fonts/thmanyahsans-Regular.woff2", weight: "400" },
    { path: "../public/fonts/thmanyahsans-Medium.woff2", weight: "500" },
    { path: "../public/fonts/thmanyahsans-Bold.woff2", weight: "700" },
    { path: "../public/fonts/thmanyahsans-Black.woff2", weight: "900" },
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${alexandria.variable} ${outfit.variable} ${thmanyahSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
