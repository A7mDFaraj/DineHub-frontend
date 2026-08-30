import Image from "next/image";
import Link from "next/link";

const footerLinks = [
  { href: "#how-it-works", label: "كيف يعمل" },
  { href: "#experience", label: "تجربة العميل" },
  { href: "#operations", label: "إدارة التشغيل" },
  { href: "/admin/login", label: "دخول الإدارة" },
];

export function SiteFooter() {
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
              DineHub
            </span>
          </Link>
          <p>طلب أسهل للعميل. تشغيل أوضح للفريق.</p>
        </div>
        <nav aria-label="روابط التذييل">
          {footerLinks.map((item) => (
            <a href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
      </div>
      <div className="landing-shell footer-bottom">
        <span dir="ltr" translate="no">© {new Date().getFullYear()} DineHub</span>
        <span>صُمّم للعمل بالعربية ومن الهاتف أولًا.</span>
      </div>
    </footer>
  );
}
