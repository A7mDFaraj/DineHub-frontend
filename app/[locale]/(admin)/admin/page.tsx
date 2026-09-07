import { BusinessInsights } from "@/components/admin/business-insights";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ClipboardList,
  QrCode,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminGuideTrigger } from "@/components/admin/admin-onboarding-guide";
import styles from "./dashboard.module.css";

export const metadata: Metadata = {
  title: "نظرة الإدارة",
  description: "ابدأ إعداد فروع DineHub وقائمتك ورموز الطلب.",
};

const setupSteps = [
  {
    number: "01",
    title: "أضف أول فرع",
    description: "عرّف موقع الخدمة الذي ستتصل به القائمة والطاولات.",
    href: "/admin/branches",
    icon: Building2,
    tone: "teal",
  },
  {
    number: "02",
    title: "ابنِ القائمة",
    description: "رتّب التصنيفات والمنتجات بالطريقة التي يراها العميل.",
    href: "/admin/categories",
    icon: UtensilsCrossed,
    tone: "lilac",
  },
  {
    number: "03",
    title: "انشر نقطة الطلب",
    description: "أنشئ رمز QR للطاولة أو الاستلام وابدأ استقبال الطلبات.",
    href: "/admin/qr-code",
    icon: QrCode,
    tone: "coral",
  },
] as const;

export default function AdminDashboard() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <span aria-hidden="true" />
            مسار الإعداد
          </p>
          <h1>حوّل المكان إلى خط خدمة متصل.</h1>
          <p className={styles.heroLead}>
            ابدأ بالفرع، مرّر القائمة إلى العميل، ثم اجعل كل طلب واضحًا للفريق.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryAction} href="/admin/branches">
              <span>ابدأ بأول فرع</span>
              <ArrowLeft aria-hidden="true" size={19} />
            </Link>
            <AdminGuideTrigger className={styles.guideAction}>
              <Sparkles aria-hidden="true" size={18} />
              <span>دليل البدء السريع</span>
            </AdminGuideTrigger>
          </div>
        </div>

        <div
          className={styles.signalMap}
          aria-label="مسار الطلب من العميل إلى لوحة التحكم"
        >
          <div className={styles.signalLine} aria-hidden="true" />
          <div className={styles.signalDot} aria-hidden="true" />
          <div className={styles.mapNode} data-position="customer">
            <span>
              <QrCode aria-hidden="true" size={22} />
            </span>
            <small>العميل</small>
          </div>
          <div className={styles.mapNode} data-position="order">
            <span>
              <ClipboardList aria-hidden="true" size={22} />
            </span>
            <small>الطلب</small>
          </div>
          <div className={styles.mapNode} data-position="team">
            <span>
              <CheckCircle2 aria-hidden="true" size={22} />
            </span>
            <small>الفريق</small>
          </div>
        </div>
      </section>

      <section className={styles.setupSection} aria-labelledby="setup-title">
        <div className={styles.sectionHeading}>
          <div>
            <p>ابدأ بخطوات حقيقية</p>
            <h2 id="setup-title">ثلاث محطات إلى أول طلب</h2>
          </div>
          <span>كل محطة تفتح التي بعدها</span>
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
                افتح المحطة <ArrowLeft aria-hidden="true" size={17} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.emptyStage} aria-labelledby="today-title">
        <div>
          <p>
            <i aria-hidden="true" />
            اليوم
          </p>
          <h2 id="today-title">هنا ستظهر نبضات الخدمة.</h2>
          <span>
            عندما يبدأ العملاء بالطلب، ستجد الحالة والتوقيت والفرع دون أرقام
            تجريبية.
          </span>
        </div>
        <Link href="/admin/menu">
          راجع القائمة <ArrowLeft aria-hidden="true" size={18} />
        </Link>
      </section>
      <BusinessInsights />
    </div>
  );
}
