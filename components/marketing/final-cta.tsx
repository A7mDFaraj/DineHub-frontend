import { ArrowUpLeft, QrCode, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function FinalCta() {
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
            <p>جاهز لرحلة طلب أقصر؟</p>
            <h2 id="final-cta-title">اجعل أول تفاعل مع مشروعك أسرع من الانتظار.</h2>
          </div>
          <Button asChild variant="brand" size="xl">
            <Link href="/admin/login">
              ابدأ إعداد DineHub
              <ArrowUpLeft aria-hidden="true" strokeWidth={2} />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
