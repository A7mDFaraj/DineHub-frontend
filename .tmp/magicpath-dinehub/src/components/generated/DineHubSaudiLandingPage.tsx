import { useState } from "react";

import heroImage from "../../../assets/dinehub-hero-3d.png";
import logoImage from "../../../assets/dinehub-logo-3d.png";
import qrFeature from "../../../assets/feature-qr-menu.png";
import customFeature from "../../../assets/feature-custom-order.png";
import analyticsFeature from "../../../assets/feature-analytics.png";

type Language = "ar" | "en";

const content = {
  ar: {
    nav: ["كيف يعمل", "للمطاعم", "المزايا", "الأسئلة"],
    navHref: ["#how", "#restaurant", "#features", "#faq"],
    demo: "احجز عرضاً",
    login: "دخول الإدارة",
    badge: "ضيافة سعودية، بتجربة رقمية أذكى",
    heroTitle: "كل طاولة تصبح نقطة طلب. وكل طلب يصبح أوضح.",
    heroBody:
      "من مسح رمز QR إلى شاشة الكاشير—يمنح DineHub ضيوفك قائمة سريعة بلا تسجيل، ويمنح فريقك إدارة كاملة للفروع والطلبات والتحليلات.",
    watch: "شاهد كيف يعمل",
    heroNote: "لا تطبيق. لا تسجيل. لا انتظار.",
    proof: [
      ["بلا تسجيل", "للضيف"],
      ["فروع متعددة", "من لوحة واحدة"],
      ["عربي أولاً", "ومتجاوب بالكامل"],
    ],
    howEyebrow: "رحلة طلب أقصر",
    howTitle: "ثلاث خطوات من الطاولة إلى المطبخ",
    howBody: "تجربة واضحة للضيف، وتدفق منظم لفريقك—حتى في ساعات الذروة.",
    steps: [
      ["01", "امسح وابدأ", "يفتح الضيف القائمة فوراً من QR، من دون تنزيل تطبيق أو إنشاء حساب."],
      ["02", "خصّص براحتك", "إضافات، أحجام، ملاحظات خاصة مثل «بدون كاتشب»—كلها واضحة قبل الإرسال."],
      ["03", "تابع كل فرع", "تصل الطلبات للشاشة المناسبة، وتظهر المبيعات والأداء في لوحة إدارة واحدة."],
    ],
    guestEyebrow: "للضيف والفريق",
    guestTitle: "واجهة سهلة على الجوال. وتشغيل قوي خلف الكواليس.",
    guestBody:
      "صممنا كل شاشة بحسب سياقها: أزرار مريحة للمس على جوال الضيف، تدفق سريع لشاشة الكاشير، وبيانات واضحة لصاحب المطعم.",
    guestPoints: ["قائمة سريعة وصور واضحة", "تخصيص دقيق قبل الدفع", "حالة الطلب لحظة بلحظة"],
    adminPoints: ["إدارة قوائم كل الفروع", "تنظيم الطلبات وحالاتها", "تحليلات ومؤشرات قابلة للتنفيذ"],
    guestTab: "تجربة الضيف",
    adminTab: "لوحة الإدارة",
    popular: "الأكثر طلباً",
    add: "إضافة",
    orderTotal: "الإجمالي",
    branch: "فرع العليا",
    sales: "مبيعات اليوم",
    orders: "الطلبات",
    featuresEyebrow: "كل ما تحتاجه للتوسع",
    featuresTitle: "نظام واحد، من أول فرع إلى الفرع القادم",
    features: [
      ["قائمة مرنة", "أصناف، فئات، إضافات، توفر وأسعار خاصة بكل فرع."],
      ["طلبات مباشرة", "حالات واضحة وتنبيهات تساعد الفريق على التحرك بسرعة."],
      ["إدارة الفروع", "صلاحيات وإعدادات وقوائم مستقلة تحت حساب واحد."],
      ["تحليلات مفهومة", "اعرف الأصناف الأعلى طلباً وأوقات الذروة وأداء كل فرع."],
      ["مصمم للمس", "مساحات ضغط كبيرة وتجربة سريعة على الجوال وشاشة الكاشير."],
      ["جاهز للسوق السعودي", "عربي وRTL، ريال سعودي، ضريبة قيمة مضافة، وتجربة محلية أصيلة."],
    ],
    saudiEyebrow: "مصمم للسوق السعودي",
    saudiTitle: "محلي في التفاصيل. عالمي في الإحساس.",
    saudiBody:
      "لغة عربية طبيعية، اتجاه RTL حقيقي، وعرض واضح للريال والضريبة—مع هوية حديثة بعيدة عن القوالب الحكومية المعتادة.",
    saudiTags: ["RTL أصلي", "ر.س", "ضريبة 15%", "فروع متعددة"],
    faqEyebrow: "أسئلة شائعة",
    faqTitle: "قبل أن تبدأ",
    faqs: [
      ["هل يحتاج العميل إلى إنشاء حساب؟", "لا. يمسح الضيف رمز QR ويفتح القائمة ويخصص طلبه مباشرة من المتصفح."],
      ["هل يمكن تخصيص القائمة لكل فرع؟", "نعم. يمكنك التحكم بالأصناف والأسعار والتوفر والإضافات لكل فرع بشكل مستقل."],
      ["هل يعمل على شاشات الكاشير الصغيرة؟", "نعم. الواجهات متجاوبة ومصممة للمس، مع أزرار واضحة ومساحات ضغط مريحة."],
      ["هل يدعم العربية والضريبة؟", "نعم. التجربة عربية وRTL وتعرض الأسعار بالريال مع دعم إعدادات ضريبة القيمة المضافة."],
    ],
    ctaTitle: "جاهز تجعل الطلب أسهل على ضيوفك وفريقك؟",
    ctaBody: "خلّنا نريك كيف يبدو DineHub على قائمة مطعمك وفروعك.",
    ctaPrimary: "احجز عرضاً مخصصاً",
    ctaSecondary: "تواصل معنا",
    footer: "نظام تشغيل المطاعم من الطاولة إلى الإدارة.",
    rights: "© 2026 DineHub. جميع الحقوق محفوظة.",
  },
  en: {
    nav: ["How it works", "For restaurants", "Features", "FAQ"],
    navHref: ["#how", "#restaurant", "#features", "#faq"],
    demo: "Book a demo",
    login: "Admin login",
    badge: "Saudi hospitality, with a smarter digital experience",
    heroTitle: "Every table becomes an order point. Every order becomes clearer.",
    heroBody:
      "From QR scan to cashier screen, DineHub gives guests an instant menu without signup—and gives your team complete control of branches, orders, and analytics.",
    watch: "See how it works",
    heroNote: "No app. No signup. No waiting.",
    proof: [["No signup", "for guests"], ["Multi-branch", "one workspace"], ["Arabic-first", "fully responsive"]],
    howEyebrow: "A shorter order journey",
    howTitle: "Three steps from table to kitchen",
    howBody: "A clear guest experience and an organized team workflow—even during the rush.",
    steps: [
      ["01", "Scan and start", "Guests open the QR menu instantly, with no app download or account creation."],
      ["02", "Make it yours", "Add-ons, sizes, and notes like “no ketchup” are clear before the order is sent."],
      ["03", "Run every branch", "Orders reach the right screen while sales and performance stay in one dashboard."],
    ],
    guestEyebrow: "For guests and teams",
    guestTitle: "Effortless on mobile. Powerful behind the scenes.",
    guestBody:
      "Every screen fits its context: comfortable touch targets for guests, a fast cashier flow, and clear data for restaurant owners.",
    guestPoints: ["Fast visual menu", "Precise order customization", "Live order status"],
    adminPoints: ["Manage every branch menu", "Organize orders and statuses", "Actionable performance analytics"],
    guestTab: "Guest experience",
    adminTab: "Admin dashboard",
    popular: "Most popular",
    add: "Add",
    orderTotal: "Total",
    branch: "Olaya branch",
    sales: "Today’s sales",
    orders: "Orders",
    featuresEyebrow: "Everything you need to scale",
    featuresTitle: "One system, from your first branch to the next",
    features: [
      ["Flexible menu", "Items, categories, add-ons, availability, and branch-level pricing."],
      ["Live orders", "Clear statuses and alerts help the team move quickly."],
      ["Branch management", "Independent permissions, settings, and menus under one account."],
      ["Useful analytics", "Know your top items, rush hours, and branch performance."],
      ["Built for touch", "Large targets and fast flows on phones and cashier screens."],
      ["Saudi-ready", "Arabic and RTL, Saudi riyals, VAT, and a genuinely local experience."],
    ],
    saudiEyebrow: "Built for Saudi Arabia",
    saudiTitle: "Local in the details. World-class in feel.",
    saudiBody:
      "Natural Arabic, true RTL, and clear SAR and VAT handling—wrapped in a distinctive identity that avoids familiar government templates.",
    saudiTags: ["Native RTL", "SAR", "15% VAT", "Multi-branch"],
    faqEyebrow: "FAQ",
    faqTitle: "Before you start",
    faqs: [
      ["Does the customer need an account?", "No. Guests scan the QR code, open the menu, and customize their order directly in the browser."],
      ["Can each branch have its own menu?", "Yes. Control items, prices, availability, and add-ons independently for every branch."],
      ["Does it work on small cashier screens?", "Yes. Every interface is responsive and touch-friendly, with clear controls and comfortable targets."],
      ["Does it support Arabic and VAT?", "Yes. The experience supports Arabic, RTL, Saudi riyals, and configurable VAT settings."],
    ],
    ctaTitle: "Ready to make ordering easier for guests and teams?",
    ctaBody: "Let us show you how DineHub can work across your menu and branches.",
    ctaPrimary: "Book a tailored demo",
    ctaSecondary: "Contact us",
    footer: "Restaurant operations from table to management.",
    rights: "© 2026 DineHub. All rights reserved.",
  },
} as const;

