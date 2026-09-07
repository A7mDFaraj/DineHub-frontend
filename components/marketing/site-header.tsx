import { ArrowUpLeft, ArrowUpRight, Globe, Menu, ScanLine } from "lucide-react";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export async function SiteHeader() {
  const locale = await getLocale();
  const t = await getTranslations("Header");
  const tCommon = await getTranslations("Common");

  const isRtl = locale === "ar";
  const otherLocale = isRtl ? "en" : "ar";

  const navigation = [
    { href: "#how-it-works", label: t("howItWorks") },
    { href: "#experience", label: t("experience") },
    { href: "#operations", label: t("operations") },
    { href: "#for-whom", label: t("forWhom") },
  ];

  return (
    <header className="site-header">
      <nav className="landing-shell site-nav" aria-label={t("navAria")}>
        <Link className="brand-lockup" href="/" aria-label={t("brandAria")}>
          <span className="brand-mark" aria-hidden="true">
            <Image
              src="/brand/dinehub-logo-3d.png"
              alt=""
              width={42}
              height={42}
              sizes="42px"
              loading="eager"
              style={{ width: "43px", height: "auto" }}
            />
          </span>
          <span className="brand-word" dir="ltr" translate="no">
            {tCommon("brandName")}
          </span>
        </Link>

        <div className="desktop-nav-links">
          {navigation.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </div>

        <div className="desktop-nav-action">
          <Link
            href="/"
            locale={otherLocale}
            className="lang-switcher-btn"
            aria-label={tCommon("switchLocaleAria")}
          >
            <Globe aria-hidden="true" size={15} strokeWidth={1.8} />
            <span>{tCommon("otherLanguage")}</span>
          </Link>

          <Button asChild variant="brand" size="default">
            <Link href="/admin/login">
              {tCommon("startNow")}
              {isRtl ? (
                <ArrowUpLeft aria-hidden="true" strokeWidth={2} />
              ) : (
                <ArrowUpRight aria-hidden="true" strokeWidth={2} />
              )}
            </Link>
          </Button>
        </div>

        <details className="mobile-menu">
          <summary aria-label={t("mobileMenuAria")}>
            <Menu aria-hidden="true" strokeWidth={1.8} />
          </summary>
          <div className="mobile-menu-panel">
            <div className="mobile-menu-title">
              <ScanLine aria-hidden="true" strokeWidth={1.8} />
              <span>{t("mobileMenuTitle")}</span>
            </div>
            {navigation.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}

            <Link
              href="/"
              locale={otherLocale}
              className="lang-switcher-btn lang-switcher-btn--mobile"
              aria-label={tCommon("switchLocaleAria")}
            >
              <Globe aria-hidden="true" size={16} strokeWidth={1.8} />
              <span>{tCommon("otherLanguage")}</span>
            </Link>

            <Button asChild variant="brand" size="default">
              <Link href="/admin/login">
                {tCommon("startNow")}
                {isRtl ? (
                  <ArrowUpLeft aria-hidden="true" strokeWidth={2} />
                ) : (
                  <ArrowUpRight aria-hidden="true" strokeWidth={2} />
                )}
              </Link>
            </Button>
          </div>
        </details>
      </nav>
    </header>
  );
}
