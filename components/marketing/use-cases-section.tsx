import {
  CakeSlice,
  Coffee,
  MonitorSmartphone,
  ShoppingBag,
  UtensilsCrossed,
} from "lucide-react";
import Image from "next/image";

import { SectionHeading } from "@/components/marketing/section-heading";
import logo from "@/public/brand/dinehub-logo-3d.png";

const venues = [
  {
    label: "مقهى",
    mode: "إضافات سريعة",
    description: "أحجام، حليب، نكهات واستلام منظم",
    icon: Coffee,
    position: "top-start",
    tone: "coral",
  },
  {
    label: "مطعم",
    mode: "طاولة أو استلام",
    description: "رحلة مرنة حسب مكان العميل",
    icon: UtensilsCrossed,
    position: "top-end",
    tone: "teal",
  },
  {
    label: "مخبز",
    mode: "اختيار مسبق",
    description: "تجهيز أوضح قبل وصول العميل",
    icon: CakeSlice,
    position: "bottom-start",
    tone: "lilac",
  },
  {
    label: "متجر سريع",
    mode: "مسار مختصر",
    description: "من المسح إلى الطلب بأقل خطوات",
    icon: ShoppingBag,
    position: "bottom-end",
    tone: "aqua",
  },
];

export function UseCasesSection() {
  return (
    <section className="landing-section use-cases-section" id="for-whom">
      <div className="landing-shell">
        <div className="use-cases-grid">
          <SectionHeading
            eyebrow="خدمة واحدة، أشكال كثيرة"
            title="لا نضع نشاطك داخل قالب. نبني الرحلة حوله."
            description="تتصل نماذج الخدمة المختلفة بالمنظومة نفسها، بينما يحتفظ كل نشاط بتفاصيله وإيقاعه وطريقة استقبال طلباته."
          />

          <div
            className="venue-constellation"
            aria-label="نماذج خدمة مختلفة تتصل بمنظومة DineHub واحدة"
          >
            <svg
              className="venue-connectors"
              viewBox="0 0 720 520"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M360 260 C290 215 245 150 165 120" />
              <path d="M360 260 C430 215 475 150 555 120" />
              <path d="M360 260 C290 305 245 370 165 400" />
              <path d="M360 260 C430 305 475 370 555 400" />
              <circle cx="360" cy="260" r="5" />
              <circle cx="165" cy="120" r="4" />
              <circle cx="555" cy="120" r="4" />
              <circle cx="165" cy="400" r="4" />
              <circle cx="555" cy="400" r="4" />
            </svg>

            <div className="venue-core">
              <span className="venue-core-pulse" aria-hidden="true" />
              <span className="venue-core-logo" aria-hidden="true">
                <Image src={logo} alt="" sizes="58px" placeholder="blur" />
              </span>
              <span className="venue-core-kicker">المركز المتصل</span>
              <strong>DineHub</strong>
              <small>يضبط المسار على طريقة خدمتك</small>
            </div>

            {venues.map((venue) => {
              const Icon = venue.icon;

              return (
                <article
                  className={`venue-node venue-node--${venue.position}`}
                  data-tone={venue.tone}
                  key={venue.label}
                >
                  <span className="venue-node-icon">
                    <Icon aria-hidden="true" strokeWidth={1.7} />
                  </span>
                  <div>
                    <span className="venue-node-heading">
                      <strong>{venue.label}</strong>
                      <em>{venue.mode}</em>
                    </span>
                    <p>{venue.description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="responsive-story">
          <div className="responsive-story-copy">
            <MonitorSmartphone aria-hidden="true" strokeWidth={1.6} />
            <h3>تجربة واحدة، مهما تغيّرت الشاشة.</h3>
            <p>
              من هاتف العميل إلى شاشة الكاشير، تبقى الواجهة مريحة للمس وواضحة
              من 320 بكسل حتى الشاشات الكبيرة.
            </p>
          </div>

          <div className="device-stage" aria-hidden="true">
            <div className="device-phone">
              <span className="device-camera" />
              <div className="device-brand-line" />
              <div className="device-search-line" />
              <div className="device-menu-row"><i /><span /></div>
              <div className="device-menu-row"><i /><span /></div>
              <div className="device-menu-row"><i /><span /></div>
            </div>
            <div className="device-pos">
              <div className="device-pos-top"><span /><i /></div>
              <div className="device-pos-columns"><span /><span /><span /></div>
              <div className="device-pos-orders"><i /><i /><i /></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
