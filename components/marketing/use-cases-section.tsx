import {
  CakeSlice,
  Coffee,
  MonitorSmartphone,
  ShoppingBag,
  UtensilsCrossed,
} from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { SectionHeading } from "@/components/marketing/section-heading";
import logo from "@/public/brand/dinehub-logo-3d.png";

export async function UseCasesSection() {
  const t = await getTranslations("UseCases");

  const venues = [
    {
      label: t("venueCafeLabel"),
      mode: t("venueCafeMode"),
      description: t("venueCafeDesc"),
      icon: Coffee,
      position: "top-start",
      tone: "coral",
    },
    {
      label: t("venueRestLabel"),
      mode: t("venueRestMode"),
      description: t("venueRestDesc"),
      icon: UtensilsCrossed,
      position: "top-end",
      tone: "teal",
    },
    {
      label: t("venueBakeryLabel"),
      mode: t("venueBakeryMode"),
      description: t("venueBakeryDesc"),
      icon: CakeSlice,
      position: "bottom-start",
      tone: "lilac",
    },
    {
      label: t("venueShopLabel"),
      mode: t("venueShopMode"),
      description: t("venueShopDesc"),
      icon: ShoppingBag,
      position: "bottom-end",
      tone: "aqua",
    },
  ];

  return (
    <section className="landing-section use-cases-section" id="for-whom">
      <div className="landing-shell">
        <div className="use-cases-grid">
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={
              <>
                <span className="use-cases-title-line use-cases-title-line--primary">
                  {t("titleLine1")}
                </span>
                <span className="use-cases-title-line use-cases-title-line--secondary">
                  {t("titleLine2")}
                </span>
              </>
            }
            description={t("description")}
          />

          <div
            className="venue-constellation"
            aria-label={t("constellationAria")}
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
              <span className="venue-core-kicker">{t("coreKicker")}</span>
              <strong>DineHub</strong>
              <small>{t("coreDesc")}</small>
            </div>

            {venues.map((venue) => {
              const Icon = venue.icon;

              return (
                <article
                  className={`venue-node venue-node--${venue.position}`}
                  data-tone={venue.tone}
                  key={venue.position}
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
            <h3>{t("responsiveTitle")}</h3>
            <p>{t("responsiveDesc")}</p>
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
