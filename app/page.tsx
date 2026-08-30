import type { Metadata, Viewport } from "next";
import "./landing.css";

import { FinalCta } from "@/components/marketing/final-cta";
import { FlowSection } from "@/components/marketing/flow-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { OperationsSection } from "@/components/marketing/operations-section";
import { ProductShowcase } from "@/components/marketing/product-showcase";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { UseCasesSection } from "@/components/marketing/use-cases-section";

export const metadata: Metadata = {
  title: "منصة الطلبات الرقمية وإدارة الفروع",
  description:
    "أنشئ تجربة طلب سريعة عبر QR لأي نشاط، وأدر القوائم والطلبات والفروع والتحليلات من لوحة واحدة مع DineHub.",
  openGraph: {
    title: "DineHub — كل طلب يبدأ بسهولة",
    description:
      "تجربة طلب بدون تطبيق أو تسجيل للعميل، وتحكم كامل للفريق عبر الفروع.",
    type: "website",
    locale: "ar_SA",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f3ed",
};

export default function Home() {
  return (
    <div className="landing-page">
      <a className="skip-link" href="#main-content">
        انتقل إلى المحتوى
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
