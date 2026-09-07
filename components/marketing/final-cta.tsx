import { ArrowUpLeft, ArrowUpRight, QrCode, Sparkles } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export async function FinalCta() {
  const locale = await getLocale();
  const isRtl = locale === "ar";
  const t = await getTranslations("FinalCta");

  return (
    <section className="final-cta-section" aria-labelledby="final-cta-title">
      <div className="landing-shell">
        <div className="final-cta-card">
          <div className="final-cta-signal" aria-hidden="true">
            <QrCode strokeWidth={1.4} />
            <span />
            <Sparkles strokeWidth={1.4} />
          </div>
          <div>
            <p>{t("kicker")}</p>
            <h2 id="final-cta-title">{t("title")}</h2>
          </div>
          <Button asChild variant="brand" size="xl">
            <Link href="/admin/login">
              {t("button")}
              {isRtl ? (
                <ArrowUpLeft aria-hidden="true" strokeWidth={2} />
              ) : (
                <ArrowUpRight aria-hidden="true" strokeWidth={2} />
              )}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
