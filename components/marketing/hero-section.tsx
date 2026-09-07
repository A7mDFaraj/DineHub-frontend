import {
  ArrowUpLeft,
  ArrowUpRight,
  BarChart3,
  BellRing,
  Check,
  LayoutGrid,
  MousePointerClick,
  QrCode,
  ScanLine,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import heroImage from "@/public/brand/herosection image.png";

type JourneyStep = {
  step: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export async function HeroSection() {
  const locale = await getLocale();
  const isRtl = locale === "ar";
  const t = await getTranslations("Hero");

  const productPromises = [
    t("promiseNoApp"),
    t("promiseNoSignup"),
    t("promiseAllScreens"),
  ];

  const journeySteps: JourneyStep[] = [
    { step: "01", title: t("step1Title"), description: t("step1Desc"), icon: QrCode },
    { step: "02", title: t("step2Title"), description: t("step2Desc"), icon: LayoutGrid },
    { step: "03", title: t("step3Title"), description: t("step3Desc"), icon: SlidersHorizontal },
    { step: "04", title: t("step4Title"), description: t("step4Desc"), icon: BellRing },
    { step: "05", title: t("step5Title"), description: t("step5Desc"), icon: BarChart3 },
  ];

  return (
    <section className="hero-section" aria-labelledby="hero-title">
      <div className="hero-orbit hero-orbit--one" aria-hidden="true" />
      <div className="hero-orbit hero-orbit--two" aria-hidden="true" />

      <div className="landing-shell hero-shell hero-grid">
        <div className="hero-copy">
          <div className="hero-intro">
            <ScanLine aria-hidden="true" strokeWidth={1.8} />
            <span>{t("intro")}</span>
          </div>

          <h1 id="hero-title">
            <span className="hero-title-line">
              {t("titleLine1")} <em>{t("titleLine1Em")}</em>
            </span>
            <span className="hero-title-line hero-title-line--secondary">
              {t("titleLine2")}
            </span>
          </h1>

          <p className="hero-lede">{t("lede")}</p>

          <div className="hero-actions">
            <Button asChild variant="brand" size="xl">
              <Link href="/admin/login">
                {t("ctaStart")}
                {isRtl ? (
                  <ArrowUpLeft aria-hidden="true" strokeWidth={2} />
                ) : (
                  <ArrowUpRight aria-hidden="true" strokeWidth={2} />
                )}
              </Link>
            </Button>
            <Button asChild variant="brandOutline" size="xl">
              <a href="#experience">
                {t("ctaExperience")}
                <MousePointerClick aria-hidden="true" strokeWidth={1.8} />
              </a>
            </Button>
          </div>

          <ul className="hero-promises" aria-label={t("promisesAria")}>
            {productPromises.map((item) => (
              <li key={item}>
                <Check aria-hidden="true" strokeWidth={2.2} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="hero-visual">
          <div className="hero-visual-glow" aria-hidden="true" />
          <div className="hero-art-frame">
            <span className="hero-art-halo hero-art-halo--outer" aria-hidden="true" />
            <span className="hero-art-halo hero-art-halo--inner" aria-hidden="true" />
            <Image
              className="hero-illustration"
              src={heroImage}
              alt={t("heroImageAlt")}
              sizes="(max-width: 767px) 96vw, (max-width: 1199px) 72vw, 760px"
              loading="eager"
              placeholder="blur"
            />
          </div>

          <div className="hero-signal hero-signal--customer" aria-hidden="true">
            <span className="signal-icon">
              <ScanLine strokeWidth={1.8} />
            </span>
            <span>
              <strong>{t("signalCustomerTitle")}</strong>
              <small>{t("signalCustomerDesc")}</small>
            </span>
          </div>

          <div className="hero-signal hero-signal--team" aria-hidden="true">
            <span className="signal-pulse" />
            <span>
              <strong>{t("signalTeamTitle")}</strong>
              <small>{t("signalTeamDesc")}</small>
            </span>
          </div>
        </div>
      </div>

      <div className="landing-shell hero-shell hero-journey-wrap">
        <ol
          className="hero-journey"
          aria-label={t("journeyAria")}
        >
          {journeySteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <li
                key={step.step}
                className={`hero-journey-item hero-journey-item--${idx + 1}`}
              >
                <span className="hero-journey-step-num" aria-hidden="true">
                  {step.step}
                </span>
                <span className="hero-journey-icon">
                  <Icon aria-hidden="true" strokeWidth={1.7} />
                </span>
                <span className="hero-journey-text">
                  <strong>{step.title}</strong>
                  <small>{step.description}</small>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
