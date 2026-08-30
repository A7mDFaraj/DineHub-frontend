import { Building2, ShoppingBag, SlidersHorizontal } from "lucide-react";
import Image from "next/image";

import { SectionHeading } from "@/components/marketing/section-heading";
import systemIllustration from "@/public/brand/dinehub-system-illustration.png";

const capabilities = [
  {
    title: "الطلب يتحرك من دون أن تضيع تفاصيله",
    description: "اختيارات العميل وملاحظاته تصل إلى الفريق في مسار واحد واضح.",
    icon: ShoppingBag,
  },
  {
    title: "كل فرع متصل بالصورة الكاملة",
    description: "تشغيل مستقل عند الحاجة، ورؤية موحّدة عندما تريد القرار الأشمل.",
    icon: Building2,
  },
  {
    title: "النظام يتشكّل حول طريقة عملك",
    description: "القائمة والتوفر والإضافات والأسعار تتبع نموذج خدمتك، لا العكس.",
    icon: SlidersHorizontal,
  },
];

export function OperationsSection() {
  return (
    <section className="operations-section" id="operations">
      <div className="landing-shell operations-grid">
        <div className="operations-copy">
          <SectionHeading
            eyebrow="منظومة واحدة، من المسح إلى القرار"
            title="يرى العميل طريقًا قصيرًا. ويرى فريقك الصورة كاملة."
            description="يربط DineHub لحظة الطلب بما يحدث بعدها: اختيار العميل، تنفيذ الفريق، وحركة الفروع—من دون أن يفرض عليك شاشة أو أسلوب تشغيل واحدًا."
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
            alt="تصوّر تجريدي يوضح انتقال الطلب من هاتف العميل إلى فريق التشغيل ثم إلى عدة فروع مترابطة"
            sizes="(max-width: 1023px) 94vw, 58vw"
            placeholder="blur"
          />
          <figcaption className="sr-only">
            رسم توضيحي للمفهوم العام، وليس صورة من واجهة النظام الفعلية.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
