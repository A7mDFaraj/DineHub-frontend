import { BusinessInsights } from "@/components/admin/business-insights";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  QrCode,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AdminGuideTrigger } from "@/components/admin/admin-onboarding-guide";
import styles from "./dashboard.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AdminDashboard" });

  return {
    title: t("pageTitle"),
    description: t("pageDesc"),
  };
}

export default async function AdminDashboard() {
  const locale = await getLocale();
  const isRtl = locale === "ar";
  const t = await getTranslations("AdminDashboard");
  const ActionArrow = isRtl ? ArrowLeft : ArrowRight;

  const setupSteps = [
    {
      number: t("step1Num"),
      title: t("step1Title"),
      description: t("step1Desc"),
      href: "/admin/branches",
      icon: Building2,
      tone: "teal",
    },
    {
      number: t("step2Num"),
      title: t("step2Title"),
      description: t("step2Desc"),
      href: "/admin/categories",
      icon: UtensilsCrossed,
      tone: "lilac",
    },
    {
      number: t("step3Num"),
      title: t("step3Title"),
      description: t("step3Desc"),
      href: "/admin/qr-code",
      icon: QrCode,
      tone: "coral",
    },
  ] as const;

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <span aria-hidden="true" />
            {t("heroEyebrow")}
          </p>
          <h1>{t("heroTitle")}</h1>
          <p className={styles.heroLead}>{t("heroLead")}</p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryAction} href="/admin/branches">
              <span>{t("heroAction")}</span>
              <ActionArrow aria-hidden="true" size={19} />
            </Link>
            <AdminGuideTrigger className={styles.guideAction}>
              <Sparkles aria-hidden="true" size={18} />
              <span>{t("guideAction")}</span>
            </AdminGuideTrigger>
          </div>
        </div>

        <div
          className={styles.signalMap}
          aria-label={t("mapAria")}
        >
          <div className={styles.signalLine} aria-hidden="true" />
          <div className={styles.signalDot} aria-hidden="true" />
          <div className={styles.mapNode} data-position="customer">
            <span>
              <QrCode aria-hidden="true" size={22} />
            </span>
            <small>{t("mapCustomer")}</small>
          </div>
          <div className={styles.mapNode} data-position="order">
            <span>
              <ClipboardList aria-hidden="true" size={22} />
            </span>
            <small>{t("mapOrder")}</small>
          </div>
          <div className={styles.mapNode} data-position="team">
            <span>
              <CheckCircle2 aria-hidden="true" size={22} />
            </span>
            <small>{t("mapTeam")}</small>
          </div>
        </div>
      </section>

      <section className={styles.setupSection} aria-labelledby="setup-title">
        <div className={styles.sectionHeading}>
          <div>
            <p>{t("setupHeadingPre")}</p>
            <h2 id="setup-title">{t("setupHeadingTitle")}</h2>
          </div>
          <span>{t("setupHeadingSub")}</span>
        </div>

        <div className={styles.setupTrack}>
          {setupSteps.map((step) => (
            <Link
              className={styles.setupCard}
              data-tone={step.tone}
              href={step.href}
              key={step.href}
            >
              <div className={styles.stepTop}>
                <span className={styles.stepIcon}>
                  <step.icon aria-hidden="true" size={21} strokeWidth={1.7} />
                </span>
                <small>{step.number}</small>
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <span className={styles.cardAction}>
                {t("openMilestone")} <ActionArrow aria-hidden="true" size={17} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.emptyStage} aria-labelledby="today-title">
        <div>
          <p>
            <i aria-hidden="true" />
            {t("todayLabel")}
          </p>
          <h2 id="today-title">{t("todayHeading")}</h2>
          <span>{t("todayDesc")}</span>
        </div>
        <Link href="/admin/menu">
          {t("reviewMenuAction")} <ActionArrow aria-hidden="true" size={18} />
        </Link>
      </section>
      <BusinessInsights />
    </div>
  );
}
