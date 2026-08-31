"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  Building2,
  ChefHat,
  CircleAlert,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  QrCode,
  ScrollText,
  Settings,
  Tags,
  UtensilsCrossed,
  UsersRound,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AdminGuideTrigger, AdminOnboardingGuide } from "@/components/admin/admin-onboarding-guide";
import { authClient, signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import logo from "@/public/brand/dinehub-logo-3d.png";
import styles from "./admin-shell.module.css";
import tokenStyles from "./admin-tokens.module.css";

const navigation = [
  { name: "نظرة عامة", href: "/admin", icon: LayoutDashboard },
  { name: "الفروع", href: "/admin/branches", icon: Building2 },
  { name: "التصنيفات", href: "/admin/categories", icon: Tags },
  { name: "القائمة", href: "/admin/menu", icon: UtensilsCrossed },
  { name: "رموز QR", href: "/admin/qr-code", icon: QrCode },
  { name: "المستخدمون", href: "/admin/users", icon: UsersRound },
  { name: "سجل النظام", href: "/admin/logs", icon: ScrollText },
  { name: "طلبات المطبخ", href: "/staff", icon: ChefHat },
  { name: "الإعدادات", href: "/admin/settings", icon: Settings },
] as const;

function NavigationLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className={styles.navigation} aria-label="التنقل في الإدارة">
      {navigation.map((item) => {
        const isActive = item.href === "/admin"
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            className={cn(styles.navLink, isActive && styles.navLinkActive)}
            href={item.href}
            key={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
          >
            <span className={styles.navIcon}><item.icon aria-hidden="true" size={19} strokeWidth={1.7} /></span>
            <span>{item.name}</span>
            <i aria-hidden="true" />
          </Link>
        );
      })}
    </nav>
  );
}

function BrandLockup() {
  return (
    <Link className={styles.brand} href="/" aria-label="DineHub، الصفحة الرئيسية">
      <Image src={logo} alt="" width={58} priority />
      <span>
        <strong dir="ltr">DineHub</strong>
        <small>لوحة التحكم</small>
      </span>
    </Link>
  );
}

function SessionLoading() {
  return (
    <main className={styles.sessionState} aria-busy="true">
      <div className={styles.loadingSignal}>
        <Image src={logo} alt="" width={72} priority />
        <span><Loader2 aria-hidden="true" size={20} /></span>
      </div>
      <p>نصل إشارتك بلوحة التحكم…</p>
    </main>
  );
}

function SessionError() {
  return (
    <main className={styles.sessionState}>
      <div className={styles.errorIcon}><CircleAlert aria-hidden="true" size={24} /></div>
      <h1>تعذّر التحقق من جلسة الدخول</h1>
      <p>تحقق من اتصالك، ثم أعد المحاولة.</p>
      <button type="button" onClick={() => window.location.reload()}>إعادة المحاولة</button>
    </main>
  );
}

function AuthenticatedAdminShell({
  children,
  pathname,
}: {
  children: ReactNode;
  pathname: string;
}) {
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { data: session, isPending, error } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session && !error) {
      router.replace("/admin/login");
      return;
    }

    if (!isPending && session && session.user.role !== "admin") {
      router.replace("/staff");
    }
  }, [error, isPending, router, session]);

  if (isPending || (!session && !error)) {
    return <SessionLoading />;
  }

  if (error) {
    return <SessionError />;
  }

  if (!session) {
    return <SessionLoading />;
  }

  if (session.user.role !== "admin") {
    return <SessionLoading />;
  }

  const currentPage = navigation.find((item) => (
    item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href)
  ))?.name ?? "الإدارة";

  const handleLogout = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace("/admin/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className={cn(tokenStyles.theme, styles.shell)}>
      <a className={styles.skipLink} href="#admin-main">انتقل إلى المحتوى</a>

      <aside className={styles.sidebar}>
        <BrandLockup />
        <div className={styles.signalStatus}>
          <span aria-hidden="true" />
          <div>
            <strong>النظام متصل</strong>
            <small>جاهز لاستقبال الطلبات</small>
          </div>
        </div>

        <NavigationLinks pathname={pathname} />

        <div className={styles.sidebarFoot}>
          <AdminGuideTrigger className={styles.guideButton}>
            <HelpCircle aria-hidden="true" size={17} strokeWidth={1.8} />
            <span>الدليل الإرشادي</span>
          </AdminGuideTrigger>

          <div className={styles.userCard}>
            <span aria-hidden="true">{session.user.name.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{session.user.name}</strong>
              <small dir="ltr">{session.user.email}</small>
            </div>
          </div>
          <button className={styles.logoutButton} type="button" onClick={handleLogout} disabled={isSigningOut}>
            {isSigningOut ? <Loader2 className={styles.spinner} aria-hidden="true" size={19} /> : <LogOut aria-hidden="true" size={19} />}
            <span>{isSigningOut ? "جارٍ الخروج…" : "تسجيل الخروج"}</span>
          </button>
        </div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.mobileHeader}>
          <BrandLockup />
          <Dialog.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <Dialog.Trigger asChild>
              <button className={styles.menuButton} type="button" aria-label="فتح قائمة الإدارة">
                <Menu aria-hidden="true" size={22} />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className={styles.mobileOverlay} />
              <Dialog.Content className={styles.mobileDrawer} dir="rtl">
                <div className={styles.drawerHeader}>
                  <Dialog.Title>التنقل في الإدارة</Dialog.Title>
                  <Dialog.Close asChild>
                    <button type="button" aria-label="إغلاق القائمة"><X aria-hidden="true" size={21} /></button>
                  </Dialog.Close>
                </div>
                <NavigationLinks pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />
                <div className={styles.drawerFoot}>
                  <AdminGuideTrigger
                    className={styles.guideButton}
                    onClick={() => setMobileNavOpen(false)}
                  >
                    <HelpCircle aria-hidden="true" size={17} strokeWidth={1.8} />
                    <span>الدليل الإرشادي</span>
                  </AdminGuideTrigger>
                  <button className={styles.logoutButton} type="button" onClick={handleLogout} disabled={isSigningOut}>
                    <LogOut aria-hidden="true" size={19} />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </header>

        <div className={styles.contextBar}>
          <div>
            <span>الإدارة</span>
            <strong>{currentPage}</strong>
          </div>
          <p><i aria-hidden="true" />الإشارة متصلة</p>
        </div>

        <main className={styles.main} id="admin-main">
          {children}
        </main>
      </div>

      <AdminOnboardingGuide />
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/admin/login") {
    return children;
  }

  return (
    <AuthenticatedAdminShell pathname={pathname}>
      {children}
    </AuthenticatedAdminShell>
  );
}