const Check = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5 shrink-0 fill-none stroke-current" strokeWidth="2">
    <path d="m4 10 3.5 3.5L16 5.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Arrow = ({ rtl }: { rtl: boolean }) => (
  <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-5 w-5 fill-none stroke-current ${rtl ? "" : "rotate-180"}`} strokeWidth="1.8">
    <path d="M16 10H4m0 0 5-5m-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const DineHubSaudiLandingPage = () => {
  const [language, setLanguage] = useState<Language>("ar");
  const [menuOpen, setMenuOpen] = useState(false);
  const [productTab, setProductTab] = useState<"guest" | "admin">("guest");
  const t = content[language];
  const rtl = language === "ar";
  const requestDemo = () => window.alert(rtl ? "شكراً لاهتمامك! سيتواصل معك فريق DineHub لترتيب العرض." : "Thanks for your interest! The DineHub team will contact you to arrange a demo.");
  const showAdmin = () => { setProductTab("admin"); document.getElementById("restaurant")?.scrollIntoView({ behavior: "smooth" }); };

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      lang={language}
      className="min-h-screen overflow-x-hidden bg-[#fffaf3] text-[#191a35] antialiased selection:bg-[#ff6b4a]/25"
    >
      <header className="sticky top-0 z-50 border-b border-[#191a35]/8 bg-[#fffaf3]/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <a href="#top" className="group flex min-h-11 items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b4a] focus-visible:ring-offset-4">
            <img src={logoImage} alt="" className="h-11 w-11 object-contain drop-shadow-sm transition-transform duration-200 group-hover:scale-105" />
            <span className="text-xl font-black tracking-[-0.04em] text-[#171831]">Dine<span className="text-[#ff6b4a]">Hub</span></span>
          </a>

          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            {t.nav.map((item, index) => (
              <a key={item} href={t.navHref[index]} className="flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-[#4d4e68] transition-colors duration-150 hover:bg-white hover:text-[#171831] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b4a]">
                {item}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <button onClick={() => setLanguage(rtl ? "en" : "ar")} className="min-h-11 rounded-xl px-3.5 text-sm font-bold text-[#4d4e68] transition-colors duration-150 hover:bg-white hover:text-[#171831] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b4a] active:scale-[.96]">
              {rtl ? "EN" : "العربية"}
            </button>
            <button onClick={showAdmin} className="min-h-11 rounded-xl px-4 text-sm font-bold text-[#292a4c] transition-colors duration-150 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b4a] active:scale-[.96]">
              {t.login}
            </button>
            <button onClick={requestDemo} className="min-h-11 rounded-xl bg-[#171831] px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(23,24,49,.18)] transition-[transform,background-color] duration-150 hover:bg-[#292a58] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b4a] focus-visible:ring-offset-2 active:scale-[.96]">
              {t.demo}
            </button>
          </div>

          <button aria-expanded={menuOpen} aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(!menuOpen)} className="grid h-11 w-11 place-items-center rounded-xl bg-white shadow-[0_4px_16px_rgba(23,24,49,.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b4a] active:scale-[.96] lg:hidden">
            <span className="relative h-4 w-5">
              <span className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-[#171831] transition-transform duration-200 ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`} />
              <span className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-[#171831] transition-opacity duration-150 ${menuOpen ? "opacity-0" : ""}`} />
              <span className={`absolute left-0 top-[14px] h-0.5 w-5 rounded-full bg-[#171831] transition-transform duration-200 ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-[#191a35]/8 bg-[#fffaf3] px-4 pb-5 pt-3 lg:hidden">
            <nav className="mx-auto grid max-w-7xl gap-1">
              {t.nav.map((item, index) => (
                <a key={item} href={t.navHref[index]} onClick={() => setMenuOpen(false)} className="flex min-h-12 items-center rounded-xl px-4 font-bold hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b4a]">{item}</a>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button onClick={() => setLanguage(rtl ? "en" : "ar")} className="min-h-12 rounded-xl bg-white font-bold shadow-sm active:scale-[.96]">{rtl ? "English" : "العربية"}</button>
                <button onClick={requestDemo} className="min-h-12 rounded-xl bg-[#171831] font-bold text-white active:scale-[.96]">{t.demo}</button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main id="top">
        <section className="relative isolate overflow-hidden pb-16 pt-10 sm:pb-24 sm:pt-16 lg:pb-28 lg:pt-20">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-[80%] bg-[radial-gradient(circle_at_20%_10%,rgba(100,214,208,.18),transparent_34%),radial-gradient(circle_at_85%_25%,rgba(255,107,74,.15),transparent_32%)]" />
          <div dir="ltr" className="mx-auto grid w-full max-w-7xl items-center gap-6 px-4 sm:px-6 lg:grid-cols-[1.02fr_.98fr] lg:gap-12 lg:px-8">
            <div className="relative mx-auto w-full max-w-[650px] lg:mx-0">
              <div className="absolute inset-[15%] -z-10 rounded-full bg-[#64d6d0]/18 blur-3xl" />
              <img src={heroImage} alt={rtl ? "منظومة DineHub من رمز QR إلى قائمة الجوال وشاشة الكاشير ولوحة التحليلات" : "The DineHub system from QR menu to cashier and analytics"} className="w-full object-contain drop-shadow-[0_30px_50px_rgba(23,24,49,.12)]" />
            </div>

            <div dir={rtl ? "rtl" : "ltr"} className="max-w-2xl text-center lg:text-start">
              <div className="mb-5 inline-flex min-h-9 items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-extrabold text-[#535470] shadow-[0_8px_30px_rgba(23,24,49,.08)] outline outline-1 outline-black/5 sm:text-sm">
                <span className="h-2 w-2 rounded-full bg-[#ff6b4a] shadow-[0_0_0_5px_rgba(255,107,74,.12)]" />
                {t.badge}
              </div>
              <h1 className="text-balance text-[clamp(2.6rem,6vw,5.3rem)] font-black leading-[.98] tracking-[-0.055em] text-[#171831]">
                {t.heroTitle}
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-pretty text-base font-medium leading-8 text-[#5d5e75] sm:text-lg lg:mx-0 lg:text-xl">
                {t.heroBody}
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <button onClick={requestDemo} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#ff6b4a] px-7 font-extrabold text-white shadow-[0_12px_30px_rgba(255,107,74,.28),inset_0_1px_0_rgba(255,255,255,.22)] transition-[transform,background-color,box-shadow] duration-150 hover:bg-[#f25a38] hover:shadow-[0_16px_36px_rgba(255,107,74,.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b4a] focus-visible:ring-offset-4 active:scale-[.96]">
                  {t.demo}<Arrow rtl={rtl} />
                </button>
                <a href="#how" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white px-7 font-extrabold text-[#292a4c] shadow-[0_8px_24px_rgba(23,24,49,.08)] outline outline-1 outline-black/5 transition-[transform,box-shadow] duration-150 hover:shadow-[0_12px_30px_rgba(23,24,49,.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b4a] focus-visible:ring-offset-4 active:scale-[.96]">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-[#171831] text-xs text-white">▶</span>{t.watch}
                </a>
              </div>
              <p className="mt-4 text-sm font-semibold text-[#77788b]">{t.heroNote}</p>
            </div>
          </div>

          <div className="mx-auto mt-14 grid w-[calc(100%-2rem)] max-w-5xl grid-cols-1 overflow-hidden rounded-[28px] bg-white shadow-[0_20px_60px_rgba(23,24,49,.09)] outline outline-1 outline-black/5 sm:grid-cols-3">
            {(t.proof as readonly (readonly [string, string])[]).map(([value, label], index) => (
              <div key={value} className={`px-6 py-6 text-center ${index ? "border-t border-[#191a35]/8 sm:border-t-0 sm:border-e" : ""}`}>
                <p className="text-xl font-black tracking-[-.03em] text-[#171831]">{value}</p>
                <p className="mt-1 text-sm font-semibold text-[#74758a]">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="scroll-mt-24 bg-white py-20 sm:py-28">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-black tracking-[.16em] text-[#ff6b4a]">{t.howEyebrow}</p>
              <h2 className="mt-4 text-balance text-3xl font-black tracking-[-.04em] text-[#171831] sm:text-5xl">{t.howTitle}</h2>
              <p className="mx-auto mt-5 max-w-2xl text-pretty text-base font-medium leading-8 text-[#68697e] sm:text-lg">{t.howBody}</p>
            </div>

            <div className="mt-14 grid gap-5 lg:grid-cols-3">
              {[qrFeature, customFeature, analyticsFeature].map((image, index) => {
                const [number, title, body] = t.steps[index];
                return (
                  <article key={title} className="group relative overflow-hidden rounded-[32px] bg-[#fffaf3] p-5 shadow-[0_14px_40px_rgba(23,24,49,.07)] outline outline-1 outline-black/5 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(23,24,49,.11)] sm:p-7">
                    <div className="absolute end-6 top-6 grid h-10 w-10 place-items-center rounded-full bg-[#171831] text-xs font-black text-white tabular-nums">{number}</div>
                    <div className="mx-auto aspect-square max-w-[250px]">
                      <img src={image} alt="" className="h-full w-full object-contain drop-shadow-[0_18px_24px_rgba(23,24,49,.10)] transition-transform duration-200 group-hover:scale-[1.03]" />
                    </div>
                    <h3 className="mt-3 text-2xl font-black tracking-[-.03em] text-[#171831]">{title}</h3>
                    <p className="mt-3 text-pretty font-medium leading-7 text-[#68697e]">{body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="restaurant" className="scroll-mt-24 py-20 sm:py-28">
          <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:px-8">
            <div>
              <p className="text-sm font-black tracking-[.16em] text-[#ff6b4a]">{t.guestEyebrow}</p>
              <h2 className="mt-4 text-balance text-3xl font-black tracking-[-.04em] text-[#171831] sm:text-5xl">{t.guestTitle}</h2>
              <p className="mt-5 max-w-xl text-pretty text-base font-medium leading-8 text-[#68697e] sm:text-lg">{t.guestBody}</p>
              <div className="mt-8 grid gap-3">
                {(productTab === "guest" ? t.guestPoints : t.adminPoints).map((point) => (
                  <div key={point} className="flex min-h-11 items-center gap-3 rounded-2xl bg-white px-4 py-3 font-bold text-[#353653] shadow-[0_5px_18px_rgba(23,24,49,.06)] outline outline-1 outline-black/5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#64d6d0]/18 text-[#128c87]"><Check /></span>{point}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[36px] bg-[#171831] p-3 shadow-[0_30px_70px_rgba(23,24,49,.2)] sm:p-5">
              <div role="tablist" aria-label="Product preview" className="mb-4 grid grid-cols-2 gap-2 rounded-[22px] bg-white/8 p-1.5">
                <button role="tab" aria-selected={productTab === "guest"} onClick={() => setProductTab("guest")} className={`min-h-12 rounded-[16px] px-4 text-sm font-extrabold transition-[background-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64d6d0] active:scale-[.96] ${productTab === "guest" ? "bg-white text-[#171831] shadow-lg" : "text-white/65 hover:text-white"}`}>{t.guestTab}</button>
                <button role="tab" aria-selected={productTab === "admin"} onClick={() => setProductTab("admin")} className={`min-h-12 rounded-[16px] px-4 text-sm font-extrabold transition-[background-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64d6d0] active:scale-[.96] ${productTab === "admin" ? "bg-white text-[#171831] shadow-lg" : "text-white/65 hover:text-white"}`}>{t.adminTab}</button>
              </div>

              <div className="min-h-[440px] rounded-[28px] bg-[#f8f3eb] p-4 sm:p-6">
                {productTab === "guest" ? (
                  <div className="mx-auto max-w-sm">
                    <div className="flex items-center justify-between">
                      <div><p className="text-xs font-bold text-[#858697]">DineHub</p><h3 className="text-2xl font-black">{t.popular}</h3></div>
                      <img src={logoImage} alt="" className="h-12 w-12 object-contain" />
                    </div>
                    <div className="mt-5 grid gap-3">
                      {[["برجر كلاسيك", "34 ر.س", "🍔"], ["تاكو دجاج", "28 ر.س", "🌮"], ["سلطة موسمية", "24 ر.س", "🥗"]].map(([name, price, emoji]) => (
                        <div key={name} className="flex min-h-20 items-center gap-3 rounded-[20px] bg-white p-3 shadow-[0_7px_20px_rgba(23,24,49,.07)]">
                          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[14px] bg-[#fff2df] text-3xl">{emoji}</span>
                          <div className="min-w-0 flex-1"><p className="truncate font-black">{name}</p><p className="mt-1 text-sm font-bold text-[#ff6b4a] tabular-nums">{price}</p></div>
                          <button className="min-h-11 rounded-xl bg-[#171831] px-4 text-sm font-black text-white active:scale-[.96]">{t.add}</button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex min-h-14 items-center justify-between rounded-2xl bg-[#ff6b4a] px-5 font-black text-white shadow-[0_10px_24px_rgba(255,107,74,.25)]"><span>{t.orderTotal}</span><span className="tabular-nums">86 ر.س</span></div>
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-bold text-[#77788b]">{t.branch}</p><h3 className="mt-1 text-2xl font-black">{t.sales}</h3></div><span className="rounded-full bg-[#64d6d0]/20 px-3 py-1.5 text-xs font-black text-[#128c87]">+12.4%</span></div>
                    <p className="mt-5 text-4xl font-black tabular-nums">18,420 <span className="text-lg text-[#77788b]">ر.س</span></p>
                    <div className="mt-7 flex h-40 items-end gap-2 rounded-[22px] bg-white p-4 shadow-sm">
                      {[38,55,42,70,62,86,76,96,82,100,72,91].map((height, i) => <div key={i} className="flex-1 rounded-t-md bg-[#7257d8]" style={{height: `${height}%`, opacity: .35 + i / 20}} />)}
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {[[t.orders, "142", "#ff6b4a"], ["متوسط الطلب", "42 ر.س", "#7257d8"], ["وقت الذروة", "8:30", "#12a6a0"]].map(([label, value, color]) => (
                        <div key={label} className="rounded-[20px] bg-white p-4 shadow-sm"><span className="mb-3 block h-2 w-8 rounded-full" style={{backgroundColor: color}} /><p className="text-xs font-bold text-[#858697]">{label}</p><p className="mt-1 text-xl font-black tabular-nums">{value}</p></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-24 bg-white py-20 sm:py-28">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-black tracking-[.16em] text-[#ff6b4a]">{t.featuresEyebrow}</p>
              <h2 className="mt-4 text-balance text-3xl font-black tracking-[-.04em] text-[#171831] sm:text-5xl">{t.featuresTitle}</h2>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(t.features as readonly (readonly [string, string])[]).map(([title, body], index) => (
                <article key={title} className="rounded-[26px] bg-[#fffaf3] p-6 outline outline-1 outline-black/5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_15px_34px_rgba(23,24,49,.08)]">
                  <span className={`grid h-12 w-12 place-items-center rounded-[15px] text-lg font-black ${index % 3 === 0 ? "bg-[#ff6b4a]/14 text-[#e84e2b]" : index % 3 === 1 ? "bg-[#7257d8]/14 text-[#6044ca]" : "bg-[#64d6d0]/20 text-[#128c87]"}`}>{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="mt-6 text-xl font-black tracking-[-.025em]">{title}</h3>
                  <p className="mt-3 text-pretty font-medium leading-7 text-[#68697e]">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-28">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-[36px] bg-[#171831] px-6 py-12 text-white shadow-[0_28px_70px_rgba(23,24,49,.18)] sm:px-12 lg:px-16 lg:py-16">
              <div aria-hidden="true" className="absolute -start-16 -top-20 h-64 w-64 rounded-full bg-[#7257d8]/25 blur-3xl" />
              <div aria-hidden="true" className="absolute -bottom-24 -end-14 h-64 w-64 rounded-full bg-[#ff6b4a]/20 blur-3xl" />
              <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_.72fr]">
                <div>
                  <p className="text-sm font-black tracking-[.16em] text-[#64d6d0]">{t.saudiEyebrow}</p>
                  <h2 className="mt-4 max-w-2xl text-balance text-3xl font-black tracking-[-.04em] sm:text-5xl">{t.saudiTitle}</h2>
                  <p className="mt-5 max-w-2xl text-pretty text-base font-medium leading-8 text-white/68 sm:text-lg">{t.saudiBody}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {t.saudiTags.map((tag, index) => <div key={tag} className="grid min-h-24 place-items-center rounded-[22px] bg-white/8 px-3 text-center text-lg font-black shadow-[inset_0_1px_0_rgba(255,255,255,.08)] outline outline-1 outline-white/8"><span className="text-balance">{index === 1 ? <span className="tabular-nums">{tag}</span> : tag}</span></div>)}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 bg-white py-20 sm:py-28">
          <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[.65fr_1fr] lg:px-8">
            <div>
              <p className="text-sm font-black tracking-[.16em] text-[#ff6b4a]">{t.faqEyebrow}</p>
              <h2 className="mt-4 text-balance text-3xl font-black tracking-[-.04em] text-[#171831] sm:text-5xl">{t.faqTitle}</h2>
            </div>
            <div className="grid gap-3">
              {(t.faqs as readonly (readonly [string, string])[]).map(([question, answer]) => (
                <details key={question} className="group rounded-[22px] bg-[#fffaf3] px-5 shadow-[0_6px_20px_rgba(23,24,49,.05)] outline outline-1 outline-black/5 open:shadow-[0_12px_28px_rgba(23,24,49,.08)]">
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b4a] [&::-webkit-details-marker]:hidden">
                    <span>{question}</span><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-xl transition-transform duration-200 group-open:rotate-45">+</span>
                  </summary>
                  <p className="max-w-2xl pb-5 text-pretty font-medium leading-7 text-[#68697e]">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[38px] bg-[#ff6b4a] px-6 py-12 text-center text-white shadow-[0_24px_64px_rgba(255,107,74,.25)] sm:px-12 sm:py-16">
            <h2 className="mx-auto max-w-4xl text-balance text-3xl font-black tracking-[-.045em] sm:text-5xl">{t.ctaTitle}</h2>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base font-semibold leading-8 text-white/82 sm:text-lg">{t.ctaBody}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button onClick={requestDemo} className="min-h-14 rounded-2xl bg-[#171831] px-7 font-black text-white shadow-[0_12px_24px_rgba(23,24,49,.22)] transition-[transform,background-color] duration-150 hover:bg-[#292a58] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#ff6b4a] active:scale-[.96]">{t.ctaPrimary}</button>
              <button onClick={requestDemo} className="min-h-14 rounded-2xl bg-white/14 px-7 font-black text-white outline outline-1 outline-white/24 transition-[transform,background-color] duration-150 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[.96]">{t.ctaSecondary}</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#191a35]/8 bg-white py-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-6 px-4 text-center sm:px-6 md:flex-row md:text-start lg:px-8">
          <div className="flex items-center gap-3"><img src={logoImage} alt="" className="h-11 w-11 object-contain" /><div><p className="text-lg font-black tracking-[-.04em]">Dine<span className="text-[#ff6b4a]">Hub</span></p><p className="mt-0.5 text-sm font-semibold text-[#77788b]">{t.footer}</p></div></div>
          <p className="text-sm font-semibold text-[#77788b]">{t.rights}</p>
        </div>
      </footer>
    </div>
  );
};
