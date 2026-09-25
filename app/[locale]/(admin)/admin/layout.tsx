"use client";
import { PasswordChangeScreen } from "@/components/auth/password-change-screen";

import {
  AccessProvider,
  useAccess,
  permissionForPage,
} from "@/lib/access-context";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Building2,
  ChefHat,
  CircleAlert,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  QrCode,
  ScrollText,
  Settings,
  Store,
  Tags,
  UtensilsCrossed,
  UsersRound,
  X,
} from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import {
  AdminGuideTrigger,
  AdminOnboardingGuide,
} from "@/components/admin/admin-onboarding-guide";
import { AdminLanguageSwitcher } from "@/components/admin/admin-language-switcher";
import { AdminBranchProvider } from "@/lib/admin-branch-context";
import { authClient, signOut } from "@/lib/auth-client";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import logo from "@/public/brand/dinehub-logo-3d.png";
import styles from "./admin-shell.module.css";
import tokenStyles from "./admin-tokens.module.css";

const navigationItems = [
  { key: "navOverview", href: "/admin", icon: LayoutDashboard },
  { key: "navBranches", href: "/admin/branches", icon: Building2 },
  { key: "navCategories", href: "/admin/categories", icon: Tags },
  { key: "navMenu", href: "/admin/menu", icon: UtensilsCrossed },
  { key: "navQrCode", href: "/admin/qr-code", icon: QrCode },
  { key: "navUsers", href: "/admin/users", icon: UsersRound },
  { key: "navLogs", href: "/admin/logs", icon: ScrollText },
  { key: "navStaffPos", href: "/staff", icon: ChefHat },
  { key: "navSettings", href: "/admin/settings", icon: Settings },
] as const;

function NavigationLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const { access, can } = useAccess();
  const t = useTranslations("AdminShell");

  return (
    <nav className={styles.navigation} aria-label={t("navAria")}>
      {access?.isPlatformAdmin && (
        <Link
          className={cn(
            styles.navLink,
            pathname.startsWith("/admin/businesses") && styles.navLinkActive,
          )}
          href="/admin/businesses"
          onClick={onNavigate}
          aria-current={
            pathname.startsWith("/admin/businesses") ? "page" : undefined
          }
        >
          <span className={styles.navIcon}>
            <Store aria-hidden="true" size={19} strokeWidth={1.7} />
          </span>
          <span>{t("navBusinesses")}</span>
          <i aria-hidden="true" />
        </Link>
      )}
      {navigationItems
        .filter((item) => can(permissionForPage(item.href) ?? "denied"))
        .map((item) => {
          const isActive =
            item.href === "/admin"
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
              <span className={styles.navIcon}>
                <item.icon aria-hidden="true" size={19} strokeWidth={1.7} />
              </span>
              <span>{t(item.key)}</span>
              <i aria-hidden="true" />
            </Link>
          );
        })}
    </nav>
  );
}

function BrandLockup() {
  const t = useTranslations("AdminShell");

  return (
    <Link
      className={styles.brand}
      href="/"
      aria-label={t("brandAria")}
    >
      <Image src={logo} alt="" width={58} priority />
      <span>
        <strong dir="ltr">DineHub</strong>
        <small>{t("dashboard")}</small>
      </span>
    </Link>
  );
}

function SessionLoading() {
  const t = useTranslations("AdminShell");

  return (
    <main className={styles.sessionState} aria-busy="true">
      <div className={styles.loadingSignal}>
        <Image src={logo} alt="" width={72} priority />
        <span>
          <Loader2 aria-hidden="true" size={20} />
        </span>
      </div>
      <p>{t("loadingSession")}</p>
    </main>
  );
}

