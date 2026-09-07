import { Building2, ShoppingBag, SlidersHorizontal } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { SectionHeading } from "@/components/marketing/section-heading";
import systemIllustration from "@/public/brand/dinehub-system-illustration.png";

export async function OperationsSection() {
  const t = await getTranslations("Operations");

  const capabilities = [
    {
      title: t("cap1Title"),
      description: t("cap1Desc"),
      icon: ShoppingBag,
    },
    {
      title: t("cap2Title"),
      description: t("cap2Desc"),
      icon: Building2,
    },
    {
      title: t("cap3Title"),
      description: t("cap3Desc"),
      icon: SlidersHorizontal,
    },
  ];

  return (
    <section className="operations-section" id="operations">
      <div className="landing-shell operations-grid">
        <div className="operations-copy">
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={t("title")}
            description={t("description")}
            inverse
          />

          <ul className="operations-list">
            {capabilities.map((capability) => {
              const Icon = capability.icon;

              return (
                <li key={capability.title}>
                  <span>
                    <Icon aria-hidden="true" strokeWidth={1.7} />
                  </span>
                  <div>
                    <strong>{capability.title}</strong>
                    <p>{capability.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <figure className="operations-visual">
          <span className="operations-visual-orbit operations-visual-orbit--one" aria-hidden="true" />
          <span className="operations-visual-orbit operations-visual-orbit--two" aria-hidden="true" />
          <span className="operations-visual-signal" aria-hidden="true" />
          <Image
            className="operations-illustration"
            src={systemIllustration}
            alt={t("illustrationAlt")}
            sizes="(max-width: 1023px) 94vw, 58vw"
            placeholder="blur"
          />
          <figcaption className="sr-only">
            {t("illustrationCaption")}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
