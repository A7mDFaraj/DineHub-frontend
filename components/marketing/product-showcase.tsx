import {
  BarChart3,
  Layers3,
  MessageSquareText,
  QrCode,
} from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { SectionHeading } from "@/components/marketing/section-heading";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export async function ProductShowcase() {
  const t = await getTranslations("Showcase");

  return (
    <section className="landing-section showcase-section" id="experience">
      <div className="landing-shell">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={
            <>
              {t("titleLine1")}{" "}
              <span className="section-title-line">{t("titleLine2")}</span>
            </>
          }
          description={t("description")}
          align="center"
        />

        <div className="showcase-grid">
          <Card glass={false} className="feature-card feature-card--lead">
            <CardHeader>
              <div className="feature-icon">
                <QrCode aria-hidden="true" strokeWidth={1.7} />
              </div>
              <CardTitle>{t("feature1Title")}</CardTitle>
              <CardDescription>{t("feature1Desc")}</CardDescription>
            </CardHeader>
            <CardContent className="feature-visual feature-visual--menu">
              <Image
                src="/brand/feature-qr-menu.png"
                alt={t("feature1Alt")}
                width={1254}
                height={1254}
                sizes="(max-width: 767px) 88vw, 52vw"
              />
            </CardContent>
          </Card>

          <Card glass={false} className="feature-card feature-card--coral">
            <CardHeader>
              <div className="feature-icon">
                <MessageSquareText aria-hidden="true" strokeWidth={1.7} />
              </div>
              <CardTitle>{t("feature2Title")}</CardTitle>
              <CardDescription>{t("feature2Desc")}</CardDescription>
            </CardHeader>
            <CardContent className="feature-visual">
              <Image
                src="/brand/feature-custom-order.png"
                alt={t("feature2Alt")}
                width={1230}
                height={1278}
                sizes="(max-width: 767px) 88vw, 34vw"
              />
            </CardContent>
          </Card>

          <Card glass={false} className="feature-card feature-card--aqua">
            <CardHeader>
              <div className="feature-icon">
                <BarChart3 aria-hidden="true" strokeWidth={1.7} />
              </div>
              <CardTitle>{t("feature3Title")}</CardTitle>
              <CardDescription>{t("feature3Desc")}</CardDescription>
            </CardHeader>
            <CardContent className="feature-visual">
              <Image
                src="/brand/feature-analytics.png"
                alt={t("feature3Alt")}
                width={1312}
                height={1199}
                sizes="(max-width: 767px) 88vw, 34vw"
              />
            </CardContent>
          </Card>
        </div>

        <div className="showcase-footnote">
          <Layers3 aria-hidden="true" strokeWidth={1.7} />
          <p>{t("footnote")}</p>
        </div>
      </div>
    </section>
  );
}
