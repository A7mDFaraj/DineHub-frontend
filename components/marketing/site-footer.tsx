import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const tCommon = await getTranslations("Common");

  const footerLinks = [
    { href: "#how-it-works", label: t("howItWorks") },
    { href: "#experience", label: t("experience") },
    { href: "#operations", label: t("operations") },
    { href: "/admin/login", label: t("adminLogin") },
  ];

  return (
    <footer className="site-footer">
      <div className="landing-shell footer-grid">
        <div>
          <Link className="brand-lockup brand-lockup--footer" href="/">
            <span className="brand-mark" aria-hidden="true">
              <Image
                src="/brand/dinehub-logo-3d.png"
                alt=""
                width={38}
                height={38}
                sizes="38px"
              />
            </span>
            <span className="brand-word" dir="ltr" translate="no">
              {tCommon("brandName")}
            </span>
          </Link>
          <p>{t("tagline")}</p>
        </div>
        <nav aria-label={t("navAria")}>
          {footerLinks.map((item) => (
            <a href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </div>
      <div className="landing-shell footer-bottom">
        <span dir="ltr" translate="no">
          {t("copyright", { year: new Date().getFullYear() })}
        </span>
        <span>{t("badge")}</span>
      </div>
    </footer>
  );
}
