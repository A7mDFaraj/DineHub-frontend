import {
  BellRing,
  QrCode,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { SectionHeading } from "@/components/marketing/section-heading";

type FlowStep = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export async function FlowSection() {
  const t = await getTranslations("Flow");

  const steps: FlowStep[] = [
    {
      title: t("step1Title"),
      description: t("step1Desc"),
      icon: QrCode,
    },
    {
      title: t("step2Title"),
      description: t("step2Desc"),
      icon: SlidersHorizontal,
    },
    {
      title: t("step3Title"),
      description: t("step3Desc"),
      icon: BellRing,
    },
  ];

  return (
    <section className="landing-section flow-section" id="how-it-works">
      <div className="landing-shell flow-layout">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={
            <>
              {t("titleLine1")}{" "}
              <span className="section-title-line">
                {t("titleLine2")}
              </span>
            </>
          }
          description={t("description")}
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
