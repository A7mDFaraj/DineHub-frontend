import {
  BellRing,
  QrCode,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

import { SectionHeading } from "@/components/marketing/section-heading";

type FlowStep = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const steps: FlowStep[] = [
  {
    title: "يمسح العميل",
    description:
      "يفتح QR تجربة الطلب مباشرة على هاتفه—من دون تنزيل تطبيق أو إنشاء حساب.",
    icon: QrCode,
  },
  {
    title: "يختار بطريقته",
    description:
      "يضيف الخيارات والملاحظات الدقيقة، من نوع الحليب إلى استبعاد مكوّن معيّن.",
    icon: SlidersHorizontal,
  },
  {
    title: "يصل الطلب واضحًا",
    description:
      "يستلم الفريق طلبًا منظمًا على شاشة مريحة للمس، ثم يتابع حالته حتى الاكتمال.",
    icon: BellRing,
  },
];

export function FlowSection() {
  return (
    <section className="landing-section flow-section" id="how-it-works">
      <div className="landing-shell flow-layout">
        <SectionHeading
          eyebrow="رحلة أقصر للعميل"
          title={
            <>
              ثلاث خطوات.
              <span className="section-title-line">
                لا طوابير جديدة.
              </span>
            </>
          }
          description="من لحظة المسح إلى وصول الطلب، يبقى المسار قصيرًا ومفهومًا؛ يختار العميل بثقة، ويستلم الفريق طلبًا واضحًا."
        />

        <ol className="flow-grid">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="flow-step">
                <span className="flow-step-icon">
                  <Icon aria-hidden="true" strokeWidth={1.7} />
                </span>
                <div className="flow-step-copy">
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
                <span className="flow-step-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