function SessionError() {
  const t = useTranslations("AdminShell");
  const tCommon = useTranslations("AdminCommon");

  return (
    <main className={styles.sessionState}>
      <div className={styles.errorIcon}>
        <CircleAlert aria-hidden="true" size={24} />
      </div>
      <h1>{t("sessionErrorTitle")}</h1>
      <p>{t("sessionErrorDesc")}</p>
      <button type="button" onClick={() => window.location.reload()}>
        {tCommon("retry")}
      </button>
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
  const locale = useLocale();
  const isRtl = locale === "ar";
  const t = useTranslations("AdminShell");
  const { access, can, loading: accessLoading, error: accessError } = useAccess();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { data: session, isPending, error } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session && !error) {
      router.replace("/admin/login");
      return;
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

  if (accessLoading) return <SessionLoading />;
  if (accessError) return <SessionError />;

  if (access?.mustChangePassword) return <PasswordChangeScreen forced expiresAt={access.temporaryPasswordExpiresAt} />;

  const matchedItem = navigationItems.find((item) =>
    item.href === "/admin"
      ? pathname === item.href
      : pathname.startsWith(item.href),
  );

  const currentPage =
    (pathname.startsWith("/admin/businesses")
      ? t("navBusinesses")
      : matchedItem
        ? t(matchedItem.key)
        : undefined) ?? t("adminRole");

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
      <a className={styles.skipLink} href="#admin-main">
        {t("skipToContent")}
      </a>

      <aside className={styles.sidebar}>
        <BrandLockup />
        <NavigationLinks pathname={pathname} />

        <div className={styles.sidebarFoot}>
          <div className={styles.sidebarControlsRow}>
            <AdminLanguageSwitcher mode="sidebar" className={styles.sidebarLangSwitcher} />
            <AdminGuideTrigger
              className={styles.guideIconButton}
              aria-label={t("guideButton")}
              title={t("guideButton")}
            >
              <span className={styles.guideQuestionMark} aria-hidden="true">?</span>
            </AdminGuideTrigger>
          </div>

          <div className={styles.userCard}>
            <span aria-hidden="true">
              {session.user.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{session.user.name}</strong>
              <small dir="ltr">{session.user.email}</small>
            </div>
          </div>
          <button
            className={styles.logoutButton}
            type="button"
            onClick={handleLogout}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <Loader2
                className={styles.spinner}
                aria-hidden="true"
                size={19}
              />
            ) : (
              <LogOut aria-hidden="true" size={19} />
            )}
            <span>{isSigningOut ? t("loggingOut") : t("logout")}</span>
          </button>
        </div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.mobileHeader}>
          <BrandLockup />
          <div className={styles.mobileHeaderActions}>
            <AdminLanguageSwitcher />
            <Dialog.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <Dialog.Trigger asChild>
                <button
                  className={styles.menuButton}
                  type="button"
                  aria-label={t("mobileMenuAria")}
                >
                  <Menu aria-hidden="true" size={22} />
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className={styles.mobileOverlay} />
                <Dialog.Content
                  className={styles.mobileDrawer}
                  dir={isRtl ? "rtl" : "ltr"}
                >
                  <div className={styles.drawerHeader}>
                    <Dialog.Title>{t("navAria")}</Dialog.Title>
                    <Dialog.Close asChild>
                      <button type="button" aria-label={t("closeMenuAria")}>
                        <X aria-hidden="true" size={21} />
                      </button>
                    </Dialog.Close>
                  </div>
                  <NavigationLinks
                    pathname={pathname}
                    onNavigate={() => setMobileNavOpen(false)}
                  />
                  <div className={styles.drawerFoot}>
                    <div className={styles.sidebarControlsRow}>
                      <AdminLanguageSwitcher mode="sidebar" className={styles.sidebarLangSwitcher} />
                      <AdminGuideTrigger
                        className={styles.guideIconButton}
                        onClick={() => setMobileNavOpen(false)}
                        aria-label={t("guideButton")}
                        title={t("guideButton")}
                      >
                        <span className={styles.guideQuestionMark} aria-hidden="true">?</span>
                      </AdminGuideTrigger>
                    </div>
                    <button
                      className={styles.logoutButton}
                      type="button"
                      onClick={handleLogout}
                      disabled={isSigningOut}
                    >
                      <LogOut aria-hidden="true" size={19} />
                      <span>
                        {isSigningOut ? t("loggingOut") : t("logout")}
                      </span>
                    </button>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </header>

        <div className={styles.contextBar}>
          <div>
            <span>{access?.businessName ?? t("adminRole")}</span>
            <strong>{currentPage}</strong>
          </div>
          <div className={styles.contextBarActions}>
            <p>
              <i aria-hidden="true" />
              {t("signalConnected")}
            </p>
          </div>
        </div>

        <main className={styles.main} id="admin-main">
          {(pathname.startsWith("/admin/businesses") ? access?.isPlatformAdmin : can(permissionForPage(pathname) ?? "denied")) ? (
            children
          ) : (
            <section role="alert">
              <h1>{t("unauthorizedTitle")}</h1>
              <p>{t("unauthorizedDesc")}</p>
            </section>
          )}
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
    <AccessProvider>
      <AdminBranchProvider>
        <AuthenticatedAdminShell pathname={pathname}>
          {children}
        </AuthenticatedAdminShell>
      </AdminBranchProvider>
    </AccessProvider>
  );
}
