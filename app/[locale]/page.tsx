import type { Metadata, Viewport } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import "@/app/landing.css";
import "@/app/landing-dark.css";

import { FinalCta } from "@/components/marketing/final-cta";
import { FlowSection } from "@/components/marketing/flow-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { OperationsSection } from "@/components/marketing/operations-section";
import { ProductShowcase } from "@/components/marketing/product-showcase";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { ThemeBootstrapScript } from "@/components/marketing/theme-bootstrap-script";
import { UseCasesSection } from "@/components/marketing/use-cases-section";

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: "#f7f3ed",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: locale === "ar" ? "/" : `/${locale}`,
      languages: {
        ar: "/",
        en: "/en",
      },
    },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      type: "website",
      locale: t("ogLocale"),
    },
  };
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tCommon = await getTranslations({ locale, namespace: "Common" });

  return (
    <div className="landing-page">
      <ThemeBootstrapScript />
      <a className="skip-link" href="#main-content">
        {tCommon("skipToContent")}
      </a>
      <SiteHeader />
      <main id="main-content">
        <HeroSection />
        <FlowSection />
        <ProductShowcase />
        <OperationsSection />
        <UseCasesSection />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}
