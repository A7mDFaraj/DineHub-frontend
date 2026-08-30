import {
  BarChart3,
  Layers3,
  MessageSquareText,
  QrCode,
} from "lucide-react";
import Image from "next/image";

import { SectionHeading } from "@/components/marketing/section-heading";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ProductShowcase() {
  return (
    <section className="landing-section showcase-section" id="experience">
      <div className="landing-shell">
        <SectionHeading
          eyebrow="تجربتان، نظام واحد"
          title={
            <>
              سهل للعميل.
              <span className="section-title-line">قوي لفريقك.</span>
            </>
          }
          description="واجهة خفيفة تقود العميل مباشرة إلى طلبه، ونظام تشغيل يمنح فريقك كل ما يحتاجه من دون أن يثقل التجربة."
          align="center"
        />

        <div className="showcase-grid">
          <Card glass={false} className="feature-card feature-card--lead">
            <CardHeader>
              <div className="feature-icon">
                <QrCode aria-hidden="true" strokeWidth={1.7} />
              </div>
              <CardTitle>قائمة تبدأ من الكاميرا</CardTitle>
              <CardDescription>
                تجربة عربية سريعة، مرتبة حسب الفئات، وتعمل بسلاسة على أصغر
                الشاشات.
              </CardDescription>
            </CardHeader>
            <CardContent className="feature-visual feature-visual--menu">
              <Image
                src="/brand/feature-qr-menu.png"
                alt="تصوّر ثلاثي الأبعاد لهاتف يعرض قائمة رقمية بعد مسح رمز QR"
                width={1254}
                height={1254}
                sizes="(max-width: 767px) 88vw, 52vw"
              />
            </CardContent>
          </Card>

          <Card glass={false} className="feature-card feature-card--coral">
            <CardHeader>
              <div className="feature-icon">
                <MessageSquareText aria-hidden="true" strokeWidth={1.7} />
              </div>
              <CardTitle>كل ملاحظة تصل كما كُتبت</CardTitle>
              <CardDescription>
                إضافات، أحجام، تفضيلات واستثناءات واضحة داخل الطلب بدل
                التخمين عند التنفيذ.
              </CardDescription>
            </CardHeader>
            <CardContent className="feature-visual">
              <Image
                src="/brand/feature-custom-order.png"
                alt="تصوّر ثلاثي الأبعاد لخيارات تخصيص الطلب والملاحظات"
                width={1230}
                height={1278}
                sizes="(max-width: 767px) 88vw, 34vw"
              />
            </CardContent>
          </Card>

          <Card glass={false} className="feature-card feature-card--aqua">
            <CardHeader>
              <div className="feature-icon">
                <BarChart3 aria-hidden="true" strokeWidth={1.7} />
              </div>
              <CardTitle>الصورة الكاملة لكل الفروع</CardTitle>
              <CardDescription>
                راقب الطلبات والأصناف والأداء من لوحة واحدة، ثم انتقل إلى أي
                فرع من دون تبديل الأنظمة.
              </CardDescription>
            </CardHeader>
            <CardContent className="feature-visual">
              <Image
                src="/brand/feature-analytics.png"
                alt="تصوّر ثلاثي الأبعاد للوحة تحليلات وأداء الفروع"
                width={1312}
                height={1199}
                sizes="(max-width: 767px) 88vw, 34vw"
              />
            </CardContent>
          </Card>
        </div>

        <div className="showcase-footnote">
          <Layers3 aria-hidden="true" strokeWidth={1.7} />
          <p>
            عدّل القائمة مرة واحدة، ثم طبّقها على الفرع المناسب مع التحكم في
            الأسعار والتوفر لكل موقع.
          </p>
        </div>
      </div>
    </section>
  );
}
