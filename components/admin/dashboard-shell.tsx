"use client";
import { PasswordChangeScreen } from "@/components/auth/password-change-screen";

import {
  AccessProvider,
  useAccess,
  permissionForPage,
} from "@/lib/access-context";
import * as Dialog from "@radix-ui/react-dialog";
import {
  CalendarDays,
  Building2,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  QrCode,
  ScrollText,
  Settings,
  ShieldCheck,
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
import styles from "@/app/[locale]/(admin)/admin/admin-shell.module.css";
import tokenStyles from "@/app/[locale]/(admin)/admin/admin-tokens.module.css";

const navigationItems = [
  { key: "navOverview", href: "/admin", icon: LayoutDashboard },
  { key: "navBranches", href: "/admin/branches", icon: Building2 },
  { key: "navCategories", href: "/admin/categories", icon: Tags },
  { key: "navMenu", href: "/admin/menu", icon: UtensilsCrossed },
  { key: "navEvents", href: "/admin/events", icon: CalendarDays },
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
          aria-label={t("navBusinesses")}
          title={t("navBusinesses")}
          onClick={onNavigate}
          aria-current={
            pathname.startsWith("/admin/businesses") ? "page" : undefined
          }
        >
          <span className={styles.navIcon}>
            <Store aria-hidden="true" size={19} strokeWidth={1.7} />
          </span>
          <span className={styles.navLabel}>{t("navBusinesses")}</span>
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
              aria-label={t(item.key)}
              title={t(item.key)}
              key={item.href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
            >
              <span className={styles.navIcon}>
                <item.icon aria-hidden="true" size={19} strokeWidth={1.7} />
              </span>
              <span className={styles.navLabel}>{t(item.key)}</span>
              <i aria-hidden="true" />
            </Link>
          );
        })}
      <Link
        className={styles.navLink}
        href="/account/password"
        aria-label={t("accountSecurity")}
        title={t("accountSecurity")}
        onClick={onNavigate}
      >
        <span className={styles.navIcon}>
          <ShieldCheck aria-hidden="true" size={19} strokeWidth={1.7} />
        </span>
        <span className={styles.navLabel}>{t("accountSecurity")}</span>
      </Link>
    </nav>
  );
}

function BrandLockup() {
  const t = useTranslations("AdminShell");

  return (
    <Link className={styles.brand} href="/" aria-label={t("brandAria")}>
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
  const {
    access,
    can,
    loading: accessLoading,
    error: accessError,
  } = useAccess();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { data: session, isPending, error } = authClient.useSession();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setSidebarCollapsed(
          localStorage.getItem("dinehub.sidebar-collapsed.v1") === "true",
        );
      } catch {
        /* The control still works when browser storage is unavailable. */
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    try {
      localStorage.setItem("dinehub.sidebar-collapsed.v1", String(next));
    } catch {
      /* Keep the in-memory preference. */
    }
  };

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

  if (access?.mustChangePassword)
    return (
      <PasswordChangeScreen
        forced
        expiresAt={access.temporaryPasswordExpiresAt}
      />
    );

  const matchedItem = navigationItems.find((item) =>
    item.href === "/admin"
      ? pathname === item.href
      : pathname.startsWith(item.href),
  );

  const showGuide =
    can("branches.create") && can("categories.create") && can("menu.create");

  const currentPage =
    (pathname.startsWith("/admin/businesses")
      ? t("navBusinesses")
      : matchedItem
        ? t(matchedItem.key)
        : undefined) ?? t("adminRole");
  const SidebarArrow = sidebarCollapsed !== isRtl ? ChevronRight : ChevronLeft;

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
    <div
      className={cn(tokenStyles.theme, styles.shell)}
      dir={isRtl ? "rtl" : "ltr"}
      data-locale={locale}
      data-sidebar-collapsed={sidebarCollapsed}
    >
      <a className={styles.skipLink} href="#admin-main">
        {t("skipToContent")}
      </a>

      <div className={styles.sidebarFrame}>
        <button
          type="button"
          className={styles.sidebarToggle}
          onClick={toggleSidebar}
          aria-expanded={!sidebarCollapsed}
          aria-controls="dashboard-sidebar"
          aria-label={
            sidebarCollapsed ? t("expandSidebar") : t("collapseSidebar")
          }
          title={
            sidebarCollapsed ? t("expandSidebar") : t("collapseSidebar")
          }
        >
          <SidebarArrow size={17} strokeWidth={2} aria-hidden="true" />
        </button>
        <aside className={styles.sidebar} id="dashboard-sidebar">
          <div className={styles.sidebarHeader}>
            <BrandLockup />
          </div>
          <NavigationLinks pathname={pathname} />

          <div className={styles.sidebarFoot}>
            <div className={styles.userCard} title={session.user.name}>
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
              aria-label={isSigningOut ? t("loggingOut") : t("logout")}
              title={t("logout")}
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
      </div>

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
                    {showGuide && (
                      <AdminGuideTrigger
                        className={styles.guideButton}
                        onClick={() => setMobileNavOpen(false)}
                        aria-label={t("guideButton")}
                        title={t("guideButton")}
                      />
                    )}
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
          <div className={styles.contextTitleGroup}>
            <span className={styles.contextBusinessBadge}>
              <Store
                aria-hidden="true"
                size={13}
                className={styles.contextStoreIcon}
              />
              <span>{access?.businessName ?? t("adminRole")}</span>
            </span>
            <span
              className={styles.contextBreadcrumbDivider}
              aria-hidden="true"
            >
              /
            </span>
            <strong className={styles.contextPageTitle}>{currentPage}</strong>
          </div>
          <div className={styles.contextBarActions}>
            <AdminLanguageSwitcher className={styles.topBarLangSwitcher} />

            {showGuide && (
              <AdminGuideTrigger
                className={styles.topBarGuideButton}
                aria-label={t("guideButton")}
                title={t("guideButton")}
              >
                <span className={styles.guideQuestionMark} aria-hidden="true">
                  ?
                </span>
              </AdminGuideTrigger>
            )}
          </div>
        </div>

        <main className={styles.main} id="admin-main">
          {(
            pathname.startsWith("/admin/businesses")
              ? access?.isPlatformAdmin
              : can(permissionForPage(pathname) ?? "denied")
          ) ? (
            children
          ) : (
            <section role="alert">
              <h1>{t("unauthorizedTitle")}</h1>
              <p>{t("unauthorizedDesc")}</p>
            </section>
          )}
        </main>
      </div>

      {showGuide && <AdminOnboardingGuide />}
    </div>
  );
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/admin/login") {
    return children;
  }

  const shell = (
    <AuthenticatedAdminShell pathname={pathname}>
      {children}
    </AuthenticatedAdminShell>
  );

  return (
    <AccessProvider>
      {pathname === "/staff" ? (
        shell
      ) : (
        <AdminBranchProvider>{shell}</AdminBranchProvider>
      )}
    </AccessProvider>
  );
}
