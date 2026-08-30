import {
  ArrowUpLeft,
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
import Link from "next/link";

import { Button } from "@/components/ui/button";
import heroImage from "@/public/brand/herosection image.png";

const productPromises = [
  "بدون تطبيق",
  "بدون تسجيل للعميل",
  "جاهز لكل شاشة",
];

type JourneyStep = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const journeySteps: JourneyStep[] = [
  { title: "يمسح", description: "QR", icon: QrCode },
  { title: "يستكشف", description: "القائمة", icon: LayoutGrid },
  { title: "يخصّص", description: "طلبه", icon: SlidersHorizontal },
  { title: "يصل", description: "للفريق", icon: BellRing },
  { title: "يتضح", description: "الأداء", icon: BarChart3 },
];

export function HeroSection() {
  return (
    <section className="hero-section" aria-labelledby="hero-title">
      <div className="hero-orbit hero-orbit--one" aria-hidden="true" />
      <div className="hero-orbit hero-orbit--two" aria-hidden="true" />

      <div className="landing-shell hero-shell hero-grid">
        <div className="hero-copy">
          <div className="hero-intro">
            <ScanLine aria-hidden="true" strokeWidth={1.8} />
            <span>من المسح إلى الخدمة، في مسار واحد</span>
          </div>

          <h1 id="hero-title">
            <span className="hero-title-line">
              كل طلب يبدأ <em>بسهولة.</em>
            </span>
            <span className="hero-title-line hero-title-line--secondary">
              وكل فرع يبقى تحت سيطرتك.
            </span>
          </h1>

          <p className="hero-lede">
            يمسح العميل QR، يختار ويخصّص طلبه، ثم يرسله بلا تطبيق ولا تسجيل.
            وفي الخلفية، يدير فريقك القوائم والطلبات والفروع والتحليلات من مكان
            واحد.
          </p>

          <div className="hero-actions">
            <Button asChild variant="brand" size="xl">
              <Link href="/admin/login">
                ابدأ تجربة DineHub
                <ArrowUpLeft aria-hidden="true" strokeWidth={2} />
              </Link>
            </Button>
            <Button asChild variant="brandOutline" size="xl">
              <a href="#experience">
                شاهد التجربة
                <MousePointerClick aria-hidden="true" strokeWidth={1.8} />
              </a>
            </Button>
          </div>

          <ul className="hero-promises" aria-label="مزايا التجربة">
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
              alt="منظومة DineHub للطلب عبر QR تضم هاتف العميل وشاشة نقطة البيع والتحليلات"
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
              <strong>مسح سريع</strong>
              <small>القائمة جاهزة</small>
            </span>
          </div>

          <div className="hero-signal hero-signal--team" aria-hidden="true">
            <span className="signal-pulse" />
            <span>
              <strong>طلب جديد</strong>
              <small>وصل إلى الفريق</small>
            </span>
          </div>
        </div>
      </div>

      <ol
        className="landing-shell hero-shell hero-journey"
        aria-label="رحلة الطلب عبر DineHub"
      >
        {journeySteps.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.title}>
              <span className="hero-journey-icon">
                <Icon aria-hidden="true" strokeWidth={1.7} />
              </span>
              <span>
                <strong>{step.title}</strong>
                <small>{step.description}</small>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
