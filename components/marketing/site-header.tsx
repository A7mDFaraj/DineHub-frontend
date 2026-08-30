import { ArrowUpLeft, Menu, ScanLine } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const navigation = [
  { href: "#how-it-works", label: "كيف يعمل" },
  { href: "#experience", label: "التجربة" },
  { href: "#operations", label: "إدارة التشغيل" },
  { href: "#for-whom", label: "لمن صُمّم" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <nav className="landing-shell site-nav" aria-label="التنقل الرئيسي">
        <Link className="brand-lockup" href="/" aria-label="DineHub، الصفحة الرئيسية">
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
            DineHub
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
          <Button asChild variant="brand" size="default">
            <Link href="/admin/login">
              ابدأ الآن
              <ArrowUpLeft aria-hidden="true" strokeWidth={2} />
            </Link>
          </Button>
        </div>

        <details className="mobile-menu">
          <summary aria-label="فتح قائمة التنقل">
            <Menu aria-hidden="true" strokeWidth={1.8} />
          </summary>
          <div className="mobile-menu-panel">
            <div className="mobile-menu-title">
              <ScanLine aria-hidden="true" strokeWidth={1.8} />
              <span>تنقّل داخل الصفحة</span>
            </div>
            {navigation.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
            <Button asChild variant="brand" size="default">
              <Link href="/admin/login">ابدأ الآن</Link>
            </Button>
          </div>
        </details>
      </nav>
    </header>
  );
}
